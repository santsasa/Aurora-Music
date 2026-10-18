# Aurora Music — Servidor de música para Raspberry Pi 5

Self-hosted music server for Raspberry Pi 5 with a web player, experimental Android client, online radio, Chromecast/AirPlay output and on-demand transcoding. Servidor de música autoalojado para Raspberry Pi 5 con reproductor web, cliente Android experimental, radios online, Chromecast/AirPlay y conversión bajo demanda.

Versión experimental 0.3.0 (MVP) original, inspirada en la navegación de SimpMusic y en dos lenguajes visuales: **Liquid Glass** (inspiración Apple Music) y **Material 3** (inspiración Google). No es una copia de sus diseños, marcas ni aplicaciones.

## Funciones incluidas

- Interfaz web responsive para móvil, tablet y PC; temas Liquid Glass / Material 3.
- Interfaz en español, inglés, portugués, francés, alemán e italiano. El idioma elegido se guarda en el navegador o en la app Android.
- **Radios online** en una sección independiente, búsqueda por país, selección de país predeterminado en Ajustes, favoritos y reproducción directa desde el navegador, usando el directorio abierto Radio Browser.
- **Proyecto de app Android** conectado al servidor (`android-app/`), para compilar como APK mediante GitHub Actions o Android Studio.
- Biblioteca local en Raspberry Pi 5 o montada desde un NAS; escaneo de tags y carátulas embebidas.
- Buscar, explorar artistas y álbumes, historial, favoritos y playlists propias.
- Reproductor web con cola, aleatorio, repetir, volumen, progreso, temporizador de suspensión.
- Ecualizador web de tres bandas (graves, medios, agudos) mediante Web Audio.
- Letras sincronizadas automáticas a través de **LRCLIB**, con caché y selección manual de otra versión; archivos `.lrc` / `.txt` locales tienen prioridad.
- Conversión **al vuelo** mediante FFmpeg: MP3 128/192/320, M4A/AAC 128/256 (MP4 fragmentado), Ogg Vorbis 96/160/320, Opus 24, FLAC, y original sin conversión.
- Perfiles con tasas **aproximadas a Spotify**. No incluyen el catálogo ni la codificación exacta de Spotify. Los originales **nunca** se reemplazan.
- Compatibilidad con parlantes **AirPlay 1/2 y Chromecast** mediante OwnTone y su API. El receptor negocia su formato de salida; no necesariamente respeta la selección MP3/AAC del navegador.
- Docker Compose usando una imagen OwnTone compatible con ARM64.

## Requisitos

- Raspberry Pi 5 con **Raspberry Pi OS 64 bits** (o Linux ARM64), Docker Engine y plugin `docker compose`.
- Red LAN confiable. Equipo receptor Chromecast/AirPlay y Pi 5 visibles entre sí (mDNS). 
- Preferible SSD USB/NAS; la tarjeta microSD también funciona para una biblioteca pequeña.
- Espacio libre para biblioteca y base de datos. La transcodificación es bajo demanda; no genera copias permanentes.

## Instalación

1. Descomprimí la carpeta `aurora-music` en tu Raspberry Pi 5.
2. Desde terminal:

```bash
cd aurora-music
cp .env.example .env
nano .env
```

3. Cambiá `APP_PASSWORD` por una contraseña **larga y única** (obligatorio).
4. Configurá `MUSIC_PATH` con la carpeta de canciones. Para comenzar podés usar `./music`. Para NAS montado previamente: `/mnt/nas/musica`.
5. Si no sos UID/GID 1000, actualizá `PUID` y `PGID` con `id -u` e `id -g`.
6. Ejecutá:

```bash
mkdir -p data owntone-cache music
sudo chown -R "$(id -u):$(id -g)" data owntone-cache
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs -f --tail=100
```

7. Desde otro dispositivo en **la misma red** abrí `http://IP_DE_LA_RPI:8787` e ingresá el usuario/contraseña del `.env`.
8. Copiá canciones dentro de la carpeta `music/` o del NAS y usá el botón `⟳` para escanear. OwnTone puede tardar unos segundos más en indexarlas para reproducirlas en parlantes.
9. Para AirPlay/Chromecast, hacé clic en `▣` (barra inferior), seleccioná el receptor y reproducí una canción. En caso de que se requiera PIN de AirPlay, completá el emparejamiento desde la interfaz OwnTone `http://IP_DE_LA_RPI:3689`.

### Portainer / Portainer

