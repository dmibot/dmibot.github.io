// === Mikrotik LB Routing & PCC Module (Final Sync) ===

document.getElementById("section2").innerHTML = `
<h2>🧭 Routing & PCC Configuration</h2>
<div class="card" style="background:#e3f2fd; border:1px solid #90caf9;">
    <p style="margin:0; font-size:0.9rem;">ℹ️ Modul ini otomatis mengambil data ISP & Gateway dari Tab 1.</p>
</div>
<label>Versi RouterOS:</label>
<select id="rosVer"><option value="7" selected>RouterOS v7 (Recommended)</option><option value="6">RouterOS v6</option></select>
<label>Mode Failover:</label>
<select id="failMode"><option value="RECURSIVE" selected>Recursive (Cek Ping)</option><option value="LOCAL">Local (Cek Interface)</option></select>
<hr>
<button id="genRoutingBtn" style="width:100%;">🔄 Generate Routing Script</button>
<textarea id="output_routing" readonly placeholder="Klik tombol Generate..."></textarea>
`;

// --- CORE LOGIC (Exported Function) ---
// Fungsi ini menerima ispList sebagai argumen agar selalu sinkron
window.generateRoutingScript = (currentIspList) => {
    if(!currentIspList || currentIspList.length === 0) {
        return { error: true, msg: "Data ISP Kosong. Silakan isi di Tab 1." };
    }

    const rosVer = document.getElementById("rosVer").value;
    const failMode = document.getElementById("failMode").value; // Ambil nilai DOM saat fungsi dipanggil

    let script = `# === 2. ROUTING & PCC CONFIG ===\n`;
    
    // Address List Lokal
    script += `/ip firewall address-list\nadd list=LOCAL_NET address=192.168.0.0/16\nadd list=LOCAL_NET address=10.0.0.0/8\nadd list=LOCAL_NET address=172.16.0.0/12\n\n`;
    
    // Mangle PCC
    script += `/ip firewall mangle\n`;
    currentIspList.forEach((isp, index) => {
        script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${currentIspList.length}/${index} action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="PCC ${isp.name}"\n`;
        script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
    });

    // Routing Table (v7)
    script += `\n# Routing Tables & Routes\n`;
    if (rosVer === "7") {
        currentIspList.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
    }

    // Main Routes (Marked)
    script += `/ip route\n`;
    currentIspList.forEach(isp => {
        const routeParam = (rosVer === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;
        script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" ${routeParam} comment="${isp.name} Route"\n`;
    });

    // Failover Routes (Main Table)
    script += `\n# Failover (Main Table)\n`;
    currentIspList.forEach((isp, index) => {
        const dist = index + 1;
        // Logic Recursive sederhana
        if(failMode === "RECURSIVE") {
            const checkIp = (index === 0) ? "8.8.8.8" : "1.1.1.1";
            script += `add dst-address=${checkIp} gateway=${isp.gw} scope=10\n`;
            script += `add dst-address=0.0.0.0/0 gateway=${checkIp} distance=${dist} target-scope=11 check-gateway=ping comment="Failover ${isp.name}"\n`;
        } else {
            script += `add dst-address=0.0.0.0/0 gateway=${isp.gw} distance=${dist} comment="Failover ${isp.name}"\n`;
        }
    });

    return { error: false, script: script };
};

// UI Listener untuk tombol di Tab 2
document.getElementById("genRoutingBtn").onclick = () => {
    // 1. Refresh data dari Tab 1
    if(typeof window.generateBasicSetup === 'function') window.generateBasicSetup();
    
    // 2. Generate Routing pakai data terbaru
    const result = window.generateRoutingScript(window.ispList);
    
    if(result.error) {
        document.getElementById("output_routing").value = result.msg;
        alert(result.msg);
    } else {
        document.getElementById("output_routing").value = result.script;
    }
};
