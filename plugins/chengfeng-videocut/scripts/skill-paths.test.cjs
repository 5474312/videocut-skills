"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pluginName = "chengfeng-videocut";
const basicsSkill = "chengfeng-videocut-basics";
const concreteSkills = [
  "chengfeng-cut-talking-head",
  "chengfeng-finish-talking-head",
  "chengfeng-report-videocut-bug",
  "chengfeng-check-videocut-updates",
];
const publicSkills = [basicsSkill, ...concreteSkills];
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

for (const name of concreteSkills) {
  const text = fs.readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8");
  assert.doesNotMatch(text, /\$SKILL_DIR|SKILL_DIR=/, `${name} must not require an injected SKILL_DIR`);
  assert.match(text, /codex plugin list --json/, `${name} must resolve the enabled plugin via Codex`);
  assert.match(text, /x\.enabled && x\.name === "chengfeng-videocut" && x\.source && x\.source\.path/, `${name} must select one enabled source.path`);
  assert.match(text, /test -n "\$PLUGIN_ROOT" && test -f "\$PLUGIN_ROOT\/.codex-plugin\/plugin\.json"/, `${name} must validate the resolved root`);
  const agent = fs.readFileSync(path.join(root, "skills", name, "agents", "openai.yaml"), "utf8");
  assert.match(agent, new RegExp(`\\$${pluginName}:${name}`), `${name} must use its full Plugin namespace in the default prompt`);
}

const basics = fs.readFileSync(path.join(root, "skills", basicsSkill, "SKILL.md"), "utf8");
assert.match(basics, /Plugin `chengfeng-videocut` 是安装与 UI 群组名称/, "basics must reserve the Plugin root for the Plugin group");
assert.match(basics, /\$chengfeng-videocut:chengfeng-cut-talking-head/, "basics must link the cut Skill by full public ID");
assert.match(basics, /\$chengfeng-videocut:chengfeng-finish-talking-head/, "basics must link the finish Skill by full public ID");
assert.doesNotMatch(basics, /codex plugin list --json|ensure-runtime\.cjs|ensure-running\.cjs|ensure-studio\.cjs|videocut-cli\.cjs/, "basics must not own Runtime or Product execution");
const basicsAgent = fs.readFileSync(path.join(root, "skills", basicsSkill, "agents", "openai.yaml"), "utf8");
assert.match(basicsAgent, /\$chengfeng-videocut:chengfeng-videocut-basics/, "basics default prompt must use its full Plugin namespace");
assert.match(basicsAgent, /allow_implicit_invocation: true/, "basics may provide shared routing context");

assert.deepEqual(fs.readdirSync(path.join(root, "skills")).sort(), publicSkills.slice().sort(), "only the five prefixed, non-shadowing Skills may be discovered");
console.log(JSON.stringify({
  fiveSkills: true,
  pluginRootUnshadowed: true,
  pluginStarterPromptCap: true,
  namespacedDefaultPrompts: true,
  basicsHasNoRuntimeOwnership: true,
  hostManualSelectionMetadata: true,
  skillDirAssumptionRemoved: true,
  explicitBusinessContract: true,
}));
