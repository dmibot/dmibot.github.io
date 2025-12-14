// === Mikrotik LB Routing & PCC Module ===

document.getElementById("section2").innerHTML = `
<h2>🧭 Routing, PCC & NAT</h2>
<div style="background:#e3f2fd; border:1px solid #90caf9; padding:15px; border-radius:8px;">
    <p style="margin:0; font-size:0.9rem;">ℹ️ Modul ini menggunakan data dari Tab 1.</p>
</div>
<br>
<label>Versi RouterOS:</label>
<select id="rosVer">
    <option value="7" selected>RouterOS v7 (Rekomendasi)</option>
    <option value="6">RouterOS v6</option>
</select>

<hr>
<button id="genRoutingBtn" class="btn-action btn-generate">🔄 Generate Routing Script</button>
<textarea id="output_routing" readonly placeholder="Klik tombol Generate..." style="height:200px; margin-top:10px; width:100%; box-sizing:border-box; font-family:monospace;"></textarea>
`;

window.generateRoutingScript = (currentIspList) => {
    if(!currentIspList || currentIspList.length === 0) {
        return { error: true, msg: "⚠️ Data ISP Kosong. Silakan isi di Tab 1." };
    }

    const rosVer = document.getElementById("rosVer").value;
    let script = `# === 2. ROUTING, PCC & NAT CONFIGURATION ===\n`;
    
    script += `/ip firewall address-list\nadd list=LOCAL_NET address=192.168.0.0/16\nadd list=LOCAL_NET address=10.0.0.0/8\nadd list=LOCAL_NET address=172.16.0.0/12\n\n`;
    
    script += `/ip firewall mangle\n`;
    currentIspList.forEach((isp, index) => {
        script += `add chain=input in-interface="${isp.iface}" action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="Input Mark ${isp.name}"\n`;
        script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${currentIspList.length}/${index} action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="PCC ${isp.name}"\n`;
        script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
        script += `add chain=output connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
    });

    script += `\n# NAT CONFIGURATION (Source NAT)\n/ip firewall nat\n`;
    currentIspList.forEach(isp => {
        script += `add chain=srcnat out-interface="${isp.iface}" action=masquerade comment="Masquerade ${isp.name}"\n`;
    });

    if (rosVer === "7") {
        script += `\n# Routing Tables Definition\n`;
        currentIspList.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
    }

    script += `\n# PCC Routes\n/ip route\n`;
    currentIspList.forEach(isp => {
        const routeParam = (rosVer === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;
        const comment = `PCC-${isp.name}-Route`;

        if (isp.mode === "DHCP") {
            script += `add dst-address=0.0.0.0/0 gateway=1.1.1.1 ${routeParam} distance=1 comment="${comment}" disabled=yes\n`;
        } else {
            script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" ${routeParam} distance=1 comment="${comment}" check-gateway=ping\n`;
        }
    });

    if (currentIspList[0].mode === "STATIC") {
        script += `\n# Static Failover Routes\n`;
        currentIspList.forEach((isp, index) => {
             script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" distance=${index+1} check-gateway=ping comment="Main Route ${isp.name}"\n`;
        });
    }

    return { error: false, script: script };
};

document.getElementById("genRoutingBtn").onclick = () => {
    if(typeof window.generateBasicSetup === 'function') window.generateBasicSetup();
    const result = window.generateRoutingScript(window.ispList);
    
    if(result.error) {
        document.getElementById("output_routing").value = result.msg;
    } else {
        document.getElementById("output_routing").value = result.script;
    }
};