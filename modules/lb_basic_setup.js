// Render HTML langsung saat file diload
document.getElementById("section1").innerHTML = `
<h2>🧱 Basic Network Setup</h2>
<div style="background:#e3f2fd; padding:10px; border-radius:5px; margin-bottom:15px;">
    <label>Mode WAN:</label>
    <select id="wanModeInput" onchange="window.toggleGwInput()">
        <option value="DHCP">DHCP Client (Dynamic)</option>
        <option value="STATIC">Static IP (Manual)</option>
    </select>
</div>

<div id="ispContainer"></div>
<button onclick="window.addIsp()" style="background:#2196F3; color:white; border:none; padding:8px;">+ Tambah ISP</button>
<hr>

<h3>🌐 LAN</h3>
<label>IP LAN:</label>
<input id="ipLan" type="text" value="192.168.1.1/24">
<label>DNS:</label>
<input id="manualDns" value="8.8.8.8, 1.1.1.1">

<div id="lanPorts"></div>
<button onclick="window.addLanPort()" style="background:#4CAF50; color:white; border:none; padding:8px;">+ Tambah Port LAN</button>
`;

// Helper Functions (ditempel ke window agar HTML bisa baca)
window.toggleGwInput = function() {
    const mode = document.getElementById("wanModeInput").value;
    document.querySelectorAll(".gw-field").forEach(el => el.style.display = (mode === "STATIC") ? "block" : "none");
}

const ispCont = document.getElementById("ispContainer");
const lanCont = document.getElementById("lanPorts");

window.addIsp = function(name="", iface="", gw="") {
    const count = ispCont.children.length + 1;
    if(!name) name = "ISP" + count;
    
    const div = document.createElement("div");
    div.className = "isp-block";
    div.style.cssText = "border:1px solid #ddd; padding:10px; margin-bottom:10px;";
    
    const mode = document.getElementById("wanModeInput") ? document.getElementById("wanModeInput").value : "DHCP";
    const disp = (mode === "STATIC") ? "block" : "none";

    div.innerHTML = `
        <label>Nama:</label><input class="ispName" value="${name}">
        <label>Interface:</label><input class="ispIface" value="${iface}" placeholder="ether1">
        <div class="gw-field" style="display:${disp}">
            <label>Gateway (Static):</label><input class="ispGw" value="${gw}" placeholder="192.168.1.1">
        </div>
        <button onclick="this.parentElement.remove()" style="background:red; color:white; border:none;">Hapus</button>
    `;
    ispCont.appendChild(div);
}

window.addLanPort = function(val="") {
    const div = document.createElement("div");
    div.innerHTML = `<input class="lanPort" value="${val}" placeholder="etherX"><button onclick="this.parentElement.remove()">X</button>`;
    lanCont.appendChild(div);
}

// Init Defaults
window.addIsp("Telkom", "ether1");
window.addIsp("Biznet", "ether2");

// === GENERATOR FUNCTION ===
window.generateBasicSetup = function() {
    window.ispList = [];
    const mode = document.getElementById("wanModeInput").value;
    
    // Ambil Data ISP
    const blocks = document.querySelectorAll(".isp-block");
    if(blocks.length === 0) return { error: true, msg: "Tambahkan minimal 1 ISP!" };

    let script = `# === 1. BASIC SETUP ===\n`;

    // LAN SETUP
    const ipLan = document.getElementById("ipLan").value;
    const dns = document.getElementById("manualDns").value;
    const ipParts = ipLan.split("/")[0].split(".");
    const network = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;
    
    script += `/interface bridge add name="bridge-LAN"\n`;
    script += `/ip address add address="${ipLan}" interface="bridge-LAN" network="${network}"\n`;
    script += `/ip pool add name="LAN-Pool" ranges="${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.2-${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.254"\n`;
    script += `/ip dhcp-server add name="LAN-DHCP" interface="bridge-LAN" address-pool="LAN-Pool" disabled=no\n`;
    script += `/ip dhcp-server network add address="${network}/24" gateway="${ipParts.join('.')}" dns-server="${dns}"\n`;
    script += `/ip dns set allow-remote-requests=yes servers="${dns}"\n`;

    // WAN SETUP
    script += `\n# WAN SETUP (${mode})\n`;
    
    blocks.forEach((block, idx) => {
        const name = block.querySelector(".ispName").value.trim().replace(/\s/g, "_");
        const iface = block.querySelector(".ispIface").value.trim();
        const gw = block.querySelector(".ispGw").value.trim();
        
        window.ispList.push({ name, iface, gw, mode }); // Simpan ke global variable

        if(mode === "DHCP") {
            const dist = idx + 1;
            // SCRIPT FIX: Update Route otomatis saat IP berubah
            const dhcpScript = `{ :if ($bound=1) do={ :local gw $"gateway-address"; /ip route set [find comment=\\"PCC-${name}-Route\\"] gateway=$gw disabled=no; } else={ /ip route set [find comment=\\"PCC-${name}-Route\\"] disabled=yes; } }`;
            
            script += `/ip dhcp-client add interface="${iface}" disabled=no add-default-route=yes default-route-distance=${dist} use-peer-dns=no script="${dhcpScript}" comment="${name}"\n`;
        } else {
            script += `/ip address add address="${gw}" interface="${iface}" comment="${name}"\n`;
        }
    });

    return { error: false, script: script };
}