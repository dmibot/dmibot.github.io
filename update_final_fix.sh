#!/bin/bash

echo "🔄 Memperbaiki Logika Load Balance (Sync Tab 1 & 2 + Auto IP)..."

# 1. PERBAIKI MODUL BASIC SETUP (Tab 1)
# - Input Gateway pindah ke sini
# - Logika Auto-IP Address
# - Global Variable window.ispList yang valid
cat << 'EOF' > modules/lb_basic_setup.js
// === Mikrotik LB Basic Setup Module (Final Fix) ===

document.getElementById("section1").innerHTML = `
<h2>🧱 Basic Network Setup</h2>
<div class="card" style="background:#fff3e0; border:1px solid #ffe0b2;">
    <p style="margin:0; font-size:0.9rem;">📝 <strong>Penting:</strong> Masukkan Gateway di sini. IP Address Mikrotik akan dihitung otomatis.</p>
</div>

<div id="ispContainer"></div>
<button id="addIspBtn" type="button" style="background:#2196F3; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">+ Tambah Data ISP</button>
<hr>

<h3>🌐 Bridge LAN Configuration</h3>
<label>IP LAN (Format CIDR):</label>
<input id="ipLan" type="text" value="192.168.1.1/24" placeholder="192.168.1.1/24">

<div id="lanPorts"></div>
<button id="addLanPort" type="button" style="background:#4CAF50; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; margin-top:5px;">+ Tambah Port LAN</button>
<hr>

<h3>🛡️ DNS & DoH Settings</h3>
<label>Pilih Provider DoH:</label>
<select id="dohSelect">
  <option value="https://dns.google/dns-query" data-dns="8.8.8.8,8.8.4.4">Google</option>
  <option value="https://dns.cloudflare.com/dns-query" data-dns="1.1.1.1,1.0.0.1" selected>Cloudflare</option>
  <option value="https://dns.quad9.net/dns-query" data-dns="9.9.9.9,149.112.112.112">Quad9</option>
  <option value="https://dns.adguard.com/dns-query" data-dns="94.140.14.14,94.140.15.15">AdGuard</option>
</select>

<label>DNS Server (Otomatis terisi):</label>
<input id="manualDns" value="1.1.1.1,1.0.0.1" placeholder="8.8.8.8,1.1.1.1">

<hr>
<button id="genBasicBtn" style="width:100%; margin-top:10px; background:#FF9800; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer;">📄 Generate Basic Script Only</button>
<textarea id="output_basic" readonly placeholder="Klik tombol di atas untuk preview..." style="height:150px; margin-top:10px; width:100%; box-sizing:border-box;"></textarea>
`;

// --- UI Logic ---
const ispContainer = document.getElementById("ispContainer");
const lanPortsContainer = document.getElementById("lanPorts");
const dohSelect = document.getElementById("dohSelect");
const manualDns = document.getElementById("manualDns");

// DNS Auto-fill
dohSelect.addEventListener("change", () => {
    const selectedOption = dohSelect.options[dohSelect.selectedIndex];
    manualDns.value = selectedOption.getAttribute("data-dns");
});

