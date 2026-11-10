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

## Uninstall

Ask the agent to remove the `dsh-approval-chime` bundle, or turn its row off in **Settings → Plugins**. Restart to unload it.

## Configuration

| Knob | How |
|---|---|
| Which sound plays | Set the `DSH_APPROVAL_CHIME_WAV` environment variable to any absolute `.wav` path (for example your own `D:\sounds\ding.wav`). It wins over the built-in list. |
| Built-in fallbacks | `index.js` → `DEFAULT_SOUNDS`; the first file that exists wins. Default is `Windows Notify System Generic.wav`, then Messaging, Calendar, Email. |
| Repeat suppression | `index.js` → `MIN_INTERVAL_MS` (default 1200 ms). Parallel tool calls inside that window produce one chime. |

Any change to `index.js` needs an app restart to take effect.

## How it works

- Registers a listener on the Host `approval/request` waterfall and returns `next()`, so the approval decision is untouched: if the cue fails for any reason, approvals still work exactly as before.
- Plays through `winmm.dll!PlaySoundW` with `SND_ASYNC`, using the `koffi` FFI runtime that ships inside the desktop app (`resources/app.asar.unpacked/dsh/node_modules/koffi`). No subprocess, no startup delay, no console flash.
- If that binding cannot be resolved it falls back to a hidden PowerShell `SoundPlayer`, and warns in the Host console.

## Troubleshooting

| Symptom | Check |
|---|---|
| No sound at all | Windows volume, the muted state, and the volume mixer entry for *DeepSeek Harness*. The plugin plays into the app's audio session. |
| Silence after an app update | The app may have moved its bundled `koffi`; the Host console shows a `[dsh-approval-chime]` warning in that case. Please open an issue. |
| Plays twice | Two copies of the bundle are installed. Remove one and restart. |
| Sound too loud / too quiet | Point `DSH_APPROVAL_CHIME_WAV` at another WAV, e.g. `C:\Windows\Media\Windows Notify Calendar.wav` or `C:\Windows\Media\Windows Ding.wav`. |

## Credits and licensing

- Code: MIT, see [LICENSE](LICENSE).
- Sound: the plugin does **not** ship any audio. It references WAV files that already exist on your Windows installation (`C:\Windows\Media\...`), so nothing copyrighted is redistributed here.
- The `koffi` FFI runtime is a separate project by Niels Martignène, MIT licensed; it is not bundled by this repository.
