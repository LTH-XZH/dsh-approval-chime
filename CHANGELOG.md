# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-10

First public release.

- Plays a Windows notification chime when the Host emits `approval/request`,
  while leaving the approval decision to the normal answerers.
- Amplifies the system WAV in memory (default +9 dB) instead of writing a
  modified file to disk.
- `DSH_APPROVAL_CHIME_WAV` to choose the sound and
  `DSH_APPROVAL_CHIME_GAIN_DB` (0–12) to set the volume.
- Collapses bursts of parallel tool calls into one chime.
- Falls back to `SND_FILENAME` playback, then to a hidden PowerShell player,
  when the FFI route is unavailable.
- Stays idle with a single warning on macOS and Linux.
