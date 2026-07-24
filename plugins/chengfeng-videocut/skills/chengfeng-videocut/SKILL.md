---
name: chengfeng-videocut
description: chengfeng-videocut 的手动总入口。用户从一个入口开始、但尚未说清要剪口播、制作口播成片、上报 Bug 还是检查 Skills 更新时使用；只路由到一个具体 Skill，不执行 Product Runtime、项目或媒体操作。
user-invocable: true
---

# chengfeng-videocut

把明确意图路由到一个具体公开 Skill：

```text
剪口播 / 口误 / 剪后字幕 ------> $chengfeng-videocut:chengfeng-cut-talking-head
口播成片 / 分镜 / 动画 / 导出 --> $chengfeng-videocut:chengfeng-finish-talking-head
复现问题 / GitHub Issue --------> $chengfeng-videocut:chengfeng-report-videocut-bug
检查 Skills 更新 ---------------> $chengfeng-videocut:chengfeng-check-videocut-updates
```

- 意图明确时，只进入对应的一个具体 Skill。
- 意图不明确时，只问一句：想要“剪口播、口播成片、上报 Bug”还是“检查更新”？得到答案后再进入对应 Skill。
- 不执行 Runtime 预检、不启动服务、不打开 Studio、不创建项目、不调用 Product CLI / API，也不复制任何具体 Skill 的工作流。
