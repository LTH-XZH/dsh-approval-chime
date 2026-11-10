# dsh-approval-chime

A tiny [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that plays a short Windows notification chime whenever the agent asks you to approve a tool request — so you can look away and still notice.

No configuration needed, no dependencies to install, no network access.

```
tool asks for approval  →  approval/request  →  ♪ Windows Notify System Generic  →  the normal approval UI still decides
```

## Why

Approval prompts appear silently in the composer. If you are reading something else, or the window is behind another app, you only notice when you come back. This plugin turns that moment into a sound.

It plays from the **Host process**, not the web page, so it still works when the window is minimized, hidden in the system tray, or when the page has not finished loading.

## Requirements

| | |
|---|---|
| OS | **Windows 10 / 11 only** (uses `winmm.dll` and the system notification sounds) |
| App | DeepSeek Harness desktop app (the plugin borrows the `koffi` FFI runtime that ships with it) |

macOS and Linux are not supported: the plugin detects that and stays idle instead of failing.

## Install

1. Download or clone this repository somewhere stable (it is linked in place, so do not delete or move the folder afterwards).
2. Ask DeepSeek Harness to install the bundle, for example:

   > install the bundle at `C:\path\to\dsh-approval-chime`

   This runs the `plugin_manager` install for the absolute package directory.
3. **Restart the app.** Host plugin code is only loaded at startup, so the plugin is not live before a restart.
4. Check **Settings → Plugins** for an *Approval Chime* row (icon: a bell with a red dot).

## Configuration

| Knob | How |
|---|---|
| Which sound plays | Set `DSH_APPROVAL_CHIME_WAV` to any absolute `.wav` path (for example your own `D:\sounds\ding.wav`). It wins over the built-in list. |
| Volume | Set `DSH_APPROVAL_CHIME_GAIN_DB` (default `9`, clamped to 0–12). Windows notification sounds are mastered quietly; the plugin amplifies the PCM samples in memory before playing, so no modified file is ever written to disk. |
| Built-in fallbacks | `index.js` → `DEFAULT_SOUNDS`; the first file that exists wins. Default is `Windows Notify System Generic.wav`, then Messaging, Calendar, Email. |
| Repeat suppression | `index.js` → `MIN_INTERVAL_MS` (default 1200 ms). Parallel tool calls inside that window produce one chime. |

Any change to `index.js` needs an app restart to take effect.

## How it works

- Registers a listener on the Host `approval/request` waterfall and returns `next()`, so the approval decision is untouched: if the cue fails for any reason, approvals still work exactly as before.
- Reads the chosen WAV once, applies digital gain to its 16-bit PCM samples in memory, and plays that buffer through `winmm.dll!PlaySoundW` with `SND_MEMORY | SND_ASYNC`. The FFI runtime is the `koffi` copy that ships inside the desktop app (`resources/app.asar.unpacked/dsh/node_modules/koffi`). No subprocess, no startup delay, no console flash.
- Falls back to `SND_FILENAME` playback (unamplified) when the file is not 16-bit PCM, and to a hidden PowerShell `SoundPlayer` when the FFI binding cannot be resolved. Both fallbacks warn in the Host console.

## Troubleshooting

| Symptom | Check |
|---|---|
| No sound at all | Windows volume, the muted state, and the volume mixer entry for *DeepSeek Harness*. The plugin plays into the app's audio session. |
| Too quiet or too loud | Set `DSH_APPROVAL_CHIME_GAIN_DB` (0–12). Above roughly 10 dB the samples start clamping, which is audible as distortion. |
| Silence after an app update | The app may have moved its bundled `koffi`; the Host console shows a `[dsh-approval-chime]` warning in that case. Please open an issue. |
| Plays twice | Two copies of the bundle are installed. Remove one and restart. |

## Credits and licensing

- Code: MIT, see [LICENSE](LICENSE).
- Sound: the plugin does **not** ship any audio and writes no audio to disk. It reads WAV files that already exist on your Windows installation (`C:\Windows\Media\...`), amplifies the samples in memory, and plays them, so nothing copyrighted is redistributed here.
- The `koffi` FFI runtime is a separate project by Niels Martignène, MIT licensed; it is not bundled by this repository.
