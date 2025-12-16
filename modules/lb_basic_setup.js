// === File: modules/lb_basic_setup.js ===

// Mapping DNS berdasarkan URL DoH
const DOH_MAP = {
  "https://dns.google/dns-query": { ip: "8.8.8.8, 8.8.4.4", name: "Google" },
  "https://cloudflare-dns.com/dns-query": { ip: "1.1.1.1, 1.0.0.1", name: "Cloudflare" },
  "https://dns.quad9.net/dns-query": { ip: "9.9.9.9, 149.112.112.112", name: "Quad9" },
  "https://dns.adguard.com/dns-query": { ip: "94.140.14.14, 94.140.15.15", name: "AdGuard" }
};

const DEFAULT_FALLBACK_DNS = "8.8.8.8, 1.1.1.1";

// 1) Render UI Tab 1
document.getElementById("section1").innerHTML = `
<h3>🧱 Basic Network Configuration</h3>

<div style="background:#e3f2fd; padding:15px; border-radius:5px; margin-bottom:15px;">
  <p style="margin:0; font-size:0.9rem;">
    ✅ **Defaults Loaded:** TELKOM (ether4) & FASTLINK (ether5) dimuat otomatis.
  </p>
</div>

<div id="ispContainer"></div>
<button id="addIspBtn" class="btn" style="background:#1976D2; width:auto;">+ Tambah ISP</button>

<hr>

<h3>🏠 LAN & DNS</h3>
<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
  <div>
    <label>IP Address LAN:</label>
    <input id="ipLan" type="text" value="10.10.10.1/24">
  </div>
  <div>
    <label>Bridge Ports (csv):</label>
    <input id="lanPorts" type="text" value="ether1, ether2, ether3">
  </div>
</div>

<label>DoH Provider (Pilih ini untuk sinkronisasi IP DNS):</label>
<select id="dohProvider" onchange="window.syncDnsServers()">
  <option value="https://dns.google/dns-query">Google</option>
  <option value="https://cloudflare-dns.com/dns-query">Cloudflare</option>
  <option value="https://dns.quad9.net/dns-query">Quad9</option>
  <option value="https://dns.adguard.com/dns-query">AdGuard</option>
  <option value="disable">Non-aktifkan DoH</option>
</select>

<div style="margin-top:10px; margin-bottom:10px;">
  <input type="checkbox" id="manualDnsToggle" onchange="window.syncDnsServers()" style="width:auto; margin-right:5px;">
  <label for="manualDnsToggle" style="display:inline; font-weight:normal;">
    Gunakan IP DNS Manual (Override DoH Default)
  </label>
</div>

<label>DNS Fallback (IP Server):</label>
<input id="dnsServer" value="${DOH_MAP['https://dns.google/dns-query'].ip}" disabled>

<div style="margin-top:10px;">
  <label>Verify DoH Cert:</label>
  <select id="verifyDoh">
    <option value="yes" selected>yes (recommended)</option>
    <option value="no">no (troubleshooting)</option>
  </select>
</div>

<hr>
<button onclick="window.previewBasic()" class="btn btn-green">🔄 Generate Basic Script</button>
<textarea id="output_basic" readonly placeholder="Hasil script Basic Setup..." style="height:200px; margin-top:10px;"></textarea>
<button onclick="window.copyBasic()" class="btn btn-copy">📋 Copy Basic Script</button>
`;

// 2) Helper container
const ispCont = document.getElementById("ispContainer");

// Helper: toggle field visibility per ISP row
window.updateIspModeUI = function(rowEl) {
  const mode = rowEl.querySelector(".ispMode").value;
  const staticBox = rowEl.querySelector(".staticBox");
  const pppoeBox = rowEl.querySelector(".pppoeBox");
  const gwBox = rowEl.querySelector(".gwBox");

  // GW dipakai untuk Tab 2 route gateway (Static) atau (opsional) untuk DHCP
  // PPPoE biasanya gateway tidak perlu diisi (gateway didapat otomatis dari PPPoE).
  if (mode === "STATIC") {
    staticBox.style.display = "block";
    pppoeBox.style.display = "none";
    gwBox.style.display = "block";
  } else if (mode === "PPPOE") {
    staticBox.style.display = "none";
    pppoeBox.style.display = "block";
    gwBox.style.display = "none";
  } else { // DHCP
    staticBox.style.display = "none";
    pppoeBox.style.display = "none";
    gwBox.style.display = "block";
  }
};

