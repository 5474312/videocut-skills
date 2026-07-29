"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pluginName = "chengfeng-videocut";
const publicSkills = [
  "chengfeng-cut-talking-head",
  "chengfeng-subtitle-talking-head",
  "chengfeng-visual-talking-head",
  "chengfeng-export-talking-head",
  "chengfeng-finish-talking-head",
  "chengfeng-report-videocut-bug",
  "chengfeng-check-videocut-updates",
];
const displayNames = {
  "chengfeng-cut-talking-head": "chengfeng · 剪口播",
  "chengfeng-subtitle-talking-head": "chengfeng · 字幕",
  "chengfeng-visual-talking-head": "chengfeng · 画面",
  "chengfeng-export-talking-head": "chengfeng · 导出",
  "chengfeng-finish-talking-head": "chengfeng · 口播成片",
  "chengfeng-report-videocut-bug": "chengfeng · 上报 Bug",
  "chengfeng-check-videocut-updates": "chengfeng · 检查更新",
};
const pluginManifest = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));

assert.equal(pluginManifest.name, pluginName, "Plugin manifest must own the root name");
assert.ok(Array.isArray(pluginManifest.interface?.defaultPrompt), "Plugin home starter prompts must be an array");
assert.ok(pluginManifest.interface.defaultPrompt.length <= 3, "Codex supports at most 3 Plugin-home starter prompts");
for (const prompt of pluginManifest.interface.defaultPrompt) {
  assert.doesNotMatch(prompt, new RegExp(`\\$${pluginName}:${pluginName}(?:\\b|:)`), "Plugin-home prompt must not reference a retired same-name router");
}

for (const name of publicSkills) {
  const text = fs.readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8");
  assert.match(text, new RegExp(`^name: ${name}$`, "m"), `${name} must match its directory and frontmatter`);
  assert.match(name, /^chengfeng-/, `${name} must use the public chengfeng- prefix`);
  assert.notEqual(name, pluginName, "a raw Skill name must not shadow the Plugin root name");
  assert.match(text, /^user-invocable: true$/m, `${name} must retain the host-compatible manual-selection metadata`);
}

for (const name of publicSkills) {
  const text = fs.readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8");
  assert.doesNotMatch(text, /\$SKILL_DIR|SKILL_DIR=/, `${name} must not require an injected SKILL_DIR`);
  assert.match(text, /codex plugin list --json/, `${name} must resolve the enabled plugin via Codex`);
  assert.match(text, /x\.enabled && x\.name === "chengfeng-videocut" && x\.source && x\.source\.path/, `${name} must select one enabled source.path`);
  assert.match(text, /test -n "\$PLUGIN_ROOT" && test -f "\$PLUGIN_ROOT\/.codex-plugin\/plugin\.json"/, `${name} must validate the resolved root`);
  const agent = fs.readFileSync(path.join(root, "skills", name, "agents", "openai.yaml"), "utf8");
  assert.match(agent, new RegExp(`\\$${pluginName}:${name}`), `${name} must use its full Plugin namespace in the default prompt`);
  assert.match(agent, new RegExp(`^  display_name: "${displayNames[name]}"$`, "m"), `${name} must expose the searchable chengfeng display name`);
}

const runtimeContract = fs.readFileSync(path.join(root, "references", "runtime-and-product-contract.md"), "utf8");
const businessContract = fs.readFileSync(path.join(root, "references", "business-workflow-contract.md"), "utf8");
assert.match(runtimeContract, /普通内部 reference/, "shared Product boundaries must be an internal reference");
assert.match(businessContract, /不是用户可调用的 Skill/, "shared business workflow must not be user-facing");
assert.doesNotMatch(
  `${runtimeContract}\n${businessContract}`,
  /^name:\s+chengfeng-videocut-basics$/m,
  "internal references must not declare the retired Skill",
);

assert.deepEqual(fs.readdirSync(path.join(root, "skills")).sort(), publicSkills.slice().sort(), "only the six task-facing Skills may be discovered");
console.log(JSON.stringify({
  sevenTaskFacingSkills: true,
  pluginRootUnshadowed: true,
  pluginStarterPromptCap: true,
  namespacedDefaultPrompts: true,
  sharedRulesAreInternalReferences: true,
  hostManualSelectionMetadata: true,
  skillDirAssumptionRemoved: true,
  explicitBusinessContract: true,
  searchableChengfengDisplayNames: true,
}));
