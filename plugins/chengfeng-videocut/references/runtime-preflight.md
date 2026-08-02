# Runtime 预检（所有业务 Skill 的第 0 步）

本文件是预检的唯一真本。业务 Skill 只引用，不复制。

## 定位插件与工具变量

从 Codex 已启用 Plugin 列表精确取得 `chengfeng-videocut` 的 `source.path`。
`SKILL_DIR` 不是 Codex 保证注入的变量；禁止依赖它、硬编码开发机路径或用 `find`
猜测安装目录：

```bash
PLUGIN_ROOT="$(codex plugin list --json | node -e 'let s=""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => { const rows = JSON.parse(s).installed || []; const hit = rows.filter(x => x.enabled && x.name === "chengfeng-videocut" && x.source && x.source.path); if (hit.length !== 1) process.exit(1); process.stdout.write(hit[0].source.path); });')"
test -n "$PLUGIN_ROOT" && test -f "$PLUGIN_ROOT/.codex-plugin/plugin.json" || { echo "chengfeng-videocut enabled plugin root unavailable" >&2; exit 1; }
ENSURE="$PLUGIN_ROOT/scripts/ensure-runtime.cjs"
RUNNING="$PLUGIN_ROOT/scripts/ensure-running.cjs"
STUDIO="$PLUGIN_ROOT/scripts/ensure-studio.cjs"
VC="$PLUGIN_ROOT/scripts/videocut-cli.cjs"

node "$ENSURE" --install-if-missing --json
```

## 结果分支

- `ready`：继续当前 Skill。
- `missing`：脚本只提示一次「正在从 GitHub Release 安装」，SHA-256 校验完成后自动续跑。
- `runtime_unhealthy`、安装失败或安装后 doctor 失败：报告结构化诊断并停止。
  **停止就是停止：禁止用自制的审核页、播放器、时间线或任何替代界面继续流程。**
  产品不可用时做出的任何产出都不可信（真实案例：Runtime 缺失时 Agent 手搓了一个
  「审片台」网页，其审核决定与产品的账本格式完全不兼容，用户白做一遍）。
  正确动作只有一个：把结构化诊断给用户，指引安装或上报 Issue。
- `runtime_capability_missing`：Runtime 健康但缺本流程要求的能力；停止并要求升级，
  禁止回退旧剪辑链。
- 预检阶段禁止启动服务、打开 Studio 或创建项目。

## 机器前置依赖

缺任何一个，安装会在对应环节明确停下（不静默跳过）：
Bun ≥ 1.2、Node.js、curl、ffmpeg ≥ 6、Google Chrome（导出用）。
云端转录另需火山引擎凭证：`node "$VC" config set transcription.apiKey <key>`。

详细协议见 [Runtime 与产品契约](runtime-and-product-contract.md)。
