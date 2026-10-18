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