**Español:** En **Stacks → Add stack → Repository**, usá la fuente pública `https://github.com/santsasa/Aurora-Music`, rama `main` y Compose path `portainer-compose.yml`. Elegí el entorno Docker **local** de la Raspberry. Esta variante usa volúmenes Docker con nombre para la biblioteca, los datos y la caché, independientes de la carpeta temporal de Git; no necesitás activar volúmenes relativos. El Stack de Portainer deja la autenticación desactivada para uso familiar dentro de la LAN (`APP_AUTH_ENABLED=false`); no publiques el puerto 8787 en Internet ni lo reenvíes en el router. `APP_USER` y `APP_PASSWORD` se pueden configurar si luego querés habilitar contraseña (`APP_AUTH_ENABLED=true`). `PUID` y `PGID` son opcionales (1000 por defecto). Comprobá que los puertos 8787 y 3689 estén libres y después pulsá **Deploy the stack**. El primer despliegue compila las imágenes en la Pi. Para usar una biblioteca ya existente, reemplazá **ambas** referencias a `aurora_music:/srv/media:ro` por la misma ruta absoluta del host, por ejemplo `/media/usb/musica:/srv/media:ro`; no borres el volumen anterior hasta verificar el cambio. Para actualizar, usá **Pull and redeploy** y verificá los logs. Si Portainer administra un Docker remoto, construí las imágenes en el host o en CI y referencialas con `image:`: Portainer documenta una limitación para `build:` en entornos remotos.

**English:** In **Stacks → Add stack → Repository**, select the public source `https://github.com/santsasa/Aurora-Music`, branch `main`, and Compose path `portainer-compose.yml`. Select the Raspberry Pi's **local** Docker environment. This variant uses named Docker volumes for music, application data, and cache, independent of Portainer's temporary Git directory. Portainer's stack disables sign-in for family use on your LAN (`APP_AUTH_ENABLED=false`); do not expose port 8787 to the Internet or forward it on your router. Set `APP_USER` and `APP_PASSWORD` if you later enable sign-in (`APP_AUTH_ENABLED=true`). `PUID` and `PGID` default to 1000. Confirm ports 8787 and 3689 are free, then deploy. The first deployment builds both images on the Pi. To use an existing library, replace **both** `aurora_music:/srv/media:ro` entries with the same absolute host path, such as `/media/usb/music:/srv/media:ro`; keep the old volume until you verify the change. On updates, use **Pull and redeploy** and check the logs. For a remote Docker environment, build the images outside Portainer and reference them with `image:` because remote Compose builds are currently limited.

### Si ya tenés OwnTone instalado

Los dos servicios se ejecutan en modo `host` para facilitar mDNS. **No puede haber otro servidor escuchando en el puerto 3689.** Ajustá el despliegue si ya lo utilizás.

## Letras sincronizadas: LRCLIB

Al iniciar una canción, Aurora busca primero un `.lrc` o `.txt` con el mismo nombre que el archivo. Si no lo encuentra:

