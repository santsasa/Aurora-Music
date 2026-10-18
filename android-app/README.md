# Aurora Music para Android (cliente experimental)

App Android que se conecta a la web del **servidor Aurora Music v0.3** en Raspberry Pi 5.
No instala el servidor en el teléfono ni descarga toda la música: reproduce la biblioteca y radios desde tu servidor o sus fuentes públicas.

## Qué funciona

- Configuración de la URL de tu Raspberry, p. ej. `http://192.168.1.100:8787`.
- Inicio de sesión HTTP Basic compatible con el servidor de Aurora (solicita usuario y contraseña en pantalla).
- Biblioteca local, búsqueda, reproducción, letras, playlists, ajustes y radios online usando la misma web responsiva del servidor.
- Selector Liquid Glass / Material 3 disponible en Ajustes web.
- Selector de idioma en la pantalla de conexión y en los Ajustes web: español, inglés, portugués, francés, alemán e italiano. La elección se guarda en las preferencias de la app y en el almacenamiento local de WebView; no se envía al servidor.
- Controles de Chromecast y AirPlay vía API del servidor OwnTone, sujetos a las limitaciones del servidor y hardware.
- Guardado de la URL de conexión; **la app no guarda usuario ni contraseña en SharedPreferences**.

## Limitaciones iniciales

- Cliente basado en Android WebView, no aplicación nativa completa.
- La reproducción estable en segundo plano, notificaciones multimedia, controles en pantalla de bloqueo y Android Auto **no están implementados ni garantizados**.
- Algunas emisoras usan formatos no compatibles con Android WebView o servidores de streaming caídos.
- La reproducción de radios por Chromecast/AirPlay no está implementada todavía; las radios se escuchan en el dispositivo.
- Si el servidor cambia de IP, tocá **Servidor** para corregirlo. Recomendamos asignar IP reservada por DHCP.
- Si usás `http://` (normal en LAN), **Basic Auth envía credenciales sin cifrar**. Solo usar en redes privadas confiables. Para conexiones desde Internet emplear HTTPS o VPN; no abrir puertos en el router.

## Obtener un APK de prueba

Este repo incluye un flujo de GitHub Actions: `.github/workflows/android-apk.yml`. Después de publicar el repo:
1. Abrí GitHub → **Actions** → **Android APK (debug)** → **Run workflow**.
2. Al finalizar, descargá el artifact `aurora-music-android-debug`.
3. Extraé `app-debug.apk` e instalalo en Android autorizando la instalación para esa fuente, solo si confiás en el archivo que acabás de compilar.

El APK debug está firmado automáticamente con una clave de desarrollo y **no es adecuado para publicar en Google Play**.

## Compilar localmente con Android Studio

1. Instalá Android Studio con JDK 17 y Android SDK 35.
2. Abrí la carpeta `android-app/` (donde está `settings.gradle`).
3. Sincronizá Gradle. Compilá `app` en modo **debug**.
4. Obtené `android-app/app/build/outputs/apk/debug/app-debug.apk`.

Si preferís línea de comandos, instalá Gradle 8.11.1 y Android SDK 35, y ejecutá desde `android-app`:

```bash
gradle :app:assembleDebug
```

Se requiere conexión a Internet al compilar para descargar las dependencias del SDK/Gradle.
