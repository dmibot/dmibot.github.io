# Security Policy

- Use HTTPS endpoints for all external requests to avoid mixed content.
- Avoid including unknown third‑party scripts. Prefer first‑party modules under `/modules`.
- If you find a vulnerability, please open an issue or contact the maintainer privately.
- For DoH/DoT helpers:
  - RouterOS **DoH** is supported in `/ip dns` on v7.
  - RouterOS `/ip dns` does **not** support DoT natively; use a local proxy (e.g., AdGuard Home) and point `/ip dns servers` to the proxy LAN IP.
  - Follow the hardening notes included in the DoT Proxy Helper block.
