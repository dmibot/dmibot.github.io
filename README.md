# dmibot.github.io — Mikrotik Tools Portal

> **Simple • Modular • Fast** — Client‑side tools for Mikrotik (Queue/PCQ, Load‑Balance, PBR utilities, DNS/DoH helpers), built for GitHub Pages.

---

## 🚀 Live
- **Portal:** https://dmibot.github.io/index.html

> This repo is optimized for GitHub Pages (static hosting). All logic runs **client-side** (HTML/CSS/JS) with **no server** required.

---

## ✨ Features
- **Modular SPA**: `index.html` is the shell, tools are loaded via **hash routes** and **iframe router** (CSS/JS isolation).
- **Mikrotik Queue Optimizer**: PCQ generator with per‑user rates & limits.
- **DNS / DoH Helper**: Templates for AdGuard / Cloudflare / Google / Quad9 / NextDNS (+ custom), RouterOS v7/v6.
- **DoT Proxy Helper**: AdGuard Home docker compose, hardening notes, and `/ip dns` mapping to local proxy.
- **Consent & I18N**: Privacy banner + toggle (sync across tools), **EN/ID** language switch.
- **Latency Tester**: client-side ping via fetch (respect consent).
- **Presets**: Save/Load/Delete form values per tool (localStorage).

---

## 🧱 Architecture
- **Shell**: `index.html` + `js/router.js` (iframe-based to prevent CSS/JS collisions between tools).
- **Modules**: shared logic under `modules/`:
  - `modules/mikrotik/pcq.js` — PCQ calculations.
  - `modules/net/ip.js`, `modules/net/ping.js` — IP/Geo & latency.
  - `modules/ui/copy.js`, `modules/ui/consent.js`, `modules/ui/presets.js`, `modules/ui/i18n.js` — UI helpers.
  - `modules/utils/*` — formatting, storage.
- **Styling**: `styles/base.css` (lightweight, turquoise theme).

Directory sketch:
```
/index.html               # portal shell (hash routes)
/js/router.js             # iframe router + shimmer
/styles/base.css
/modules/...
/pbr_game_calculator.html
/pbr_sosmed_tool.html
/mikrotik_load_balance_tools.html
/mikrotik_queue_optimizer.html
/mikrotik_tools_portal.html
```

---

## 🔐 Privacy & Safety (Must Read)
This site may call **third‑party APIs** (e.g., public IP + geolocation) — **only if user consent is given**.
- Consent stored in `localStorage` key: `dmibot:consent_geo`.
- Latency tester and any network helper **respect consent**.
- See **[PRIVACY.md](PRIVACY.md)** for details.

**GitHub Pages limits & good practices**:
- Static hosting only (no server‑side code). Keep all logic in JS (client).
- Keep repo size reasonable (published site ≤ ~1 GB). Avoid large assets.
- Avoid abusive content or tracking without consent.
- Prefer HTTPS APIs; avoid mixed content. We set `upgrade-insecure-requests` in HTML meta.

---

## 🧪 Local Development
Run a simple static server to test ES Modules & iframes properly:
```bash
# Python 3
python -m http.server 5500
# Then open
http://localhost:5500/index.html
```

---

## 🛠 Deploy (GitHub Pages)
- Push changes to the default branch configured for Pages (e.g., `main`).
- Access: `https://dmibot.github.io/index.html`

---

## 🌐 Tools Overview
- **Queue Optimizer** (`mikrotik_queue_optimizer.html`): PCQ per-user rates/limits + presets + consent-aware IP/Geo widget.
- **Load Balance Tools** (`mikrotik_load_balance_tools.html`): helper snippets & calculators (modular).
- **PBR Tools** (`pbr_*`): domain-specific calculators.
- **DNS Helpers** (`mikrotik_tools_portal.html` section): DoH templates, DoT proxy with AdGuard Home.
- **Latency Tester**: configurable targets (Cloudflare, Google, AdGuard, etc.).

---

## 🧭 Internationalization (EN/ID)
- Language stored in `localStorage` as `dmibot:lang`.
- Auto-detects on first visit from `navigator.language`, defaulting to **ID** for `id-*` locales.

---

## 🤝 Contributing
PRs welcome. For new tools:
1. Create a standalone HTML (and optional JS) page.
2. Use shared modules instead of global scripts when possible.
3. Add a new hash route in `js/router.js` (iframe isolation).
4. Keep CSS scoped; avoid global resets.

---

## 📄 License
MIT — see `LICENSE` (or specify your license).

---

## 🗒 Changelog
- **2025-10-25**: Switch to iframe router, add DNS/DoH helper (providers + custom), DoT proxy helper, consent/i18n sync, latency & presets.
