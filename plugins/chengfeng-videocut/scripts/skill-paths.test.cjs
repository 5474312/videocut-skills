"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, "..");
const concreteSkills = ["chengfeng-cut-talking-head", "chengfeng-finish-talking-head", "chengfeng-report-videocut-bug", "chengfeng-check-videocut-updates"];
const hubSkill = "chengfeng-videocut";
const publicSkills = [hubSkill, ...concreteSkills];
const pluginManifest = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));
assert.ok(Array.isArray(pluginManifest.interface?.defaultPrompt), "Plugin home starter prompts must be an array");
assert.ok(pluginManifest.interface.defaultPrompt.length <= 3, "Codex supports at most 3 Plugin-home starter prompts");
assert.match(pluginManifest.interface.defaultPrompt[0], /\$chengfeng-videocut:chengfeng-videocut/, "first Plugin-home prompt must offer the explicit hub");
for (const name of publicSkills) {
  const text = fs.readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8");
  assert.match(text, new RegExp(`^name: ${name}$`, "m"), `${name} must match its directory and frontmatter`);
  assert.match(name, /^chengfeng-/, `${name} must use the public chengfeng- prefix`);
  assert.match(text, /^user-invocable: true$/m, `${name} must be a user-selectable Plugin Skill`);
}
for (const name of concreteSkills) {
  const text = fs.readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8");
  assert.doesNotMatch(text, /\$SKILL_DIR|SKILL_DIR=/, `${name} must not require an injected SKILL_DIR`);
  assert.match(text, /codex plugin list --json/, `${name} must resolve the enabled plugin via Codex`);
  assert.match(text, /x\.enabled && x\.name === "chengfeng-videocut" && x\.source && x\.source\.path/, `${name} must select one enabled source.path`);
  assert.match(text, /test -n "\$PLUGIN_ROOT" && test -f "\$PLUGIN_ROOT\/\.codex-plugin\/plugin\.json"/, `${name} must validate the resolved root`);
  const agent = fs.readFileSync(path.join(root, "skills", name, "agents", "openai.yaml"), "utf8");
  assert.match(agent, new RegExp(`\\$chengfeng-videocut:${name}`), `${name} must use its full Plugin namespace in the default prompt`);
}
const hub = fs.readFileSync(path.join(root, "skills", hubSkill, "SKILL.md"), "utf8");
assert.match(hub, /\$chengfeng-videocut:chengfeng-cut-talking-head/, "hub must route to the cut Skill by full public ID");
assert.match(hub, /\$chengfeng-videocut:chengfeng-finish-talking-head/, "hub must route to the finish Skill by full public ID");
assert.doesNotMatch(hub, /codex plugin list --json|ensure-runtime\.cjs|ensure-running\.cjs|ensure-studio\.cjs|videocut-cli\.cjs/, "hub must not own Runtime or Product execution");
const hubAgent = fs.readFileSync(path.join(root, "skills", hubSkill, "agents", "openai.yaml"), "utf8");
assert.match(hubAgent, /\$chengfeng-videocut:chengfeng-videocut/, "hub default prompt must use its full Plugin namespace");
assert.match(hubAgent, /allow_implicit_invocation: false/, "hub must remain an explicit routing entry");
assert.deepEqual(fs.readdirSync(path.join(root, "skills")).sort(), publicSkills.slice().sort(), "only the five prefixed public skills may be discovered");
console.log(JSON.stringify({ fiveSkills: true, manualEntryContract: true, pluginStarterPromptCap: true, namespacedDefaultPrompts: true, hubHasNoRuntimeOwnership: true, skillDirAssumptionRemoved: true, explicitPluginRootContract: true }));
