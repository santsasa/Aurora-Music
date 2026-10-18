# Aurora Music Changelog

All listed versions are **experimental**. Universal compatibility is not guaranteed until tested on real hardware.

## [0.3.3] — 2026-10-18 (Hotfix)

- Added the official Google Cast Web Sender SDK and a trusted local HTTPS entry point through Caddy for the Raspberry Pi LAN address.
- Added persistent Caddy certificate storage and a LAN endpoint to download the local root certificate required by browsers that control Cast.
- Added a signed, short-lived FLAC media URL for Google Cast while keeping the receiver stream on the Raspberry Pi's LAN HTTP address.
- Added live receiver-state synchronization for active Cast sessions, including external media title, artist, album art, duration, playback position, and device volume.
- Routed direct Chromecast track and radio playback, play/pause, stop, seek, and user-adjusted volume through the official Cast session when available; retained existing fallback routes when HTTPS or the SDK is unavailable.
- Preserved the receiver's current volume when starting a Cast session; the volume slider only changes it after the user moves the control.
- Added a quick audio-quality selector to the main and compact players, with the selected profile saved in the browser and applied to browser playback.
- Added an explicit stop control and translations for the new quality and stop controls.
- Updated the Portainer and Docker Compose stacks to start Caddy, persist its local CA, and use a LAN-reachable Cast media URL.
- Made the Portainer Caddy configuration self-contained so deployment does not depend on a separate bind-mounted `Caddyfile`.
- Added local HTTPS, certificate-trust, Cast, and LAN-only setup instructions to the README.
- Refreshed frontend asset versions to ensure browsers load the Cast and quality-control updates.

## [0.3.2] — 2026-10-18 (Hotfix)

- Recover direct Chromecast playback when a previous connection worker has stopped instead of trying to restart a finished thread.
- Serialize direct Chromecast playback and control commands to prevent overlapping operations on the same receiver.
- Serialize device discovery so concurrent requests cannot replace the active discovery state.

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
