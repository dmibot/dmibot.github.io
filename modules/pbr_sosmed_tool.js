// === PBR Sosmed Tool Logic (Optimized) ===
const sosmedDomains = {
  "Facebook": [".facebook.com", ".fbcdn.net", ".fbsbx.com", ".messenger.com"],
  "Instagram": [".instagram.com", ".cdninstagram.com"],
  "TikTok": [".tiktok.com", ".byteoversea.com", ".tiktokcdn.com", ".tiktokv.com"],
  "YouTube": [".youtube.com", ".googlevideo.com", ".ytimg.com", ".youtu.be"],
  "Twitter": [".twitter.com", ".twimg.com", ".x.com"],
  "WhatsApp": [".whatsapp.com", ".whatsapp.net"],
  "Telegram": [".telegram.org", ".t.me"],
  "Shopee": [".shopee.co.id", ".shp.ee"],
  "Tokopedia": [".tokopedia.com"]
};

document.getElementById("generateBtn").addEventListener("click", () => {
  const ispName = document.getElementById("ispName").value;
  const gw = document.getElementById("gw").value;
  const cleanupMode = document.querySelector('input[name="cleanupMode"]:checked').value;
  const timeoutVal = document.getElementById("timeoutVal").value;
  const schedTime = document.getElementById("schedTime").value;
  const useManual = document.getElementById("manualDomainChk").checked;
  const manualList = document.getElementById("manualDomains").value;
  let basic = `# === PBR Sosmed RAW & Mangle ===\n/ip firewall raw\nadd chain=prerouting action=accept dst-address-list=LOCAL_NET comment="Bypass Local Traffic"\n`;

  for (const [app, domains] of Object.entries(sosmedDomains)) {
    domains.forEach(domain => {
      let rule = `add chain=prerouting content="${domain}" action=add-dst-to-address-list address-list="${app}"`;
      if (cleanupMode === "timeout") rule += ` address-list-timeout=${timeoutVal}`;
      basic += `${rule} comment="${app}"\n`;
    });
  }

  if (useManual && manualList) {
    const mDomains = manualList.split(",").map(s => s.trim()).filter(s => s !== "");
    mDomains.forEach(domain => {
        let rule = `add chain=prerouting content="${domain}" action=add-dst-to-address-list address-list="MANUAL_SOSMED"`;
        if (cleanupMode === "timeout") rule += ` address-list-timeout=${timeoutVal}`;
        basic += `${rule} comment="Manual Domain"\n`;
    });
  }

  basic += `\n/ip firewall mangle\n`;
  const apps = Object.keys(sosmedDomains);
  if(useManual) apps.push("MANUAL_SOSMED");
  apps.forEach(app => {
      basic += `add chain=prerouting dst-address-list="${app}" action=mark-routing new-routing-mark="${ispName}" passthrough=no comment="Route ${app} to ${ispName}"\n`;
  });

  let routing = `# === Routing Configuration ===\n# Pastikan Table ada di v7\n/ip route\nadd dst-address=0.0.0.0/0 gateway=${gw} routing-mark=${ispName} comment="Sosmed Route to ${ispName}"\n`;

  if (cleanupMode === "scheduler") {
    const [h, m] = schedTime.split(":");
    const mikrotikListArray = apps.map(a => `"${a}"`).join(";");
    routing += `\n/system scheduler\nadd name="cleanup_sosmed_daily" start-time=${h}:${m}:00 interval=1d on-event={\n    :local lists {${mikrotikListArray}};\n    :foreach k in=$lists do={\n        /ip firewall address-list remove [find list=$k]\n    }\n    :log info "Sosmed Address Lists Cleaned (Auto)"\n} comment="Auto Cleanup by DmiBot"\n`;
  }
  document.getElementById("outputBasic").value = basic.trim();
  document.getElementById("outputRouting").value = routing.trim();
});

document.getElementById("copyBasic").onclick = () => { const t = document.getElementById("outputBasic"); t.select(); navigator.clipboard.writeText(t.value); };
document.getElementById("copyRouting").onclick = () => { const t = document.getElementById("outputRouting"); t.select(); navigator.clipboard.writeText(t.value); };
