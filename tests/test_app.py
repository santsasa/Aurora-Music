"""Run with: python -m pytest tests -q (pip install pytest httpx)."""
import base64
import importlib.util
import os
import sys
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    music=tmp_path/'music'
    music.mkdir()
    # One second of silence: self-made test data, no copyrighted audio.
    with wave.open(str(music/'Prueba.wav'), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(8000)
        wav.writeframes(b'\0\0'*8000)
    (music/'Prueba.lrc').write_text('[00:00.10]Hola\n[00:00.40]Mundo\n', encoding='utf-8')
    monkeypatch.setenv('MUSIC_DIR',str(music))
    monkeypatch.setenv('DATA_DIR',str(tmp_path/'data'))
    monkeypatch.setenv('APP_USER','tester')
    monkeypatch.setenv('APP_PASSWORD','A-test-password-123456')
    spec=importlib.util.spec_from_file_location('aurora_under_test',Path(__file__).parent.parent/'backend'/'main.py')
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.init_db()
    module.scan_library()
    creds=base64.b64encode(b'tester:A-test-password-123456').decode()
    with TestClient(module.app) as c:
        yield c, {'Authorization':f'Basic {creds}'}, module


def test_auth(client):
    c, headers, _ = client
    assert c.get('/health').status_code==200
    assert c.get('/api/library').status_code==401
    assert c.get('/api/library',headers=headers).status_code==200


def test_scan_stream_lyrics(client):
    c, headers, module=client
    data=c.get('/api/library',headers=headers).json()
    assert len(data['items'])==1
    item=data['items'][0]
    assert item['title']=='Prueba'
    assert c.get(f"/api/stream/{item['id']}",headers=headers).status_code==200
    assert c.get(f"/api/lyrics/{item['id']}",headers=headers).json()['lines'][0]['text']=='Hola'
    assert c.get('/api/stream/nonexistent',headers=headers).status_code==404
    assert c.get(f"/api/stream/{item['id']}?profile=unknown",headers=headers).status_code==400


def test_favorites_playlist_and_recent(client):
    c, headers, _ = client
    headers={**headers,'Content-Type':'application/json'}
    t=c.get('/api/library',headers=headers).json()['items'][0]
    assert c.post('/api/favorite',headers=headers,json={'id':t['id']}).json()['favorite'] is True
    assert len(c.get('/api/library?view=favorites',headers=headers).json()['items'])==1
    p=c.post('/api/playlists',headers=headers,json={'name':'Mis canciones'}).json()
    assert c.post(f"/api/playlists/{p['id']}/tracks",headers=headers,json={'track_id':t['id']}).status_code==200
    assert len(c.get(f"/api/playlists/{p['id']}",headers=headers).json()['items'])==1
    c.post('/api/history',headers=headers,json={'id':t['id']})
    assert len(c.get('/api/library?view=recent',headers=headers).json()['items'])==1
