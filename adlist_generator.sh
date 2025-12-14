#!/bin/bash

echo "🔄 Memperbarui modules/adlist_logic.js dengan daftar filter agresif..."

# 1. PERBAHARUI MODUL ADLIST LOGIC (modules/adlist_logic.js)
cat << 'EOF' > modules/adlist_logic.js
// === Mikrotik DNS Adlist Logic Module ===

// Mapping Adlist default yang sering digunakan (Daftar Agresif dari Permintaan Pengguna)
const DEFAULT_ADLISTS = [
    // 1. SBC.io - Agresif (Fakenews, Gambling, Porn, Social)
    { url: "http://sbc.io/hosts/alternates/fakenews-gambling-porn-social/hosts", name: "sbc.io - Full Block (Aggressive)" },
    
    // 2. IgorKha - AdGuard Aggregated (Menggunakan format Hosts/TXT yang kompatibel dengan Adlist Mikrotik)
    { url: "https://raw.githubusercontent.com/IgorKha/mikrotik-adlist/main/hosts/adguard.txt", name: "IgorKha (AdGuard Aggregated)" },
    
    // 3. HaGeZi - Multi Ultimate (Sangat Agresif dan Luas)
    { url: "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/hosts/multi.ultimate.txt", name: "HaGeZi Multi ULTIMATE Hosts" }
];

const adlistCont = document.getElementById("adlistContainer");

// Helper: Add Adlist URL Input
window.addAdlistInput = function(url="", name="") {
    const div = document.createElement("div");
    div.className = "list-group";
    div.style.marginBottom = "10px";
    
    // Menambahkan label untuk identifikasi list yang terisi otomatis
    const listName = name ? `<p style="font-size:0.8rem; margin: 0 0 5px 0; color:#1976D2;">${name}</p>` : '';

    div.innerHTML = `
        ${listName}
        <label style="font-size:0.9rem; font-weight:600;">Adlist URL:</label>
        <input type="text" class="adlistUrl" value="${url}" placeholder="https://..." required style="width:100%; padding:8px; box-sizing:border-box;">
        <button onclick="this.parentElement.remove()" class="btn-remove" style="background:#D32F2F; color:white; border:none; margin-top:5px; padding:5px 10px; font-size:0.8rem; border-radius:4px; cursor:pointer;">Hapus</button>
    `;
    adlistCont.appendChild(div);
};

// 1. GENERATOR LOGIC UTAMA
window.generateAdlistScript = function() {
    const output = document.getElementById("outputScript");
    let script = `# ==========================================\n`;
    script += `# MIKROTIK DNS ADLIST CONFIG (.rsc)\n`;
    script += `# Generated: ${new Date().toLocaleString()}\n`;
    script += `# WARNING: Daftar ini sangat agresif dan dapat memblokir fungsi non-iklan.\n`;
    script += `# ==========================================\n\n`;

    const cacheSize = document.getElementById("cacheSize").value;
    const sslVerify = document.getElementById("sslVerify").value;
    const whitelistRaw = document.getElementById("whitelist").value;
    
    // --- STEP 1: CACHE & SETUP ---
    script += `# 1. Set DNS Cache Size (Diperlukan untuk menyimpan ribuan entri Adlist)\n`;
    if (cacheSize && parseInt(cacheSize) >= 2048) {
        script += `/ip dns set cache-size=${cacheSize}KiB\n\n`;
    } else {
        script += `# Peringatan: Cache size tidak diubah atau terlalu kecil. Disarankan minimal 8192KiB.\n\n`;
    }

    // --- STEP 2: CLEAR OLD ADLISTS ---
    script += `# 2. Hapus semua Adlist lama dan Static Whitelist\n`;
    script += `/ip dns adlist remove [find]\n`;
    script += `/ip dns static remove [find comment~"ADLIST-WHITELIST"]\n\n`;
    

    // --- STEP 3: ADD NEW ADLISTS ---
    script += `# 3. Tambahkan Adlist URL\n`;
    const urlInputs = document.querySelectorAll(".adlistUrl");
    let urlCount = 0;
    
    urlInputs.forEach(input => {
        const url = input.value.trim();
        if (url) {
            script += `/ip dns adlist add url="${url}" ssl-verify=${sslVerify}\n`;
            urlCount++;
        }
    });

    if (urlCount === 0) {
        output.value = "⚠️ ERROR: Masukkan setidaknya satu Adlist URL!";
        return;
    }

    // --- STEP 4: ADD WHITELIST (DNS STATIC FWD) ---
    script += `\n# 4. Tambahkan Whitelist (Menggunakan DNS Static FWD Entry)\n`;
    
    const whitelistDomains = whitelistRaw.split(',').map(d => d.trim()).filter(d => d !== "");
    
    if (whitelistDomains.length > 0) {
        whitelistDomains.forEach(domain => {
            // FWD memastikan domain ini diteruskan ke Upstream DNS server (mengabaikan Adlist)
            script += `/ip dns static add name="${domain}" type=fwd comment="ADLIST-WHITELIST: ${domain}"\n`;
        });
        script += `# Whitelist ditambahkan. Gunakan type=fwd untuk memastikan domain tidak diblokir.\n`;
    } else {
        script += `# Tidak ada domain yang dimasukkan dalam Whitelist.\n`;
    }
    
    script += `\n# Selesai. Adlist akan otomatis diunduh dan diperbarui setiap 4 jam.\n`;

    output.value = script;
};

// 2. Button Actions
window.copyOutput = function() {
    const ta = document.getElementById("outputScript");
    ta.select(); navigator.clipboard.writeText(ta.value).then(() => { alert("✅ Adlist Script Copied!"); });
};

// 3. Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Muat semua Adlist default saat UI pertama kali dimuat
    DEFAULT_ADLISTS.forEach(item => {
        window.addAdlistInput(item.url, item.name);
    });

    // Tambahkan event listener untuk tombol 'Tambah Adlist'
    document.getElementById('addAdlistBtn').addEventListener('click', () => {
        window.addAdlistInput("");
    });
});
EOF
echo "✅ modules/adlist_logic.js telah diperbarui dengan 3 Adlist agresif."

echo "==============================================="
echo "Tools Adlist sekarang siap dengan daftar default baru."
echo "==============================================="