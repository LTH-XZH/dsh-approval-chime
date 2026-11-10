# 审批提示音 · Approval Chime

[![npm](https://img.shields.io/npm/v/dsh-approval-chime-win?label=npm&color=blue)](https://www.npmjs.com/package/dsh-approval-chime-win)
[![license](https://img.shields.io/npm/l/dsh-approval-chime-win)](LICENSE)
[![platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078d4)](#环境要求)

[English](README.md) | 中文

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
| 应用 | DeepSeek Harness **0.2.1-rc.3 及以上**（`0.2.x` 范围内，写在 `engines.dsh` 里） |

macOS 和 Linux 上也能安装，但会保持静默：只在宿主控制台打一条警告，不会发声。

## 安装

npm 包名是 **`dsh-approval-chime-win`**——`dsh-approval-chime` 这个名字在 npm 上已经被别人占用。它们是同一个插件，原因见[为什么包名带 `-win`](#为什么包名带--win)。

### 一、在应用里安装（推荐）

1. 侧栏打开 **插件**。
2. 点 **添加插件**。
3. 粘贴 `dsh-approval-chime-win`，按回车。
4. 安装结束后点 **立即启用**。
5. **重启 DeepSeek Harness**——宿主插件代码只在启动时加载。
6. **已安装**分组里出现一张 **审批提示音** 卡片（铃铛加红点），同时在 **设置 → 内置插件** 里能看到它。

想验证：让 agent 做一件需要审批的事（比如执行一条 shell 命令），审批框出现的那一刻就应该响。

### 二、让 agent 帮你装

把这句话发给它：

> 安装 `dsh-approval-chime-win` 这个组合包，启用它，然后提醒我重启。

agent 会调用 `plugin_manager`，你只需要批准这一次操作。

### 三、用命令行

```sh
dsh plugin --profile <profile> add dsh-approval-chime-win
dsh --profile <profile>
```

`<profile>` 是你平时启动的 profile，例如 `desktop`。

### 四、直接从 GitHub 安装（不需要 npm 账号）

在 **添加插件** 里粘贴 `github:LTH-XZH/dsh-approval-chime`，或者用命令行：

```sh
dsh plugin --profile <profile> add github:LTH-XZH/dsh-approval-chime
```

代码是纯 JavaScript，放出来的就是能直接跑的产物，所以 git 安装**不需要构建步骤，也不会触发构建脚本授权**。想固定版本就带上 commit：`github:LTH-XZH/dsh-approval-chime#<sha>`。

### 五、离线安装（压缩包）

从 [Releases](https://github.com/LTH-XZH/dsh-approval-chime/releases) 下载 `dsh-approval-chime-win-1.0.0.tgz`，然后在 **添加插件** 里填这个文件的绝对路径，或者：

```sh
dsh plugin --profile <profile> add ./dsh-approval-chime-win-1.0.0.tgz
```

### 升级与卸载

目前还不支持自动更新。升级 = 先卸载再装新版本，然后重启。卸载在组合包详情页点 **卸载** 即可，同样需要重启。

## 配置

| 想改什么 | 怎么改 |
|---|---|
| 换声音 | 设置环境变量 `DSH_APPROVAL_CHIME_WAV` 为任意 `.wav` 的绝对路径（比如你自己的 `D:\sounds\ding.wav`），优先级最高。 |
| 音量 | 设置环境变量 `DSH_APPROVAL_CHIME_GAIN_DB`（默认 `9`，限制在 0–12）。Windows 的通知音本身录得比较轻，插件在**内存里**放大 PCM 采样后再播放，不会把修改过的音频写到磁盘。 |
| 内置回退列表 | `index.js` 里的 `DEFAULT_SOUNDS`，取第一个存在的文件。默认 `Windows Notify System Generic.wav`，其后是 Messaging、Calendar、Email。 |
| 合并间隔 | `index.js` 里的 `MIN_INTERVAL_MS`（默认 1200 毫秒）。这个窗口内的并发工具调用只响一声。 |

环境变量作用于应用进程，所以要在启动 DeepSeek Harness 之前设好。改动 `index.js` 后需要重启应用才生效。

## 实现要点

- 挂在宿主侧的 `approval/request` waterfall 上，处理完立即 `next()` 交还，**不参与审批决策**：即使播放失败，审批流程也不受影响。
- 启动后读取一次选定的 WAV，在内存里对 16-bit PCM 采样做数字增益，再用 `winmm.dll!PlaySoundW`（`SND_MEMORY | SND_ASYNC`）播放这个缓冲区。FFI 用桌面端自带的 `koffi`（`resources/app.asar.unpacked/dsh/node_modules/koffi`），没有子进程、没有启动延迟、不闪控制台窗口。
- 文件不是 16-bit PCM 时退回 `SND_FILENAME` 直接播放（不放大）；FFI 绑定失败时退回隐藏窗口的 PowerShell `SoundPlayer`。两条回退都会在宿主控制台打警告。

## 排障

| 现象 | 检查 |
|---|---|
| 完全没声音 | Windows 音量、是否静音、音量合成器里 *DeepSeek Harness* 这一项，以及装完之后有没有重启。 |
| macOS/Linux 上不响 | 正常，播放只支持 Windows；宿主控制台会有一条 `[dsh-approval-chime]` 警告。 |
| 太轻或太响 | 调 `DSH_APPROVAL_CHIME_GAIN_DB`（0–12）。超过约 10 dB 后采样开始被削平，会听出失真。 |
| 一声响两次 | 装了两份 bundle，删掉一份并重启。 |
| 安装被版本检查拒绝 | 应用低于 `0.2.1-rc.3`，先升级 DeepSeek Harness。 |
| 应用更新后不响了 | 可能是自带的 `koffi` 路径变了；宿主控制台会有 `[dsh-approval-chime]` 警告。请提 issue。 |

## 为什么包名带 `-win`

`dsh-approval-chime` 这个名字已经被另一位作者发布在 npm 上，所以这个包叫 `dsh-approval-chime-win`。后缀同时也说明了支持平台。GitHub 仓库名仍然是 `dsh-approval-chime`。

## 开发

```sh
git clone https://github.com/LTH-XZH/dsh-approval-chime.git
cd dsh-approval-chime
npm test              # WAV 增益逻辑的纯函数测试
npm pack --dry-run    # 看发布包里到底有什么
```

想在应用里直接试本地目录：把整个目录当成包安装（`dsh plugin --profile <profile> add /绝对/路径/dsh-approval-chime`，或在 **添加插件** 里填绝对路径）。安装是**链接**这个目录，之后不要删除或移动它。

插件没有构建步骤、没有运行时依赖，所以 checkout、npm 压缩包和 git 安装拿到的是同一份代码。

## 许可与来源

- 代码：MIT，见 [LICENSE](LICENSE)。
- 声音：仓库**不携带任何音频**，也不往磁盘写音频。只读取你 Windows 系统里已有的 `C:\Windows\Media\...`，在内存里放大后播放，因此不涉及音频版权再分发。
- `koffi` 是 Niels Martignène 的独立项目（MIT），本仓库不打包它。
