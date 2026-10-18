# Seguridad

Aurora Music 0.3 es una aplicación experimental pensada **solo para LAN privada**.

- No publiques los puertos del contenedor en Internet. La autenticación HTTP Basic no cifra credenciales sin HTTPS.
- Elegí una contraseña larga y única en `.env`. No adjuntes `.env`, `data/library.db` ni logs que revelen tokens a issues.
- Para acceso remoto utilizá VPN o reverse proxy con TLS y controles adicionales.
- Reportá problemas sensibles de seguridad de forma privada al responsable de tu instalación; no publiques exploits con datos de terceros.
- Las letras remotas envían metadatos (no archivos) a LRCLIB; podés desactivar esta función.
- No se ha realizado una auditoría independiente de seguridad.
