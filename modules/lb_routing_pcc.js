// === Mikrotik LB Routing & PCC Module (Supports DHCP/STATIC/PPPoE) ===

document.getElementById("section2").innerHTML = `
<h2>🧭 Routing & PCC Configuration</h2>

<div class="card" style="background:#e3f2fd; border:1px solid #bbdefb;">
  <p style="margin:0; font-size:0.9rem;">
    ℹ️ Modul ini mengambil data ISP dari Tab 1 (DHCP/STATIC/PPPoE). Pastikan Tab 1 sudah diisi lengkap.
  </p>
</div>

<label>RouterOS Version:</label>
<select id="rosVer">
  <option value="7" selected>RouterOS v7</option>
  <option value="6">RouterOS v6</option>
</select>

<label style="margin-top:10px;">Failover Method:</label>
<select id="failMode">
  <option value="RECURSIVE" selected>Recursive (Ping 8.8.8.8 / 1.1.1.1)</option>
  <option value="GATEWAY">Check Gateway (Ping Gateway/Interface)</option>
</select>

<hr>
<button id="genRoutingBtn" style="width:100%; margin-top:10px;">📄 Generate Routing & PCC Script Only</button>
<textarea id="output_routing" readonly placeholder="Klik tombol di atas untuk melihat preview..." style="height:280px; margin-top:10px;"></textarea>
`;

/**
 * Helper: ambil gateway yang akan dipakai untuk /ip route
 * - PPPoE: gunakan interface pppoe (wanIface) sebagai gateway route
 * - STATIC/DHCP: gunakan gw (kalau diisi)
 */
function getRouteGateway(isp) {
  if (!isp) return "";
  if (isp.mode === "PPPOE") return isp.wanIface || "";
  return (isp.gw || "").trim();
}

// CORE
window.generateRoutingScript = function(ispList) {
  if (!ispList || ispList.length === 0) {
    return { error: true, msg: "⚠️ Data ISP kosong. Kembali ke Tab 1, isi ISP, lalu Generate Basic Script." };
  }

  const ros = document.getElementById("rosVer").value;
  const failMode = document.getElementById("failMode").value;

  // validasi minimum
  for (const isp of ispList) {
    if (!isp.name) return { error: true, msg: "⚠️ Ada ISP tanpa nama. Periksa Tab 1." };
    if (!isp.wanIface) return { error: true, msg: `⚠️ ISP ${isp.name}: wanIface kosong. Periksa Tab 1.` };

    // STATIC wajib gateway
    if (isp.mode === "STATIC" && !(isp.gw && isp.gw.trim())) {
      return { error: true, msg: `⚠️ ISP ${isp.name}: mode STATIC wajib isi Gateway di Tab 1.` };
    }

    // DHCP: gateway sangat disarankan supaya route PCC/failover bisa dibuat jelas
    if (isp.mode === "DHCP" && !(isp.gw && isp.gw.trim())) {
      // Tidak dibuat hard error supaya user tetap bisa lihat script,
      // tapi routing PCC untuk ISP ini akan diberi WARNING.
    }
  }

  let script = `# === 2. ROUTING, PCC & NAT ===\n`;

  // 1) Address List
  script += `/ip firewall address-list\n`;
  script += `add list=LOCAL_NET address=192.168.0.0/16\n`;
  script += `add list=LOCAL_NET address=10.0.0.0/8\n`;
  script += `add list=LOCAL_NET address=172.16.0.0/12\n\n`;

  // 2) Mangle
  script += `/ip firewall mangle\n`;
  script += `add chain=prerouting src-address-list=LOCAL_NET dst-address-list=LOCAL_NET action=accept comment="BYPASS: LAN to LAN sebelum PCC"\n\n`;

  // INPUT MARK (pakai wanIface agar PPPoE benar)
  ispList.forEach(isp => {
    script += `add chain=input in-interface="${isp.wanIface}" action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="Input Mark ${isp.name}"\n`;
  });

  // PCC PREROUTING (LAN -> internet)
  ispList.forEach((isp, idx) => {
    script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${ispList.length}/${idx} action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="PCC ${isp.name}"\n`;
  });

  // MARK ROUTING
  ispList.forEach(isp => {
    script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
  });

  // OUTPUT MARK (traffic dari router)
  ispList.forEach(isp => {
    script += `add chain=output connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no comment="Output ${isp.name}"\n`;
  });

  // 3) NAT
  script += `\n# NAT MASQUERADE\n/ip firewall nat\n`;
  ispList.forEach(isp => {
    script += `add chain=srcnat out-interface="${isp.wanIface}" action=masquerade comment="NAT ${isp.name}"\n`;
  });

  // 4) Routing Tables & PCC Routes
  if (ros === "7") {
    script += `\n# Routing Tables\n`;
    ispList.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
  }

  script += `\n# PCC Routes\n/ip route\n`;
  ispList.forEach(isp => {
    const param = (ros === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;
    const gw = getRouteGateway(isp);

    if (!gw) {
      script += `# WARNING: Gateway untuk ${isp.name} kosong (mode ${isp.mode}). Isi Gateway di Tab 1 (disarankan) agar route PCC dibuat.\n`;
    } else {
      script += `add dst-address=0.0.0.0/0 gateway="${gw}" ${param} distance=1 comment="PCC ${isp.name}" check-gateway=ping\n`;
    }
  });

  // 5) Failover (Main table)
  script += `\n# Failover Config (Main Table)\n`;
  ispList.forEach((isp, idx) => {
    const dist = idx + 1;
    const gw = getRouteGateway(isp);

    if (!gw) {
      script += `# WARNING: Skip failover route ${isp.name} karena gateway/interface kosong.\n`;
      return;
    }

    // Recursive lebih cocok untuk gateway IP (STATIC/DHCP). PPPoE kita pakai direct interface.
    if (failMode === "RECURSIVE" && isp.mode !== "PPPOE") {
      const checkIp = (idx % 2 === 0) ? "8.8.8.8" : "1.1.1.1";
      script += `add dst-address=${checkIp} gateway=${gw} scope=10 comment="Recursive Check ${isp.name}"\n`;
      script += `add dst-address=0.0.0.0/0 gateway=${checkIp} distance=${dist} target-scope=11 check-gateway=ping comment="Main ${isp.name}"\n`;
    } else {
      script += `add dst-address=0.0.0.0/0 gateway=${gw} distance=${dist} check-gateway=ping comment="Main ${isp.name}"\n`;
    }
  });

  return { error: false, script };
};

// BUTTON
document.getElementById("genRoutingBtn").onclick = () => {
  // Pastikan Tab 1 sudah “fresh”: panggil generateBasicSetup jika tersedia
  if (typeof window.generateBasicSetup === "function") {
    const basicRes = window.generateBasicSetup();
    if (basicRes?.error) {
      document.getElementById("output_routing").value = basicRes.msg;
      alert(basicRes.msg);
      return;
    }
  }

  const res = window.generateRoutingScript(window.ispList);
  document.getElementById("output_routing").value = res.error ? res.msg : res.script;
  if (res.error) alert(res.msg);
};
