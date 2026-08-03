# chengfeng-videocut

给 Codex 用的中文口播剪辑 Marketplace 插件。

Plugin 根入口、两个业务入口和两个支持入口组成；共同规则是内部 reference，不占用户 Skill：

```text
Plugin 根名  -> 安装与 UI 群组名，不是同名 Skill
剪口播      -> source_cut.mp4 + subtitles.srt
上报 Bug    -> 脱敏草稿 -> 用户确认 -> GitHub Issue URL
检查更新    -> Marketplace 快照 -> 来源证明 -> 用户确认 -> 复读版本
共同规则    -> references/，不注册为 Skill
```

插件不复制剪辑产品本体。两个业务 Skill 负责判断和编排，确定性动作由 `chengfeng-videocut` Runtime 的 CLI / API 执行；只有进入人工审核阶段且 Studio 能力匹配时才打开界面。Bug 支持 Skill 不安装 Runtime、不启动 Studio，也不改项目。

## 安装

一行命令装插件（挂市场 + 安装，`&&` 串联，第一步成功才执行第二步）。
播放器 / Studio 不需要单独装：第一次让 Agent 真正干活（剪口播、导出等）时，
「检查更新」的就绪检查会自动从固定版本的 GitHub Release 下载、SHA-256 校验并安装，
只是那一次任务要先等几分钟安装。

**系统要求：macOS**（Apple Silicon / Intel）。Windows 暂不支持——安装时会得到明确的
`platform_unsupported` 提示而不是模糊报错；Windows 支持已在路线图，需求请开 Issue 登记。

**机器上需要预先装好这些**（缺任何一个，首次运行会在对应环节明确停下，不会静默跳过）：

| 依赖 | 用途 | 要求 |
| --- | --- | --- |
| Bun | 运行产品 Runtime | ≥ 1.2 |
| Node.js | Skill 预检脚本 | 近代版本即可 |
| curl | 下载 Release | 系统自带即可 |
| ffmpeg | 剪辑与导出 | ≥ 6 |
| Google Chrome | 导出成片时渲染字幕和动画 | 桌面版 |

**Runtime 装不上时，Agent 应停在安装指引上**——用自制审核页/播放器替代产品属于违反
Skill 合同的行为（真实发生过：Runtime 缺失时 Agent 手搓了一个"审片台"，产出与产品
完全不兼容）。遇到这种情况，把 Agent 的报错原文发 Issue。

当前公开 Plugin P 是 `0.7.1`；发布后将由 Bootstrap manifest 固定其不可变 40-hex commit。直接使用 Codex Marketplace 安装：

```bash
codex plugin marketplace add Agentchengfeng/chengfeng-videocut-skills --ref a2e484e9adf30e6754e2b3406f39e30dbec9681b && codex plugin add chengfeng-videocut@chengfeng-videocut
```

两段必须分开是 Codex 官方 CLI 的机制：市场与插件是两层（一个市场可挂多个插件），
`plugin add` 只能从已挂市场的快照安装，没有「直接从 Git 一步装」的形式。
想装完立即拿到播放器（不等首次任务），装完插件后对 Codex 说「**安装剪辑环境**」即可。

Bootstrap 仍只调用官方 `plugin marketplace add --ref <40hex>` 与 `plugin add`，随后做只读回查；它不复制 Skill 文件，也不会安装、升级、启动或修改 Product Runtime。每个 Bootstrap B 都在 manifest 中固定不可变 Plugin commit P。npm 的 GitHub git-spec 在已验证环境中不能稳定启动，因此不把 `npx github:...` 作为对外稳定安装承诺。

装完插件后也可以直接对 Codex 说「**安装剪辑环境**」——「检查更新」Skill 的环境入口会
下载校验 Runtime、跑 doctor 自检并报告缺什么，不必先发起剪辑任务。

已安装后可用以下命令诊断身份（均不安装 Runtime）：

```bash
codex plugin marketplace list --json
codex plugin list --json
```

安装插件后，第一次使用任一业务 Skill 时会先检测产品 Runtime：

```text
doctor
  |
  +-- ready --------------------> 继续当前 Skill
  |
  +-- missing
  |      |
  |      +--> 提示一句安装状态
  |      +--> GitHub Release
  |      +--> SHA-256 校验
  |      +--> 安装后 doctor
  |      +--> 继续当前 Skill
  |
  +-- unhealthy / failed -------> 停止；不覆盖；不打开 Studio
```

Runtime 默认安装到：

```text
~/.chengfeng-videocut
```

Plugin 0.7.1 的产品合同固定为 `v0.3.0` Release、Runtime 0.3.0+ EDL 与用户级常驻 service 能力，以及 Studio 的三个顶层视图与 `managedTimelineEditing=true`。首次安装会从这个精确 Release 下载 `install.sh` 和 `SHA256SUMS.txt`，先验证安装器，再让安装器读取同一个 Release 的产品包；不使用会漂移的 `latest`。Release 不存在、资产不全、哈希不匹配或已有 Runtime 不兼容时均停止，不覆盖现有安装，也不回退 v0.1.1。

