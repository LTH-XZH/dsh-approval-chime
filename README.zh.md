# dsh-approval-chime · 审批提示音

一个很小的 DeepSeek Harness 插件（Windows 专用）：当 agent 请求你批准工具调用时，响一声系统提示音，你可以先去看别的东西，也不会错过。

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078d4)](#环境要求)

[English](README.md) | 中文

```
工具请求授权  →  ♪ Windows Notify System Generic  →  原有的审批界面照常决定
```

## 环境要求

| | |
|---|---|
| 操作系统 | Windows 10 / 11 |
| 应用 | DeepSeek Harness 0.2.1-rc.3 及以上（0.2.x） |

在 macOS / Linux 上也能装，但不会发声，也不影响其他功能。

## 安装

电脑上需要有 **Git**（应用靠它下载插件）。不经过 npm，也不需要编译或安装依赖。

1. 侧栏打开 **插件**。
2. 点 **添加插件**。
3. 粘贴 `github:LTH-XZH/dsh-approval-chime`，按回车。
4. 装好后点 **立即启用**。
5. **完全退出 DeepSeek Harness，再重新打开。** 只关窗口不算——要右键任务栏托盘里的图标，选退出。

以上就是全部步骤。

> 没装 Git 或打不开 GitHub？在本页点 **Code → Download ZIP**，解压到一个固定目录（例如 `D:\dsh-approval-chime`），再把文件夹路径粘贴到同一个「添加插件」输入框里。

### 验证是否生效

让 agent 做一件需要你批准的事，比如执行一条 PowerShell 命令。审批框出现的那一刻，应该会响一声。

### 卸载

**插件 → 审批提示音 → 卸载**，然后重启应用。

## 自定义

| 想改什么 | 怎么改 |
|---|---|
| 换一个声音 | 启动应用前设置环境变量 `DSH_APPROVAL_CHIME_WAV` 为某个 `.wav` 的绝对路径。 |
| 调大或调小 | 设置 `DSH_APPROVAL_CHIME_GAIN_DB`（默认 `9`，范围 0–12）。 |
| 默认声音 | `C:\Windows\Media\Windows Notify System Generic.wav`；找不到时依次用 Messaging、Calendar、Email。 |

Windows 的通知音本身录得比较轻，插件会在**内存里**把音量放大 9 dB 再播放，不会修改或写入任何音频文件。环境变量要在启动应用之前设好。

## 常见问题

| 现象 | 处理 |
|---|---|
| 完全没声音 | 装完之后有没有重启应用？再看 Windows 音量和音量合成器里 *DeepSeek Harness* 这一项。 |
| 装完没看到卡片 | **插件 → 已安装** 里应该有 *审批提示音*。没有的话重新安装一次；应用版本需为 0.2.1-rc.3 及以上。 |
| 太轻或失真 | 把 `DSH_APPROVAL_CHIME_GAIN_DB` 调到 0–12 之间；超过约 10 dB 采样会被削平，听上去发闷。 |
| 一声响两次 | 装了两份插件，删掉一份再重启。 |
| 应用更新后不响了 | 应用自带的 `koffi` 路径可能变了；宿主控制台会出现 `[dsh-approval-chime]` 警告，欢迎提 issue。 |

## 实现方式

- 监听宿主侧的 `approval/request` 事件，处理完立刻交还，不参与、也不会拖延审批决定。
- 启动后读一次 WAV，在内存里放大 16-bit PCM 采样，再用桌面端自带的 `koffi` 调 `winmm.dll!PlaySoundW` 播放。没有子进程，也不会闪控制台窗口。
- FFI 不可用时，退回隐藏窗口的 PowerShell 播放器。

## 开发

```sh
npm test              # WAV 解析与增益的测试
npm pack --dry-run    # 看发布包里有什么
```

想直接试当前目录：把目录路径粘贴到 **添加插件** 里（代替 Git 地址），安装会链接这个目录。

## 许可

MIT，见 [LICENSE](LICENSE)。仓库不携带任何音频：只读取你 Windows 系统里已有的 WAV 文件。
