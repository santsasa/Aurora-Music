# Security

Aurora Music 0.3.1 is an experimental application intended **only for a private LAN**.

- Do not expose container ports to the Internet. HTTP Basic authentication does not encrypt credentials without HTTPS.
- Choose a long, unique password in `.env`. Do not attach `.env`, `data/library.db`, or logs that expose tokens to issues.
- For remote access, use a VPN or a reverse proxy with TLS and additional access controls.
- Report sensitive security issues privately to the person responsible for your installation; do not publish exploits containing third-party data.
- Remote lyrics send metadata (not audio files) to LRCLIB; you can disable this feature.
- No independent security audit has been performed.
