#!/usr/bin/env node
// Validates skills + manifests. No deps; Node 22+.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const errors = [];

// 1. Every skills/<dir> has a SKILL.md with valid frontmatter
const skillsDir = join(root, "skills");
const skillFolders = readdirSync(skillsDir).filter((f) =>
  statSync(join(skillsDir, f)).isDirectory(),
);
if (skillFolders.length === 0) errors.push("no skill folders found");

for (const folder of skillFolders) {
  const path = join(skillsDir, folder, "SKILL.md");
  if (!existsSync(path)) {
    errors.push(`${folder}: missing SKILL.md`);
    continue;
  }
  const text = readFileSync(path, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) {
    errors.push(`${folder}: missing YAML frontmatter`);
    continue;
  }
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = fm[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (name !== folder) errors.push(`${folder}: frontmatter name "${name}" != folder name`);
  if (!description) errors.push(`${folder}: missing description`);
  else {
    if (!description.startsWith("Use when")) errors.push(`${folder}: description must start with "Use when"`);
    if (description.length > 500) errors.push(`${folder}: description > 500 chars`);
  }
  if (!/##\s*Tools used/i.test(text)) errors.push(`${folder}: missing "Tools used" section`);
  if (/\bengagements?\b/i.test(text)) errors.push(`${folder}: uses forbidden word "engagement" (say participant)`);
  // relative links resolve
  for (const [, target] of text.matchAll(/\]\((\.\.?\/[^)#]+)\)/g)) {
    if (!existsSync(resolve(join(skillsDir, folder), target)))
      errors.push(`${folder}: broken link ${target}`);
  }
}

// 2. Manifests parse and agree
const marketplace = JSON.parse(readFileSync(join(root, ".claude-plugin/marketplace.json"), "utf8"));
const plugin = JSON.parse(readFileSync(join(root, "plugins/boom/.claude-plugin/plugin.json"), "utf8"));
JSON.parse(readFileSync(join(root, "plugins/boom/.mcp.json"), "utf8"));
if (marketplace.plugins?.[0]?.name !== plugin.name)
  errors.push("marketplace plugin name != plugin.json name");
if (!/^\d+\.\d+\.\d+$/.test(plugin.version)) errors.push("plugin.json version is not semver");

// 3. Plugin skills symlink resolves to root skills/
if (!existsSync(join(root, "plugins/boom/skills/"))) errors.push("plugins/boom/skills symlink broken");

if (errors.length) {
  console.error("FAIL:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`OK: ${skillFolders.length} skills, manifests valid`);
