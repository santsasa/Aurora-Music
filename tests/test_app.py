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
    assert item['format']=='WAV'
    assert item['bit_depth']==16
    assert item['sample_rate']==8000
    assert c.get(f"/api/stream/{item['id']}",headers=headers).status_code==200
    assert c.get(f"/api/lyrics/{item['id']}",headers=headers).json()['lines'][0]['text']=='Hola'
    assert c.get('/api/stream/nonexistent',headers=headers).status_code==404
    assert c.get(f"/api/stream/{item['id']}?profile=unknown",headers=headers).status_code==400


def test_cast_stream_requires_signed_short_lived_link(client):
    c, headers, module=client
    expires=int(module.time.time())+600
    unknown='missing-track'
    signature=module.cast_stream_signature(unknown,expires)
    assert c.get(f"/api/cast-stream/{unknown}?expires={expires}&signature={signature}").status_code==404
    assert c.get(f"/api/cast-stream/{unknown}?expires={expires}&signature=invalid").status_code==403
    expired=int(module.time.time())-1
    assert c.get(f"/api/cast-stream/{unknown}?expires={expired}&signature={module.cast_stream_signature(unknown,expired)}").status_code==403


def test_chromecast_direct_uses_flac_receiver(client, monkeypatch):
    c, headers, module=client
    item=c.get('/api/library',headers=headers).json()['items'][0]
    calls=[]

    class MediaStatus:
        player_state='PLAYING'

    class MediaController:
        status=MediaStatus()
        def play_media(self, url, content_type, **kwargs):
            calls.append((url, content_type, kwargs))
        def block_until_active(self, timeout):
            calls.append(('active', timeout))
        def pause(self):
            calls.append(('pause',))
        def play(self):
            calls.append(('play',))
        def stop(self):
            calls.append(('stop',))

    class Device:
        name='Test Chromecast'
        model_name='Test model'
        uuid='cast-test-uuid'
        media_controller=MediaController()
        def wait(self, timeout):
            calls.append(('wait', timeout))

    device=Device()
    def fake_discovery():
        module.cast_devices={device.uuid:device}
        return [{'id':device.uuid,'name':device.name,'model':device.model_name}]
    monkeypatch.setattr(module,'discover_direct_casts',fake_discovery)
    assert c.get('/api/chromecast/outputs',headers=headers).json()['outputs'][0]['name']=='Test Chromecast'
    assert c.post('/api/chromecast/select',headers=headers,json={'uuid':device.uuid}).status_code==200
    response=c.post(f"/api/chromecast/play/{item['id']}",headers=headers)
    assert response.status_code==200
    assert response.json()['format']=='FLAC'
    assert any(call[1:2]==('audio/flac',) for call in calls if len(call)>1)
    assert c.post('/api/chromecast/control/pause',headers=headers).status_code==200


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