// Helper: Add ISP
function createISPBlock(nameVal="", ifaceVal="", gwVal="") {
    const div = document.createElement("div");
    div.className = "isp-block";
    div.style.cssText = "border:1px solid #ddd; padding:15px; margin-bottom:10px; border-radius:8px; background:#f9f9f9;";
    div.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
            <div><label style="font-size:0.8rem">Nama ISP:</label><input class="ispName" value="${nameVal}" placeholder="ISP1"></div>
            <div><label style="font-size:0.8rem">Interface:</label><input class="ispIface" value="${ifaceVal}" placeholder="ether1"></div>
            <div><label style="font-size:0.8rem">Gateway:</label><input class="ispGw" value="${gwVal}" placeholder="192.168.x.1"></div>
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="background:#f44336; color:white; border:none; margin-top:5px; padding:5px 10px; font-size:0.8rem; border-radius:4px; cursor:pointer;">Hapus</button>
    `;
    ispContainer.appendChild(div);
}

// Default Values
createISPBlock("Telkom", "ether1-Telkom", "192.168.10.1");
createISPBlock("Biznet", "ether2-Biznet", "192.168.20.1");

document.getElementById("addIspBtn").onclick = () => createISPBlock();

// Helper: Add LAN Port
function createLanPort(val="") {
    const div = document.createElement("div");
    div.innerHTML = `<input class="lanPort" value="${val}" placeholder="etherX" style="width:80%; padding:8px; margin-top:5px;"><button onclick="this.parentElement.remove()" style="width:15%; background:#f44336; color:white; border:none; margin-left:5px; padding:8px; border-radius:4px; cursor:pointer;">X</button>`;
    lanPortsContainer.appendChild(div);
}
createLanPort("ether3");
createLanPort("ether4");
document.getElementById("addLanPort").onclick = () => createLanPort();

// --- CORE FUNCTION (Exported) ---
window.generateBasicSetup = () => {
  window.ispList = [];
  
  // Ambil Data ISP
  document.querySelectorAll(".isp-block").forEach(block => {
      const name = block.querySelector(".ispName").value.trim();
      const iface = block.querySelector(".ispIface").value.trim();
      const gw = block.querySelector(".ispGw").value.trim();
      if(name && iface && gw) window.ispList.push({ name, iface, gw });
  });

  const ipLan = document.getElementById("ipLan").value;
  const dnsServers = manualDns.value;
  const dohUrl = dohSelect.value;
  
  if(window.ispList.length === 0) return { error: true, msg: "⚠️ Minimal 1 ISP harus diisi lengkap (Nama, Interface, Gateway)." };
  
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

  script += `\n# WAN CONFIGURATION (Auto-Calculated)\n`;
  window.ispList.forEach(isp => {
      // LOGIKA SMART IP: GW .1 -> IP .2
      const parts = isp.gw.split(".");
      if(parts.length === 4) {
          let lastOctet = parseInt(parts[3]);
          let newOctet = (lastOctet === 1) ? 2 : (lastOctet === 254 ? 253 : lastOctet + 1);
          let calculatedIp = `${parts[0]}.${parts[1]}.${parts[2]}.${newOctet}`;
          script += `/ip address add address="${calculatedIp}/24" interface="${isp.iface}" comment="${isp.name} Static IP"\n`;
      }
      script += `/ip dhcp-client add interface="${isp.iface}" disabled=no add-default-route=no use-peer-dns=no comment="${isp.name} DHCP Client (Backup)"\n`;
  });

  return { error: false, script: script };
};

// Event Listener Tombol Generate Tab 1
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

# 2. PERBAIKI MODUL ROUTING PCC (Tab 2)
# - Hapus input ISP manual
# - Baca data dari window.ispList (hasil Tab 1)
cat << 'EOF' > modules/lb_routing_pcc.js
// === Mikrotik LB Routing & PCC Module (Final Fix) ===

document.getElementById("section2").innerHTML = `
<h2>🧭 Routing & PCC Configuration</h2>
<div class="card" style="background:#e3f2fd; border:1px solid #90caf9;">
    <p style="margin:0; font-size:0.9rem;">ℹ️ Modul ini otomatis mengambil data dari <strong>Tab 1 (Basic Setup)</strong>.</p>
</div>
<br>
<label>Versi RouterOS:</label>
<select id="rosVer"><option value="7" selected>RouterOS v7</option><option value="6">RouterOS v6</option></select>

<label>Mode Failover:</label>
<select id="failMode"><option value="RECURSIVE" selected>Recursive (Cek Ping DNS)</option><option value="LOCAL">Local (Cek Interface)</option></select>

<hr>
<button id="genRoutingBtn" style="width:100%; background:#673AB7; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer;">🔄 Generate Routing Script</button>
<textarea id="output_routing" readonly placeholder="Klik tombol Generate..." style="height:200px; margin-top:10px; width:100%; box-sizing:border-box;"></textarea>
`;

