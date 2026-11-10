# dsh-approval-chime

A small DeepSeek Harness plugin for Windows: it plays one short system chime the moment the agent asks you to approve a tool call, so you can look elsewhere and still notice.

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078d4)](#requirements)

[English](README.md) | [中文](README.zh.md)

```
tool asks for approval  →  ♪ Windows Notify System Generic  →  the normal approval UI still decides
```

## Requirements

| | |
|---|---|
| OS | Windows 10 / 11 |
| App | DeepSeek Harness 0.2.1-rc.3 or newer |

The plugin is silent (but harmless) on macOS and Linux.

## Install

The plugin is not on npm yet, so install it from this repository. There is no build step and no dependency to install.

### A. One line (needs Git for Windows)

1. In DeepSeek Harness, open **Plugins** in the sidebar.
2. Click **Add plugin**.
3. Paste `github:LTH-XZH/dsh-approval-chime` and press Enter.
4. When it finishes, click **Enable now**.
5. **Quit DeepSeek Harness completely and open it again.** Closing the window is not enough — right-click the tray icon and choose Quit.

### B. ZIP download (no Git needed)

1. On this page click **Code → Download ZIP**, and unzip it into a folder you will keep, for example `D:\dsh-approval-chime`. Do not move or delete that folder afterwards.
2. In DeepSeek Harness: **Plugins → Add plugin**.
3. Paste the folder path (`D:\dsh-approval-chime`) and press Enter.
4. Click **Enable now**, then quit and reopen the app as in step A5.

### Check that it works

Ask the agent to do something that needs your permission, for example run a PowerShell command. The chime plays as the approval prompt appears.

### Uninstall

**Plugins → Approval Chime → Uninstall**, then restart the app.

## Customize

| Want | How |
|---|---|
| A different sound | Set the environment variable `DSH_APPROVAL_CHIME_WAV` to an absolute `.wav` path before starting the app. |
| Louder or quieter | Set `DSH_APPROVAL_CHIME_GAIN_DB` (default `9`, range 0–12). |
| Default sound | `C:\Windows\Media\Windows Notify System Generic.wav`; the plugin falls back to Messaging, Calendar, then Email. |

Windows notification sounds are mastered quietly, so the plugin amplifies the samples **in memory** at +9 dB by default. No file is modified or written to disk.

## Troubleshooting

| Problem | Fix |
|---|---|
| No sound | Did you restart the app after installing? Then check the Windows volume, and the *DeepSeek Harness* entry in the volume mixer. |
| No card after installing | **Plugins → Installed** should list *Approval Chime*. If it is missing, install again; the app must be 0.2.1-rc.3 or newer. |
| Too quiet or distorted | Set `DSH_APPROVAL_CHIME_GAIN_DB` between 0 and 12. Above ~10 dB the samples clip. |
| Two chimes | Two copies are installed. Uninstall one and restart. |
| Silent after an app update | The app may have moved its bundled `koffi`. The Host console shows a `[dsh-approval-chime]` warning; please open an issue. |

## How it works

- Listens to the Host `approval/request` event and returns immediately, so the approval decision is never delayed or changed.
- Reads the WAV once, amplifies its 16-bit PCM samples in memory, and plays it with `winmm.dll!PlaySoundW` through the `koffi` runtime that ships with the desktop app. No subprocess, no console window.
- Falls back to a hidden PowerShell player if the FFI binding cannot be resolved.

## Development

```sh
npm test              # tests for the WAV parsing and gain code
npm pack --dry-run    # what would be published
```

To try the checkout directly, add the folder as a plugin (option B above); the install links the folder in place.

## License

MIT, see [LICENSE](LICENSE). The plugin ships no audio: it reads WAV files that already exist on your Windows installation.