// 3) Add ISP row (UPDATED: support DHCP/STATIC/PPPOE)
window.addIsp = function(name = "", iface = "", gw = "", mode = "DHCP") {
  if (typeof name !== 'string') { name = ""; iface = ""; gw = ""; mode = "DHCP"; }

  const count = ispCont.children.length + 1;
  if (!name) name = "ISP" + count;
  if (!iface) iface = "ether" + count;

  const div = document.createElement("div");
  div.className = "isp-row";
  div.style.cssText = "display:grid; grid-template-columns: 2fr 2fr 2fr 3fr auto; gap:10px; padding:10px; border:1px solid #ddd; margin-bottom:8px;";

  div.innerHTML = `
    <div>
      <label style="font-size:0.8rem">Nama ISP</label>
      <input class="ispName" value="${name}">
    </div>

    <div>
      <label style="font-size:0.8rem">Interface Fisik (WAN)</label>
      <input class="ispIface" value="${iface}">
    </div>

    <div>
      <label style="font-size:0.8rem">WAN Mode</label>
      <select class="ispMode">
        <option value="DHCP" ${mode === "DHCP" ? "selected" : ""}>DHCP</option>
        <option value="STATIC" ${mode === "STATIC" ? "selected" : ""}>Static</option>
        <option value="PPPOE" ${mode === "PPPOE" ? "selected" : ""}>PPPoE</option>
      </select>
    </div>

    <div>
      <div class="gwBox">
        <label style="font-size:0.8rem">Gateway (Static/DHCP optional)</label>
        <input class="ispGw" value="${gw}" placeholder="Contoh static: 192.168.1.1">
      </div>

      <div class="staticBox" style="display:none; margin-top:8px;">
        <label style="font-size:0.8rem">WAN IP/CIDR (Static)</label>
        <input class="ispWanIp" placeholder="Contoh: 192.168.1.2/24">
      </div>

      <div class="pppoeBox" style="display:none; margin-top:8px;">
        <label style="font-size:0.8rem">PPPoE Username</label>
        <input class="pppoeUser" placeholder="user@isp">
        <label style="font-size:0.8rem; margin-top:6px;">PPPoE Password</label>
        <input class="pppoePass" type="password" placeholder="••••••••">
      </div>
    </div>

    <button onclick="this.parentElement.remove()" class="btn-red" style="margin-top:22px;">X</button>
  `;

  ispCont.appendChild(div);

  // attach mode change handler
  div.querySelector(".ispMode").addEventListener("change", () => window.updateIspModeUI(div));
  window.updateIspModeUI(div);
};

// 4) FIX: Sinkronisasi DNS + manual DNS
window.syncDnsServers = function() {
  const dohSelect = document.getElementById("dohProvider");
  const dnsInput = document.getElementById("dnsServer");
  const manualToggle = document.getElementById("manualDnsToggle");
  const selectedDoh = dohSelect.value;

  if (manualToggle.checked) {
    dnsInput.disabled = false;
    if (dnsInput.value === "") dnsInput.value = DEFAULT_FALLBACK_DNS;
  } else {
    dnsInput.disabled = true;
    if (selectedDoh === "disable") dnsInput.value = DEFAULT_FALLBACK_DNS;
    else if (DOH_MAP[selectedDoh]) dnsInput.value = DOH_MAP[selectedDoh].ip;
  }
};

