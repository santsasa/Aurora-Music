# Aurora Music Changelog

All listed versions are **experimental**. Universal compatibility is not guaranteed until tested on real hardware.

## [0.3.1] — 2026-10-18 (Hotfix)

- Added a direct Chromecast playback option that streams FLAC through the Cast Default Media Receiver; OwnTone's Opus route remains available as a fallback.
- Added direct Chromecast and OwnTone radio playback, plus live format, bitrate, source bit depth, and sample-rate details in the player.
- Added a periodic short stream sample so radio playback can show observed source throughput separately from the directory's advertised bitrate.
- Replaced the player device glyph with a speaker icon and made browser volume default to 100%, saved per browser.
- Fixed API startup so radio routes are registered.
- The Portainer variant now repairs ownership of OwnTone's persistent cache before starting it.
- Added web interface and Android connection language selectors for Spanish, English, Portuguese, French, German, and Italian; the preference is saved in each browser or app installation.
- Fixed the Android GitHub Actions workflow to avoid using the retired `tools` SDK package.

## [0.3.0] — 2026-10-18

### Added

- Separate **Online Radio** section and country selection (in Settings or the Radio tab).
- Integration with the community **Radio Browser** directory, with station search by name and country.
- Persistent radio favorites in SQLite and direct playback in the browser.
- Directory caching and station URL filtering to prevent local destinations in metadata.
- **Android client project** under `android-app/`, with a WebView and server connection screen.
- Debug APK build workflow in GitHub Actions (`.github/workflows/android-apk.yml`).
- Tests for countries, favorites, authentication, and radio URL validation.

### Limitations

- Radio streams play in the browser; they are not relayed or automatically transcoded by the Raspberry Pi.
- Radio control to Chromecast/AirPlay is not yet implemented.
- The debug APK builds in GitHub Actions but has not been validated on a real phone.
- The Android client does not guarantee background playback or Android Auto support.

## [0.2.0] — 2026-10-18

- Synchronized lyrics search through LRCLIB, with caching and a variant selector.
- Priority for local `.lrc` lyrics and an API for selecting matches.
- Privacy settings for online lyrics.

## [0.1.0] — 2026-10-18

- First version with a local library, web playback, playlists, favorites, and scanning.
- On-demand transcoding through FFmpeg.
- Liquid Glass / Material 3 interface, queue, basic equalizer, and sleep timer.
- Initial OwnTone integration for AirPlay and Chromecast (pending validation on real hardware).
