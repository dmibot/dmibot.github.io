// === File: modules/lb_basic_setup.js ===

// NOTE: Merender UI langsung saat file dimuat, sesuai pola aslinya.

// 1. Render UI Tab 1
document.getElementById("section1").innerHTML = `
<h3>🧱 Basic Network Configuration</h3>

<div style="background:#e3f2fd; padding:15px; border-radius:5px; margin-bottom:15px;">
    <p style="margin:0; font-size:0.9rem;">
        ✅ <strong>Auto Calculation:</strong> Masukkan Gateway ISP (cth: 192.168.1.1). Script otomatis membuat IP Address Router dan DHCP Client Backup.
    </p>
</div>

<div id="ispContainer"></div>
<button id="addIspBtn" class="btn" style="background:#1976D2; width:auto;">+ Tambah ISP</button>

<hr>

<h3>🏠 LAN & DNS</h3>
<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
    <div>
        <label>IP Address LAN:</label>
        <input id="ipLan" type="text" value="192.168.10.1/24">
    </div>
    <div>
        <label>Bridge Ports (csv):</label>
        <input id="lanPorts" type="text" value="ether3, ether4, ether5">
    </div>
</div>

<label>DoH Provider (Quad9 RESTORED):</label>
<select id="dohProvider">
    <option value="https://dns.google/dns-query">Google</option>
    <option value="https://cloudflare-dns.com/dns-query">Cloudflare</option>
    <option value="https://dns.quad9.net/dns-query">Quad9 (RESTORED)</option>
    <option value="https://dns.adguard.com/dns-query">AdGuard</option>
    <option value="disable">Non-aktifkan DoH</option>
</select>

<label>DNS Fallback:</label>
<input id="dnsServer" value="8.8.8.8, 1.1.1.1">

<hr>
<button onclick="window.previewBasic()" class="btn btn-green">🔄 Generate Basic Script</button>
<textarea id="output_basic" readonly placeholder="Hasil script Basic Setup..." style="height:150px; margin-top:10px;"></textarea>
<button onclick="window.copyBasic()" class="btn btn-copy">📋 Copy Basic Script</button>
`;

// 2. Helper Functions (Ditempel ke window agar bisa diakses HTML dan JS lain)
const ispCont = document.getElementById("ispContainer");

window.addIsp = function(name="", iface="", gw="") {
    // Logic untuk handling klik tombol tanpa parameter, atau penambahan default
    if (typeof name !== 'string') { name = ""; iface = ""; gw = ""; } 
    
    const count = ispCont.children.length + 1;
    if(!name) name = "ISP" + count;
    if(!iface) iface = "ether" + count;
    
    const div = document.createElement("div");
    div.className = "isp-row";
    div.style.cssText = "display:grid; grid-template-columns: 2fr 2fr 3fr auto; gap:10px; padding:10px; border:1px solid #ddd; margin-bottom:8px;";
    
    div.innerHTML = `
        <div><label style="font-size:0.8rem">Nama ISP</label><input class="ispName" value="${name}"></div>
        <div><label style="font-size:0.8rem">Interface</label><input class="ispIface" value="${iface}"></div>
        <div><label style="font-size:0.8rem">Gateway IP</label><input class="ispGw" value="${gw}" placeholder="192.168.1.1"></div>
        <button onclick="this.parentElement.remove()" class="btn-red" style="margin-top:22px;">X</button>
    `;
    ispCont.appendChild(div);
};

// 3. GENERATOR LOGIC (BASIC)
window.generateBasicScript = function() {
    window.ispList = []; 
    let script = `# === 1. BASIC SETUP ===\n`;
    
    const rows = document.querySelectorAll(".isp-row");
    let hasError = false;

    // 1. Collect Data & Build WAN Script
    rows.forEach(row => {
        const name = row.querySelector(".ispName").value.trim().replace(/\s/g, "_");
        const iface = row.querySelector(".ispIface").value.trim();
        const gw = row.querySelector(".ispGw").value.trim();
        
        if(!name || !iface || !gw) hasError = true;
        window.ispList.push({ name, iface, gw });

        // Auto Calc IP Address (Gateway .1 -> IP .2)
        const gwParts = gw.split(".");
        let lastOctet = parseInt(gwParts[3]);
        let newOctet = (lastOctet === 1) ? 2 : (lastOctet === 254 ? 253 : lastOctet + 1);
        const myIp = `${gwParts[0]}.${gwParts[1]}.${gwParts[2]}.${newOctet}`;

        script += `/ip address add address="${myIp}/24" interface="${iface}" comment="${name} Static IP"\n`;
        // Hybrid DHCP Client Backup (add-default-route=no is key)
        script += `/ip dhcp-client add interface="${iface}" disabled=no add-default-route=no use-peer-dns=no comment="${name} DHCP Client (Backup)"\n`;
    });

    if(hasError) return { error: true, msg: "⚠️ Lengkapi semua data ISP (Nama, Interface, Gateway)!" };

    // 2. LAN & DNS Logic
    const ipLan = document.getElementById("ipLan").value;
    const ports = document.getElementById("lanPorts").value;
    const dns = document.getElementById("dnsServer").value;
    const doh = document.getElementById("dohProvider").value;
    const ipParts = ipLan.split("/")[0].split(".");
    const network = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;
    
    script += `\n# LAN & Bridge Setup\n`;
    script += `/interface bridge add name="bridge-LAN" protocol-mode=rstp arp=enabled comment="LAN Bridge"\n`;
    if(ports) {
        ports.split(",").forEach(p => {
            script += `/interface bridge port add bridge="bridge-LAN" interface="${p.trim()}"\n`;
        });
    }

    script += `/ip address add address="${ipLan}" interface="bridge-LAN" network="${network}"\n`;
    script += `/ip pool add name="LAN-Pool" ranges="${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.2-${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.254"\n`;
    script += `/ip dhcp-server add name="LAN-DHCP" interface="bridge-LAN" address-pool="LAN-Pool" disabled=no\n`;
    script += `/ip dhcp-server network add address="${network}/24" gateway="${ipParts.join('.')}" dns-server="${dns}"\n`;

    // DNS & DoH
    script += `\n# DNS Configuration\n`;
    script += `/ip dns set allow-remote-requests=yes servers="${dns}"`;
    if(doh !== "disable") script += ` use-doh-server="${doh}" verify-doh-cert=no`;
    script += `\n`;
    script += `/ip firewall filter add chain=input protocol=udp dst-port=53 in-interface-list=!LAN action=drop comment="Security: Drop External DNS"\n`;

    return { error: false, script: script };
};

// 4. Button Actions (Exported to Window)
window.previewBasic = function() {
    const res = window.generateBasicScript();
    document.getElementById("output_basic").value = res.error ? res.msg : res.script;
};

window.copyBasic = function() {
    const ta = document.getElementById("output_basic");
    ta.select(); navigator.clipboard.writeText(ta.value);
    alert("Basic Script Copied!");
};

// 5. PENTING: Inisialisasi setelah seluruh file dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Tambahkan event listener untuk tombol +ISP setelah UI di-render
    const addButton = document.getElementById('addIspBtn');
    if (addButton) {
        addButton.addEventListener('click', function() {
            window.addIsp(); // Panggil fungsi addIsp tanpa parameter
        });
    }
    
    // Panggil fungsi untuk menambahkan ISP default
    window.addIsp("Telkom", "ether1", "192.168.10.1");
    window.addIsp("Biznet", "ether2", "192.168.20.1");
});