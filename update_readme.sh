#!/bin/bash

echo "📝 Mengupdate README.md dengan Daftar Fitur Lengkap..."

cat << 'EOF' > README.md
# Mikrotik Tools Portal | DmiBot

Portal web *All-in-One* untuk generator konfigurasi Mikrotik RouterOS otomatis. Dibuat dengan logika JavaScript modular yang berjalan sepenuhnya di sisi klien (browser).

🌐 **Live Site:** [https://dmibot.github.io/](https://dmibot.github.io/)

## 🚀 Fitur Unggulan
- **Privasi Terjamin:** Semua kalkulasi dilakukan di browser Anda. Tidak ada data sensitif (IP/Password) yang dikirim ke server.
- **RouterOS v6 & v7 Ready:** Mendukung sintaks lama dan baru (termasuk Routing Table v7).
- **Copy-Paste Ready:** Output skrip langsung siap ditempel ke Terminal Mikrotik.

## 🧰 Daftar Tools
Project ini mencakup 6 modul utilitas jaringan:

### 1. ⚙️ Load Balance Generator (v3.0)
Generator PCC & Failover tercanggih dengan logika sinkronisasi otomatis.
- **Smart Logic:** Input Gateway di Tab 1, otomatis ter-sync ke Routing PCC.
- **Auto-IP Calculation:** Otomatis menghitung IP Address Mikrotik berdasarkan Gateway ISP.
- **Fitur:** - Dual WAN PCC (Per Connection Classifier).
  - Failover (Recursive Check Ping / Local Check).
  - DNS & DoH Selector (Cloudflare, Google, AdGuard).
  - Bypass Traffic Lokal otomatis.

### 2. 🎮 PBR Game Calculator
Pisahkan trafik game agar tidak terganggu download/browsing.
- **Database Port Terupdate:** Mobile Legends, PUBG, FF, Valorant, Roblox, dll.
- **Custom Game:** Bisa tambah port game manual.
- **Fitur:** Mangle, Routing Mark, dan Simple Queue otomatis.

### 3. 📱 PBR Sosmed Tool
Routing khusus untuk memisahkan trafik sosial media ke ISP tertentu.
- **Metode:** RAW Learning (Domain Content) & Mangle.
- **Platform:** TikTok, Facebook, Instagram, YouTube, Netflix, dll.
- **Fitur:** Auto Cleanup Scheduler (untuk membersihkan list IP dinamis).

### 4. 📢 Netwatch Telegram Monitor
Jangan tunggu klien komplain! Dapatkan notifikasi saat internet mati.
- **Real-time Monitoring:** Cek status Ping ke IP tertentu (Gateway/Google).
- **Bot Integration:** Generator script `fetch` ke API Telegram.
- **Output:** Pesan otomatis "🔴 DOWN" dan "✅ UP" ke HP Admin.

### 5. 🛡️ Firewall Hardening & Port Knocking
Amankan router yang terekspos ke IP Public.
- **Basic Hardening:** Drop Invalid, Block Port Scanners, Block DNS WAN.
- **Port Knocking:** Sembunyikan port Winbox! Akses hanya terbuka jika Anda melakukan "ketukan" ke urutan port rahasia (misal: 1000 -> 2000 -> 3000).

### 6. 🔐 WireGuard VPN Generator
Konfigurasi VPN modern untuk RouterOS v7.
- **Server Config:** Script interface, IP, dan Firewall otomatis.
- **Client Config:** Generator teks config `.conf` untuk HP/Laptop.
- **Visualisasi:** Panduan penempatan Public/Private Key.

## 🎨 Teknologi
- **Frontend:** HTML5, CSS3 (Modern Turquoise Theme).
- **Logic:** Vanilla JavaScript (ES6+ Modules).
- **Styling:** CSS Grid & Flexbox (Responsive Mobile/Desktop).

## 📦 Instalasi Lokal (Offline)
Jika ingin menjalankan tool ini tanpa internet:
1. Clone repo ini:
   \`\`\`bash
   git clone https://github.com/dmibot/dmibot.github.io.git
   \`\`\`
2. Buka file `index.html` di browser Chrome/Edge/Firefox.

---
&copy; 2025 **DmiBot Projects**. Dibuat dengan ❤️ untuk komunitas Mikrotik Indonesia.
EOF

echo "✅ README.md berhasil diperbarui dengan dokumentasi lengkap!"