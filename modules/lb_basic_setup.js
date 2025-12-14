// === Mikrotik LB Basic Setup Module ===

document.getElementById("section1").innerHTML = `
<h2>🧱 Basic Network Setup</h2>

<div style="background:#e8f5e9; border:1px solid #c8e6c9; padding:15px; border-radius:8px; margin-bottom:20px;">
    <label>Mode Koneksi WAN:</label>
    <select id="wanModeInput" onchange="toggleGwInput()">
        <option value="DHCP" selected>DHCP Client (Dynamic IP) - Recommended</option>
        <option value="STATIC">Static IP (Manual)</option>
    </select>
    <p style="margin:5px 0 0 0; font-size:0.85rem; color:#2e7d32;">
        ℹ️ <strong>DHCP:</strong> Gateway otomatis dari ISP. Script otomatis update routing.<br>
        ℹ️ <strong>Static:</strong> Anda wajib mengisi Gateway manual.
    </p>
</div>

<div id="ispContainer"></div>
<button type="button" onclick="createISPBlock()" style="background:#2196F3; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">+ Tambah ISP</button>
<hr>

<h3>🌐 LAN Configuration</h3>
<label>IP Address LAN (CIDR):</label>
<input id="ipLan" type="text" value="10.10.10.1/24" placeholder="Contoh: 192.168.1.1/24">

<label>DNS Servers:</label>
<input id="manualDns" value="8.8.8.8, 1.1.1.1" placeholder="8.8.8.8, 1.1.1.1">

<div id="lanPorts"></div>
<button type="button" onclick="createLanPort()" style="background:#4CAF50; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; margin-top:5px;">+ Tambah Port LAN</button>
`;

const ispContainer = document.getElementById("ispContainer");
const lanPortsContainer = document.getElementById("lanPorts");

window.toggleGwInput = () => {
    const mode = document.getElementById("wanModeInput").value;
    document.querySelectorAll(".gw-wrapper").forEach(el => {
        el.style.display = (mode === "STATIC") ? "block" : "none";
    });
};

window.createISPBlock = (nameVal="", ifaceVal="", gwVal="") => {
    if(!nameVal) nameVal = "ISP" + (document.querySelectorAll(".isp-block").length + 1);
    
    const div = document.createElement("div");
    div.className = "isp-block";
    div.style.cssText = "border:1px solid #ddd; padding:15px; margin-bottom:10px; border-radius:8px; background:#f9f9f9;";
    
    const currentMode = document.getElementById("wanModeInput") ? document.getElementById("wanModeInput").value : "DHCP";
    const gwDisplay = (currentMode === "STATIC") ? "block" : "none";

    div.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
                <label style="font-size:0.8rem">Nama ISP:</label>
                <input class="ispName" value="${nameVal}" placeholder="Telkom">
            </div>
            <div>
                <label style="font-size:0.8rem">Interface WAN:</label>
                <input class="ispIface" value="${ifaceVal}" placeholder="ether1">
            </div>
        </div>
        <div class="gw-wrapper" style="display:${gwDisplay}; margin-top:5px;">
            <label style="font-size:0.8rem">Gateway IP (Wajib untuk Static):</label>
            <input class="ispGw" value="${gwVal}" placeholder="192.168.1.1">
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="background:#ff4d4d; color:white; border:none; margin-top:10px; padding:5px 10px; font-size:0.8rem; border-radius:4px; cursor:pointer;">Hapus</button>
    `;
    ispContainer.appendChild(div);
};

window.createLanPort = (val="") => {
    const div = document.createElement("div");
    div.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center;">
            <input class="lanPort" value="${val}" placeholder="etherX" style="margin-bottom:5px;">
            <button onclick="this.parentElement.remove()" style="background:#ff4d4d; color:white; border:none; height:38px; border-radius:4px; cursor:pointer;">X</button>
        </div>`;
    lanPortsContainer.appendChild(div);
};

