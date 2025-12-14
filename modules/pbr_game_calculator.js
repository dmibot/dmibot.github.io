// === PBR Game Calculator Logic (Optimized) ===
const gamePorts = {
  "Mobile Legends": { tcp: ["5000-5221,5224-5227,5229-5241,9000-9010"], udp: ["5000-5221,5224-5241,5500-5700,8001,9000-9010,30000-30300"] },
  "PUBG Mobile": { tcp: ["10012,17500,18081,20000-20002"], udp: ["10010-10650,11000-14000,17000,17500,20000-20002"] },
  "Free Fire": { tcp: ["7000-9000,10000-10009"], udp: ["7000-9000,10000-10009"] },
  "Valorant": { tcp: ["2099,5222-5223,8088"], udp: ["5000-5500"] },
  "Roblox": { tcp: ["443"], udp: ["49152-65535"] }
};
const joinPorts = (arr) => arr ? arr.join(',') : "";

document.getElementById('addManualBtn').addEventListener('click', () => {
    const container = document.getElementById('manualGameList');
    const div = document.createElement('div');
    div.style.border="1px dashed #ccc"; div.style.padding="10px"; div.style.marginTop="5px";
    div.innerHTML = `<input class="mName" placeholder="Nama Game"><input class="mTcp" placeholder="Port TCP (contoh: 80,443)"><input class="mUdp" placeholder="Port UDP (contoh: 5000-6000)"><button type="button" onclick="this.parentElement.remove()" style="background:red;padding:5px;">Hapus</button>`;
    container.appendChild(div);
});

document.getElementById("generateBtn").addEventListener("click", () => {
  const rosVer = document.getElementById("rosVer").value;
  const ispName = document.getElementById("ispName").value;
  const gw = document.getElementById("gw").value;
  const bwUp = document.getElementById("bwUp").value;
  const bwDown = document.getElementById("bwDown").value;
  let selectedGames = [];
  document.querySelectorAll('.game-chk:checked').forEach(c => {
      selectedGames.push({ name: c.value, ...gamePorts[c.value] });
  });
  document.querySelectorAll('#manualGameList div').forEach(d => {
      const name = d.querySelector('.mName').value;
      const tcp = d.querySelector('.mTcp').value;
      const udp = d.querySelector('.mUdp').value;
      if(name) selectedGames.push({ name, tcp: tcp ? [tcp] : [], udp: udp ? [udp] : [] });
  });

  let basic = `# === PBR Game Mangle (Optimized) ===\n/ip firewall mangle\n`;
  let routing = "";
  if (rosVer === "7") {
    routing += `/routing table add name="${ispName}" fib\n`;
    routing += `/ip route add dst-address=0.0.0.0/0 gateway="${gw}" routing-table="${ispName}" comment="Game Route"\n`;
  } else {
    routing += `/ip route add dst-address=0.0.0.0/0 gateway="${gw}" routing-mark="${ispName}" comment="Game Route"\n`;
  }
  routing += `\n# Single QoS Queue\n`;
  routing += `/queue simple add name="Global_Game_QoS" target="" max-limit="${bwUp}M/${bwDown}M" packet-marks="GlobalGame_Pkt" queue=pcq-upload-default/pcq-download-default\n`;

  selectedGames.forEach(game => {
    const safeName = game.name.replace(/\s+/g, "_");
    const tcp = joinPorts(game.tcp);
    const udp = joinPorts(game.udp);
    if (tcp) basic += `add chain=prerouting in-interface="bridge-LAN" protocol=tcp dst-port=${tcp} action=mark-connection new-connection-mark="${safeName}_conn" passthrough=yes comment="${game.name}"\n`;
    if (udp) basic += `add chain=prerouting in-interface="bridge-LAN" protocol=udp dst-port=${udp} action=mark-connection new-connection-mark="${safeName}_conn" passthrough=yes comment="${game.name}"\n`;
    basic += `add chain=prerouting connection-mark="${safeName}_conn" action=mark-packet new-packet-mark="GlobalGame_Pkt" passthrough=yes\n`;
    basic += `add chain=prerouting connection-mark="${safeName}_conn" action=mark-routing new-routing-mark="${ispName}" passthrough=no\n`;
  });
  document.getElementById("outputBasic").value = basic.trim();
  document.getElementById("outputRouting").value = routing.trim();
});
