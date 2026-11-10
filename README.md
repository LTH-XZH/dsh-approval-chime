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
| App | DeepSeek Harness 0.2.1-rc.3 or newer (0.2.x) |

The plugin is Windows-only today. The author has no macOS or Linux hardware to develop and verify against, so on those systems it installs cleanly but stays silent. If you have such a machine, contributions are very welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Install

You need **Git for Windows** installed: the app uses it to download the plugin. There is no build step and no dependency to install.

1. In DeepSeek Harness, open **Plugins** in the sidebar.
2. Click **Add plugin**.
3. Paste `github:LTH-XZH/dsh-approval-chime` and press Enter.
4. When it finishes, click **Enable now**.
5. **Quit DeepSeek Harness completely and open it again.** Closing the window is not enough — right-click the tray icon and choose Quit.

That is the whole install.

> No Git, or cannot reach GitHub? Click **Code → Download ZIP** on this page, unzip it to a folder you will keep (for example `D:\dsh-approval-chime`), and paste that folder path into the same **Add plugin** box.

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
node test/wav.test.mjs    # WAV parsing and gain tests
```

The tests use Node's built-in test runner, so no package manager or registry is involved.

To try the checkout directly, paste its folder path into **Add plugin** instead of the Git address; the install links the folder in place.

## Contributing

All suggestions are welcome — features, wording, or code. The ground rules are in [CONTRIBUTING.md](CONTRIBUTING.md); the Chinese version is [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md).

## License

MIT, see [LICENSE](LICENSE). The plugin ships no audio: it reads WAV files that already exist on your Windows installation.