1. Usa las letras previamente guardadas en `./data/library.db` cuando están vigentes (no las publica en GitHub).
2. Busca por título, artista, álbum y duración en [LRCLIB](https://lrclib.net/docs).
3. Guarda los resultados disponibles en caché. Las búsquedas sin resultados se vuelven a intentar después de 24 h.
4. Desde la pestaña **Letra**, usá **Actualizar** para buscar de nuevo o **Otra versión** para buscar y elegir otra coincidencia.

Las letras sincronizadas se resaltan según el tiempo de reproducción local en el navegador. Las letras sin marcas de tiempo aparecen como texto normal.

**Privacidad:** se envían metadatos musicales (título, artista, álbum y duración) a LRCLIB cuando no hay letra local ni resultado en caché. No se suben canciones. Si no querés conexiones externas, configurá `LYRICS_ONLINE_ENABLED=false` en `.env` y ejecutá `docker compose up -d`.

**Uso responsable:** LRCLIB exige identificar el cliente y respetar límites de peticiones. No se realizan búsquedas masivas durante el indexado. Una respuesta HTTP 429 provoca un tiempo de espera. No redistribuyas letras copiándolas dentro del repositorio sin los derechos necesarios.

**Limitaciones:** no hay sincronización palabra por palabra y la API de LRCLIB puede cambiar o no incluir determinados temas. El control de avance en Chromecast/AirPlay continúa gestionado por OwnTone.

## Calidad y compatibilidad

| Perfil en la interfaz | Salida | Observaciones |
|---|---|---|
| Original | Archivo intacto | Requiere compatibilidad del navegador. Seek HTTP Range disponible para archivos originales. |
| MP3 128, 192, 320 | MPEG audio | Amplia compatibilidad. |
| M4A/AAC 128, 256 | MP4 fragmentado | No todos los navegadores admiten MP4 fragmentado por streaming. |
| Spotify-like Bajo | Opus 24 kbps | Perfil propio, no códec oficial prometido. |
| Spotify-like Normal/Alta/Muy alta | Ogg Vorbis 96/160/320 | Tasas equivalentes aproximadas, no streaming del catálogo Spotify. |
| FLAC | FLAC | Solo sin pérdida si el origen ya lo es; no recupera información de MP3. |

Los flujos transcodificados no incorporan seeking HTTP Range nativo: el reproductor vuelve a crear el flujo con desplazamiento cuando adelantás la canción. El navegador debe soportar el códec/contenedor; si no, usá MP3. El modo AirPlay y Chromecast se gestiona por OwnTone con compatibilidad propia del destino.

## Qué incluye de SimpMusic y qué NO

**Sí (en esta versión):** reproducción, biblioteca, búsqueda local, carátulas, playlists locales, favoritos, historial, letras `.lrc`, búsqueda LRCLIB, caché y selección manual de versiones, cola, repetición, aleatorio, temporizador, EQ, dos temas de interfaz y selección de destino.

**Radios y Android:** directorio por país y favoritos ya disponibles; cliente Android experimental con proyecto compilable.

**Pendiente (futuras versiones):** descubrimiento de catálogos externos, charts, podcasts, streaming online de YouTube/YouTube Music, recomendaciones IA, integración de cuentas, sincronización multiusuario, descargas offline, Last.fm, Android Auto, videos, traducción automática de letras, AirPlay desde cualquier app, crossfade entre dos canciones y salas sincronizadas. No se afirma una paridad completa con SimpMusic.

**Importante:** no se incluyen música, imágenes de álbumes ni letras con derechos de autor; usá archivos y materiales para los que tengas permiso.

## Seguridad y acceso remoto

- La web usa autenticación HTTP Basic. En LAN via HTTP **la contraseña no viaja cifrada**, por lo que debe usarse solamente en una red de confianza. Para acceso remoto o redes no confiables, configurá **HTTPS** con un reverse proxy seguro o accedé por VPN (por ejemplo Tailscale). El proyecto no instala un reverse proxy.
- **No abras ni redirijas los puertos 8787 ni 3689 en el router.** OwnTone tiene su propia interfaz en `:3689`, que en esta configuración se presupone LAN confiable.
- `network_mode: host` facilita AirPlay/Chromecast/mDNS, pero comparte la red del host, de modo que es importante la protección perimetral.
- El contenedor de Aurora monta música **solo lectura**; las playlists y la base SQLite quedan dentro de `./data`.
- `.env` contiene tu contraseña: no la subas a GitHub ni la compartas. El ZIP trae exclusivamente `.env.example`, sin credenciales reales.
- Por defecto no hay HTTPS ni cuentas individuales. Para usuarios o invitados, agregaremos autorización/HTTPS en otra etapa.

## Diagnóstico

```bash
sudo docker compose ps
sudo docker compose logs -f aurora
sudo docker compose logs -f owntone
curl http://localhost:8787/health
curl http://localhost:3689/api/outputs
```

Si no aparecen AirPlay/Chromecast: verificá que la Pi y los parlantes estén en la **misma red/subred**, que el router o mesh no use aislamiento de clientes, que el multicast/mDNS funcione y que OwnTone vea los dispositivos. El emparejamiento/validación de receptores debe hacerse físicamente en tu red.

### En desarrollo local (sin Docker)

```bash
cd backend
pip install -r requirements.txt
APP_USER=admin APP_PASSWORD=clave_prueba_segura MUSIC_DIR=../music DATA_DIR=../data python main.py
```

OwnTone debe estar disponible aparte en `http://localhost:3689`. En desarrollo local las demás funciones del navegador funcionan sin OwnTone.

Pruebas:

```bash
pip install pytest httpx
python -m pytest tests -q
node --check backend/static/app.js
```

## Diseño técnico

- `backend/main.py`: FastAPI, SQLite, metadata Mutagen, streams FFmpeg y API OwnTone.
- `backend/static`: frontend responsive HTML/CSS/JS sin frameworks pesados, ideal para bajo consumo de RAM.
- `owntone/owntone.conf`: configuración del servidor de salida local.
- `docker-compose.yml`: dos servicios con `network_mode: host` para descubrimiento por mDNS.
- `music/`: carpeta opcional para música; no incluida en el ZIP.

Versión **0.3.0 / MVP experimental**. API y pantalla probadas localmente; instalación real ARM64 y emparejamiento de receptores **pendientes de verificar en una Raspberry Pi 5**.

## Radios online por país

1. Abrí **Radios online** en el menú lateral.
2. Seleccioná un país, por ejemplo Argentina (`AR`), y buscá emisoras por nombre.
3. Tocá una emisora para escucharla en el navegador o en la app Android cuando el teléfono esté conectado al servidor.
4. El corazón agrega o quita favoritas; quedan almacenadas en `./data/library.db`.
5. En **Ajustes → Radios online** elegís el país que se abrirá por defecto. La preferencia de país se recuerda en ese navegador/app.

Directorio de emisoras: [Radio Browser](https://www.radio-browser.info/), API documentada en https://docs.radio-browser.info/. El proyecto no aloja las señales: el navegador solicita el flujo de audio directamente al servidor de cada radio. Algunas emisoras no funcionan o usan códecs incompatibles; pueden existir enlaces HTTP sin cifrar. Escuchar radios requiere Internet y datos móviles si estás fuera del Wi-Fi. `RADIO_ENABLED=false` deshabilita consultas al directorio. No se recomienda publicar el servidor sin HTTPS.

**Limitación actual:** la reproducción de radio funciona en navegador/cliente Android, pero no se ha implementado todavía su envío a receptores Chromecast o AirPlay. AirPlay/Chromecast está previsto y parcialmente implementado para la **biblioteca local** mediante OwnTone.

## Aplicación Android

En `android-app/` está el **proyecto fuente** Java/Android para generar un APK. Configurás la dirección del servidor de la Raspberry Pi (p. ej. `http://192.168.1.100:8787`), iniciás sesión y accedés a Biblioteca / Radios / Favoritos / Playlists. Más detalles y compilación: [`android-app/README.md`](android-app/README.md).

No hay un APK precompilado en el ZIP: el entorno de desarrollo de esta entrega no tiene instalado Android SDK/Gradle. Incluimos `.github/workflows/android-apk.yml` para compilarlo en **GitHub Actions** una vez publicado el repo. La reproducción en segundo plano, controles de bloqueo y Android Auto son funciones futuras, no prometidas en v0.3.

## Organización del repositorio

```text
aurora-music/
├── android-app/               # Proyecto Android que compila APK
├── backend/
│   ├── main.py               # API, biblioteca, transcodificación, radio y letras
│   ├── static/               # Web Liquid Glass / Material 3
│   ├── Dockerfile
│   └── requirements.txt
├── owntone/                  # Configuración de AirPlay/Chromecast
├── tests/                    # Pruebas automáticas Python
├── .github/workflows/        # CI y compilación APK de Android
├── music/                    # Vacío: agregá tus archivos locales (ignorado en Git)
├── docker-compose.yml       # Instalación en Raspberry Pi 5
├── .env.example             # Plantilla de configuración (sin secretos)
├── README.md                # Presentación e instrucciones
├── CHANGELOG.md             # Historial de versiones
├── CONTRIBUTING.md          # Cómo colaborar
├── SECURITY.md              # Seguridad del despliegue
└── LICENSE                  # MIT para el código propio
```

## Publicación y colaboración en GitHub

- El código original de Aurora Music se ofrece bajo licencia **MIT** (`LICENSE`). Los proyectos externos (OwnTone, FFmpeg, LRCLIB, bibliotecas Python) mantienen sus propias licencias.
- Antes de publicar verificá que NO incluyas: `.env`, `data/`, `owntone-cache/`, `music/`, bases SQLite, datos de cuenta, grabaciones ni letras descargadas. `.gitignore` protege esos directorios en un `git add .` normal.
- El repositorio original se publica como código fuente, no como una imagen Docker ya compilada ni como una distribución de música.
- Los estilos visuales están **inspirados** en interfaces conocidas, sin marcas, iconos, assets ni código propios de Apple, Google, Spotify o SimpMusic.
- Las funciones Chromecast/AirPlay están implementadas mediante OwnTone, pero **no han sido verificadas con hardware real en tu red**. Usá GitHub Issues para registrar problemas de compatibilidad.
- Para reportar errores o proponer cambios, consultá `CONTRIBUTING.md`.

### Crear el repositorio desde una PC con Git y GitHub CLI (opcional)

```bash
cd aurora-music
git init
git add .
git commit -m "Aurora Music v0.3: Internet radio and Android client"
# Requiere haber iniciado sesión: gh auth login
gh repo create aurora-music --public --source=. --remote=origin --push
```

**No ejecutes `git add -f` sobre archivos ignorados**; revisá con `git status` antes de publicar.
