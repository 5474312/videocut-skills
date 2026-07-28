"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contractPath = path.join(root, "references", "business-workflow-contract.md");
const contract = fs.readFileSync(contractPath, "utf8");
const cut = fs.readFileSync(path.join(root, "skills", "chengfeng-cut-talking-head", "SKILL.md"), "utf8");
const finish = fs.readFileSync(path.join(root, "skills", "chengfeng-finish-talking-head", "SKILL.md"), "utf8");

const phases = [
  "preflight",
  "Product state readback",
  "proposal",
  "Product CAS",
  "project-level review binding",
  "user confirmation",
  "Product execution",
  "outcome verification",
];
let previous = -1;
for (const phase of phases) {
  const position = contract.indexOf(phase);
  assert.ok(position > previous, `shared contract must preserve phase order: ${phase}`);
  previous = position;
}

for (const skill of [cut, finish]) {
  assert.match(skill, /business-workflow-contract\.md/, "business Skill must cite the shared contract");
  assert.match(skill, /project-level review binding/, "business Skill must use project-level review binding");
  assert.match(skill, /API\/readback PASS/, "business Skill must preserve evidence levels");
  assert.match(skill, /human listening UNVERIFIED/, "business Skill must not claim listening acceptance");
}

assert.match(cut, /本地真实视频.*云端逐词稿/s, "cut must accept direct local video and cloud transcript");
assert.match(cut, /project create[\s\S]*workflow get[\s\S]*cuts get/, "cut must read Product state after create before proposal");
assert.match(cut, /#project\/<projectId>/, "cut review must bind URL hash project identity");
assert.match(finish, /已有.*projectId/, "finish must operate an existing project");
assert.match(finish, /#project\/<projectId>/, "finish review must bind URL hash project identity");
assert.match(contract, /不产生一次性 Product receipt/, "one-time receipt must remain explicitly out of scope");
assert.match(contract, /素材库、material-library、上传会话/, "contract must explicitly prohibit asset/upload workflows");

const skills = fs.readdirSync(path.join(root, "skills")).sort();
assert.deepEqual(skills, [
  "chengfeng-check-videocut-updates",
  "chengfeng-cut-talking-head",
  "chengfeng-export-talking-head",
  "chengfeng-finish-talking-head",
  "chengfeng-report-videocut-bug",
  "chengfeng-subtitle-talking-head",
], "the Plugin must expose exactly six task-facing Skills");
console.log(JSON.stringify({
  sixTaskFacingSkillsRetained: true,
  sharedBusinessContract: true,
  phaseOrder: phases,
  directProjectCreate: true,
  existingProjectFinish: true,
  evidenceLevelsExplicit: true,
}));
