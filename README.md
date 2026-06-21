# chengfeng-videocut-skills

> Codex / Claude Code 可用的口播视频剪辑 Skills 包。

这个仓库把我自己的视频剪辑流程拆成了一组 Skills：先剪口播、再处理字幕，最后把视频、字幕和素材组织成可审核、可修改、可导出的竖屏成片。

它不是一个剪辑软件，也不是万能视频生成器。它更像是一个给 Agent 用的工作流：你把视频、字幕和素材放好，Agent 按 Skill 往下跑，人只需要看页面、提修改意见、确认结果。

## 一句话安装

复制这条命令即可：

```bash
npx chengfeng-videocut-skills install
```

这个 npm 包只是一个很小的安装器。真正的 Skills 源码在 GitHub：

```text
https://github.com/Agentchengfeng/chengfeng-videocut-skills
```

安装器每次会从 GitHub 拉取最新版本，所以我只需要维护这个仓库。

默认会安装到两个位置：

```text
~/.claude/skills/chengfeng-videocut-skills
~/.codex/skills/chengfeng-videocut-skills
```

只安装到 Codex：

```bash
npx chengfeng-videocut-skills install --target codex
```

只安装到 Claude Code：

```bash
npx chengfeng-videocut-skills install --target claude
```

指定安装目录：

```bash
npx chengfeng-videocut-skills install --dir ~/.codex/skills/chengfeng-videocut-skills
```

## 它能做什么

```text
原始口播视频
    |
    v
剪口播
转录、识别口误/重复/静音，生成审核页，确认后导出剪后视频
    |
    v
导入字幕
重新转录剪后视频，校对字幕，输出 SRT 或剪映草稿
    |
    v
口播成片
按字幕拆分镜，生成分镜页面和时间线预览，确认后导出 1080x1440 MP4
    |
    v
高清化 / 自进化
按需要做高清导出，或把你的偏好写回规则
```

当前最核心的是两条路径：

1. `剪口播`：把一段口播原片剪成更干净的 A-roll。
2. `口播成片`：把剪后视频、字幕和素材做成可发布的竖屏成片。

## 典型用法

### 1. 先剪口播

把原始视频给 Agent，说：

```text
用 chengfeng-videocut-skills:剪口播，帮我处理这个口播视频。
```

它会做这些事：

- 提取音频
- 调用火山引擎转录
- 识别静音、口误、重复、卡顿
- 生成审核网页
- 用户确认后执行剪辑

### 2. 再出字幕

剪完后，说：

```text
用 chengfeng-videocut-skills:导入字幕，给剪后视频生成字幕。
```

它会重新基于剪后视频转录，不用原视频时间线反推，避免字幕和剪后视频错位。

### 3. 做口播成片

准备一个文件夹：

```text
project/
├── source_cut.mp4
├── subtitles.srt
└── assets/
    ├── 产品截图.png
    ├── 评论截图.png
    └── 结果页.png
```

然后说：

```text
用 chengfeng-videocut-skills:口播成片，把这个文件夹里的视频和字幕做成 1080x1440 竖屏 MP4。
先生成分镜页面给我确认，不要直接导出。
```

这个 Skill 的默认顺序是：

```text
视频 + 字幕 + 素材
    |
    v
分镜页面
按字幕拆段，判断每段该用原视频、截图、页面、HTML 画面还是动画
    |
    v
时间线预览
把所有画面按时间线放在一起，方便看节奏和错位
    |
    v
合成导出
确认后导出 1080x1440 竖屏 MP4
```

这里的关键不是让用户手动剪时间线，而是把中间判断变成 Agent 能读写的页面。页面可以交给 Codex / Claude Code 检查，也可以由人直接看。

## Skill 清单

