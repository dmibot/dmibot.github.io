// === Mikrotik LB Basic Setup Module (WAN Mode: DHCP/STATIC/PPPoE) ===

document.getElementById("section1").innerHTML = `
<h2>🧱 Basic Network Setup</h2>

<div class="card" style="background:#e8f5e9; border:1px solid #c8e6c9;">
  <p style="margin:0; font-size:0.9rem;">
    ✅ <strong>Update:</strong> Sekarang WAN mendukung mode <b>DHCP</b>, <b>Static</b>, dan <b>PPPoE</b> (tanpa auto-IP dari gateway).
  </p>
</div>

<div id="ispContainer"></div>
<button id="addIspBtn" type="button" style="background:#2196F3;">+ Tambah Data ISP</button>
<hr>

<h3>🌐 Bridge LAN Configuration</h3>
<label for="ipLan">IP LAN (Format CIDR):</label>
<input id="ipLan" type="text" value="192.168.1.1/24" placeholder="192.168.1.1/24">

<div id="lanPorts"></div>
<button id="addLanPort" type="button">+ Tambah Port LAN</button>
<hr>

<h3>🛡️ DNS & DoH Settings</h3>
<label>Pilih Provider DoH:</label>
<select id="dohSelect">
  <option value="https://dns.google/dns-query" data-dns="8.8.8.8,8.8.4.4">Google</option>
  <option value="https://cloudflare-dns.com/dns-query" data-dns="1.1.1.1,1.0.0.1" selected>Cloudflare</option>
  <option value="https://dns.quad9.net/dns-query" data-dns="9.9.9.9,149.112.112.112">Quad9</option>
  <option value="https://dns.adguard.com/dns-query" data-dns="94.140.14.14,94.140.15.15">AdGuard (Ads Block)</option>
  <option value="disable" data-dns="8.8.8.8,1.1.1.1">Disable DoH</option>
</select>

<label>DNS Server:</label>
<input id="manualDns" value="1.1.1.1,1.0.0.1" placeholder="8.8.8.8,1.1.1.1">

<label style="margin-top:10px;">Verify DoH Certificate:</label>
<select id="verifyDoh">
  <option value="yes" selected>yes (recommended)</option>
  <option value="no">no (troubleshooting)</option>
</select>

<hr>
<button id="genBasicBtn" style="width:100%; margin-top:20px; background:#FF9800;">📄 Generate Basic Script Only</button>
<textarea id="output_basic" readonly placeholder="Klik tombol di atas untuk melihat preview..." style="height:220px; margin-top:10px;"></textarea>
`;

// --- UI LOGIC ---
const ispContainer = document.getElementById("ispContainer");
const lanPortsContainer = document.getElementById("lanPorts");
const dohSelect = document.getElementById("dohSelect");
const manualDns = document.getElementById("manualDns");

dohSelect.addEventListener("change", () => {
  const selectedOption = dohSelect.options[dohSelect.selectedIndex];
  manualDns.value = selectedOption.getAttribute("data-dns") || manualDns.value;
});

function setModeUI(block) {
  const mode = block.querySelector(".ispMode").value;
  const staticBox = block.querySelector(".staticBox");
  const pppoeBox = block.querySelector(".pppoeBox");
  const gwBox = block.querySelector(".gwBox");

  if (mode === "STATIC") {
    staticBox.style.display = "block";
    gwBox.style.display = "block";
    pppoeBox.style.display = "none";
  } else if (mode === "PPPOE") {
    staticBox.style.display = "none";
    gwBox.style.display = "none";
    pppoeBox.style.display = "block";
  } else { // DHCP
    staticBox.style.display = "none";
    pppoeBox.style.display = "none";
    // gateway optional, tapi tetap ditampilkan supaya Tab 2 bisa bikin route dengan jelas
    gwBox.style.display = "block";
  }
}

