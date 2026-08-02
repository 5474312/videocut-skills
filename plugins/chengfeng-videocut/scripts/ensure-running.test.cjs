"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const ensureRunning = path.join(root, "scripts", "ensure-running.cjs");
const cutSkill = fs.readFileSync(path.join(root, "skills", "chengfeng-cut-talking-head", "SKILL.md"), "utf8");
const exportSkill = fs.readFileSync(path.join(root, "skills", "chengfeng-export-talking-head", "SKILL.md"), "utf8");
const subtitleSkill = fs.readFileSync(path.join(root, "skills", "chengfeng-subtitle-talking-head", "SKILL.md"), "utf8");
const finishSkill = fs.readFileSync(path.join(root, "skills", "chengfeng-finish-talking-head", "SKILL.md"), "utf8");
const visualSkill = fs.readFileSync(path.join(root, "skills", "chengfeng-visual-talking-head", "SKILL.md"), "utf8");
const visualContract = fs.readFileSync(
  path.join(root, "skills", "chengfeng-visual-talking-head", "references", "visual-module-contract.md"),
  "utf8",
);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "videocut-ensure-running-test-"));

function writeExecutable(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, { mode: 0o755 });
}

function run(binary) {
  return spawnSync(process.execPath, [ensureRunning, "--json"], {
    encoding: "utf8",
    env: {
      ...process.env,
      CHENGFENG_VIDEOCUT_BIN: binary,
      CHENGFENG_VIDEOCUT_DIR: "",
      PATH: "",
    },
  });
}