// --- CORE FUNCTION (Exported) ---
window.generateRoutingScript = (currentIspList) => {
    if(!currentIspList || currentIspList.length === 0) {
        return { error: true, msg: "⚠️ Data ISP Kosong. Silakan isi di Tab 1 terlebih dahulu." };
    }

    const rosVer = document.getElementById("rosVer").value;
    const failMode = document.getElementById("failMode").value;

    let script = `# === 2. ROUTING & PCC CONFIG ===\n`;
    
    // Bypass Lokal
    script += `/ip firewall address-list\nadd list=LOCAL_NET address=192.168.0.0/16\nadd list=LOCAL_NET address=10.0.0.0/8\nadd list=LOCAL_NET address=172.16.0.0/12\n\n`;
    
    // Mangle PCC
    script += `/ip firewall mangle\n`;
    currentIspList.forEach((isp, index) => {
        script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${currentIspList.length}/${index} action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="PCC ${isp.name}"\n`;
        script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
    });

    // Routing Table (v7)
    script += `\n# Routing Tables\n`;
    if (rosVer === "7") {
        currentIspList.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
    }

    // Main Routes
    script += `\n# Main Routes\n/ip route\n`;
    currentIspList.forEach(isp => {
        const routeParam = (rosVer === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;
        script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" ${routeParam} comment="${isp.name} Route"\n`;
    });

    // Failover
    script += `\n# Failover Config (${failMode})\n`;
    currentIspList.forEach((isp, index) => {
        const dist = index + 1;
        if(failMode === "RECURSIVE") {
            // Target Ping: Google & Cloudflare
            const checkIp = (index % 2 === 0) ? "8.8.8.8" : "1.1.1.1"; 
            script += `add dst-address=${checkIp} gateway=${isp.gw} scope=10\n`;
            script += `add dst-address=0.0.0.0/0 gateway=${checkIp} distance=${dist} target-scope=11 check-gateway=ping comment="Failover ${isp.name}"\n`;
        } else {
            script += `add dst-address=0.0.0.0/0 gateway=${isp.gw} distance=${dist} comment="Failover ${isp.name}"\n`;
        }
    });

    return { error: false, script: script };
};

// Event Listener Tombol Generate Tab 2
document.getElementById("genRoutingBtn").onclick = () => {
    // 1. Refresh Data Tab 1 (PENTING)
    if(typeof window.generateBasicSetup === 'function') window.generateBasicSetup();
    
    // 2. Generate
    const result = window.generateRoutingScript(window.ispList);
    
    if(result.error) {
        document.getElementById("output_routing").value = result.msg;
        alert(result.msg);
    } else {
        document.getElementById("output_routing").value = result.script;
    }
};
EOF

# 3. PERBAIKI MAIN HTML (Combine Logic)
# - Memastikan combineConfigs memanggil ulang generator agar data fresh
cat << 'EOF' > mikrotik_load_balance_tools.html
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mikrotik Load Balance Tools | dmibot</title>
<link rel="icon" href="Mikrotik.svg">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header>
  <button class="home-btn" onclick="window.location.href='index.html'">🏠 Home</button>
  <h1>⚙️ Load Balance Generator</h1>
  <p>PCC, Failover & Basic Network Setup (v6 & v7)</p>
</header>
<main>
  <div class="tabs">
    <button id="tab1" class="active" onclick="openTab(1)">1. Basic Setup</button>
    <button id="tab2" onclick="openTab(2)">2. Routing & PCC</button>
    <button id="tab3" onclick="combineConfigs()">3. Combine & Export</button>
  </div>
  
  <div id="section1" class="card"></div>
  <div id="section2" class="card hidden"></div>
  
  <div id="section3" class="card hidden">
    <h3>📦 Final Configuration</h3>
    <p>Skrip di bawah ini adalah gabungan otomatis dari Tab 1 & Tab 2 berdasarkan data <strong>TERBARU</strong>.</p>
    <textarea id="combinedOutput" readonly placeholder="Klik tab 'Combine & Export'..." style="height:300px; width:100%; box-sizing:border-box; padding:10px;"></textarea>
    <button onclick="copyAll()" style="width:100%; margin-top:10px; background:#4CAF50; color:white; border:none; padding:12px; border-radius:5px; cursor:pointer; font-size:1rem;">📋 Copy All Scripts</button>
  </div>
</main>
<footer><p style="text-align:center; padding:20px; color:#777;">&copy; 2025 DmiBot Projects</p></footer>

<script>
  window.ispList = []; 
</script>
<script src="modules/lb_basic_setup.js"></script>
<script src="modules/lb_routing_pcc.js"></script>

<script>
  function openTab(num){
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('main .card').forEach(sec => sec.classList.add('hidden'));
    document.getElementById('tab'+num).classList.add('active');
    document.getElementById('section'+num).classList.remove('hidden');
  }

  // === REAL-TIME COMBINE LOGIC ===
  function combineConfigs(){
    openTab(3); // Pindah ke tab 3
    
    // 1. Paksa Generate Basic (untuk update window.ispList)
    const basicRes = window.generateBasicSetup();
    if(basicRes.error) {
        document.getElementById("combinedOutput").value = basicRes.msg;
        return;
    }

    // 2. Paksa Generate Routing (pakai window.ispList terbaru)
    const routingRes = window.generateRoutingScript(window.ispList);
    if(routingRes.error) {
        document.getElementById("combinedOutput").value = basicRes.script + "\n\n" + routingRes.msg;
        return;
    }

    // 3. Gabungkan
    const header = `# ==========================================\n# MIKROTIK ALL-IN-ONE CONFIG\n# Generated by DmiBot Tools\n# ==========================================\n\n`;
    document.getElementById("combinedOutput").value = header + basicRes.script + "\n\n" + routingRes.script;
  }

  function copyAll(){
    const ta = document.getElementById("combinedOutput");
    ta.select(); navigator.clipboard.writeText(ta.value).then(() => { alert("✅ Skrip berhasil disalin!"); });
  }
</script>
</body>
</html>
EOF

echo "✅ Selesai! Logika Sinkronisasi Tab 1 & 2 serta Auto-IP telah diperbaiki."