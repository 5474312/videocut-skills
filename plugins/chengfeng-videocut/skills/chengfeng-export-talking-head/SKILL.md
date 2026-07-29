---
name: chengfeng-export-talking-head
description: 把剪好的口播烧成一个成片文件：账本切片段、推近、字幕、HTML 画面层，一次全部烧进 mp4。用户说导出、出成片、烧字幕、渲染、导出视频、生成最终文件时使用。不要用于生成删词候选、写字幕、做画面动画。
user-invocable: true
---

# 导出（成片）

**这是链条最后一段，也是整个产品里唯一一个真正画出像素的地方。**

在它之前全部是标注：账本记「播哪些词」，字幕记「屏上写什么」，画面记「盖什么层」，
预览把这三样实时拼给人看，**不落盘**。导出把它们烧成一个文件。

```text
需要   edit-list.json（必须）、subtitles.json、visuals.json + modules/
产出   成片.mp4
```

前提工具：机器上有 **Google Chrome**（用来把字幕和动画画成图）和 **ffmpeg**。
缺 Chrome 会明确报错，不要试图绕过——没有它就没有字幕层和动画层。

先读取并执行 [业务 Skill 的阶段合同](../../references/business-workflow-contract.md)
里的「结论等级」一节。**导出不进剪辑状态机**：它不改任何项目文件、不做 CAS 写入、
不推进 stage，产出是一个新文件，重跑一次就覆盖。所以它不需要确认卡。

## 0. 每次先做 Runtime 预检

从 Codex 已启用 Plugin 列表精确取得 `chengfeng-videocut` 的 `source.path`。
`SKILL_DIR` 不是 Codex 保证注入的变量；禁止依赖它、硬编码开发机路径或用 `find` 猜测安装目录：

```bash
PLUGIN_ROOT="$(codex plugin list --json | node -e 'let s=""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => { const rows = JSON.parse(s).installed || []; const hit = rows.filter(x => x.enabled && x.name === "chengfeng-videocut" && x.source && x.source.path); if (hit.length !== 1) process.exit(1); process.stdout.write(hit[0].source.path); });')"
test -n "$PLUGIN_ROOT" && test -f "$PLUGIN_ROOT/.codex-plugin/plugin.json" || { echo "chengfeng-videocut enabled plugin root unavailable" >&2; exit 1; }
ENSURE="$PLUGIN_ROOT/scripts/ensure-runtime.cjs"
VC="$PLUGIN_ROOT/scripts/videocut-cli.cjs"

node "$ENSURE" --install-if-missing --json
```

- `ready`：继续本 Skill。
- `missing`：脚本只提示一次「正在从 GitHub Release 安装」，校验完成后自动续跑。
- `runtime_unhealthy`、安装失败或安装后 doctor 失败：报告结构化诊断并停止。
- 预检阶段禁止启动服务、打开 Studio 或创建项目。

详细协议见 [Runtime 与产品契约](../../references/runtime-and-product-contract.md)。

## 命令

```bash
node "$VC" export <project> --dry-run --json          # 先看计划，不编码
node "$VC" export <project> --json                    # 出成片（默认 2 倍、源帧率）
node "$VC" export <project> --out /path/成片.mp4 --json
node "$VC" export <project> --scale 1 --json          # 只要源尺寸
node "$VC" export <project> --keep-work --json        # 留下中间片和逐帧 PNG，供排查
```

## 两步，别只跑第二步

```text
① --dry-run 先报计划    片长、帧数、字幕屏数、画面层数、推近段数、输出尺寸
                       念给用户听。数字不对就是上游不对，编码十分钟不会修好它
② 真跑                 assemble → overlay → compose → verify 四段进度
```

`--dry-run` 里的 `warnings` 必须原样转述。它只报一类事：**某些字幕屏或画面层的词
已经被剪掉了**，所以它们不会出现在成片里。这是上游要决定的事，不是导出该替人吞掉的。

## 清晰度：源片是天花板，先看源再谈放大

导出前看一眼源分辨率（`--dry-run` 的 `source` 字段就有）：

