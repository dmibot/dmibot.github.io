#!/bin/bash

echo "🔄 Membuat Tools DNS Adlist Generator baru..."

# Pastikan folder modules ada
mkdir -p modules

# 1. BUAT MODUL ADLIST LOGIC
cat << 'EOF' > modules/adlist_logic.js
// === Mikrotik DNS Adlist Logic Module ===

// Mapping Adlist default yang sering digunakan
const DEFAULT_ADLISTS = [
    { url: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts", name: "Steven Black Basic" }
];

const adlistCont = document.getElementById("adlistContainer");

// Helper: Add Adlist URL Input
window.addAdlistInput = function(url="") {
    const div = document.createElement("div");
    div.className = "list-group";
    div.style.marginBottom = "10px";
    
    div.innerHTML = `
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
            // FWD memastikan domain ini diproses oleh upstream DNS server (mengabaikan Adlist)
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
    // Muat Adlist default saat UI pertama kali dimuat
    const initialUrl = DEFAULT_ADLISTS[0].url;
    window.addAdlistInput(initialUrl);

    // Tambahkan event listener untuk tombol 'Tambah Adlist'
    document.getElementById('addAdlistBtn').addEventListener('click', () => {
        window.addAdlistInput("");
    });
});
EOF
echo "✅ modules/adlist_logic.js berhasil dibuat."

# 2. BUAT FILE HTML UTAMA
cat << 'EOF' > mikrotik_adlist_tools.html
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mikrotik Adlist DNS Generator | DmiBot</title>
<style>
    body { font-family: 'Segoe UI', sans-serif; background: #f4f6f8; padding: 20px; color: #333; }
    .card { background: white; padding: 25px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    h2 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 0; }
    label { display: block; font-weight: 600; margin-top: 10px; margin-bottom: 5px; color: #444; }
    input[type="text"], textarea, select, input[type="number"] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: monospace; }
    .btn { padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; color: white; margin-top: 15px; }
    .btn-generate { background: #388E3C; }
    .btn-copy { background: #607D8B; margin-left: 10px; }
    .list-group { margin-bottom: 15px; padding: 15px; border: 1px dashed #ccc; border-radius: 4px; }
</style>
</head>
<body>

<main style="max-width: 800px; margin: 0 auto;">
    <header style="text-align: center; margin-bottom: 30px;">
        <h1>🛡️ Mikrotik DNS Adlist Generator</h1>
        <p>Alat untuk membuat konfigurasi Adblocker terpusat menggunakan fitur <code>/ip dns adlist</code>.</p>
    </header>

    <div class="card">
        <h2>🔗 Adlist URL Configuration</h2>
        
        <div id="adlistContainer">
            </div>

        <button id="addAdlistBtn" class="btn" style="background: #1977D2; width: auto;">+ Tambah Adlist URL</button>
    </div>

    <div class="card">
        <h2>⚙️ Advanced Settings</h2>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
            <div>
                <label for="cacheSize">DNS Cache Size (KiB):</label>
                <input type="number" id="cacheSize" value="8192" min="2048" placeholder="Misal: 8192 KiB">
                <p style="font-size: 0.8rem; color: #777; margin-top: 5px;">*Disarankan 8192KiB atau lebih.</p>
            </div>
            <div>
                <label for="sslVerify">Verifikasi SSL (Keamanan):</label>
                <select id="sslVerify">
                    <option value="yes">Ya (Disarankan)</option>
                    <option value="no">Tidak</option>
                </select>
            </div>
        </div>
        
        <label for="whitelist">Whitelist (Optional - Domain yang tidak ingin diblokir, pisahkan dengan koma):</label>
        <textarea id="whitelist" rows="3" placeholder="Misal: bankmandiri.co.id, myapp.com"></textarea>
        <p style="font-size: 0.8rem; color: #777;">*Whitelist akan dibuat sebagai <code>type=FWD</code> di DNS Static.</p>
    </div>

    <div class="card">
        <h2>📦 Generate & Output</h2>
        <button onclick="window.generateAdlistScript()" class="btn btn-generate">🔄 Generate Full Adlist Script</button>
        <button onclick="window.copyOutput()" class="btn btn-copy">📋 Copy Script</button>
        
        <label for="outputScript" style="margin-top: 20px;">Hasil Script Mikrotik (.rsc):</label>
        <textarea id="outputScript" rows="15" readonly placeholder="Klik tombol Generate Script..." style="height:300px; width:100%; box-sizing:border-box; padding:10px;"></textarea>
    </div>
</main>
<footer><p style="text-align:center; padding:20px; color:#777;">&copy; 2025 DmiBot Projects</p></footer>

<script src="modules/adlist_logic.js"></script>
</body>
</html>
EOF
echo "✅ mikrotik_adlist_tools.html berhasil dibuat."

echo "==============================================="
echo "🚀 Tools DNS Adlist Anda siap!"
echo "Akses file 'mikrotik_adlist_tools.html' di browser Anda."
echo "==============================================="