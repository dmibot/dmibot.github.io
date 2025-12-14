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