每个业务流程在第一次产品 API 前、每次人工审核恢复前都会执行共享 `ensure-running`：

```text
Skill -> Product service ensure -> launchd service ready -> 继续当前流程
                           |
                           +-> identity / port conflict -> 停止，不回退 foreground
```

服务由 Product 管理；Plugin 不直接运行 `launchctl`、`nohup`，也不会把 Codex 当前终端当作 Studio Server 的生命周期所有者。

## 使用

### 从具体任务开始

Plugin `chengfeng-videocut` 保留给安装和可能的 Desktop 群组展示，不能被同名 raw Skill 或公共说明 Skill 覆盖。Plugin namespace 必须保留，不能用裸 `$chengfeng` 代替：

```text
chengfeng-videocut:chengfeng-cut
chengfeng-videocut:chengfeng-report-bug
chengfeng-videocut:chengfeng-check-updates
```

Plugin 首页 starter prompt 最多三条；它不是 Skill 数量表。`SKILL.md` 的 `name` / `description` 与 `agents/openai.yaml` 提供发现元数据，但不能单独证明 Desktop Slash/Plugin 群组已经显示；后者须单独实测。

剪口播：

```text
使用“剪口播”处理这条视频。识别口误，等我审核后再物理剪切，并生成剪后字幕。
```

技术 ID：`chengfeng-videocut:chengfeng-cut`。

上报 Bug：

```text
使用“上报 Bug”整理刚才的问题。先给我看脱敏后的 GitHub Issue 草稿，确认后再提交。
```

技术 ID：`chengfeng-videocut:chengfeng-report-bug`。它会固定路由到产品或 Skills 仓库、清理常见密钥与本地路径、用脱敏内容指纹查重，并且只在用户确认同一份草稿后提交。

检查更新：

```text
使用“检查更新”检查 chengfeng-videocut Skills 的可信 Marketplace 更新；先报告状态，不要直接激活。
```

技术 ID：`chengfeng-videocut:chengfeng-check-updates`。

## 架构

```text
Codex
  |
  +-- Plugin: chengfeng-videocut（根名称）
  +-- chengfeng-cut
  +-- chengfeng-report-bug (支持入口)
  +-- chengfeng-check-updates (支持入口)
  +-- references/ (内部合同，不是 Skill)
  +-- show_workflow_confirmation (MCP App)
  |
  v
shared ensure-runtime
  |
  v
GitHub Release Runtime
  |
  +-- service ensure -> macOS user service
  +-- CLI / API
  +-- project truth + revision / CAS
  +-- media cut / render / verify
  +-- Studio（只在 review-ready 时打开）
```

确认卡不是独立 Skill。它只把白名单 action、`projectId` 与 revision 交回当前 Codex 对话；卡片本身不执行剪切或导出。

## 仓库结构

```text
chengfeng-videocut-skills/
├── .agents/plugins/marketplace.json
├── plugins/chengfeng-videocut/
│   ├── .codex-plugin/plugin.json
│   ├── .mcp.json
│   ├── runtime-requirements.json
│   ├── dist/server.mjs
│   ├── public/review-confirm.html
│   ├── scripts/
│   ├── references/
│   └── skills/
│       ├── chengfeng-cut/
│       ├── chengfeng-report-bug/
│       └── chengfeng-check-updates/
├── LICENSE
├── NOTICE.md
└── CITATION.cff
```

发布插件包含约 1.1MB 的预打包 MCP Server，不包含 `node_modules`。

## 发布边界

公开 Runtime v0.1.1 不满足 Plugin 0.5.1 的合同，不能再作为自动安装目标。稳定发布顺序必须是：

```text
Runtime v0.2.0 Release
  -> install.sh 与产品包进入 SHA256SUMS
  -> 隔离环境首次安装 / doctor / Studio capability / 两条工作流 E2E
  -> Plugin 0.5.1 Marketplace 发布
```

在 Runtime v0.2.0 补齐云端 transcribe/import、内置 renderer 并完成真实项目 E2E 前，不把“两条工作流已经完全自动化”作为公开承诺。

## 开发验证

```bash
cd plugins/chengfeng-videocut
npm install
npm run build
npm test
```

另外运行 Plugin validator、前端 YAML/公开 ID 契约测试，并在隔离 Codex 上下文中确认两个业务 Skill 和两个支持 Skill，且不存在已退休的 basics。静态文件存在不等于斜杠/技能选择器已经显示，后者必须单独实测。

## 官方来源

本项目由 **chengfeng / AI产品自由** 原创并维护。

```text
GitHub: Agentchengfeng
X: chengfeng240928
小红书 / 公众号 / B站 / 抖音 / 视频号: AI产品自由
```

原始仓库：<https://github.com/Agentchengfeng/chengfeng-videocut-skills>

## 协议

本项目使用 Apache License 2.0。转载、翻译、二次发布或改造时，请保留原作者、原始仓库链接、`LICENSE` 和 `NOTICE.md`。