try {
  const argsFile = path.join(tmp, "args.txt");
  const readyBin = path.join(tmp, "ready", "chengfeng-videocut");
  writeExecutable(readyBin, `#!/bin/sh
printf '%s\n' "$*" > "${argsFile}"
printf '%s\n' '{"schemaVersion":1,"product":"chengfeng-videocut","command":"service.ensure","ok":true,"data":{"serviceApiVersion":1,"action":"ensure","state":"running","ready":true,"healthy":true,"configured":true,"runtimeMode":"launchd","productVersion":"0.3.0","studioBuildId":"build-123","pid":1234,"url":"http://127.0.0.1:5190/","identity":{"product":"chengfeng-videocut","productVersion":"0.3.0","pid":1234,"runtimeMode":"launchd","studioBuildId":"build-123"}}}'
`);
  const ready = run(readyBin);
  assert.equal(ready.status, 0, ready.stderr);
  assert.equal(JSON.parse(ready.stdout).data.healthy, true);
  assert.equal(fs.readFileSync(argsFile, "utf8").trim(), "service ensure --json");

  const foregroundBin = path.join(tmp, "foreground", "chengfeng-videocut");
  writeExecutable(foregroundBin, `#!/bin/sh
printf '%s\n' '{"schemaVersion":1,"product":"chengfeng-videocut","command":"service.ensure","ok":true,"data":{"serviceApiVersion":1,"action":"ensure","state":"running","ready":true,"healthy":true,"configured":true,"runtimeMode":"foreground","productVersion":"0.3.0","studioBuildId":"build-4321","pid":4321,"url":"http://127.0.0.1:5190/","identity":{"product":"chengfeng-videocut","productVersion":"0.3.0","pid":4321,"runtimeMode":"foreground","studioBuildId":"build-4321"}}}'
`);
  const foreground = run(foregroundBin);
  assert.equal(foreground.status, 21);
  assert.equal(JSON.parse(foreground.stdout).error.code, "service_identity_mismatch");

  const conflictBin = path.join(tmp, "conflict", "chengfeng-videocut");
  writeExecutable(conflictBin, `#!/bin/sh
printf '%s\n' '{"schemaVersion":1,"product":"chengfeng-videocut","command":"service.ensure","ok":false,"error":{"code":"service_port_conflict","message":"port conflict"}}'
exit 6
`);
  const conflict = run(conflictBin);
  assert.equal(conflict.status, 6);
  assert.equal(JSON.parse(conflict.stdout).error.code, "service_port_conflict");

  const forgedBin = path.join(tmp, "forged", "chengfeng-videocut");
  writeExecutable(forgedBin, `#!/bin/sh
printf '%s\n' '{"schemaVersion":1,"product":"another-product","command":"service.ensure","ok":true,"data":{"serviceApiVersion":1,"action":"ensure","state":"running","ready":true,"healthy":true,"configured":true,"runtimeMode":"launchd","productVersion":"0.3.0","studioBuildId":"build-123","pid":1234,"url":"http://127.0.0.1:5190/","identity":{"product":"chengfeng-videocut","productVersion":"0.3.0","pid":1234,"runtimeMode":"launchd","studioBuildId":"build-123"}}}'
`);
  const forged = run(forgedBin);
  assert.equal(forged.status, 21);
  assert.equal(JSON.parse(forged.stdout).error.code, "service_identity_mismatch");

  const malformedBin = path.join(tmp, "malformed", "chengfeng-videocut");
  writeExecutable(malformedBin, "#!/bin/sh\nprintf '%s\\n' 'not-json'\nexit 0\n");
  const malformed = run(malformedBin);
  assert.equal(malformed.status, 20);
  assert.equal(JSON.parse(malformed.stdout).error.code, "service_ensure_failed");

  const missing = run(path.join(tmp, "missing", "chengfeng-videocut"));
  assert.equal(missing.status, 10);
  assert.equal(JSON.parse(missing.stdout).error.code, "runtime_missing");

  const script = fs.readFileSync(ensureRunning, "utf8");
  assert.doesNotMatch(script, /launchctl|nohup/);

  const cutCreate = cutSkill.indexOf('node "$VC" project create');
  const cutEnsure = cutSkill.indexOf('node "$RUNNING" --json');
  const firstCutsApi = cutSkill.indexOf('node "$VC" cuts get');
  assert.ok(cutCreate >= 0 && cutCreate < cutEnsure && cutEnsure < firstCutsApi);
  const cutReview = cutSkill.indexOf("## 3. 到人工审核时才打开 Studio");
  const cutReviewEnsure = cutSkill.indexOf('node "$RUNNING" --json', cutReview);
  const cutReviewOpen = cutSkill.indexOf('node "$VC" open "$jobDir" --json', cutReview);
  assert.ok(cutReview < cutReviewEnsure && cutReviewEnsure < cutReviewOpen);
  // 剪口播到账本为止：确认卡与物理剪切已经搬进导出 Skill。留在这里会让剪刀
  // 落在用户确认之后又改出来的那一版上。
  assert.doesNotMatch(cutSkill, /cuts apply/, "cut must not perform the physical cut");
  assert.doesNotMatch(cutSkill, /show_workflow_confirmation/, "the confirmation card belongs to export");
  assert.doesNotMatch(cutSkill, /node "\$VC" start|nohup|launchctl/);

  // 导出：现在是成片导出，不是物理剪切。它只读、只产出一个新文件，所以确认卡和
  // 「冻结 revision 再剪」整套都不适用了 —— 那套守的是「剪刀落在用户没看过的
  // 那一版上」，而这里没有剪刀。留着反而会让人以为导出会改项目。
  assert.doesNotMatch(exportSkill, /show_workflow_confirmation/, "export no longer mutates anything");
  assert.doesNotMatch(exportSkill, /cuts apply/, "export burns a film; it does not cut the source");
  assert.match(exportSkill, /export <project> --dry-run/, "export must plan before it encodes");
  const dryRunPosition = exportSkill.indexOf("--dry-run 先报计划");
  const verifyPosition = exportSkill.indexOf("抽帧看像素");
  assert.ok(dryRunPosition >= 0 && dryRunPosition < verifyPosition, "plan comes before pixels");
  // 三条验收纪律，各对应一次真事故或一条已定的规矩。
  assert.match(exportSkill, /不许用预览截图/, "the preview cannot be evidence for the film");
  assert.match(exportSkill, /human listening UNVERIFIED/, "nobody listened until somebody listened");
  assert.match(exportSkill, /color-scheme: dark/, "the白板 fault must stay in the lookup table");
  assert.doesNotMatch(exportSkill, /node "\$VC" start|nohup|launchctl/);

  // 字幕：只需要账本。这三条守的是它「不做什么」——
  // 旧版要求先导出 source_cut.mp4、再转写剪后视频、最后 artifact put 发布 SRT，
  // 三样现在一个都不用了：逐词稿加账本就能算出剪后时间。
  assert.match(subtitleSkill, /edit-list\.json/, "subtitles need the ledger and say so");
  assert.match(subtitleSkill, /subtitle build/, "subtitles are written by subtitle build");
  assert.match(
    subtitleSkill,
    /不要断言 `source_cut\.mp4`/,
    "the skill must say out loud that the export is not a precondition",
  );
  assert.doesNotMatch(
    subtitleSkill,
    /artifact put/,
    "subtitles are no longer published as an SRT artifact",
  );
  // 守的是「不要去调」，不是「不要提到」—— skill 里点名 transcript retranscribe
  // 正是为了说明它是上一版遗留、做字幕不要用。
  assert.doesNotMatch(
    subtitleSkill,
    /node "\$VC" (transcribe|transcript retranscribe)/,
    "re-transcribing to get cut-timeline times is arithmetic the ledger already answers",
  );
  // 词典是每次转录都要过的一道闸，不是可选步骤 —— 同一段音频转两遍，
  // 第二遍把 Grok 听成了 Clock / Gokul / Glock。
  assert.match(subtitleSkill, /transcript dictionary/, "subtitles must run the dictionary");
  assert.doesNotMatch(subtitleSkill, /node "\$VC" start|nohup|launchctl/);

  // 画面：看在放之前，量在画之前。这三条守的是流程里最容易被跳过的两步。
  const frameStep = visualSkill.indexOf("visual frame");
  const addStep = visualSkill.indexOf("visual add");
  assert.ok(frameStep >= 0 && addStep > frameStep, "the skill must look at frames before placing layers");
  assert.match(visualSkill, /不存秒数/, "layers bind subtitle screens, never seconds");
  assert.match(visualSkill, /不动是常见答案|不动。这是最常见的正确答案/, "restraint is a rule, not a mood");
  assert.doesNotMatch(visualSkill, /artifact put|confirm-storyboard/, "the retired pipeline must not leak back");
  // 模块契约的两条命门：少一条就是一类已经发生过的事故。
  assert.match(visualContract, /color-scheme: dark/, "modules must declare the host color scheme");
  assert.match(visualContract, /drawSVG/, "the paid-plugin trap must stay documented");
  assert.doesNotMatch(visualSkill, /node "\$VC" start|nohup|launchctl/);

  const runtimeEnsure = finishSkill.indexOf('node "$ENSURE" --install-if-missing --json');
  const serviceEnsure = finishSkill.indexOf('node "$RUNNING" --json');
  const firstWorkflowApi = finishSkill.indexOf('node "$VC" workflow get');
  assert.ok(runtimeEnsure >= 0 && runtimeEnsure < serviceEnsure && serviceEnsure < firstWorkflowApi);
  const firstReview = finishSkill.indexOf("首次进入 storyboard");
  const firstReviewEnsure = finishSkill.indexOf('node "$RUNNING" --json', firstReview);
  const firstReviewOpen = finishSkill.indexOf('node "$VC" open "$jobDir" --json', firstReview);
  const firstReviewGate = finishSkill.indexOf('node "$STUDIO" --url "$productUrl"', firstReview);
  assert.ok(firstReview < firstReviewEnsure && firstReviewEnsure < firstReviewOpen && firstReviewOpen < firstReviewGate);
  for (const action of [
    "continue_finish_storyboard",
    "continue_finish_animation",
    "continue_finish_timeline",
    "return_finish_storyboard",
    "return_finish_animation",
    "return_finish_timeline",
  ]) {
    let actionPosition = -1;
    let guardedByRealCommand = false;
    while ((actionPosition = finishSkill.indexOf(`action=${action}`, actionPosition + 1)) >= 0) {
      const ensurePosition = finishSkill.indexOf('node "$RUNNING" --json', actionPosition);
      if (ensurePosition > actionPosition && ensurePosition - actionPosition < 500) {
        guardedByRealCommand = true;
        break;
      }
    }
    assert.ok(guardedByRealCommand, `${action} must execute the real ensure-running command before resuming`);
  }
  assert.doesNotMatch(finishSkill, /node "\$VC" start|nohup|launchctl/);

  console.log(JSON.stringify({ ready: true, foregroundRejected: true, conflictForwarded: true, malformedFailedClosed: true, missing: true, skillOrdering: true }));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