document.getElementById("addIspBtn").onclick = () => {
  const div = document.createElement("div");
  div.className = "isp-block";
  div.style.cssText = "border:1px solid #ddd; padding:15px; margin-bottom:10px; border-radius:8px; background:#f9f9f9;";

  div.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
      <div>
        <label style="font-size:0.8rem">Nama ISP:</label>
        <input class="ispName" value="ISP1">
      </div>

      <div>
        <label style="font-size:0.8rem">Interface Fisik WAN:</label>
        <input class="ispIface" placeholder="ether1">
      </div>

      <div>
        <label style="font-size:0.8rem">WAN Mode:</label>
        <select class="ispMode">
          <option value="DHCP" selected>DHCP</option>
          <option value="STATIC">Static</option>
          <option value="PPPOE">PPPoE</option>
        </select>
      </div>
    </div>

    <div class="gwBox" style="margin-top:10px;">
      <label style="font-size:0.8rem">Gateway (wajib untuk STATIC, opsional untuk DHCP):</label>
      <input class="ispGw" placeholder="Contoh: 192.168.1.1">
    </div>

    <div class="staticBox" style="margin-top:10px; display:none;">
      <label style="font-size:0.8rem">WAN IP/CIDR (STATIC):</label>
      <input class="ispWanIp" placeholder="Contoh: 192.168.1.2/24">
    </div>

    <div class="pppoeBox" style="margin-top:10px; display:none;">
      <label style="font-size:0.8rem">PPPoE Username:</label>
      <input class="pppoeUser" placeholder="user@isp">
      <label style="font-size:0.8rem; margin-top:8px;">PPPoE Password:</label>
      <input class="pppoePass" type="password" placeholder="••••••••">
    </div>

    <button type="button" class="removeBtn" style="background:#f44336; margin-top:10px; padding:6px 10px; font-size:0.85rem; width:100%;">Hapus ISP</button>
  `;

  ispContainer.appendChild(div);

  div.querySelector(".removeBtn").onclick = () => div.remove();
  div.querySelector(".ispMode").addEventListener("change", () => setModeUI(div));
  setModeUI(div);
};

document.getElementById("addLanPort").onclick = () => {
  const div = document.createElement("div");
  div.style.marginBottom = "6px";
  div.innerHTML = `
    <input class="lanPort" placeholder="etherX" style="width:80%">
    <button type="button" class="removePort" style="width:18%; background:#f44336; margin-left:5px;">X</button>
  `;
  div.querySelector(".removePort").onclick = () => div.remove();
  lanPortsContainer.appendChild(div);
};

// --- CORE LOGIC ---
// IMPORTANT: Nama fungsi tetap generateBasicSetup() agar HTML Tab 3 tidak perlu berubah.
window.generateBasicSetup = () => {
  window.ispList = [];

  const blocks = document.querySelectorAll(".isp-block");
  blocks.forEach(block => {
    const name = (block.querySelector(".ispName").value || "").trim().replace(/\s+/g, "_");
    const ifacePhysical = (block.querySelector(".ispIface").value || "").trim();
    const mode = (block.querySelector(".ispMode").value || "DHCP").trim();

    const gw = (block.querySelector(".ispGw")?.value || "").trim();
    const wanIpCidr = (block.querySelector(".ispWanIp")?.value || "").trim();
    const pppoeUser = (block.querySelector(".pppoeUser")?.value || "").trim();
    const pppoePass = (block.querySelector(".pppoePass")?.value || "").trim();

    // WAN interface untuk NAT/mangle (PPPoE beda)
    let wanIface = ifacePhysical;
    if (mode === "PPPOE" && name) wanIface = `pppoe_${name}`;

    window.ispList.push({
      name,
      mode,
      ifacePhysical,
      wanIface,
      gw,
      wanIpCidr,
      pppoeUser,
      pppoePass
    });
  });

  // Validasi minimal
  if (window.ispList.length === 0) return { error: true, msg: "⚠️ Minimal 1 ISP harus ditambahkan." };

  // Validasi per-mode
  for (const isp of window.ispList) {
    if (!isp.name || !isp.ifacePhysical) return { error: true, msg: "⚠️ Nama ISP dan Interface wajib diisi." };

    if (isp.mode === "STATIC") {
      if (!isp.wanIpCidr || !isp.gw) return { error: true, msg: `⚠️ ISP ${isp.name}: mode STATIC wajib isi WAN IP/CIDR dan Gateway.` };
    }
    if (isp.mode === "PPPOE") {
      if (!isp.pppoeUser || !isp.pppoePass) return { error: true, msg: `⚠️ ISP ${isp.name}: mode PPPoE wajib isi Username & Password.` };
    }
  }

  const ipLan = document.getElementById("ipLan").value.trim();
  const dnsServers = manualDns.value.trim();
  const dohUrl = dohSelect.value;
  const verifyDoh = document.getElementById("verifyDoh").value;

  if (!ipLan.includes("/")) return { error: true, msg: "⚠️ IP LAN harus format CIDR. Contoh: 192.168.1.1/24" };

  const ipOnly = ipLan.split("/")[0];
  const network = ipOnly.split(".").slice(0, 3).join(".") + ".0";

  const ports = [];
  document.querySelectorAll(".lanPort").forEach(i => { if (i.value && i.value.trim()) ports.push(i.value.trim()); });

  let script = `# === 1. BASIC NETWORK SETUP ===\n`;

  // Interface list (NOTE: ini masih bisa error kalau sudah ada; nanti bisa kamu upgrade ke idempotent)
  script += `\n# Interface List (LAN/WAN)\n`;
  script += `/interface list add name=LAN\n`;
  script += `/interface list add name=WAN\n`;

  // Bridge LAN
  script += `\n# Bridge LAN\n`;
  script += `/interface bridge add name="bridge-LAN" protocol-mode=rstp comment="LAN Bridge"\n`;
  script += `/interface list member add interface="bridge-LAN" list=LAN\n`;

  if (ports.length > 0) {
    script += `/interface bridge port\n` + ports.map(p => `add bridge="bridge-LAN" interface="${p}"`).join("\n") + "\n";
  }

  // LAN addressing & DHCP
  script += `\n# IP LAN & DHCP\n`;
  script += `/ip address add address="${ipLan}" interface="bridge-LAN" network="${network}"\n`;
  script += `/ip pool add name="LAN-Pool" ranges="${network.replace(".0", ".2")}-${network.replace(".0", ".254")}"\n`;
  script += `/ip dhcp-server add name="LAN-DHCP" interface="bridge-LAN" address-pool="LAN-Pool" lease-time=4h disabled=no\n`;
  script += `/ip dhcp-server network add address="${network}/24" gateway="${ipOnly}" dns-server="${dnsServers}"\n`;

  // DNS & DoH
  script += `\n# DNS & DoH\n`;
  script += `/ip dns set allow-remote-requests=yes servers="${dnsServers}"\n`;
  if (dohUrl !== "disable") {
    script += `/ip dns set use-doh-server="${dohUrl}" verify-doh-cert=${verifyDoh}\n`;
  }

  // WAN Setup per ISP
  script += `\n# WAN CONFIGURATION\n`;

  window.ispList.forEach(isp => {
    script += `\n# --- ${isp.name} (${isp.mode}) ---\n`;

    // Tambahkan interface list member WAN: pakai wanIface (PPPoE) atau ifacePhysical (DHCP/Static)
    script += `/interface list member add interface="${isp.wanIface}" list=WAN\n`;

    if (isp.mode === "DHCP") {
      script += `/ip dhcp-client add interface="${isp.ifacePhysical}" disabled=no add-default-route=no use-peer-dns=no comment="${isp.name} DHCP"\n`;
      // gateway tidak dibuat dari sini; gateway dipakai Tab 2 bila kamu isi manual
    } else if (isp.mode === "STATIC") {
      script += `/ip address add address="${isp.wanIpCidr}" interface="${isp.ifacePhysical}" comment="${isp.name} Static WAN"\n`;
    } else if (isp.mode === "PPPOE") {
      script += `/interface pppoe-client add name="${isp.wanIface}" interface="${isp.ifacePhysical}" user="${isp.pppoeUser}" password="${isp.pppoePass}" disabled=no add-default-route=no use-peer-dns=no comment="${isp.name} PPPoE"\n`;
    }
  });

  // Basic security: drop DNS from WAN (butuhkan interface list LAN sudah ada)
  script += `\n# Basic Security (DNS)\n`;
  script += `/ip firewall filter add chain=input protocol=udp dst-port=53 in-interface-list=!LAN action=drop comment="Drop DNS Request from WAN"\n`;

  return { error: false, script };
};

// UI button
document.getElementById("genBasicBtn").onclick = () => {
  const result = window.generateBasicSetup();
  document.getElementById("output_basic").value = result.error ? result.msg : result.script;
  if (result.error) alert(result.msg);
};