// 5) Generator Basic (UPDATED: no more auto IP from gateway)
window.generateBasicScript = function() {
  window.ispList = [];
  let script = `# === 1. BASIC SETUP ===\n`;

  const rows = document.querySelectorAll(".isp-row");
  let hasError = false;

  rows.forEach(row => {
    const name = row.querySelector(".ispName").value.trim().replace(/\s/g, "_");
    const ifacePhysical = row.querySelector(".ispIface").value.trim();
    const mode = row.querySelector(".ispMode").value;

    const gw = (row.querySelector(".ispGw")?.value || "").trim();
    const wanIpCidr = (row.querySelector(".ispWanIp")?.value || "").trim();
    const pppoeUser = (row.querySelector(".pppoeUser")?.value || "").trim();
    const pppoePass = (row.querySelector(".pppoePass")?.value || "").trim();

    if (!name || !ifacePhysical) hasError = true;

    // Determine WAN interface to be used by NAT/Mangle/Routes
    let wanIface = ifacePhysical;

    // Generate WAN config per mode
    if (mode === "DHCP") {
      // optional gateway can still be provided for Tab 2 routes, but not mandatory here
      script += `/ip dhcp-client add interface="${ifacePhysical}" disabled=no add-default-route=no use-peer-dns=no comment="${name} DHCP Client"\n`;
    } else if (mode === "STATIC") {
      if (!wanIpCidr || !gw) hasError = true;
      script += `/ip address add address="${wanIpCidr}" interface="${ifacePhysical}" comment="${name} Static WAN"\n`;
      // no dhcp-client for static (avoid conflicts)
    } else if (mode === "PPPOE") {
      if (!pppoeUser || !pppoePass) hasError = true;
      wanIface = `pppoe_${name}`;
      script += `/interface pppoe-client add name="${wanIface}" interface="${ifacePhysical}" user="${pppoeUser}" password="${pppoePass}" disabled=no add-default-route=no use-peer-dns=no comment="${name} PPPoE"\n`;
    }

    // Store for Tab 2
    window.ispList.push({
      name,
      mode,
      ifacePhysical,
      wanIface,
      gw, // used as gateway in Tab 2 (required for STATIC and recommended for DHCP, ignored for PPPoE)
    });
  });

  if (hasError) {
    return { error: true, msg: "⚠️ Lengkapi data ISP. STATIC wajib isi WAN IP/CIDR + Gateway. PPPoE wajib isi Username + Password." };
  }

  // 2) LAN & DNS
  const ipLan = document.getElementById("ipLan").value;
  const ports = document.getElementById("lanPorts").value;
  const dnsRaw = document.getElementById("dnsServer").value;
  const doh = document.getElementById("dohProvider").value;
  const verifyDoh = document.getElementById("verifyDoh").value;

  const ipParts = ipLan.split("/")[0].split(".");
  const network = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;

  const dnsServers = dnsRaw.split(',').map(s => s.trim()).filter(Boolean).join(', ');

  // Interface list - NOTE: still "add". Recommended to make idempotent in RouterOS script later.
  script += `\n# INTERFACE LIST DEFINITION\n`;
  script += `/interface list add name=LAN\n`;
  script += `/interface list add name=WAN\n`;

  script += `\n# LAN & Bridge Setup\n`;
  script += `/interface bridge add name="bridge-LAN" protocol-mode=rstp arp=enabled comment="LAN Bridge"\n`;
  script += `/interface list member add interface=bridge-LAN list=LAN\n`;

  if (ports) {
    ports.split(",").forEach(p => {
      const port = p.trim();
      if (port) script += `/interface bridge port add bridge="bridge-LAN" interface="${port}"\n`;
    });
  }

  window.ispList.forEach(isp => {
    script += `/interface list member add interface="${isp.wanIface}" list=WAN\n`;
  });

  script += `/ip address add address="${ipLan}" interface="bridge-LAN" network="${network}"\n`;
  script += `/ip pool add name="LAN-Pool" ranges="${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.2-${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.254"\n`;
  script += `/ip dhcp-server add name="LAN-DHCP" interface="bridge-LAN" address-pool="LAN-Pool" disabled=no\n`;
  script += `/ip dhcp-server network add address="${network}/24" gateway="${ipParts.join('.')}" dns-server="${dnsServers}"\n`;

  // DNS & DoH
  script += `\n# DNS Configuration\n`;
  script += `/ip dns set allow-remote-requests=yes servers="${dnsServers}"`;
  if (doh !== "disable") script += ` use-doh-server="${doh}" verify-doh-cert=${verifyDoh}`;
  script += `\n`;
  script += `/ip firewall filter add chain=input protocol=udp dst-port=53 in-interface-list=!LAN action=drop comment="Security: Drop External DNS"\n`;

  return { error: false, script };
};

// 6) Buttons
window.previewBasic = function() {
  const res = window.generateBasicScript();
  document.getElementById("output_basic").value = res.error ? res.msg : res.script;
};

window.copyBasic = function() {
  const ta = document.getElementById("output_basic");
  ta.select();
  navigator.clipboard.writeText(ta.value);
  alert("Basic Script Copied!");
};

// 7) Init
const initBasic = () => {
  const addButton = document.getElementById('addIspBtn');
  if (addButton) addButton.addEventListener('click', () => window.addIsp());

  const ispContCheck = document.getElementById("ispContainer");
  if (ispContCheck && ispContCheck.children.length === 0) {
    // Default examples now DHCP (no fake IP)
    window.addIsp("Telkom", "ether4", "172.16.0.1", "DHCP");
    window.addIsp("Fastlink", "ether5", "172.8.45.1", "DHCP");
  }

  window.syncDnsServers();
};

document.addEventListener('DOMContentLoaded', initBasic);
