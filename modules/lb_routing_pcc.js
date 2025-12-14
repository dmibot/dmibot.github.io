// === File: modules/lb_routing_pcc.js ===

// 1. Render UI Tab 2
document.getElementById("section2").innerHTML = `
<h3>🧭 Routing & PCC Configuration</h3>

<div style="background:#e3f2fd; padding:15px; border-radius:5px; margin-bottom:15px; border:1px solid #bbdefb;">
    <p style="margin:0; font-size:0.9rem;">ℹ️ Modul ini mengambil data ISP yang Anda input di Tab 1. Pastikan Tab 1 sudah diisi.</p>
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
            <option value="GATEWAY">Check Gateway (Ping ISP IP)</option>
        </select>
    </div>
</div>

<hr>
<button onclick="window.previewRouting()" class="btn btn-blue" style="width:100%;">🔄 Generate Routing Script</button>
<textarea id="output_routing" readonly placeholder="Hasil script Routing & PCC..." style="height:250px; margin-top:10px;"></textarea>
<button onclick="window.copyRouting()" class="btn btn-copy" style="width:100%;">📋 Copy Routing Script</button>
`;


// 2. GENERATOR LOGIC (ROUTING)
window.generateRoutingScript = function(ispList) {
    if(!ispList || ispList.length === 0) return { error: true, msg: "⚠️ Data ISP Kosong. Klik Tab 1 dan lengkapi data!" };

    const ros = document.getElementById("rosVer").value;
    const failMode = document.getElementById("failMode").value;
    let script = `# === 2. ROUTING, PCC & NAT ===\n`;

    // 1. Address List (Dipindahkan ke blok terpisah sesuai Mikrotik Script Order)
    script += `/ip firewall address-list\n`;
    script += `add list=LOCAL_NET address=192.168.0.0/16\n`;
    script += `add list=LOCAL_NET address=10.0.0.0/8\n`;
    script += `add list=LOCAL_NET address=172.16.0.0/12\n\n`;

    // 2. Mangle Rules (Dengan Bypass Optimal)
    script += `/ip firewall mangle\n`;
    
    // 0. BYPASS KRITIS: Lewati semua lalu lintas yang berasal atau menuju IP Lokal
    script += `add chain=prerouting src-address-list=LOCAL_NET dst-address-list=LOCAL_NET action=accept comment="BYPASS: LAN to LAN sebelum PCC"\n\n`;

    // 1. INPUT MARK: Menandai koneksi yang masuk dari WAN ke router
    ispList.forEach(isp => {
        script += `add chain=input in-interface="${isp.iface}" action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="Input Mark ${isp.name}"\n`;
    });

    // 2. PREROUTING (PCC): Menandai koneksi baru dari LAN ke INTERNET
    ispList.forEach((isp, idx) => {
        // PCC Logic with Local IP Bypass
        script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${ispList.length}/${idx} action=mark-connection new-connection-mark="Telkom_conn" passthrough=yes comment="PCC Telkom"\n`;
    });

    // 3. MARK ROUTING
    ispList.forEach(isp => {
        script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
    });

    // 4. OUTPUT MARK: Memastikan traffic yang berasal dari router
    ispList.forEach(isp => {
        script += `add chain=output connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no comment="Output ${isp.name}"\n`;
    });
    
    // 3. NAT (FIX: Masquerade wajib ada)
    script += `\n# NAT MASQUERADE\n/ip firewall nat\n`;
    ispList.forEach(isp => {
        script += `add chain=srcnat out-interface="${isp.iface}" action=masquerade comment="NAT ${isp.name}"\n`;
    });

    // 4. Routing Tables & Routes
    if(ros === "7") {
        script += `\n# Routing Tables\n`;
        ispList.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
    }

    script += `\n# PCC Routes\n/ip route\n`;
    ispList.forEach(isp => {
        const param = (ros === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;
        script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" ${param} distance=1 comment="PCC ${isp.name}" check-gateway=ping\n`;
    });

    // Failover (Main Table)
    script += `\n# Failover Config\n`;
    ispList.forEach((isp, idx) => {
        const dist = idx + 1;
        if(failMode === "RECURSIVE") {
            const checkIp = (idx % 2 === 0) ? "8.8.8.8" : "1.1.1.1";
            script += `add dst-address=${checkIp} gateway=${isp.gw} scope=10 comment="Recursive Check ${isp.name}"\n`;
            script += `add dst-address=0.0.0.0/0 gateway=${checkIp} distance=${dist} target-scope=11 check-gateway=ping comment="Main ${isp.name}"\n`;
        } else {
            script += `add dst-address=0.0.0.0/0 gateway=${isp.gw} distance=${dist} check-gateway=ping comment="Main ${isp.name}"\n`;
        }
    });

    return { error: false, script: script };
};

// 3. Button Actions (Exported to Window)
window.previewRouting = function() {
    // Refresh Basic dulu untuk update window.ispList
    if(typeof window.generateBasicScript === 'function') window.generateBasicScript();
    
    const res = window.generateRoutingScript(window.ispList);
    document.getElementById("output_routing").value = res.error ? res.msg : res.script;
};

window.copyRouting = function() {
    const ta = document.getElementById("output_routing");
    ta.select(); navigator.clipboard.writeText(ta.value);
    alert("Routing Script Copied!");
};