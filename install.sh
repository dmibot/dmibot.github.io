#!/bin/bash

echo "🚀 Mengupdate Logic: Auto-Detect IP Address dari Gateway..."

cat << 'EOF' > modules/lb_basic_setup.js
// === Mikrotik LB Basic Setup Module (Auto-IP Feature) ===

document.getElementById("section1").innerHTML = `
<h2>🧱 Basic Network Setup</h2>
<div class="card" style="background:#fff3e0; border:1px solid #ffe0b2;">
    <p style="margin:0; font-size:0.9rem;">📝 <strong>Smart Feature:</strong> Masukkan Gateway, sistem akan otomatis membuatkan IP Address untuk Interface WAN Anda.</p>
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
  <option value="https://dns.cloudflare.com/dns-query" data-dns="1.1.1.1,1.0.0.1" selected>Cloudflare</option>
  <option value="https://dns.quad9.net/dns-query" data-dns="9.9.9.9,149.112.112.112">Quad9</option>
  <option value="https://dns.adguard.com/dns-query" data-dns="94.140.14.14,94.140.15.15">AdGuard (Ads Block)</option>
</select>

<label>DNS Server (Otomatis terisi):</label>
<input id="manualDns" value="1.1.1.1,1.0.0.1" placeholder="8.8.8.8,1.1.1.1">

<hr>
<button id="genBasicBtn" style="width:100%; margin-top:20px; background:#FF9800;">📄 Generate Basic Script Only</button>
<textarea id="output_basic" readonly placeholder="Klik tombol di atas untuk melihat preview..." style="height:200px; margin-top:10px;"></textarea>
`;

// --- UI LOGIC ---
const ispContainer = document.getElementById("ispContainer");
const lanPortsContainer = document.getElementById("lanPorts");
const dohSelect = document.getElementById("dohSelect");
const manualDns = document.getElementById("manualDns");

dohSelect.addEventListener("change", () => {
    const selectedOption = dohSelect.options[dohSelect.selectedIndex];
    manualDns.value = selectedOption.getAttribute("data-dns");
});

document.getElementById("addIspBtn").onclick = () => {
    const div = document.createElement("div");
    div.className = "isp-block";
    div.style.cssText = "border:1px solid #ddd; padding:15px; margin-bottom:10px; border-radius:8px; background:#f9f9f9;";
    div.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
            <div><label style="font-size:0.8rem">Nama ISP:</label><input class="ispName" value="ISP1"></div>
            <div><label style="font-size:0.8rem">Interface:</label><input class="ispIface" placeholder="ether1"></div>
            <div><label style="font-size:0.8rem">Gateway:</label><input class="ispGw" placeholder="192.168.1.1"></div>
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="background:#f44336; margin-top:5px; padding:5px 10px; font-size:0.8rem;">Hapus</button>
    `;
    ispContainer.appendChild(div);
};

document.getElementById("addLanPort").onclick = () => {
    const div = document.createElement("div");
    div.innerHTML = `<input class="lanPort" placeholder="etherX" style="width:80%"><button onclick="this.parentElement.remove()" style="width:15%; background:#f44336; margin-left:5px;">X</button>`;
    lanPortsContainer.appendChild(div);
};

// --- CORE LOGIC (Smart IP Calculation) ---
window.generateBasicSetup = () => {
  window.ispList = [];
  document.querySelectorAll(".isp-block").forEach(block => {
      const name = block.querySelector(".ispName").value;
      const iface = block.querySelector(".ispIface").value;
      const gw = block.querySelector(".ispGw").value;
      if(name && iface && gw) window.ispList.push({ name, iface, gw });
  });

  const ipLan = document.getElementById("ipLan").value;
  const dnsServers = manualDns.value;
  const dohUrl = dohSelect.value;
  
  if(window.ispList.length === 0) return { error: true, msg: "⚠️ Minimal 1 ISP harus diisi lengkap." };
  
  const ipOnly = ipLan.split("/")[0]; 
  const network = ipOnly.split(".").slice(0,3).join(".") + ".0";
  let ports = [];
  document.querySelectorAll(".lanPort").forEach(i => { if(i.value) ports.push(i.value); });

  let script = `# === 1. BASIC NETWORK SETUP ===\n`;
  script += `/interface bridge add name="bridge-LAN" protocol-mode=rstp comment="LAN Bridge"\n`;
  if(ports.length > 0) {
      script += `/interface bridge port\n` + ports.map(p => `add bridge="bridge-LAN" interface="${p}"`).join("\n") + "\n";
  }
  script += `/ip address add address="${ipLan}" interface="bridge-LAN" network="${network}"\n`;
  script += `/ip pool add name="LAN-Pool" ranges="${network.replace(".0", ".2")}-${network.replace(".0", ".254")}"\n`;
  script += `/ip dhcp-server add name="LAN-DHCP" interface="bridge-LAN" address-pool="LAN-Pool" lease-time=4h disabled=no\n`;
  script += `/ip dhcp-server network add address="${network}/24" gateway="${ipOnly}" dns-server="${dnsServers}"\n`;
  script += `\n# DNS & DoH Security\n`;
  script += `/ip dns set allow-remote-requests=yes servers="${dnsServers}" use-doh-server="${dohUrl}" verify-doh-cert=no\n`;
  script += `/ip firewall filter add chain=input protocol=udp dst-port=53 in-interface-list=!LAN action=drop comment="Drop DNS Request from WAN"\n`;

  script += `\n# WAN CONFIGURATION (Auto-Detected)\n`;
  
  window.ispList.forEach(isp => {
      // LOGIKA PINTAR: Hitung IP Mikrotik berdasarkan Gateway
      // Misal GW: 192.168.1.1 -> IP: 192.168.1.2
      const parts = isp.gw.split(".");
      if(parts.length === 4) {
          let lastOctet = parseInt(parts[3]);
          // Jika GW .1, maka IP .2. Jika GW .254, maka IP .253. Selain itu tambah 1.
          let newOctet = (lastOctet === 1) ? 2 : (lastOctet === 254 ? 253 : lastOctet + 1);
          let calculatedIp = `${parts[0]}.${parts[1]}.${parts[2]}.${newOctet}`;
          
          script += `/ip address add address="${calculatedIp}/24" interface="${isp.iface}" comment="${isp.name} Static IP (Auto-Calc)"\n`;
      }
      
      // Tetap tambahkan DHCP Client sebagai backup/deteksi
      // add-default-route=no AGAR TIDAK BENTROK dengan Routing PCC Manual
      script += `/ip dhcp-client add interface="${isp.iface}" disabled=no add-default-route=no use-peer-dns=no comment="${isp.name} DHCP Client (Backup)"\n`;
  });

  return { error: false, script: script };
};

document.getElementById("genBasicBtn").onclick = () => {
    const result = window.generateBasicSetup();
    if(result.error) {
        alert(result.msg);
        document.getElementById("output_basic").value = result.msg;
    } else {
        document.getElementById("output_basic").value = result.script;
    }
};
EOF

echo "✅ Logic Update Selesai! IP Address otomatis dihitung dari Gateway."