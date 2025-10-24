// === Mikrotik LB Routing & PCC Module ===
// Create UI
document.getElementById("section2").innerHTML = `
<h2>🧭 Routing & PCC Configuration</h2>

<label>Versi RouterOS:</label>
<select id="rosVer">
  <option value="6">RouterOS v6</option>
  <option value="7" selected>RouterOS v7</option>
</select><br>

<label>Mode Failover:</label>
<select id="failMode">
  <option value="RECURSIVE" selected>Recursive</option>
  <option value="LOCAL">Local</option>
</select><br>

<label>IP Sama atau Beda?</label>
<select id="ipMode">
  <option value="BEDA" selected>Beda</option>
  <option value="SAMA">Sama</option>
</select><br>

<hr>
<div style="text-align:center">
  <button id="genRoutingBtn">Generate Config</button>
  <button id="copyRoutingBtn">Copy Config</button>
</div>

<textarea id="output_routing" readonly></textarea>
`;

// === Helper: timestamp ===
function getTimestamp() {
  const now = new Date();
  const pad = n => (n < 10 ? "0" + n : n);
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// === Generate Script ===
document.getElementById("genRoutingBtn").onclick = () => {
  const rosVer = document.getElementById("rosVer").value;
  const failMode = document.getElementById("failMode").value;
  const ipMode = document.getElementById("ipMode").value;
  const timestamp = getTimestamp();

  // Ambil data ISP dari modul pertama
  const ifaceEls = document.querySelectorAll(".iface");
  const gwEls = document.querySelectorAll(".gateway");
  const ispNameEls = document.querySelectorAll(".ispname");

  const ispList = [];
  for (let i = 0; i < ifaceEls.length; i++) {
    ispList.push({
      iface: ifaceEls[i].value || `ether${i+1}`,
      gw: gwEls[i].value || `192.168.${i+1}.1`,
      name: ispNameEls[i].value || `ISP${i+1}`
    });
  }

  const totalISP = ispList.length;
  let script = `# =========================================================
# PCC Loadbalance Tools by @DmiBot
# Generated on: ${timestamp}
# =========================================================

# === ROUTING & PCC CONFIGURATION ===
`;

  // Bypass Local Networks
  script += `
# Bypass All Local Networks
/ip firewall mangle
add chain=prerouting dst-address=10.0.0.0/8 action=accept
add chain=prerouting dst-address=172.16.0.0/12 action=accept
add chain=prerouting dst-address=192.168.0.0/16 action=accept
`;

  if (rosVer === "7") {
    // RouterOS v7 - create routing tables dynamically
    script += `\n# Create Routing Tables (RouterOS v7)\n/routing/table\n`;
    ispList.forEach(isp => {
      script += `add name=to_${isp.name} fib\n`;
    });
  }

  // PCC Rules
  script += `\n# PCC Load Balancing Rules\n/ip firewall mangle\n`;
  ispList.forEach((isp, index) => {
    script += `add chain=prerouting in-interface-list=LAN per-connection-classifier=both-addresses-and-ports:${totalISP}/${index} action=mark-connection new-connection-mark=${isp.name}_conn passthrough=yes comment="${isp.name}"\n`;
  });

  ispList.forEach(isp => {
    script += `add chain=prerouting connection-mark=${isp.name}_conn action=mark-routing new-routing-mark=to_${isp.name} passthrough=no comment="${isp.name}"\n`;
  });

  // Routes
  script += `\n# Static Routes\n/ip route\n`;
  ispList.forEach(isp => {
    if (rosVer === "6") {
      script += `add dst-address=0.0.0.0/0 gateway=${isp.gw} routing-mark=to_${isp.name} comment="${isp.name} by@DmiBot"\n`;
    } else {
      script += `add dst-address=0.0.0.0/0 gateway=${isp.gw} routing-table=to_${isp.name} comment="${isp.name} by@DmiBot"\n`;
    }
  });

  // Failover Logic
  script += `\n# Failover Config (${failMode})\n/ip route\n`;
  if (failMode === "RECURSIVE") {
    ispList.forEach((isp, index) => {
      const distance = index + 1;
      const dnsTarget = index === 0 ? "8.8.8.8" : "1.1.1.1";
      script += `add dst-address=${dnsTarget} gateway=${isp.gw} check-gateway=ping comment="${isp.name} by@DmiBot"\n`;
      script += `add dst-address=0.0.0.0/0 gateway=${dnsTarget} distance=${distance} comment="${isp.name} Recursive by@DmiBot"\n`;
    });
  } else {
    ispList.forEach((isp, index) => {
      const distance = index + 1;
      script += `add dst-address=0.0.0.0/0 gateway=${isp.gw} distance=${distance} comment="${isp.name} Local by@DmiBot"\n`;
    });
  }

  document.getElementById("output_routing").value = script.trim();
  window.routingOutput = script.trim(); // share ke portal utama
};

// === Copy Config ===
document.getElementById("copyRoutingBtn").onclick = () => {
  const t = document.getElementById("output_routing");
  t.select(); t.setSelectionRange(0,99999);
  navigator.clipboard.writeText(t.value);
  alert("Routing Config Copied!");
};
