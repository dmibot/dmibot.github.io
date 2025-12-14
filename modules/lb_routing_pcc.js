// Render HTML langsung
document.getElementById("section2").innerHTML = `
<h2>🧭 Routing & PCC</h2>
<div style="background:#e3f2fd; padding:10px;">
    ℹ️ Data diambil otomatis dari Tab 1.
</div>
<br>
<label>RouterOS:</label>
<select id="rosVer"><option value="7">v7</option><option value="6">v6</option></select>
<hr>
<button onclick="window.previewRouting()" style="width:100%; background:#673AB7; color:white; padding:10px;">🔄 Update Preview</button>
<textarea id="output_routing" readonly style="height:200px; margin-top:10px; width:100%;"></textarea>
`;

window.previewRouting = function() {
    if(typeof window.generateBasicSetup === 'function') window.generateBasicSetup(); // Refresh data
    const res = window.generateRoutingScript(window.ispList);
    document.getElementById("output_routing").value = res.error ? res.msg : res.script;
}

// === GENERATOR ROUTING ===
window.generateRoutingScript = function(list) {
    if(!list || list.length === 0) return { error: true, msg: "Data ISP Kosong!" };

    const ros = document.getElementById("rosVer").value;
    let script = `# === 2. ROUTING & PCC ===\n`;
    
    // Address List
    script += `/ip firewall address-list\nadd list=LOCAL_NET address=192.168.0.0/16\nadd list=LOCAL_NET address=10.0.0.0/8\nadd list=LOCAL_NET address=172.16.0.0/12\n\n`;

    // Mangle
    script += `/ip firewall mangle\n`;
    list.forEach((isp, idx) => {
        script += `add chain=input in-interface="${isp.iface}" action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes\n`;
        script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${list.length}/${idx} action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes\n`;
        script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
        script += `add chain=output connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
    });

    // === NAT FIX (SAYA MASUKKAN KEMBALI) ===
    script += `\n# NAT MASQUERADE (WAJIB ADA)\n/ip firewall nat\n`;
    list.forEach(isp => {
        script += `add chain=srcnat out-interface="${isp.iface}" action=masquerade comment="NAT ${isp.name}"\n`;
    });

    // Routing Tables (v7)
    if(ros === "7") {
        script += `\n# Tables\n`;
        list.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
    }

    // Routes
    script += `\n# Routes\n/ip route\n`;
    list.forEach(isp => {
        const param = (ros === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;
        
        if(isp.mode === "DHCP") {
            // FIX ERROR: Pakai gateway dummy 1.1.1.1 agar tidak error saat paste.
            // Script DHCP di Tab 1 akan otomatis menimpanya dengan IP asli.
            script += `add dst-address=0.0.0.0/0 gateway=1.1.1.1 ${param} distance=1 comment="PCC-${isp.name}-Route" disabled=yes\n`;
        } else {
            script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" ${param} distance=1 comment="PCC-${isp.name}-Route" check-gateway=ping\n`;
        }
    });

    return { error: false, script: script };
}