// Init Default
createISPBlock("Telkom", "ether4-Telkom", "192.168.100.1");
createISPBlock("Fastlink", "ether5-Fastlink", "192.168.200.1");
createLanPort("ether1");
createLanPort("ether2");
createLanPort("ether3");

window.generateBasicSetup = () => {
  window.ispList = [];
  const wanMode = document.getElementById("wanModeInput").value;
  let hasError = false;

  document.querySelectorAll(".isp-block").forEach(block => {
      const name = block.querySelector(".ispName").value.trim().replace(/\s/g, "_");
      const iface = block.querySelector(".ispIface").value.trim();
      const gw = block.querySelector(".ispGw").value.trim();
      
      if(!name || !iface) hasError = true;
      if(wanMode === "STATIC" && !gw) hasError = true;

      window.ispList.push({ name, iface, gw, mode: wanMode });
  });

  if(hasError || window.ispList.length === 0) {
      return { error: true, msg: "⚠️ Data ISP tidak lengkap! Nama dan Interface wajib diisi." };
  }

  const ipLan = document.getElementById("ipLan").value;
  const dnsServers = document.getElementById("manualDns").value;
  const ipOnly = ipLan.split("/")[0]; 
  const parts = ipOnly.split(".");
  const network = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  
  let ports = [];
  document.querySelectorAll(".lanPort").forEach(i => { if(i.value) ports.push(i.value); });

  let script = `# === 1. BASIC NETWORK SETUP ===\n`;
  
  script += `/interface bridge add name="bridge-LAN" protocol-mode=rstp comment="LAN Bridge"\n`;
  if(ports.length > 0) {
      script += `/interface bridge port\n` + ports.map(p => `add bridge="bridge-LAN" interface="${p}"`).join("\n") + "\n";
  }
  
  script += `/ip address add address="${ipLan}" interface="bridge-LAN" network="${network}"\n`;
  script += `/ip pool add name="LAN-Pool" ranges="${parts[0]}.${parts[1]}.${parts[2]}.2-${parts[0]}.${parts[1]}.${parts[2]}.254"\n`;
  script += `/ip dhcp-server add name="LAN-DHCP" interface="bridge-LAN" address-pool="LAN-Pool" lease-time=4h disabled=no\n`;
  script += `/ip dhcp-server network add address="${network}/24" gateway="${ipOnly}" dns-server="${dnsServers}"\n`;
  
  script += `\n# DNS & Security\n`;
  script += `/ip dns set allow-remote-requests=yes servers="${dnsServers}"\n`;
  script += `/ip firewall filter add chain=input protocol=udp dst-port=53 in-interface-list=!LAN action=drop comment="Drop DNS Request from WAN"\n`;

  script += `\n# WAN CONFIGURATION\n`;
  window.ispList.forEach((isp, index) => {
      script += `/ip dhcp-client remove [find interface="${isp.iface}"]\n`;
      script += `/ip address remove [find interface="${isp.iface}"]\n`;

      if (wanMode === "DHCP") {
          const dist = index + 1;
          const routeComment = `PCC-${isp.name}-Route`;
          const dhcpScript = `{ :if ($bound=1) do={ :local gw $"gateway-address"; /ip route set [find comment=\\"${routeComment}\\"] gateway=$gw disabled=no; :log info \\"PCC Update: ${isp.name} Gateway changed to $gw\\"; } else={ /ip route set [find comment=\\"${routeComment}\\"] disabled=yes; } }`;
          
          script += `/ip dhcp-client add interface="${isp.iface}" disabled=no add-default-route=yes default-route-distance=${dist} use-peer-dns=no script="${dhcpScript}" comment="${isp.name} (DHCP)"\n`;
      } else {
          script += `/ip address add address="${isp.gw}" interface="${isp.iface}" comment="${isp.name} Static (Check IP)"\n`;
      }
  });

  return { error: false, script: script };
};