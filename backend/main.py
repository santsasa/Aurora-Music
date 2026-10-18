"""Aurora Music MVP: own library, on-demand transcoding and OwnTone output control."""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import re
import secrets
import sqlite3
import subprocess
import time
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlsplit
from ipaddress import ip_address
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from mutagen import File as AudioFile
from mutagen.flac import FLAC
from mutagen.id3 import ID3
from mutagen.mp4 import MP4
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent
MUSIC = Path(os.getenv("MUSIC_DIR", str(BASE.parent / "music"))).resolve()
DATA = Path(os.getenv("DATA_DIR", str(BASE.parent / "data"))).resolve()
DB = DATA / "library.db"
OWN = os.getenv("OWNTONE_URL", "http://127.0.0.1:3689").rstrip("/")
USER = os.getenv("APP_USER", "admin")
PASSWORD = os.getenv("APP_PASSWORD", "")
AUTH_ENABLED = os.getenv("APP_AUTH_ENABLED", "true").strip().lower() in {"1", "yes", "true", "on"}
EXTENSIONS = {".mp3", ".flac", ".m4a", ".mp4", ".aac", ".ogg", ".opus", ".wav", ".aiff", ".aif", ".wma"}
CONTENT_TYPES = {".mp3": "audio/mpeg", ".flac": "audio/flac", ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg", ".opus": "audio/ogg", ".wav": "audio/wav", ".aiff": "audio/aiff", ".aif": "audio/aiff"}
# Browser profiles. 24k Spotify-like is Opus, not an assertion about Spotify's low-tier codec.
PROFILES = {
    "mp3_128": ("audio/mpeg", "libmp3lame", "128k", "mp3", []),
    "mp3_192": ("audio/mpeg", "libmp3lame", "192k", "mp3", []),
    "mp3_320": ("audio/mpeg", "libmp3lame", "320k", "mp3", []),
    "aac_128": ("audio/mp4", "aac", "128k", "mp4", ["-movflags", "frag_keyframe+empty_moov+default_base_moof"]),
    "aac_256": ("audio/mp4", "aac", "256k", "mp4", ["-movflags", "frag_keyframe+empty_moov+default_base_moof"]),
    "opus_24": ("audio/ogg; codecs=opus", "libopus", "24k", "opus", ["-ac", "2", "-application", "audio"]),
    "ogg_96": ("audio/ogg", "libvorbis", "96k", "ogg", []),
    "ogg_160": ("audio/ogg", "libvorbis", "160k", "ogg", []),
    "ogg_320": ("audio/ogg", "libvorbis", "320k", "ogg", []),
    "flac": ("audio/flac", "flac", None, "flac", []),
}
LYRICS_API = "https://lrclib.net"
LYRICS_ENABLED = os.getenv("LYRICS_ONLINE_ENABLED", "true").strip().lower() in {"1", "yes", "true", "on"}
LYRICS_USER_AGENT = os.getenv("LYRICS_USER_AGENT", "AuroraMusic/0.3 (+https://github.com/topics/music-server)")
LYRICS_TTL_SUCCESS = 90 * 86400
LYRICS_TTL_MISS = 24 * 3600
LYRICS_MAX_BODY = 250_000
lyric_request_lock = asyncio.Lock()
lyrics_cooldown_until = 0.0
app = FastAPI(title="Aurora Music", version="0.3.0", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")


@app.middleware("http")
async def require_basic_auth(request: Request, call_next):
    if not AUTH_ENABLED or request.url.path == "/health" or request.url.path.startswith("/static/"):
        return await call_next(request)
    # Refuse to silently run with an insecure default credential.
    if not PASSWORD or PASSWORD == "CAMBIAR_POR_UNA_CLAVE_LARGA_Y_UNICA":
        return JSONResponse({"detail": "Configurá APP_PASSWORD en .env"}, status_code=503)
    auth = request.headers.get("Authorization", "")
    try:
        scheme, token = auth.split(" ", 1)
        decoded = base64.b64decode(token, validate=True).decode("utf8")
        who, passwd = decoded.split(":", 1)
        permitted = scheme.lower() == "basic" and secrets.compare_digest(who, USER) and secrets.compare_digest(passwd, PASSWORD)
    except Exception:
        permitted = False
    if not permitted:
        return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="Aurora Music"'})
    return await call_next(request)


@contextmanager
def db_conn():
    DATA.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB, timeout=30)
    try:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with db_conn() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY, rel TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
            artist TEXT NOT NULL, album TEXT NOT NULL, genre TEXT NOT NULL,
            duration REAL NOT NULL DEFAULT 0, track_no INTEGER NOT NULL DEFAULT 0,
            mtime_ns INTEGER NOT NULL, size INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS favorites(track_id TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS playlists(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS playlist_tracks(playlist_id INTEGER NOT NULL, track_id TEXT NOT NULL,
           ordinal INTEGER NOT NULL, PRIMARY KEY(playlist_id, track_id));
        CREATE TABLE IF NOT EXISTS history(track_id TEXT PRIMARY KEY, played_at INTEGER NOT NULL, plays INTEGER NOT NULL DEFAULT 1);
        CREATE INDEX IF NOT EXISTS idx_artist ON tracks(artist);
        CREATE TABLE IF NOT EXISTS radio_favorites (
            stationuuid TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL,
            favicon TEXT NOT NULL DEFAULT '', countrycode TEXT NOT NULL DEFAULT '',
            codec TEXT NOT NULL DEFAULT '', bitrate INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS lyrics_cache (
            track_id TEXT PRIMARY KEY, signature TEXT NOT NULL,
            source TEXT NOT NULL, payload TEXT NOT NULL,
            fetched_at INTEGER NOT NULL
        );
        """)


def tag_first(tags, keys, fallback):
    for k in keys:
        try:
            value = tags.get(k)
            if value:
                if isinstance(value, list):
                    value = value[0]
                text = str(value).strip()
                if text:
                    return text
        except (AttributeError, TypeError):
            pass
    return fallback


def safe_trackno(val):
    try:
        return int(str(val).split("/")[0])
    except ValueError:
        return 0


def scan_library():
    MUSIC.mkdir(parents=True, exist_ok=True)
    seen = set()
    count = 0
    with db_conn() as db:
        for root, dirs, files in os.walk(MUSIC, followlinks=False):
            dirs[:] = [d for d in dirs if not (Path(root) / d).is_symlink()]
            for name in files:
                path = Path(root) / name
                if path.suffix.lower() not in EXTENSIONS or path.is_symlink():
                    continue
                try:
                    rel = str(path.relative_to(MUSIC))
                    stat = path.stat()
                    ident = hashlib.sha256(rel.encode("utf-8")).hexdigest()[:24]
                    seen.add(ident)
                    record = db.execute("SELECT mtime_ns,size FROM tracks WHERE id=?", (ident,)).fetchone()
                    if record and record[0] == stat.st_mtime_ns and record[1] == stat.st_size:
                        continue
                    audio = AudioFile(path, easy=True)
                    tags = audio if audio is not None else {}
                    duration = float(getattr(getattr(audio, "info", None), "length", 0) or 0)
                    title = tag_first(tags, ("title",), path.stem)
                    artist = tag_first(tags, ("artist", "albumartist"), path.parent.parent.name if path.parent != MUSIC else "Artista desconocido")
                    album = tag_first(tags, ("album",), path.parent.name if path.parent != MUSIC else "Sin álbum")
                    genre = tag_first(tags, ("genre",), "Sin género")
                    track_no = safe_trackno(tag_first(tags, ("tracknumber",), "0"))
                    db.execute("""INSERT INTO tracks(id,rel,title,artist,album,genre,duration,track_no,mtime_ns,size)
                       VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
                       title=excluded.title, artist=excluded.artist,album=excluded.album,genre=excluded.genre,
                       duration=excluded.duration,track_no=excluded.track_no,mtime_ns=excluded.mtime_ns,size=excluded.size""",
                       (ident, rel, title, artist, album, genre, duration, track_no, stat.st_mtime_ns, stat.st_size))
                    count += 1
                except Exception as exc:
                    print(f"No se pudo indexar {path.name}: {exc}", flush=True)
        # Remove only tracks no longer on disk; favorites and playlists remain for future restoration.
        for row in db.execute("SELECT id FROM tracks").fetchall():
            if row[0] not in seen:
                db.execute("DELETE FROM tracks WHERE id=?", (row[0],))
    return {"indexed_or_updated": count, "total": len(seen)}


@app.on_event("startup")
def startup():
    init_db()
    # OwnTone indexes independently. Our index is user-triggered and initially populated here.
    import threading
    threading.Thread(target=scan_library, daemon=True).start()


def track_lookup(track_id):
    with db_conn() as db:
        row = db.execute("SELECT * FROM tracks WHERE id=?", (track_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Canción no encontrada")
    path = (MUSIC / row["rel"]).resolve()
    if not path.is_relative_to(MUSIC) or not path.is_file():
        raise HTTPException(404, "Archivo no disponible")
    return dict(row), path


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def home():
    return FileResponse(BASE / "static" / "index.html")


@app.get("/api/library")
def library(q: str = "", view: str = "all", limit: int = Query(500, ge=1, le=5000)):
    where = "1=1"
    values = []
    if q.strip():
        where += " AND (t.title LIKE ? OR t.artist LIKE ? OR t.album LIKE ? OR t.genre LIKE ?)"
        values += [f"%{q[:120]}%"] * 4
    if view == "favorites":
        where += " AND f.track_id IS NOT NULL"
    elif view == "recent":
        where += " AND h.track_id IS NOT NULL"
    elif view not in {"all", "favorites", "recent"}:
        raise HTTPException(400, "Vista desconocida")
    order = "h.played_at DESC" if view == "recent" else "t.artist COLLATE NOCASE, t.album COLLATE NOCASE, t.track_no, t.title COLLATE NOCASE"
    with db_conn() as db:
        items = db.execute(f"""SELECT t.id,t.title,t.artist,t.album,t.genre,t.duration,t.rel,
                 f.track_id IS NOT NULL AS favorite FROM tracks t
                 LEFT JOIN favorites f ON f.track_id=t.id
                 LEFT JOIN history h ON h.track_id=t.id
                 WHERE {where} ORDER BY {order} LIMIT ?""", values + [limit]).fetchall()
        total = db.execute("SELECT COUNT(*) FROM tracks").fetchone()[0]
    return {"items": [dict(r) for r in items], "total": total}


@app.post("/api/scan")
async def api_scan():
    result = await asyncio.to_thread(scan_library)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.put(f"{OWN}/api/update")
    except httpx.HTTPError:
        pass
    return result


@app.get("/api/cover/{track_id}")
def cover(track_id: str):
    _track, path = track_lookup(track_id)
    try:
        audio = AudioFile(path)
        artwork = None
        if isinstance(audio, FLAC) and audio.pictures:
            artwork = audio.pictures[0].data
        elif isinstance(audio, MP4) and audio.tags and audio.tags.get("covr"):
            artwork = bytes(audio.tags["covr"][0])
        elif audio and getattr(audio, "tags", None):
            tags = audio.tags
            if isinstance(tags, ID3):
                covers = tags.getall("APIC")
                if covers:
                    artwork = covers[0].data
        if artwork:
            mime = "image/png" if artwork.startswith(b"\x89PNG") else "image/jpeg"
            return Response(content=artwork, media_type=mime, headers={"Cache-Control": "private, max-age=3600"})
    except Exception:
        pass
    raise HTTPException(404, "Carátula no disponible")


# Local lyrics always win. The remote provider only receives track metadata, never audio.
def parse_lyrics(raw: str) -> list[dict]:
    lines = []
    for row in raw.splitlines():
        timestamps = re.findall(r"\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]", row)
        if timestamps:
            cleaned = re.sub(r"\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]", "", row).strip()
            for mm, ss in timestamps:
                lines.append({"t": int(mm) * 60 + float(ss), "text": cleaned})
        elif not row.startswith("["):
            if row.strip():
                lines.append({"t": None, "text": row.strip()})
    if any(item["t"] is not None for item in lines):
        lines.sort(key=lambda item: item["t"] if item["t"] is not None else float("inf"))
    return lines[:5000]


def local_lyrics(path: Path):
    for candidate in (path.with_suffix(".lrc"), path.with_suffix(".LRC"), path.with_suffix(".txt")):
        if candidate.is_file() and not candidate.is_symlink() and candidate.stat().st_size <= LYRICS_MAX_BODY:
            return {"lines": parse_lyrics(candidate.read_text(encoding="utf-8-sig", errors="replace")),
                    "source": f"Local: {candidate.name}", "synced": candidate.suffix.lower() == ".lrc"}
    return None


def lyric_signature(track: dict) -> str:
    signature = [track["title"], track["artist"], track["album"], round(track["duration"])]
    return hashlib.sha256(json.dumps(signature, ensure_ascii=False).encode("utf8")).hexdigest()


def lyric_cache_read(track_id: str, signature: str, ignore_expiry=False):
    with db_conn() as db:
        row = db.execute("SELECT source,payload,fetched_at,signature FROM lyrics_cache WHERE track_id=?", (track_id,)).fetchone()
    if not row or row["signature"] != signature:
        return None
    if not ignore_expiry and row["source"] != "manual":
        ttl = LYRICS_TTL_MISS if row["source"] == "unavailable" else LYRICS_TTL_SUCCESS
        if time.time() - row["fetched_at"] > ttl:
            return None
    try:
        payload = json.loads(row["payload"])
    except json.JSONDecodeError:
        return None
    return {**payload, "cached": True}


def lyric_cache_write(track_id: str, signature: str, source: str, payload: dict):
    with db_conn() as db:
        db.execute("""INSERT INTO lyrics_cache(track_id,signature,source,payload,fetched_at)
            VALUES (?,?,?,?,?) ON CONFLICT(track_id) DO UPDATE SET
            signature=excluded.signature,source=excluded.source,
            payload=excluded.payload,fetched_at=excluded.fetched_at""",
            (track_id, signature, source, json.dumps(payload, ensure_ascii=False), int(time.time())))


def as_lyrics(record: dict, source: str = "LRCLIB") -> dict:
    synced = record.get("syncedLyrics") or ""
    plain = record.get("plainLyrics") or ""
    if not isinstance(synced, str) or not isinstance(plain, str):
        raise ValueError("Datos inválidos de LRCLIB")
    raw = synced or plain
    if len(raw) > LYRICS_MAX_BODY:
        raise ValueError("Letra demasiado larga")
    return {"lines": parse_lyrics(raw), "source": source,
            "synced": bool(synced), "cached": False,
            "lrclib_id": record.get("id")}


def lyrics_http_headers():
    return {"User-Agent": LYRICS_USER_AGENT, "Accept": "application/json"}


async def lrclib_request(endpoint: str, params: dict | None = None):
    global lyrics_cooldown_until
    if time.monotonic() < lyrics_cooldown_until:
        raise HTTPException(503, "LRCLIB solicitó esperar antes de volver a consultar")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(7.0), follow_redirects=False) as client:
            response = await client.get(LYRICS_API + endpoint, params=params, headers=lyrics_http_headers())
    except httpx.RequestError:
        raise HTTPException(503, "LRCLIB no está disponible")
    if response.status_code == 429:
        try:
            retry = max(30, min(3600, int(response.headers.get("Retry-After", "60"))))
        except ValueError:
            retry = 60
        lyrics_cooldown_until = time.monotonic() + retry
        raise HTTPException(503, f"LRCLIB limitó las consultas. Reintentá en {retry} segundos")
    if response.status_code == 404:
        return None
    if response.status_code != 200:
        raise HTTPException(503, "Respuesta inesperada de LRCLIB")
    if len(response.content) > 1_500_000:
        raise HTTPException(502, "Respuesta de letras demasiado grande")
    try:
        return response.json()
    except ValueError:
        raise HTTPException(502, "Respuesta inválida de LRCLIB")


def normalize_lyric_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", __import__("unicodedata").normalize("NFKD", value).encode("ascii", "ignore").decode().lower())


def choose_lyric(record_list, track):
    if not isinstance(record_list, list):
        return None
    desired_title = normalize_lyric_name(track["title"])
    desired_artist = normalize_lyric_name(track["artist"])
    candidates = []
    for item in record_list[:40]:
        if not isinstance(item, dict) or not item.get("syncedLyrics") and not item.get("plainLyrics"):
            continue
        title = normalize_lyric_name(str(item.get("trackName", "")))
        artist = normalize_lyric_name(str(item.get("artistName", "")))
        seconds = float(item.get("duration") or 0)
        diff = abs(seconds - track["duration"]) if seconds and track["duration"] else 0
        if desired_title and title != desired_title:
            continue
        if desired_artist and artist != desired_artist:
            continue
        if diff > 12:
            continue
        candidates.append((bool(item.get("syncedLyrics")), -diff, item))
    if not candidates:
        return None
    return max(candidates, key=lambda x: (x[0], x[1]))[2]


async def fetch_online_lyrics(track: dict):
    async with lyric_request_lock:
        # API get generally prefers strict metadata matching. Search catches different album versions.
        params = {"track_name": track["title"], "artist_name": track["artist"]}
        if track["album"] and track["album"] != "Sin álbum":
            params["album_name"] = track["album"]
        if track["duration"] > 0:
            params["duration"] = int(round(track["duration"]))
        exact = await lrclib_request("/api/get", params)
        if isinstance(exact, dict) and (exact.get("syncedLyrics") or exact.get("plainLyrics")):
            return as_lyrics(exact)
        matches = await lrclib_request("/api/search", {"track_name": track["title"], "artist_name": track["artist"]})
        candidate = choose_lyric(matches, track)
        return as_lyrics(candidate) if candidate else {"lines": [], "source": None, "synced": False, "cached": False}


@app.get("/api/lyrics/{track_id}")
async def lyrics(track_id: str, refresh: bool = False):
    track, path = track_lookup(track_id)
    local = local_lyrics(path)
    if local:
        return {**local, "cached": True}
    signature = lyric_signature(track)
    if not refresh:
        cached = lyric_cache_read(track_id, signature)
        if cached:
            return cached
    if not LYRICS_ENABLED:
        return {"lines": [], "source": None, "synced": False, "online_disabled": True}
    try:
        response = await fetch_online_lyrics(track)
    except HTTPException as exc:
        # Preserve existing cached lyrics during transient outages.
        stale = lyric_cache_read(track_id, signature, ignore_expiry=True)
        if stale and stale.get("lines"):
            return {**stale, "notice": exc.detail}
        return {"lines": [], "source": None, "synced": False, "error": exc.detail}
    lyric_cache_write(track_id, signature, "lrclib" if response["lines"] else "unavailable", response)
    return response


@app.get("/api/lyrics/{track_id}/search")
async def lyrics_search(track_id: str, q: str = Query("", max_length=120)):
    track, _ = track_lookup(track_id)
    if not LYRICS_ENABLED:
        raise HTTPException(503, "Búsqueda online desactivada")
    async with lyric_request_lock:
        matches = await lrclib_request("/api/search", {"q": q.strip() or f"{track['artist']} {track['title']}"})
    if not isinstance(matches, list):
        return {"items": []}
    return {"items": [{"id": x.get("id"), "title": x.get("trackName", ""),
                       "artist": x.get("artistName", ""), "album": x.get("albumName", ""),
                       "duration": x.get("duration", 0), "synced": bool(x.get("syncedLyrics"))}
                      for x in matches[:20] if isinstance(x, dict) and isinstance(x.get("id"), int)]}


class LyricsChoice(BaseModel):
    lrclib_id: int = Field(ge=1, le=2_147_483_647)


@app.post("/api/lyrics/{track_id}/select")
async def lyrics_select(track_id: str, choice: LyricsChoice):
    track, path = track_lookup(track_id)
    if local_lyrics(path):
        raise HTTPException(409, "La letra local tiene prioridad; quitá el archivo .lrc para elegir una versión online")
    if not LYRICS_ENABLED:
        raise HTTPException(503, "Búsqueda online desactivada")
    async with lyric_request_lock:
        record = await lrclib_request(f"/api/get/{choice.lrclib_id}")
    if not isinstance(record, dict) or not (record.get("syncedLyrics") or record.get("plainLyrics")):
        raise HTTPException(404, "No se encontraron letras en esa versión")
    payload = as_lyrics(record, "LRCLIB (selección manual)")
    lyric_cache_write(track_id, lyric_signature(track), "manual", payload)
    return payload


@app.get("/api/stream/{track_id}")
async def stream(track_id: str, profile: str = "original", start: float = Query(0, ge=0, le=86400)):
    _track, path = track_lookup(track_id)
    if profile == "original":
        return FileResponse(path, media_type=CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream"))
    if profile not in PROFILES:
        raise HTTPException(400, "Perfil de audio desconocido")
    mime, codec, bitrate, fmt, more = PROFILES[profile]
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin"]
    if start:
        args.extend(["-ss", str(start)])
    args.extend(["-i", str(path), "-map", "0:a:0", "-vn", "-c:a", codec])
    if bitrate:
        args.extend(["-b:a", bitrate])
    args.extend(more)
    args.extend(["-f", fmt, "pipe:1"])

    async def encoded():
        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        try:
            while True:
                chunk = await asyncio.to_thread(proc.stdout.read, 65536)
                if not chunk:
                    break
                yield chunk
        finally:
            if proc.poll() is None:
                proc.terminate()
            try:
                await asyncio.to_thread(proc.wait, timeout=2)
            except subprocess.TimeoutExpired:
                proc.kill()
                await asyncio.to_thread(proc.wait)
            proc.stdout.close()
    return StreamingResponse(encoded(), media_type=mime, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


class TrackAction(BaseModel):
    id: str


@app.post("/api/favorite")
def favorite(action: TrackAction):
    track_lookup(action.id)
    with db_conn() as db:
        existing = db.execute("SELECT 1 FROM favorites WHERE track_id=?", (action.id,)).fetchone()
        if existing:
            db.execute("DELETE FROM favorites WHERE track_id=?", (action.id,))
        else:
            db.execute("INSERT INTO favorites(track_id) VALUES(?)", (action.id,))
    return {"favorite": not bool(existing)}


@app.post("/api/history")
def history(action: TrackAction):
    track_lookup(action.id)
    with db_conn() as db:
        db.execute("""INSERT INTO history(track_id,played_at,plays) VALUES(?,?,1)
            ON CONFLICT(track_id) DO UPDATE SET played_at=excluded.played_at,plays=history.plays+1""",
            (action.id, int(time.time())))
    return {"ok": True}


class PlaylistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class PlaylistItem(BaseModel):
    track_id: str


@app.get("/api/playlists")
def playlists():
    with db_conn() as db:
        res = db.execute("SELECT id,name FROM playlists ORDER BY id DESC").fetchall()
    return {"items": [dict(x) for x in res]}


@app.post("/api/playlists")
def create_playlist(payload: PlaylistCreate):
    with db_conn() as db:
        result = db.execute("INSERT INTO playlists(name) VALUES(?)", (payload.name.strip(),))
    return {"id": result.lastrowid, "name": payload.name.strip()}


@app.delete("/api/playlists/{playlist_id}")
def remove_playlist(playlist_id: int):
    with db_conn() as db:
        db.execute("DELETE FROM playlist_tracks WHERE playlist_id=?", (playlist_id,))
        db.execute("DELETE FROM playlists WHERE id=?", (playlist_id,))
    return {"ok": True}


@app.get("/api/playlists/{playlist_id}")
def playlist_tracks(playlist_id: int):
    with db_conn() as db:
        items = db.execute("""SELECT t.id,t.title,t.artist,t.album,t.genre,t.duration,t.rel, f.track_id IS NOT NULL AS favorite
              FROM playlist_tracks p JOIN tracks t ON t.id=p.track_id
              LEFT JOIN favorites f ON f.track_id=t.id
              WHERE p.playlist_id=? ORDER BY p.ordinal""", (playlist_id,)).fetchall()
    return {"items": [dict(r) for r in items]}


@app.post("/api/playlists/{playlist_id}/tracks")
def playlist_add(playlist_id: int, payload: PlaylistItem):
    track_lookup(payload.track_id)
    with db_conn() as db:
        if not db.execute("SELECT 1 FROM playlists WHERE id=?", (playlist_id,)).fetchone():
            raise HTTPException(404, "Playlist no encontrada")
        ordinal = db.execute("SELECT COALESCE(MAX(ordinal),0)+1 FROM playlist_tracks WHERE playlist_id=?", (playlist_id,)).fetchone()[0]
        db.execute("INSERT OR IGNORE INTO playlist_tracks(playlist_id,track_id,ordinal) VALUES(?,?,?)", (playlist_id, payload.track_id, ordinal))
    return {"ok": True}


@app.delete("/api/playlists/{playlist_id}/tracks/{track_id}")
def playlist_remove(playlist_id: int, track_id: str):
    with db_conn() as db:
        db.execute("DELETE FROM playlist_tracks WHERE playlist_id=? AND track_id=?", (playlist_id, track_id))
    return {"ok": True}


async def own_request(method, endpoint, **kwargs):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.request(method, f"{OWN}{endpoint}", **kwargs)
            res.raise_for_status()
            return res.json() if res.content else {"ok": True}
    except (httpx.RequestError, httpx.HTTPStatusError) as exc:
        raise HTTPException(502, f"OwnTone no disponible o rechazó la operación: {exc}")


@app.get("/api/cast/outputs")
async def cast_outputs():
    return await own_request("GET", "/api/outputs")


class OutputSelect(BaseModel):
    output_ids: list[str]


@app.post("/api/cast/outputs")
async def cast_select(payload: OutputSelect):
    existing = await own_request("GET", "/api/outputs")
    available = {str(o["id"]) for o in existing.get("outputs", [])}
    if any(x not in available for x in payload.output_ids):
        raise HTTPException(400, "Salida desconocida")
    await own_request("PUT", "/api/outputs/set", json={"outputs": payload.output_ids})
    return {"ok": True}


@app.get("/api/cast/status")
async def cast_status():
    return await own_request("GET", "/api/player")


@app.post("/api/cast/play/{track_id}")
async def cast_play(track_id: str):
    track, _path = track_lookup(track_id)
    outputs = await own_request("GET", "/api/outputs")
    if not any(o.get("selected") for o in outputs.get("outputs", [])):
        raise HTTPException(400, "Elegí un parlante AirPlay o Chromecast primero")
    # OwnTone and Aurora mount the same library at /srv/media.
    match_path = str(Path("/srv/media") / track["rel"])
    result = await own_request("GET", "/api/search", params={"query": track["title"], "type": "track", "limit": 100})
    candidates = result.get("tracks", {}).get("items", [])
    matching = next((x for x in candidates if x.get("path") == match_path), None)
    if matching is None:
        raise HTTPException(404, "OwnTone todavía no indexó esa canción. Esperá el escaneo o abrí OwnTone para actualizar la biblioteca.")
    await own_request("POST", "/api/queue/items/add", params={"uris": matching["uri"], "clear": "true", "playback": "start"})
    return {"ok": True, "device": True}


@app.post("/api/cast/control/{action}")
async def cast_control(action: str):
    if action not in {"play", "pause", "toggle", "next", "previous", "stop"}:
        raise HTTPException(400, "Control no permitido")
    return await own_request("PUT", f"/api/player/{action}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("APP_PORT", "8787")))


# Radio Browser is a public community directory. Never proxy arbitrary station URLs:
# browsers request public streams directly and the application only stores metadata.
RADIO_SERVERS = ("https://de1.api.radio-browser.info", "https://nl1.api.radio-browser.info", "https://at1.api.radio-browser.info")
RADIO_ENABLED = os.getenv("RADIO_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}
RADIO_UA = os.getenv("RADIO_USER_AGENT", "AuroraMusic/0.3 (self-hosted radio directory)")
_radio_cache: dict[str, tuple[float, list]] = {}


def checked_country(code: str) -> str:
    code = code.strip().upper()
    if not re.fullmatch(r"[A-Z]{2}", code):
        raise HTTPException(422, "Código de país inválido (ejemplo: AR)")
    return code


def safe_public_url(url: str) -> bool:
    if not isinstance(url, str) or len(url) > 2048:
        return False
    try:
        parsed = urlsplit(url.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
            return False
        hostname = parsed.hostname.lower().rstrip('.')
        if hostname in {"localhost", "0.0.0.0"} or hostname.endswith((".localhost", ".local", ".internal")):
            return False
        try:
            return ip_address(hostname).is_global
        except ValueError:
            return True
    except (ValueError, TypeError):
        return False


def normalized_station(item: dict) -> dict | None:
    if not isinstance(item, dict):
        return None
    url = str(item.get("url_resolved") or item.get("url") or "").strip()
    uuid = str(item.get("stationuuid") or "").strip().lower()
    name = str(item.get("name") or "").strip()[:180]
    if not name or not re.fullmatch(r"[a-f0-9-]{32,36}", uuid) or not safe_public_url(url):
        return None
    icon = str(item.get("favicon") or "").strip()
    return {"stationuuid": uuid, "name": name, "url": url,
            "favicon": icon if safe_public_url(icon) else "",
            "countrycode": str(item.get("countrycode") or "")[:2].upper(),
            "codec": str(item.get("codec") or "")[:24],
            "bitrate": max(0, min(10000, int(item.get("bitrate") or 0))),
            "tags": str(item.get("tags") or "")[:150],
            "votes": max(0, int(item.get("votes") or 0))}


async def radio_browser(endpoint: str, params: dict | None = None, ttl: int = 3600) -> list:
    if not RADIO_ENABLED:
        raise HTTPException(503, "El directorio de radios está desactivado")
    key = endpoint + json.dumps(params or {}, sort_keys=True)
    cached = _radio_cache.get(key)
    if cached and time.monotonic() < cached[0]:
        return cached[1]
    last_error = "No se pudo consultar Radio Browser"
    async with httpx.AsyncClient(timeout=httpx.Timeout(8.0), follow_redirects=False,
                                 headers={"User-Agent": RADIO_UA, "Accept": "application/json"}) as client:
        for server in RADIO_SERVERS:
            try:
                response = await client.get(server + endpoint, params=params)
                response.raise_for_status()
                data = response.json()
                if not isinstance(data, list):
                    raise ValueError("Respuesta inesperada del directorio")
                _radio_cache[key] = (time.monotonic() + ttl, data)
                return data
            except (httpx.HTTPError, ValueError) as exc:
                last_error = str(exc)
    raise HTTPException(502, f"Radio Browser no está disponible: {last_error[:150]}")


@app.get("/api/radio/countries")
async def radio_countries():
    rows = await radio_browser("/json/countries", ttl=12 * 3600)
    result = [{"code": str(r.get("iso_3166_1") or "").upper(),
               "name": str(r.get("name") or ""),
               "stations": int(r.get("stationcount") or 0)} for r in rows if isinstance(r, dict)]
    return {"items": sorted((r for r in result if re.fullmatch(r"[A-Z]{2}", r["code"])),
                            key=lambda r: r["name"].casefold())}


@app.get("/api/radio/stations")
async def radio_stations(country: str = "AR", q: str = Query("", max_length=80)):
    code = checked_country(country)
    term = q.strip()
    if term:
        rows = await radio_browser("/json/stations/search", {
            "countrycode": code, "name": term, "hidebroken": "true", "order": "votes",
            "reverse": "true", "limit": 100}, ttl=1800)
    else:
        rows = await radio_browser(f"/json/stations/bycountrycodeexact/{code}", {
            "hidebroken": "true", "order": "votes", "reverse": "true", "limit": 100}, ttl=3600)
    clean = [item for row in rows if (item := normalized_station(row)) is not None]
    return {"country": code, "items": clean}


@app.get("/api/radio/favorites")
def radio_favorites():
    with db_conn() as db:
        rows = [dict(row) for row in db.execute("SELECT * FROM radio_favorites ORDER BY name COLLATE NOCASE").fetchall()]
    return {"items": rows}


class RadioFavorite(BaseModel):
    stationuuid: str = Field(min_length=32, max_length=36)
    name: str = Field(min_length=1, max_length=180)
    url: str = Field(min_length=10, max_length=2048)
    favicon: str = Field(default="", max_length=2048)
    countrycode: str = Field(default="", max_length=2)
    codec: str = Field(default="", max_length=24)
    bitrate: int = Field(default=0, ge=0, le=10000)


@app.post("/api/radio/favorites")
def add_radio_favorite(item: RadioFavorite):
    station = normalized_station(item.model_dump())
    if station is None:
        raise HTTPException(422, "Emisora o URL inválida")
    with db_conn() as db:
        db.execute("""INSERT INTO radio_favorites(stationuuid,name,url,favicon,countrycode,codec,bitrate)
                      VALUES(?,?,?,?,?,?,?) ON CONFLICT(stationuuid) DO UPDATE SET
                      name=excluded.name,url=excluded.url,favicon=excluded.favicon,
                      countrycode=excluded.countrycode,codec=excluded.codec,bitrate=excluded.bitrate""",
                   tuple(station[k] for k in ("stationuuid", "name", "url", "favicon", "countrycode", "codec", "bitrate")))
    return {"favorite": True}


@app.delete("/api/radio/favorites/{stationuuid}")
def delete_radio_favorite(stationuuid: str):
    if not re.fullmatch(r"[a-f0-9-]{32,36}", stationuuid.lower()):
        raise HTTPException(422, "Identificador inválido")
    with db_conn() as db:
        db.execute("DELETE FROM radio_favorites WHERE stationuuid=?", (stationuuid.lower(),))
    return {"favorite": False}