| Skill | 作用 | 常见输入 | 常见输出 |
| --- | --- | --- | --- |
| `chengfeng-videocut-skills:安装` | 准备 Node.js、FFmpeg、API Key 等环境 | 无 | 环境检查结果 |
| `chengfeng-videocut-skills:剪口播` | 转录口播，识别口误、重复、静音，生成审核页 | 原始视频 | 剪后视频、审核页、删除清单 |
| `chengfeng-videocut-skills:导入字幕` | 给剪后视频生成字幕，必要时推送剪映草稿 | 剪后视频、可选原稿 | SRT、剪映草稿 |
| `chengfeng-videocut-skills:口播成片` | 生成分镜页面、时间线预览和最终竖屏 MP4 | 剪后视频、字幕、素材 | 分镜页、预览页、1080x1440 MP4 |
| `chengfeng-videocut-skills:高清化` | 用 FFmpeg 做高清导出 | 视频文件 | 高清视频 |
| `chengfeng-videocut-skills:自进化` | 把使用偏好沉淀回规则 | 用户反馈 | 更新后的规则 |

## 环境配置

基础依赖：

| 依赖 | 用途 |
| --- | --- |
| Node.js 18+ | 运行安装器和脚本 |
| FFmpeg | 音视频处理 |
| curl | API 请求 |
| 火山引擎语音识别 API Key | 口播转录 |

安装后复制环境变量模板：

```bash
cd ~/.claude/skills/chengfeng-videocut-skills
cp .env.example .env
```

然后在 `.env` 里填写：

```text
VOLCENGINE_API_KEY=your_volcengine_api_key_here
```

如果你只装到 Codex，对应目录是：

```bash
cd ~/.codex/skills/chengfeng-videocut-skills
cp .env.example .env
```

## 仓库结构

```text
chengfeng-videocut-skills/
├── README.md
├── package.json
├── bin/
│   └── cli.js
├── 剪口播/
│   ├── SKILL.md
│   ├── scripts/
│   └── 用户习惯/
├── 导入字幕/
│   ├── SKILL.md
│   ├── 安装/
│   │   └── SKILL.md
│   ├── references/
│   └── scripts/
├── 口播成片/
│   ├── SKILL.md
│   ├── templates/
│   │   ├── storyboard-audit.html
│   │   └── timeline-preview.html
│   ├── references/
│   └── scripts/
├── 高清化/
│   ├── SKILL.md
│   └── scripts/
└── 自进化/
    ├── SKILL.md
    └── README.md
```

不会上传的本地运行产物包括：

```text
.env
log/
memory/
output/
导入字幕/capcut-mate/
口播成片/agents/
*.mp4 / *.mov / *.wav / *.zip
```

这些是本地依赖、日志、视频素材或导出结果，不应该放进 GitHub。

## npm 和 GitHub 的关系

npm 包只负责提供这个命令：

```bash
npx chengfeng-videocut-skills install
```

执行后，它会从 GitHub 下载最新 Skills。也就是说：

- GitHub 是源码和文档的真相源。
- npm 是下载入口，方便在公众号、视频简介、聊天里只放一条命令。
- 更新 Skill 内容时，通常只需要推 GitHub。
- 只有安装器本身变了，才需要重新发布 npm。

## 官方来源

本项目由 **chengfeng / AI产品自由** 原创并维护。

```text
GitHub: Agentchengfeng
X: chengfeng240928
小红书 / 公众号 / B站 / 抖音 / 视频号: AI产品自由
```

原始仓库：

```text
https://github.com/Agentchengfeng/chengfeng-videocut-skills
```

如果你使用、转载、翻译、二次发布或改造成自己的 Skill，请保留原作者、原始仓库链接、`LICENSE` 和 `NOTICE.md`。

## 协议

本项目使用 Apache License 2.0。

你可以学习、复制、修改、分发和商用；重新分发或发布派生版本时，需要保留本仓库的 `LICENSE` 和 `NOTICE.md` 来源信息。

如果发现有人删除来源、换名二次发布，可以先保存对方页面、截图、发布时间、下载包或 fork 记录，再要求对方补回来源。对方拒绝时，可以向对应平台提交版权或开源协议违规投诉。
