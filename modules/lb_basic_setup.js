// === Mikrotik LB Basic Setup Module ===
// Create the Basic Setup UI dynamically inside section1
document.getElementById("section1").innerHTML = `
<h2>🧱 Basic Network Setup</h2>

<div id="ispContainer"></div>
<button id="addIspBtn">+ Tambah Interface ISP</button>

<hr>
<h3>🌐 Bridge LAN Configuration</h3>
<label>IP LAN:</label>
<input id="ipLan" value="10.10.10.1/24" placeholder="contoh: 10.10.10.1/24">
<br>
<div id="lanPorts"></div>
<button id="addLanPort">+ Tambah Port LAN</button>

<hr>
<h3>🧩 DNS & DoH Settings</h3>
<label>Pilih DoH Provider:</label>
<select id="dohSelect">
  <option value="https://dns.google/dns-query">Google (8.8.8.8,8.8.4.4)</option>
  <option value="https://dns.cloudflare.com/dns-query" selected>Cloudflare (1.1.1.1,1.0.0.1)</option>
  <option value="https://dns.quad9.net/dns-query">Quad9 (9.9.9.9,149.112.112.112)</option>
  <option value="https://dns.adguard.com/dns-query">AdGuard (94.140.14.14,94.140.15.15)</option>
</select>
<br>
<label>Tambahan Manual DNS (opsional, pisahkan dengan koma):</label>
<input id="manualDns" placeholder="contoh: 1.1.1.1,8.8.8.8">

<hr>
<div style="text-align:center">
  <button id="genBasicBtn">Generate Config</button>
  <button id="copyBasicBtn">Copy Config</button>
</div>
<textarea id="output_basic" readonly></textarea>
`;

// === Default ISP data ===
let ispCount = 0;
const ispContainer = document.getElementById("ispContainer");

function addISP(iface, gw, name) {
  ispCount++;
  const div = document.createElement("div");
  div.className = "isp-block";
  div.innerHTML = `
    <h3>ISP-${ispCount}</h3>
    <label>Nama Interface:</label>
    <input class="iface" value="${iface || ""}" placeholder="contoh: ether1-Telkom">
    <label>IP Gateway:</label>
    <input class="gateway" value="${gw || ""}" placeholder="contoh: 172.16.0.1">
    <label>Nama ISP:</label>
    <input class="ispname" value="${name || ""}" placeholder="contoh: Telkom">
    <hr>`;
  ispContainer.appendChild(div);
}

// default Telkom & Fastlink
addISP("ether4-Telkom", "172.16.0.1", "Telkom");
addISP("ether5-Fastlink", "172.8.45.1", "Fastlink");

document.getElementById("addIspBtn").onclick = () => addISP("", "", "");

// === LAN Port handling ===
let lanCount = 0;
const lanPorts = document.getElementById("lanPorts");
function addLANport(name) {
  lanCount++;
  const div = document.createElement("div");
  div.innerHTML = `
    <label>Port LAN-${lanCount}:</label>
    <input class="lanPort" value="${name || ""}" placeholder="contoh: ether2">`;
  lanPorts.appendChild(div);
}
addLANport("ether3"); // default
document.getElementById("addLanPort").onclick = () => addLANport("");

// === Generate Basic Config ===
document.getElementById("genBasicBtn").onclick = () => {
  const ipLan = document.getElementById("ipLan").value.trim() || "10.10.10.1/24";
  const doh = document.getElementById("dohSelect").value;
  const manualDns = document.getElementById("manualDns").value.trim();

  // Collect ISP data
  const ifaceEls = document.querySelectorAll(".iface");
  const gwEls = document.querySelectorAll(".gateway");
  const ispNameEls = document.querySelectorAll(".ispname");
  let ispList = [];
  for (let i = 0; i < ifaceEls.length; i++) {
    ispList.push({
      iface: ifaceEls[i].value || `ether${i+1}`,
      gw: gwEls[i].value || `192.168.${i+1}.1`,
      name: ispNameEls[i].value || `ISP${i+1}`
    });
  }

  // Collect LAN ports
  const ports = Array.from(document.querySelectorAll(".lanPort")).map(p => p.value).filter(Boolean);

  // Build DNS list
  let dnsServers = "";
  if (doh.includes("google")) dnsServers = "8.8.8.8,8.8.4.4";
  else if (doh.includes("cloudflare")) dnsServers = "1.1.1.1,1.0.0.1";
  else if (doh.includes("quad9")) dnsServers = "9.9.9.9,149.112.112.112";
  else if (doh.includes("adguard")) dnsServers = "94.140.14.14,94.140.15.15";
  if (manualDns) dnsServers += (dnsServers ? "," : "") + manualDns;

  // Bridge & DHCP
  const network = ipLan.split("/")[0].split(".").slice(0,3).join(".") + ".0";

  let output = `# === Basic Network Setup ===
/interface bridge add name=bridge-LAN protocol-mode=rstp arp=enabled
/interface bridge port
${ports.map(p=>`add bridge=bridge-LAN interface=${p}`).join("\n")}

/ip address add address=${ipLan} interface=bridge-LAN network=${network}
/ip pool add name=LAN-Pool ranges=${network.replace(".0",".2")}-${network.replace(".0",".254")}
/ip dhcp-server add name=LAN-DHCP interface=bridge-LAN address-pool=LAN-Pool lease-time=4h disabled=no
/ip dhcp-server network add address=${network}/24 gateway=${ipLan.split("/")[0]} dns-server=${dnsServers}

/ip dns set allow-remote-requests=yes servers=${dnsServers} use-doh-server=${doh} verify-doh-cert=no
`;

  // DHCP Client per ISP
  ispList.forEach(isp => {
    output += `\n/ip dhcp-client add interface=${isp.iface} use-peer-dns=no disabled=no comment="${isp.name}"`;
  });

  document.getElementById("output_basic").value = output.trim();
  window.basicOutput = output.trim(); // share to main page for combine
};

// === Copy Config ===
document.getElementById("copyBasicBtn").onclick = () => {
  const t = document.getElementById("output_basic");
  t.select();t.setSelectionRange(0,99999);
  navigator.clipboard.writeText(t.value);
  alert("Basic Config Copied!");
};
