---
name: chengfeng-videocut-basics
description: 为 chengfeng-videocut 的剪口播、口播成片、Bug 上报和更新检查提供共同的分发边界与产品所有权规则。当任务已明确属于该 Plugin、但需要先判断共同边界或选择具体业务/支持 Skill 时使用；不用于直接执行剪辑、创建项目、启动 Runtime 或替代具体 Skill。
user-invocable: true
---

# chengfeng-videocut 基础规则

```text
[chengfeng-videocut Plugin]
          |
          +-- common boundary --> 本 Skill
          |
          +-- 剪口播 ---------> $chengfeng-videocut:chengfeng-cut-talking-head
          +-- 口播成片 -------> $chengfeng-videocut:chengfeng-finish-talking-head
          +-- 上报 Bug -------> $chengfeng-videocut:chengfeng-report-videocut-bug
          +-- 检查更新 -------> $chengfeng-videocut:chengfeng-check-videocut-updates
```

## 共同边界

- Plugin `chengfeng-videocut` 是安装与 UI 群组名称；本 Skill 不是同名 router，也不占用 Plugin 根入口。
- 具体业务只由相应的精确 Skill 承担。不要在这里转发、重复或实现它们的流程。
- Product Runtime、Studio、项目、媒体、EDL、播放器和时钟只由 Product 拥有；本 Skill 不启动服务、不写项目、不调用媒体执行。
- 当用户只选择 Plugin、却没有说清意图时，只要求一次澄清：剪口播、口播成片、上报 Bug 或检查更新；随后进入一个具体 Skill。

## 不承担的工作

- 不把 Plugin 根名写成另一个 raw Skill name。
- 不将 static metadata、`default_prompt` 或 CLI 明确调用写成 Desktop Slash 群组已经验收。
- 不创建第二份项目状态、history、EDL 或播放时钟。
