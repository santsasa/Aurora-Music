# Changelog de Aurora Music

Todas las versiones listadas son **experimentales**. Hasta ejecutar pruebas en hardware real, no se garantiza compatibilidad universal.

## Sin publicar

- Corregido el arranque de la API para que registre también las rutas de radios.
- La variante de Portainer repara la propiedad de la caché persistente de OwnTone antes de iniciarlo.
- Interfaz web y conexión Android con selector de español, inglés, portugués, francés, alemán e italiano; preferencia guardada en cada navegador o instalación de la app.
- Corregido el flujo de Android en GitHub Actions para evitar el paquete SDK retirado `tools`.

## [0.3.0] — 2026-10-18

### Añadido
- Sección independiente **Radios online** y selección de país (en Ajustes o la pestaña Radios).
- Integración con el directorio comunitario **Radio Browser**, buscador de estaciones por nombre y país.
- Favoritos de radios persistentes en SQLite, y reproducción directa desde el navegador.
- Caché del directorio y filtro de URLs de estación para evitar destinos locales en los metadatos.
- **Proyecto cliente Android** bajo `android-app/`, con WebView y pantalla de conexión al servidor.
- Flujo de compilación de APK debug en GitHub Actions (`.github/workflows/android-apk.yml`).
- Tests de países, favoritos, autenticación y validación de URLs de radios.

### Limitaciones
- El streaming de radios es desde el navegador, no se retransmite ni transcodifica automáticamente desde la Raspberry.
- El control de radios a Chromecast/AirPlay aún no está implementado.
- El APK debug se compila en GitHub Actions, pero no se ha validado en un teléfono real.
- El cliente Android no garantiza reproducción en segundo plano ni Android Auto.

## [0.2.0] — 2026-10-18

- Búsqueda de letras sincronizadas mediante LRCLIB, caché y selector de variantes.
- Prioridad de letras `.lrc` locales; API de selección de coincidencias.
- Configuración de privacidad para letras online.

## [0.1.0] — 2026-10-18

- Primera versión con biblioteca local, reproducción web, playlists, favoritos y escaneo.
- Transcodificación bajo demanda mediante FFmpeg.
- Interfaz Liquid Glass / Material 3, cola, EQ básico y temporizador.
- Integración inicial con OwnTone para AirPlay y Chromecast (pendiente de validar con hardware real).
