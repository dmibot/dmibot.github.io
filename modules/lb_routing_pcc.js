// === Mikrotik LB Routing & PCC Module (Fixed by Tutik) ===

document.getElementById("section2").innerHTML = `
<h2>🧭 Routing, PCC & NAT</h2>
<div class="card" style="background:#e3f2fd; border:1px solid #90caf9;">
    <p style="margin:0; font-size:0.9rem;">ℹ️ Modul ini otomatis mengambil data dari <strong>Tab 1</strong>.</p>
</div>
<br>
<label>Versi RouterOS:</label>
<select id="rosVer"><option value="7" selected>RouterOS v7 (Recommended)</option><option value="6">RouterOS v6</option></select>

<hr>
<button id="genRoutingBtn" style="width:100%; background:#673AB7; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer;">🔄 Update Preview Routing</button>
<textarea id="output_routing" readonly placeholder="Klik tombol Generate..." style="height:200px; margin-top:10px; width:100%; box-sizing:border-box;"></textarea>
`;

window.generateRoutingScript = (currentIspList) => {
    if(!currentIspList || currentIspList.length === 0) {
        return { error: true, msg: "⚠️ Data ISP Kosong. Silakan isi di Tab 1 terlebih dahulu." };
    }

    const rosVer = document.getElementById("rosVer").value;
    
    let script = `# === 2. ROUTING, PCC & NAT ===\n`;
    
    // 1. Firewall Address List (Bypass Lokal)
    script += `/ip firewall address-list\nadd list=LOCAL_NET address=192.168.0.0/16\nadd list=LOCAL_NET address=10.0.0.0/8\nadd list=LOCAL_NET address=172.16.0.0/12\n\n`;
    
    // 2. Mangle PCC (Input & Prerouting)
    script += `/ip firewall mangle\n`;
    currentIspList.forEach((isp, index) => {
        // Mark Connection Input (Agar trafik masuk bisa keluar di interface yang sama)
        script += `add chain=input in-interface="${isp.iface}" action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes\n`;
        
        // PCC Rules
        script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${currentIspList.length}/${index} action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="PCC ${isp.name}"\n`;
        
        // Mark Routing
        script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
        
        // Output Routing (Penting untuk traffic dari router sendiri)
        script += `add chain=output connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
    });

    // 3. NAT / MASQUERADE (WAJIB ADA)
    script += `\n# NAT Configuration (FIXED)\n/ip firewall nat\n`;
    currentIspList.forEach(isp => {
        script += `add chain=srcnat out-interface="${isp.iface}" action=masquerade comment="NAT ${isp.name}"\n`;
    });

    // 4. Routing Tables (v7 only)
    if (rosVer === "7") {
        script += `\n# Routing Tables\n`;
        currentIspList.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
    }

    // 5. Routes (Logika Dummy vs Static)
    script += `\n# PCC Routes\n/ip route\n`;
    
    currentIspList.forEach(isp => {
        const routeParam = (rosVer === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;
        const comment = `PCC-${isp.name}-Route`;

        if (isp.mode === "DHCP") {
            // MODE DHCP: Gunakan Dummy Gateway (1.1.1.1). Nanti di-update otomatis oleh Script DHCP Client.
            // Ini solusi anti-error "Invalid argument base".
            script += `add dst-address=0.0.0.0/0 gateway=1.1.1.1 ${routeParam} distance=1 comment="${comment}" disabled=yes\n`;
        } else {
            // MODE STATIC: Gunakan Gateway inputan user
            script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" ${routeParam} distance=1 comment="${comment}"\n`;
        }
    });

    // Failover Routes (Main Table) handled by DHCP Client default-route or Manual
    if (currentIspList[0].mode === "STATIC") {
        script += `\n# Static Failover Routes\n`;
        currentIspList.forEach((isp, index) => {
             script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" distance=${index+1} comment="Main Failover ${isp.name}"\n`;
        });
    }

    return { error: false, script: script };
};

// Event Listener
document.getElementById("genRoutingBtn").onclick = () => {
    if(typeof window.generateBasicSetup === 'function') window.generateBasicSetup();
    const result = window.generateRoutingScript(window.ispList);
    document.getElementById("output_routing").value = result.error ? result.msg : result.script;
};