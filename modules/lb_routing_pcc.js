// === Mikrotik LB Routing & PCC Module ===

document.getElementById("section2").innerHTML = `
<h2>🧭 Routing, PCC & NAT</h2>
<div style="background:#e8f0fe; padding:15px; border-radius:6px; margin-bottom:20px; border:1px solid #d0e2ff;">
    <p style="margin:0; font-size:0.9rem;">ℹ️ Modul ini mengambil data ISP dari Tab 1.</p>
</div>
<br>
<label>Versi RouterOS:</label>
<select id="rosVer"><option value="7" selected>RouterOS v7 (Rekomendasi)</option><option value="6">RouterOS v6</option></select>
<hr>
<button id="genRoutingBtn" class="btn-action btn-blue">🔄 Generate Routing Script</button>
<textarea id="output_routing" readonly placeholder="Klik tombol Generate..." style="height:200px; margin-top:10px; width:100%; box-sizing:border-box; font-family:monospace;"></textarea>
`;

window.generateRoutingScript = (currentIspList) => {
    if(!currentIspList || currentIspList.length === 0) return { error: true, msg: "⚠️ Data ISP Kosong. Isi Tab 1 dulu." };

    const rosVer = document.getElementById("rosVer").value;
    let script = `# === 2. ROUTING, PCC & NAT CONFIG ===\n`;
    
    // Address List
    script += `/ip firewall address-list\nadd list=LOCAL_NET address=192.168.0.0/16\nadd list=LOCAL_NET address=10.0.0.0/8\nadd list=LOCAL_NET address=172.16.0.0/12\n\n`;
    
    // Mangle PCC
    script += `/ip firewall mangle\n`;
    currentIspList.forEach((isp, index) => {
        script += `add chain=input in-interface="${isp.iface}" action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes\n`;
        script += `add chain=prerouting in-interface="bridge-LAN" dst-address-list=!LOCAL_NET per-connection-classifier=both-addresses-and-ports:${currentIspList.length}/${index} action=mark-connection new-connection-mark="${isp.name}_conn" passthrough=yes comment="PCC ${isp.name}"\n`;
        script += `add chain=prerouting in-interface="bridge-LAN" connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
        script += `add chain=output connection-mark="${isp.name}_conn" action=mark-routing new-routing-mark="to_${isp.name}" passthrough=no\n`;
    });

    // NAT (Masquerade) - WAJIB ADA AGAR INTERNET JALAN
    script += `\n# NAT CONFIGURATION (PENTING)\n/ip firewall nat\n`;
    currentIspList.forEach(isp => {
        script += `add chain=srcnat out-interface="${isp.iface}" action=masquerade comment="NAT ${isp.name}"\n`;
    });

    // Routing Tables
    if (rosVer === "7") {
        script += `\n# Routing Tables\n`;
        currentIspList.forEach(isp => script += `/routing table add name="to_${isp.name}" fib\n`);
    }

    // Routes
    script += `\n# PCC Routes\n/ip route\n`;
    currentIspList.forEach(isp => {
        const routeParam = (rosVer === "7") ? `routing-table="to_${isp.name}"` : `routing-mark="to_${isp.name}"`;
        const comment = `PCC-${isp.name}-Route`;

        if (isp.mode === "DHCP") {
            // MODE DHCP: Gunakan Dummy Gateway (1.1.1.1) agar tidak error 'invalid argument'. 
            // Script 'Smart DHCP' di Tab 1 akan otomatis menggantinya dengan IP asli saat konek.
            script += `add dst-address=0.0.0.0/0 gateway=1.1.1.1 ${routeParam} distance=1 comment="${comment}" disabled=yes\n`;
        } else {
            // MODE STATIC
            script += `add dst-address=0.0.0.0/0 gateway="${isp.gw}" ${routeParam} distance=1 comment="${comment}" check-gateway=ping\n`;
        }
    });

    // Static Failover (hanya untuk mode static, DHCP sudah otomatis)
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
    document.getElementById("output_routing").value = result.error ? result.msg : result.script;
};