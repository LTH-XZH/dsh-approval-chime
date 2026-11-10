# dsh-approval-chime

一个很小的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件：当 agent 请求你审批某个工具调用时，播放一声 Windows 通知音——你可以先去看别的东西，也不会错过。

零配置、无需安装依赖、不联网。

```
工具请求授权  →  approval/request  →  ♪ Windows Notify System Generic  →  原有的审批界面照常决定
```

## 为什么需要它

审批框是静默出现在输入区上方的。如果你在看别的窗口，或者应用被别的程序挡住，往往要过一会儿才发现。这个插件把那一刻变成一声提示音。

声音由**宿主进程**播放，不是网页里播，所以窗口最小化、收进系统托盘、甚至前端还没加载完，都照样能响。

## 环境要求

| | |
|---|---|
| 操作系统 | **仅 Windows 10 / 11**（依赖 `winmm.dll` 和系统自带提示音） |
| 应用 | DeepSeek Harness 桌面端（插件借用应用里自带的 `koffi` FFI 运行时） |

macOS 和 Linux 不支持：插件会检测到并保持静默，不会报错。

## 安装

1. 把仓库下载或克隆到一个固定位置（安装是**链接**这个目录，之后不要删除或移动它）。
2. 让 DeepSeek Harness 安装这个 bundle，例如对 agent 说：

   > 安装 `C:\path\to\dsh-approval-chime` 这个目录的插件

   这等价于用 `plugin_manager` 安装一个绝对路径的包目录。
3. **重启应用。** 宿主插件代码只在启动时加载，不重启不会生效。
4. 在 **设置 → 插件** 里应该能看到 *审批提示音* 这一行（图标是铃铛加一个红点）。

## 配置

| 想改什么 | 怎么改 |
|---|---|
| 换声音 | 设置环境变量 `DSH_APPROVAL_CHIME_WAV` 为任意 `.wav` 的绝对路径（比如你自己的 `D:\sounds\ding.wav`），优先级最高。 |
| 音量 | 设置环境变量 `DSH_APPROVAL_CHIME_GAIN_DB`（默认 `9`，限制在 0–12）。Windows 的通知音本身录得比较轻，插件在**内存里**放大 PCM 采样后再播放，不会把修改过的音频写到磁盘。 |
| 内置回退列表 | `index.js` 里的 `DEFAULT_SOUNDS`，取第一个存在的文件。默认 `Windows Notify System Generic.wav`，其后是 Messaging、Calendar、Email。 |
| 合并间隔 | `index.js` 里的 `MIN_INTERVAL_MS`（默认 1200 毫秒）。这个窗口内的并发工具调用只响一声。 |

改动 `index.js` 后需要重启应用才生效。

## 实现要点

- 挂在宿主侧的 `approval/request` waterfall 上，处理完立即 `next()` 交还，**不参与审批决策**：即使播放失败，审批流程也不受影响。
- 启动后读取一次选定的 WAV，在内存里对 16-bit PCM 采样做数字增益，再用 `winmm.dll!PlaySoundW`（`SND_MEMORY | SND_ASYNC`）播放这个缓冲区。FFI 用桌面端自带的 `koffi`（`resources/app.asar.unpacked/dsh/node_modules/koffi`），没有子进程、没有启动延迟、不闪控制台窗口。
- 文件不是 16-bit PCM 时退回 `SND_FILENAME` 直接播放（不放大）；FFI 绑定失败时退回隐藏窗口的 PowerShell `SoundPlayer`。两条回退都会在宿主控制台打警告。

## 排障

| 现象 | 检查 |
|---|---|
| 完全没声音 | Windows 音量、是否静音，以及音量合成器里 *DeepSeek Harness* 这一项。声音走的是应用的音频会话。 |
| 太轻或太响 | 调 `DSH_APPROVAL_CHIME_GAIN_DB`（0–12）。超过约 10 dB 后采样开始被削平，会听出失真。 |
| 应用更新后不响了 | 可能是自带的 `koffi` 路径变了；宿主控制台会有 `[dsh-approval-chime]` 警告。请提 issue。 |
| 一声响两次 | 装了两份 bundle，删掉一份并重启。 |

## 许可与来源

- 代码：MIT，见 [LICENSE](LICENSE)。
- 声音：仓库**不携带任何音频**，也不往磁盘写音频。只读取你 Windows 系统里已有的 `C:\Windows\Media\...`，在内存里放大后播放，因此不涉及音频版权再分发。
- `koffi` 是 Niels Martignène 的独立项目（MIT），本仓库不打包它。
