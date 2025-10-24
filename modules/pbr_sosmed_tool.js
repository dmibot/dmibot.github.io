// === PBR Sosmed Tool by @DmiBot ===

// Timestamp generator
function getTimestamp() {
  const now = new Date();
  const pad = n => (n < 10 ? "0" + n : n);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// === Daftar domain sosial media (update 2025) ===
const sosmedDomains = {
  "Facebook": [".facebook.com", ".fbcdn.net", ".fbsbx.com", ".messenger.com"],
  "Instagram": [".instagram.com", ".cdninstagram.com"],
  "TikTok": [".tiktok.com", ".byteoversea.com", ".tiktokcdn.com"],
  "YouTube": [".youtube.com", ".googlevideo.com", ".ytimg.com"],
  "Twitter": [".twitter.com", ".twimg.com", ".x.com"],
  "WhatsApp": [".whatsapp.com", ".whatsapp.net"],
  "Telegram": [".telegram.org", ".t.me"],
  "Discord": [".discord.com", ".discord.gg", ".discordapp.net"],
  "Spotify": [".spotify.com"],
  "Netflix": [".nflxvideo.net", ".netflix.com"],
  "Threads": [".threads.net"],
  "Shopee": [".shopee.co.id", ".shp.ee"],
  "Tokopedia": [".tokopedia.com"]
};

// === Event tombol Generate ===
document.getElementById("generateBtn").addEventListener("click", () => {
  const rosVer = document.getElementById("rosVer").value;
  const ispName = document.getElementById("ispName").value.trim() || "to_Telkom";
  const iface = document.getElementById("ispInterface").value.trim() || "ether5";
  const gw = document.getElementById("ispGateway").value.trim() || "172.8.45.1";
  const cleanupMode = document.querySelector('input[name="cleanupMode"]:checked').value;
  const timeoutValue = document.getElementById("timeoutValue").value.trim() || "4h";
  const schedTime = document.getElementById("schedHour").value || "03:00";
  const timestamp = getTimestamp();

  // === Ambil sosmed terpilih ===
  const checkedBoxes = document.querySelectorAll(".sosmed-list input[type=checkbox]:checked");
  const selected = Array.from(checkedBoxes).map(el => el.value);
  const manualDomains = document.getElementById("manualDomains").value.trim();

  if (selected.length === 0 && !manualDomains) {
    alert("⚠️ Pilih minimal satu platform sosial media atau tambahkan domain manual!");
    return;
  }

  let basic = `# =========================================================
# PBR Sosmed Tool by @DmiBot
# Generated on: ${timestamp}
# =========================================================
/ip firewall raw`;
  let routing = "";

  // === RouterOS 7 routing table ===
  if (rosVer === "7") {
    routing += `/routing/table add name=${ispName} fib comment="PBR Sosmed Table by@DmiBot"\n`;
  }

  // === Tambahkan rule untuk tiap sosmed ===
  selected.forEach(app => {
    const domains = sosmedDomains[app] || [];
    const listName = app.toUpperCase().replace(/\s+/g, "_");

    domains.forEach(domain => {
      let rule = `add action=add-dst-to-address-list chain=prerouting content=${domain} address-list=${listName} dst-address-list=!lokal comment="${app} by@DmiBot"`;
      if (cleanupMode === "timeout") {
        const valid = /^(?:\d+[mhd])$/i.test(timeoutValue) ? timeoutValue : "4h";
        rule += ` address-list-timeout=${valid}`;
      } else {
        rule += ` address-list-timeout=none`;
      }
      basic += `\n${rule}`;
    });

    // === Mangle mark-routing ===
    routing += `
/ip firewall mangle
add chain=prerouting dst-address-list=${listName} action=mark-routing new-routing-mark=${ispName} passthrough=no comment="${app} by@DmiBot"
`;
  });

  // === Manual Domain Section ===
  if (manualDomains) {
    const listName = "MANUAL_SOSMED";
    const domains = manualDomains.split(",").map(d => d.trim()).filter(Boolean);
    domains.forEach(domain => {
      let rule = `add action=add-dst-to-address-list chain=prerouting content=${domain} address-list=${listName} dst-address-list=!lokal comment="Manual by@DmiBot"`;
      if (cleanupMode === "timeout") {
        const valid = /^(?:\d+[mhd])$/i.test(timeoutValue) ? timeoutValue : "4h";
        rule += ` address-list-timeout=${valid}`;
      } else {
        rule += ` address-list-timeout=none`;
      }
      basic += `\n${rule}`;
    });

    routing += `
/ip firewall mangle
add chain=prerouting dst-address-list=${listName} action=mark-routing new-routing-mark=${ispName} passthrough=no comment="Manual by@DmiBot"
`;
  }

  // === Scheduler Section (if enabled) ===
  if (cleanupMode === "scheduler") {
    const [hour, minute] = schedTime.split(":");
    routing += `
/system scheduler
add name=cleanup_sosmed start-time=${hour}:${minute} interval=1d on-event="/ip firewall address-list remove [find list~\\"FACEBOOK\\"]; /ip firewall address-list remove [find list~\\"INSTAGRAM\\"]; /ip firewall address-list remove [find list~\\"TIKTOK\\"]; /ip firewall address-list remove [find list~\\"YOUTUBE\\"]; /ip firewall address-list remove [find list~\\"TWITTER\\"]; /ip firewall address-list remove [find list~\\"MANUAL_SOSMED\\"]" comment="Auto cleanup by@DmiBot"
`;
  }

  // === Output ===
  document.getElementById("outputBasic").value = basic.trim();
  document.getElementById("outputRouting").value = routing.trim();
});

// === Copy Buttons ===
document.getElementById("copyBasic").addEventListener("click",()=>{
  const t=document.getElementById("outputBasic");
  t.select();document.execCommand("copy");
  alert("✅ Basic Config Copied!");
});
document.getElementById("copyRouting").addEventListener("click",()=>{
  const t=document.getElementById("outputRouting");
  t.select();document.execCommand("copy");
  alert("✅ Routing Config Copied!");
});
