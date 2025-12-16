// === File: modules/lb_routing_pcc.js ===

// 1. Render UI Tab 2
document.getElementById("section2").innerHTML = `
<h3>🧭 Routing & PCC Configuration</h3>

<div style="background:#e3f2fd; padding:15px; border-radius:5px; margin-bottom:15px; border:1px solid #bbdefb;">
  <p style="margin:0; font-size:0.9rem;">
    ℹ️ Modul ini mengambil data ISP dari Tab 1. Pastikan Tab 1 sudah diisi lalu klik Generate Basic Script minimal sekali.
  </p>
</div>

<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
  <div>
    <label>RouterOS Version:</label>
    <select id="rosVer">
      <option value="7">RouterOS v7 (Terbaru)</option>
      <option value="6">RouterOS v6 (Lama)</option>
    </select>
  </div>
  <div>
    <label>Failover Method:</label>
    <select id="failMode">
      <option value="RECURSIVE">Recursive (Ping 8.8.8.8 / 1.1.1.1)</option>
      <option value="GATEWAY">Check Gateway (Ping Gateway ISP)</option>
    </select>
  </div>
</div>

<hr>
<button onclick="window.previewRouting()" class="btn btn-blue" style="width:100%;">🔄 Generate Routing Script</button>
<textarea id="output_routing" readonly placeholder="Hasil script Routing & PCC..." style="height:280px; margin-top:10px;"></textarea>
<button onclick="window.copyRouting()" class="btn btn-copy" style="width:100%;">📋 Copy Routing Script</button>
`;

// 2. Generator Routing (UPDATED: use wanIface and handle PPPoE)
window.generateRoutingScript = function(ispList) {
  if (!ispList || ispList.length === 0) return { error: true, msg: "⚠️ Data ISP kosong. Isi Tab 1 lalu Generate Basic Script dulu." };

  const ros = document.getElementById("rosVer").value;
  const failMode = document.getElementById("failMode").value;

  // Validate gateways: required for STATIC, optional for DHCP, not needed for PPPoE
  const missingGw = ispList.filter(i => i.mode === "STATIC" && !i.gw);
  if (missingGw.length > 0) return { error: true, msg: "⚠️ Mode STATIC wajib isi Gateway di Tab 1." };

  let script = `# === 2. ROUTING, PCC & NAT ===\n`;

  // Address List
  script += `/ip firewall address-list\n`;
  script += `add list=LOCAL_NET address=192.168.0.0/16\n`;
  script += `add list=LOCAL_NET address=10.0.0.0/8\n`;
  script += `add list=LOCAL_NET address=172.16.0.0/12\n\n`;

  // Mangle
  script += `/ip firewall mangle\n`;
  script += `add chain=prerouting src-address-list=LOCAL_NET dst-address-list=LOCAL_NET action=accept comment="BYPASS: LAN to LAN sebelum PCC"\n\n`;

  // INPUT MARK (use wanIface)
  ispList.forEach(isp => {
    script += `add chain=input in-interface="${isp.wanIface}" action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="Input Mark ${isp.name}"\n`;
  });

  // PCC PREROUTING
  ispList.forEach((isp, idx) => {
    script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${ispList.length}/${idx} action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="PCC ${isp.name}"\n`;
  });

  // MARK ROUTING
  ispList.forEach(isp => {
    script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
  });

  // OUTPUT MARK
  ispList.forEach(isp => {
    script += `add chain=output connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no comment="Output ${isp.name}"\n`;
  });

  // NAT
  script += `\n# NAT MASQUERADE\n/ip firewall nat\n`;
  ispList.forEach(isp => {
    script += `add chain=srcnat out-interface="${isp.wanIface}" action=masquerade comment="NAT ${isp.name}"\n`;
  });

  // Routing tables (ROS7)
  if (ros === "7") {
    script += `\n# Routing Tables\n`;
    ispList.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
  }

  // PCC routes: gateway depends on mode
  script += `\n# PCC Routes\n/ip route\n`;
  ispList.forEach(isp => {
    const param = (ros === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;

    // PPPoE: route via interface name, not gateway IP
    const gw = (isp.mode === "PPPOE") ? isp.wanIface : isp.gw;

    if (!gw) {
      // For DHCP without gateway input, cannot generate route deterministically
      script += `# WARNING: Gateway untuk ${isp.name} kosong. Isi Gateway di Tab 1 agar route bisa dibuat.\n`;
    } else {
      script += `add dst-address=0.0.0.0/0 gateway="${gw}" ${param} distance=1 comment="PCC ${isp.name}" check-gateway=ping\n`;
    }
  });

  // Failover (main table)
  script += `\n# Failover Config (Main Table)\n`;
  ispList.forEach((isp, idx) => {
    const dist = idx + 1;

    // PPPoE main route can also be via interface
    const gw = (isp.mode === "PPPOE") ? isp.wanIface : isp.gw;

    if (!gw) {
      script += `# WARNING: Skip failover route for ${isp.name} (gateway/interface missing)\n`;
      return;
    }

    if (failMode === "RECURSIVE" && isp.mode !== "PPPOE") {
      const checkIp = (idx % 2 === 0) ? "8.8.8.8" : "1.1.1.1";
      script += `add dst-address=${checkIp} gateway=${gw} scope=10 comment="Recursive Check ${isp.name}"\n`;
      script += `add dst-address=0.0.0.0/0 gateway=${checkIp} distance=${dist} target-scope=11 check-gateway=ping comment="Main ${isp.name}"\n`;
    } else {
      // For PPPoE or GATEWAY mode, use direct gw/interface
      script += `add dst-address=0.0.0.0/0 gateway=${gw} distance=${dist} check-gateway=ping comment="Main ${isp.name}"\n`;
    }
  });

  return { error: false, script };
};

// 3) Button actions
window.previewRouting = function() {
  if (typeof window.generateBasicScript === "function") {
    const resBasic = window.generateBasicScript();
    if (resBasic.error) {
      document.getElementById("output_routing").value = resBasic.msg;
      return;
    }
  }

  const res = window.generateRoutingScript(window.ispList);
  document.getElementById("output_routing").value = res.error ? res.msg : res.script;
};

window.copyRouting = function() {
  const ta = document.getElementById("output_routing");
  ta.select();
  navigator.clipboard.writeText(ta.value);
  alert("Routing Script Copied!");
};
