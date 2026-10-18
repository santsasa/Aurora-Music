"""LRCLIB calls are mocked: no Internet dependency and no external lyrics in fixtures."""
import base64
import importlib.util
import json
import time
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def setup(tmp_path, monkeypatch):
    music = tmp_path / 'music'
    music.mkdir()
    with wave.open(str(music / 'Prueba.wav'), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(8000)
        wav.writeframes(b'\0\0' * 16000)
    monkeypatch.setenv('MUSIC_DIR', str(music))
    monkeypatch.setenv('DATA_DIR', str(tmp_path / 'data'))
    monkeypatch.setenv('APP_USER', 'tester')
    monkeypatch.setenv('APP_PASSWORD', 'very-strong-test-password')
    monkeypatch.setenv('LYRICS_ONLINE_ENABLED', 'true')
    spec = importlib.util.spec_from_file_location('aurora_lyrics_test', Path(__file__).parent.parent / 'backend' / 'main.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.init_db()
    module.scan_library()
    headers = {'Authorization': 'Basic ' + base64.b64encode(b'tester:very-strong-test-password').decode()}
    with TestClient(module.app) as client:
        track = client.get('/api/library', headers=headers).json()['items'][0]
        yield client, headers, module, music, track


def test_online_search_cached_and_refresh(setup, monkeypatch):
    c, headers, module, music, track = setup
    requests = []

    async def fake_request(endpoint, params=None):
        requests.append(endpoint)
        if endpoint == '/api/get':
            return None
        return [{'id': 123, 'trackName': 'Prueba', 'artistName': 'Artista desconocido',
                 'duration': 2.0, 'syncedLyrics': '[00:00.25]Texto de ejemplo\n[00:01.20]Fin',
                 'plainLyrics': 'Texto de ejemplo\nFin'}]

    monkeypatch.setattr(module, 'lrclib_request', fake_request)
    url = f"/api/lyrics/{track['id']}"
    one = c.get(url, headers=headers)
    assert one.status_code == 200
    assert one.json()['synced'] is True
    assert one.json()['source'] == 'LRCLIB'
    assert one.json()['lines'][0]['t'] == .25
    assert requests == ['/api/get', '/api/search']
    two = c.get(url, headers=headers).json()
    assert two['cached'] is True
    assert requests == ['/api/get', '/api/search']
    c.get(url+'?refresh=true', headers=headers)
    assert requests == ['/api/get', '/api/search', '/api/get', '/api/search']
    (music/'Prueba.lrc').write_text('[00:00.45]Letra personal\n', encoding='utf8')
    local = c.get(url, headers=headers).json()
    assert local['lines'][0]['text'] == 'Letra personal'
    assert local['source'].startswith('Local:')
    assert len(requests) == 4


def test_manual_pick_and_metadata_invalidation(setup, monkeypatch):
    c, headers, module, music, track = setup

    async def fake_request(endpoint, params=None):
        if endpoint.startswith('/api/get/'):
            return {'id': 12, 'syncedLyrics': '[00:00.01]Manual', 'plainLyrics': None}
        if endpoint == '/api/search':
            return [{'id': 12, 'trackName':'Versión en vivo', 'artistName':'Grupo', 'albumName': 'Directo',
                     'duration': 200, 'syncedLyrics': '[00:00.01]Manual'}]
        return None

    monkeypatch.setattr(module, 'lrclib_request', fake_request)
    id_ = track['id']
    r = c.get(f'/api/lyrics/{id_}/search?q=Versión', headers=headers)
    assert r.status_code == 200
    assert r.json()['items'][0]['id'] == 12
    r = c.post(f'/api/lyrics/{id_}/select', headers=headers, json={'lrclib_id':12})
    assert r.status_code == 200
    assert r.json()['source'] == 'LRCLIB (selección manual)'
    assert c.get(f'/api/lyrics/{id_}', headers=headers).json()['source'] == 'LRCLIB (selección manual)'
    assert c.post(f'/api/lyrics/{id_}/select', headers=headers, json={'lrclib_id':0}).status_code == 422
    (music/'Prueba.lrc').write_text('[00:00.02]Local', encoding='utf8')
    assert c.post(f'/api/lyrics/{id_}/select', headers=headers, json={'lrclib_id':12}).status_code == 409


def test_failure_graceful_no_negative_cache(setup, monkeypatch):
    c, headers, module, _, track = setup
    from fastapi import HTTPException
    async def fake_request(endpoint, params=None):
        raise HTTPException(503, 'Límite temporal')
    monkeypatch.setattr(module, 'lrclib_request', fake_request)
    response=c.get(f"/api/lyrics/{track['id']}", headers=headers)
    assert response.status_code == 200
    assert response.json()['error'] == 'Límite temporal'
    with module.db_conn() as db:
        assert db.execute('SELECT COUNT(*) FROM lyrics_cache').fetchone()[0] == 0


def test_parser_repeated_timestamps(setup):
    _, _, m, _, _ = setup
    lines=m.parse_lyrics('[00:10.00][00:11.00]Dos marcas\n[ar:Prueba]\n[00:03.20]Antes')
    assert [x['t'] for x in lines] == [3.2,10.0,11.0]
    assert lines[1]['text']=='Dos marcas'
