// === PBR Game Calculator by @DmiBot ===

// Helper: Timestamp
function getTimestamp() {
  const now = new Date();
  const pad = n => (n < 10 ? "0" + n : n);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// === Game Port Database (Update 12 Jan 2025) ===
const gamePorts = {
  "Mobile Legends": {
    tcp: [
      "5000-5221,5224-5227,5229-5241,5243-5287,5289-5352,5354-5509,5517,5520-5529",
      "5551-5569,5601-5700,9000-9010,9443,10003,30000-30900"
    ],
    udp: [
      "2702,3702,4001-4009,5000-5221,5224-5241,5243-5287,5289-5352,5354-5509",
      "5507,5517-5529,5551-5569,5601-5700,8001,8130",
      "9000-9010,9120,9992,10003,30000-30900"
    ]
  },
  "Free Fire": {
    tcp: [
      "6006,6008,6674,7000-7999,8001-8012,9006,9137,10000-10015,11000-11019",
      "12006,12008,13006,15006,20561,39003,39006,39698,39779,39800"
    ],
    udp: [
      "6006,6008,6674,7000-7999,8008,8001-8012,8130,8443,9008,9120",
      "10000-10015,10100,11000-11019,12008,13008"
    ]
  },
  "PUBG Mobile": {
    tcp: ["7889,10012,13004,14000,17000,17500,18081,20000-20002,20371"],
    udp: ["8011,9030,10491,10612,12235,13004,13748,14073,17000,17500,20000-20002",
          "7086-7995,10039,10096,11096,11455,12070-12460,13894,13972,41182-41192"]
  },
  "Call of Duty": {
    tcp: ["3013,10000-10019,18082,50000,65010,65050"],
    udp: ["7085-7995,8700,9030,10010-10019,17000-20100"]
  },
  "Arena of Valor": {
    tcp: ["10001-10094"],
    udp: ["10101-10201,10080-10110,17000-18000"]
  },
  "Stumble Guys": { tcp: ["5055-5058"], udp: ["5055-5058"] },
  "Genshin Impact": { tcp: ["42472"], udp: ["42472,22101-22102"] },
  "Clash of Clans": { tcp: ["9330-9340"], udp: ["9330-9340"] },
  "League of Legends": { tcp: ["2080-2099"], udp: ["5100"] },
  "DOTA2": { tcp: ["9100-9200,8230-8250,8110-8120,27000-28998"], udp: ["27000-28998,39000"] },
  "FIFA Online": { tcp: ["7770-7790"], udp: ["16300-16350"] },
  "Point Blank Mobile": { tcp: ["44590-44610"], udp: ["40000-40010"] },
  "LINE Get Rich": { tcp: ["10500-10515"], udp: [] },
  "Dream League Soccer": { tcp: [], udp: ["60970-60980"] },
  "Among Us": { tcp: ["27015-27030,27036-27037"], udp: ["4380,27000-27031,27036"] },
  "Roblox": { tcp: [], udp: ["49152-65535"] }
};

// === Generate Button ===
document.getElementById("generateBtn").addEventListener("click", () => {
  const rosVer = document.getElementById("rosVer").value;
  const ispName = document.getElementById("ispName").value.trim() || "to_Telkom";
  const iface = document.getElementById("ispInterface").value.trim() || "ether4";
  const gw = document.getElementById("ispGateway").value.trim() || "172.16.0.1";
  const priority = document.getElementById("priority").value || "1";
  const bwUp = document.getElementById("bwUp").value.trim() || "5M";
  const bwDown = document.getElementById("bwDown").value.trim() || "5M";
  const timestamp = getTimestamp();

  const gameList = [];

  // === Multi Preset ===
  const selectedGames = Array.from(document.getElementById("gameSelect").selectedOptions).map(o => o.value);
  for (const g of selectedGames) {
    if (gamePorts[g]) gameList.push({ name: g, ...gamePorts[g] });
  }

  // === Multi Manual ===
  const manualBlocks = document.querySelectorAll(".manual-block");
  manualBlocks.forEach(block => {
    const name = block.querySelector(".manualName").value.trim();
    const portText = block.querySelector(".manualPort").value.trim();
    if (name && portText) {
      const manual = { name, tcp: [], udp: [] };
      const lines = portText.split(/\n|;/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (line.startsWith("tcp:")) manual.tcp.push(line.replace("tcp:", "").trim());
        else if (line.startsWith("udp:")) manual.udp.push(line.replace("udp:", "").trim());
      }
      gameList.push(manual);
    }
  });

  if (gameList.length === 0) {
    alert("⚠️ Pilih minimal satu game preset atau isi game manual!");
    return;
  }

  // === OUTPUT ===
  let basic = `# =========================================================
# PBR Game Calculator by @DmiBot
# Generated on: ${timestamp}
# =========================================================
/ip firewall mangle`;

  let routing = "";
  if (rosVer === "7") routing += `/routing/table add name=${ispName} fib comment="PBR Game Table by@DmiBot"\n`;
  routing += `/ip route`;

  // === Loop tiap game ===
  for (const game of gameList) {
    const gName = game.name.replace(/\s+/g, "_");

    // TCP Lines
    for (const tcpLine of game.tcp || []) {
      if (!tcpLine) continue;
      basic += `\nadd chain=prerouting protocol=tcp dst-port=${tcpLine} action=mark-connection new-connection-mark=${gName}_conn passthrough=yes comment="${game.name} by@DmiBot"`;
    }

    // UDP Lines
    for (const udpLine of game.udp || []) {
      if (!udpLine) continue;
      basic += `\nadd chain=prerouting protocol=udp dst-port=${udpLine} action=mark-connection new-connection-mark=${gName}_conn passthrough=yes comment="${game.name} by@DmiBot"`;
    }

    // Mark Routing
    basic += `\nadd chain=prerouting connection-mark=${gName}_conn action=mark-routing new-routing-mark=${ispName} passthrough=no comment="${game.name} by@DmiBot"\n`;

    // Routing & Queue
    routing += `\nadd dst-address=0.0.0.0/0 gateway=${gw} routing-mark=${ispName} comment="${game.name} by@DmiBot"`;
    routing += `\n/queue simple add name="${game.name}" max-limit=${bwUp}/${bwDown} priority=${priority} queue=pcq-upload-default/pcq-download-default comment="${game.name} QoS by@DmiBot"\n`;
  }

  document.getElementById("outputBasic").value = basic.trim();
  document.getElementById("outputRouting").value = routing.trim();
});

// === Copy Buttons ===
document.getElementById("copyBasic").addEventListener("click", () => {
  const t = document.getElementById("outputBasic");
  t.select(); document.execCommand("copy");
  alert("✅ Basic Config Copied!");
});
document.getElementById("copyRouting").addEventListener("click", () => {
  const t = document.getElementById("outputRouting");
  t.select(); document.execCommand("copy");
  alert("✅ Routing Config Copied!");
});
