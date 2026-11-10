# Approval Chime for DeepSeek Harness

[![npm](https://img.shields.io/npm/v/dsh-approval-chime-win?label=npm&color=blue)](https://www.npmjs.com/package/dsh-approval-chime-win)
[![license](https://img.shields.io/npm/l/dsh-approval-chime-win)](LICENSE)
[![platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078d4)](#requirements)

[English](README.md) | [中文](README.zh.md)

A tiny [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that plays a short Windows notification chime whenever the agent asks you to approve a tool request — so you can look away and still notice.

No configuration, no dependencies to install, no network access.

```
tool asks for approval  →  approval/request  →  ♪ Windows Notify System Generic  →  the normal approval UI still decides
```

## Why

Approval prompts appear silently in the composer. If you are reading something else, or the window is behind another app, you only notice when you come back. This plugin turns that moment into a sound.

It plays from the **Host process**, not the web page, so it works even when the window is minimized, hidden in the system tray, or the page has not finished loading.

## Requirements

| | |
|---|---|
| OS | **Windows 10 / 11** (uses `winmm.dll` and the system notification sounds) |
| App | DeepSeek Harness **0.2.1-rc.3 or newer** within `0.2.x` (declared as `engines.dsh`) |

On macOS and Linux the bundle still installs but stays idle: it logs one warning and never plays anything.

## Install

The npm package is named **`dsh-approval-chime-win`** — `dsh-approval-chime` was already taken on npm. It is the same plugin; see [Why the `-win` suffix](#why-the--win-suffix).

### 1. From the app (recommended)

1. In the sidebar, open **Plugins**.
2. Click **Add plugin**.
3. Paste `dsh-approval-chime-win` and press <kbd>Enter</kbd>.
4. When the install finishes, click **Enable now**.
5. **Restart DeepSeek Harness** — Host plugin code is loaded at startup.
6. The bundle card **Approval Chime** (bell with a red dot) now appears under **Installed**, and the plugin is listed in **Settings → Built-in plugins**.

To trigger it, ask the agent to do something that needs approval (for example, run a shell command). The chime plays the moment the approval prompt appears.

### 2. By asking the agent

Paste this into the chat:

> Install the bundle `dsh-approval-chime-win`, enable it, then tell me to restart.

The agent calls `plugin_manager` for you; you approve that one action.

### 3. From the command line

```sh
dsh plugin --profile <profile> add dsh-approval-chime-win
dsh --profile <profile>
```

`<profile>` is the profile you start, for example `desktop`.

### 4. Straight from GitHub (no npm account needed)

Paste `github:LTH-XZH/dsh-approval-chime` into **Add plugin**, or use the CLI:

```sh
dsh plugin --profile <profile> add github:LTH-XZH/dsh-approval-chime
```

The published code is plain JavaScript, so git installs need **no build step and no build-script approval**. Pin a commit if you want a frozen copy: `github:LTH-XZH/dsh-approval-chime#<sha>`.

### 5. Offline, from a tarball

Download `dsh-approval-chime-win-1.0.0.tgz` from [Releases](https://github.com/LTH-XZH/dsh-approval-chime/releases), then use **Add plugin** with the absolute path to the file, or:

```sh
dsh plugin --profile <profile> add ./dsh-approval-chime-win-1.0.0.tgz
```

### Upgrading and uninstalling

There is no auto-update yet. To upgrade, uninstall the bundle (or `dsh plugin remove dsh-approval-chime-win`), install the new version, and restart. To remove it, open the bundle page and choose **Uninstall**, then restart.

## Configuration

| Knob | How |
|---|---|
| Which sound plays | Set `DSH_APPROVAL_CHIME_WAV` to any absolute `.wav` path (for example your own `D:\sounds\ding.wav`). It wins over the built-in list. |
| Volume | Set `DSH_APPROVAL_CHIME_GAIN_DB` (default `9`, clamped to 0–12). Windows notification sounds are mastered quietly; the plugin amplifies the PCM samples in memory before playing, so no modified file is ever written to disk. |
| Built-in fallbacks | `index.js` → `DEFAULT_SOUNDS`; the first file that exists wins. Default is `Windows Notify System Generic.wav`, then Messaging, Calendar, Email. |
| Repeat suppression | `index.js` → `MIN_INTERVAL_MS` (default 1200 ms). Parallel tool calls inside that window produce one chime. |

Environment variables apply to the app process, so set them before starting DeepSeek Harness. Any change to `index.js` needs an app restart to take effect.

## How it works

- Registers a listener on the Host `approval/request` waterfall and returns `next()`, so the approval decision is untouched: if the cue fails for any reason, approvals still work exactly as before.
- Reads the chosen WAV once, applies digital gain to its 16-bit PCM samples in memory, and plays that buffer through `winmm.dll!PlaySoundW` with `SND_MEMORY | SND_ASYNC`. The FFI runtime is the `koffi` copy that ships inside the desktop app (`resources/app.asar.unpacked/dsh/node_modules/koffi`). No subprocess, no startup delay, no console flash.
- Falls back to `SND_FILENAME` playback (unamplified) when the file is not 16-bit PCM, and to a hidden PowerShell `SoundPlayer` when the FFI binding cannot be resolved. Both fallbacks warn in the Host console.

## Troubleshooting

| Symptom | Check |
|---|---|
| No sound at all | Windows volume and mute state, the volume mixer entry for *DeepSeek Harness*, and whether you restarted after installing. |
| Still silent on macOS/Linux | Expected — playback is Windows-only. The Host console shows one `[dsh-approval-chime]` warning. |
| Too quiet or too loud | Set `DSH_APPROVAL_CHIME_GAIN_DB` (0–12). Above roughly 10 dB the samples start clamping, which is audible as distortion. |
| Plays twice | Two copies of the bundle are installed. Remove one and restart. |
| Install refused with an engine error | The app is older than `0.2.1-rc.3`; update DeepSeek Harness. |
| Silence after an app update | The app may have moved its bundled `koffi`; the Host console shows a `[dsh-approval-chime]` warning in that case. Please open an issue. |

## Why the `-win` suffix

`dsh-approval-chime` is already published on npm by another author, so this package uses `dsh-approval-chime-win`. The suffix also states the supported platform. The GitHub repository keeps the name `dsh-approval-chime`.

## Development

```sh
git clone https://github.com/LTH-XZH/dsh-approval-chime.git
cd dsh-approval-chime
npm test              # pure-function tests for the WAV gain path
npm pack --dry-run    # see exactly what would be published
```

To try a local checkout inside the app, install the folder itself (`dsh plugin --profile <profile> add /absolute/path/to/dsh-approval-chime`, or **Add plugin** with the absolute path); the install links the directory, so keep it in place.

The plugin has no build step and no runtime dependencies, so the checkout, the npm tarball, and a git install contain the same code.

## Credits and licensing

- Code: MIT, see [LICENSE](LICENSE).
- Sound: the plugin does **not** ship any audio and writes no audio to disk. It reads WAV files that already exist on your Windows installation (`C:\Windows\Media\...`), amplifies the samples in memory, and plays them, so nothing copyrighted is redistributed here.
- The `koffi` FFI runtime is a separate project by Niels Martignène, MIT licensed; it is not bundled by this repository.