```text
源宽 ≥2560（Retina 原生录屏）  → --scale 1，输出就是原生像素，这是最好的情况
源宽 <1920（如 960×720）      → 先停一下：问用户有没有同一次录制的高清导出。
                              录屏工具常常能把同一次录制重新导出成 3 倍分辨率，
                              换源比任何后期都管用（见下节）。确实没有 → --scale 2
```

`--scale 2` 对低清源有用的原因：底片放大不会变清楚，但**字幕和动画是按输出尺寸
重画的**——观众真正在读的就是这两样；平台再压一次时，大图分到的码率也更高。

**不要为了「更清晰」去调 `--fps`。** 帧率跟着源片走；改它只会让动画的采样和录屏对不上。

## 换源：用户拿出同一次录制的高清版时

这不是导出流程的一部分——导出本身永远只读。换源是用户明确点头后的独立素材操作，
做完再回来正常导出。

**先判定是不是同一条**（前两条就足够硬）：

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 <两个文件>   # 时长精确到毫秒相同
ffmpeg -v error -i <文件> -map 0:a:0 -c copy -f md5 -                  # 音频流逐位相同
# 再抽两三帧对比画面内容，眼睛确认
```

**音频逐位相同 = 时间线相同**：逐词稿、账本、字幕、画面层全绑词 id，一个不用动。
这正是「绑词不绑秒」在换源这件事上的兑现。

**换源三步**（2026-07-29 真实走过一次）：

```text
① 换文件      input/source.mp4 和 uploads/source.mp4 是硬链接对 ——
              rm 两个，cp 新文件到 input/，再 ln 回 uploads/
② 更新指纹    project.json 的 source.sha256 改成新文件的
              （产品把源片当不可变文件校验指纹，不改会被挡）
③ 重导        --scale 1 —— 换源就是为了原生像素，别再放大
```

音频不同（重新录了一遍、剪过、时长不一样）就**不是换源**，是新项目：
逐词稿要重新转，所有标注作废。别硬套。

## 验收：三件事，缺一件就不算导出完成

```text
① 命令成功返回        产品自己数成片的尺寸、帧数、音轨，和计划逐项比。
                     对不上就是 readback_mismatch 报错，文件留在盘上当证据，
                     不算导出完成
② 抽帧看像素          从成片里抽帧，用眼睛看。至少覆盖：一个推近段、
                     一个整屏动画段、一个只有字幕的段、一个层与层的边界
③ 人耳听感            没人真的听过，一律记 human listening UNVERIFIED
```

② 不许用预览截图代替。**预览和成片是两条渲染路径，验收要看的正是它们对不对得上**——
拿预览的图当成片的证据，等于把要验的那件事当成了前提。

抽帧就用 ffmpeg：

```bash
ffmpeg -v error -ss 8.84 -i 成片.mp4 -frames:v 1 -y frame.png
```

## 出问题往哪查

`--keep-work` 会在项目的 `.chengfeng-videocut/export/` 下留三样东西，
它们把「哪一半错了」直接分开：

```text
assembled.mkv    只有剪辑，没有任何盖的东西。它错 = 账本或切片错
overlay/*.png    只有盖的东西，透明底。它错 = 字幕样式或模块错
spans/*.mp4      合成后的分段。它错 = 推近或对齐错
```

对照表：

```text
成片没有字幕/动画       overlay PNG 是不是全透明？模块是不是没答应 seek？
动画停在第一帧          模块没实现 seek，或者 GSAP 时间线没 paused
画面整块白             模块少了 `:root { color-scheme: dark }`
推近的框歪了            模块的 viewBox 和层的 zoom 不是同一组数
成片比计划短            某个 span 帧数不够，看 compose 阶段的报错
找不到 Chrome          装 Google Chrome，别改成别的渲染路径
```

## 不许做什么

- 不许把「导出成功」说成「验收通过」——命令返回成功只是产品自己对得上，不是画面对
- 不许用预览截图、DOM、日志代替成片抽帧
- 不许没人听过就报 human listening PASS
- 不许为了让导出跑通去改项目文件（改字幕、删层、动账本）。导出只读，不写
- 不许在导出里补做上游的活：缺字幕就去写字幕，缺画面就去做画面，别在这一段临时糊一个
