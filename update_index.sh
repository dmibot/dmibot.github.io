#!/bin/bash

echo "🏠 Mengupdate Dashboard Utama (index.html) dengan 6 Menu Lengkap..."

cat << 'EOF' > index.html
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mikrotik Tools Portal | DmiBot</title>
    <meta name="description" content="Kumpulan Tools Generator Script Mikrotik Otomatis - Lengkap & Gratis.">
    <link rel="icon" href="Mikrotik.svg">
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <header>
        <h1>🛠️ DmiBot Mikrotik Tools</h1>
        <p>Solusi Otomatisasi Jaringan: Cepat, Aman, & Efisien</p>
    </header>

    <main>
        <div class="menu-grid">
            <div class="menu-card" onclick="window.location.href='mikrotik_load_balance_tools.html'">
                <div class="icon">⚙️</div>
                <h3>Load Balance & PCC</h3>
                <p>Setup Dual WAN, Failover, dan Basic Network dalam sekali klik.</p>
            </div>
            
            <div class="menu-card" onclick="window.location.href='pbr_game_calculator.html'">
                <div class="icon">🎮</div>
                <h3>PBR Game Calculator</h3>
                <p>Pisahkan trafik Game ke ISP khusus dengan database port terbaru.</p>
            </div>

            <div class="menu-card" onclick="window.location.href='pbr_sosmed_tool.html'">
                <div class="icon">📱</div>
                <h3>Sosmed Routing</h3>
                <p>Routing khusus trafik Sosmed (TikTok, FB, IG) via RAW/Mangle.</p>
            </div>

            <div class="menu-card" onclick="window.location.href='telegram_monitor_tool.html'">
                <div class="icon">📢</div>
                <h3>Netwatch Telegram</h3>
                <p>Bot Notifikasi otomatis ke HP saat internet/ISP mati.</p>
            </div>

            <div class="menu-card" onclick="window.location.href='firewall_security_tool.html'">
                <div class="icon">🛡️</div>
                <h3>Firewall Hardening</h3>
                <p>Amankan Router dari serangan Brute Force & Port Knocking.</p>
            </div>

            <div class="menu-card" onclick="window.location.href='vpn_wireguard_tool.html'">
                <div class="icon">🔐</div>
                <h3>WireGuard VPN</h3>
                <p>Generator Config Server & Client untuk VPN super cepat (v7).</p>
            </div>
        </div>
    </main>

    <footer>
        <p style="text-align:center; padding:20px; color:#777;">
            &copy; 2025 DmiBot Projects | 
            <a href="https://github.com/dmibot/dmibot.github.io" style="color:#4CAF50; text-decoration:none;">GitHub Repository</a>
        </p>
    </footer>

</body>
</html>
EOF

echo "✅ Dashboard berhasil diperbarui! Semua 6 Menu sudah tampil."