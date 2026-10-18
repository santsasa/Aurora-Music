"""Offline tests of radio API contracts; no external stations are contacted."""
import importlib.util
from pathlib import Path
import base64

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('MUSIC_DIR', str(tmp_path / 'music'))
    monkeypatch.setenv('DATA_DIR', str(tmp_path / 'data'))
    (tmp_path / 'music').mkdir()
    monkeypatch.setenv('APP_USER', 'radio-user')
    monkeypatch.setenv('APP_PASSWORD', 'radio-private-password-123')
    spec = importlib.util.spec_from_file_location('aurora_radio_under_test', Path(__file__).parent.parent / 'backend/main.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.init_db()
    async def fake_radio_browser(endpoint, params=None, ttl=3600):
        if endpoint == '/json/countries':
            return [{'name': 'Argentina', 'iso_3166_1': 'AR', 'stationcount': 100},
                    {'name': 'United States', 'iso_3166_1': 'US', 'stationcount': 200}]
        return [{'name': 'Radio de prueba', 'stationuuid': '12345678-1234-1234-1234-123456789012',
                 'url_resolved': 'https://radio.example.org/live.mp3', 'countrycode': 'AR',
                 'codec': 'MP3', 'bitrate': 128, 'votes': 45},
                {'name': 'Localhost malicioso', 'stationuuid': '00000000-0000-0000-0000-000000000001',
                 'url_resolved': 'http://127.0.0.1/private', 'countrycode': 'AR'}]
    mod.radio_browser = fake_radio_browser
    auth = base64.b64encode(b'radio-user:radio-private-password-123').decode()
    with TestClient(mod.app) as test:
        yield test, {'Authorization': f'Basic {auth}'}, mod


def test_country_stations_and_security(client):
    http, auth, mod = client
    assert http.get('/api/radio/stations?country=AR').status_code == 401
    countries = http.get('/api/radio/countries', headers=auth).json()['items']
    assert countries[0]['code'] == 'AR'
    stations = http.get('/api/radio/stations?country=AR', headers=auth).json()['items']
    assert len(stations) == 1
    assert stations[0]['codec'] == 'MP3'
    assert http.get('/api/radio/stations?country=INVALID', headers=auth).status_code == 422
    assert not mod.safe_public_url('http://192.168.1.1/admin')
    assert not mod.safe_public_url('file:///etc/passwd')
    assert mod.safe_public_url('https://radio.example.org/stream')


def test_radio_favorites(client):
    http, auth, _ = client
    station = http.get('/api/radio/stations?country=AR', headers=auth).json()['items'][0]
    assert http.post('/api/radio/favorites', headers=auth, json=station).status_code == 200
    assert len(http.get('/api/radio/favorites', headers=auth).json()['items']) == 1
    assert http.post('/api/radio/favorites', headers=auth, json={**station, 'url':'http://127.0.0.1:3689/private'}).status_code == 422
    assert http.delete('/api/radio/favorites/'+station['stationuuid'], headers=auth).status_code == 200
    assert len(http.get('/api/radio/favorites', headers=auth).json()['items']) == 0


def test_radio_casts_directly_to_chromecast(client, monkeypatch):
    http, auth, mod = client
    received = {}

    class MediaController:
        status = type('Status', (), {'player_state': 'PLAYING'})()

        def play_media(self, url, content_type, **kwargs):
            received.update(url=url, content_type=content_type, **kwargs)

        def block_until_active(self, timeout):
            received['active_timeout'] = timeout

    class Device:
        name = 'Test Chromecast'
        media_controller = MediaController()

        def wait(self, timeout):
            received['device_timeout'] = timeout

    device = Device()
    mod.cast_selected_uuid = 'test-device'

    async def direct_device(device_uuid):
        assert device_uuid == 'test-device'
        return device

    monkeypatch.setattr(mod, 'direct_cast_by_uuid', direct_device)
    response = http.post('/api/chromecast/radio/12345678-1234-1234-1234-123456789012', headers=auth)
    assert response.status_code == 200
    assert response.json()['content_type'] == 'audio/mpeg'
    assert received['url'] == 'https://radio.example.org/live.mp3'
    assert received['stream_type'] == 'LIVE'
    assert received['title'] == 'Radio de prueba'


def test_radio_casts_to_selected_owntone_output(client, monkeypatch):
    http, auth, mod = client
    calls = []

    async def own_request(method, endpoint, **kwargs):
        calls.append((method, endpoint, kwargs))
        if method == 'GET':
            return {'outputs': [{'id': 'cast-output', 'type': 'Chromecast', 'selected': True}]}
        return {'ok': True}

    monkeypatch.setattr(mod, 'own_request', own_request)
    response = http.post('/api/cast/radio/12345678-1234-1234-1234-123456789012', headers=auth)
    assert response.status_code == 200
    assert calls[1][1] == '/api/queue/items/add'
    assert calls[1][2]['params']['uris'] == 'https://radio.example.org/live.mp3'
    assert calls[1][2]['params']['playback'] == 'start'
    assert calls[1][2]['params']['clear'] == 'true'


def test_radio_cast_rejects_unknown_or_invalid_station(client):
    http, auth, _ = client
    assert http.post('/api/cast/radio/not-a-uuid', headers=auth).status_code == 422
    assert http.post('/api/chromecast/radio/not-a-uuid', headers=auth).status_code == 422


def test_radio_live_bitrate_measures_received_stream_bytes(client, monkeypatch):
    http, auth, mod = client

    async def station_by_uuid(_station_uuid):
        return {'stationuuid': '12345678-1234-1234-1234-123456789012', 'url': 'https://radio.example.org/live.mp3'}

    class FakeResponse:
        def raise_for_status(self):
            return None

        async def aiter_raw(self):
            yield b'x' * 32768
            yield b'x' * 32768

    class FakeStream:
        async def __aenter__(self):
            return FakeResponse()

        async def __aexit__(self, *_args):
            return None

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        def stream(self, *_args, **_kwargs):
            return FakeStream()

    monkeypatch.setattr(mod, 'radio_station_by_uuid', station_by_uuid)
    monkeypatch.setattr(mod.httpx, 'AsyncClient', FakeClient)
    response = http.get('/api/radio/bitrate/12345678-1234-1234-1234-123456789012', headers=auth)
    assert response.status_code == 200
    data = response.json()
    assert data['bytes'] == 65536
    assert data['bitrate_kbps'] > 0
    assert data['measurement'] == 'observed stream throughput'
