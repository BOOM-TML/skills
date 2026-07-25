#!/usr/bin/env node
// One-command setup for Boom's Claude Code skills.
// Registers the Boom marketplace, enables the plugin, and (opt-in) turns on
// auto-update — by safely merging into the user's Claude Code settings.json.
// Zero dependencies on purpose: fast `npx`, nothing to audit.

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import process from 'node:process';

const MARKETPLACE = 'boom';
const PLUGIN_REF = 'boom@boom';
const REPO = 'BOOM-TML/skills';

// Skill names we publish, kept in sync with the repo's skills/ directory by
// scripts/validate.mjs. Used only to spot pre-plugin copies left behind by the
// `skills` CLI, never to decide what the plugin installs.
const BOOM_SKILLS = new Set(
  JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'boom-skills.json'), 'utf8'),
  ),
);

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};
const paint = (s, code) => (process.stdout.isTTY ? `${code}${s}${c.reset}` : s);

function help() {
  console.log(`
${paint('boom-skills-setup', c.bold)} — set up Boom's Claude Code skills

Usage:
  npx @useboom/skills-setup [options]

Options:
  --scope <user|project>   Where to write settings (default: user, ~/.claude)
  --auto-update            Enable auto-update (default; skills stay current)
  --no-auto-update         Install once, update manually later
  --no-clean               Keep pre-plugin copies from \`npx skills add\` in place
  --settings <path>        Write to a specific settings.json (advanced/testing)
  --yes, -y                Accept defaults, no prompts (scriptable)
  --print                  Show the resulting settings without writing (dry run)
  --help, -h               This help
`);
}

function scopePath(scope) {
  if (scope === 'project') return resolve(process.cwd(), '.claude', 'settings.json');
  return join(homedir(), '.claude', 'settings.json');
}

// Read existing settings without clobbering. Returns {} for a missing file;
// throws a clear error for malformed JSON so we never overwrite a broken-but-
// real config the user still owns.
function readSettings(path) {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, 'utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Your settings file isn't valid JSON: ${path}\n  (${err.message})\n` +
        `Fix or remove it and re-run — refusing to overwrite it.`,
    );
  }
}

// Shallow, additive merge: we own the `boom` marketplace entry and the
// `boom@boom` plugin flag; everything else in the user's settings is preserved.
// Nothing about credentials belongs here — the plugin's MCP server authenticates
// with the user's Boom login over OAuth, so there is no key to store.
function applyBoom(settings, { autoUpdate }) {
  const next = { ...settings };
  next.extraKnownMarketplaces = { ...(next.extraKnownMarketplaces ?? {}) };
  next.extraKnownMarketplaces[MARKETPLACE] = {
    source: { source: 'github', repo: REPO },
    autoUpdate,
  };
  next.enabledPlugins = { ...(next.enabledPlugins ?? {}), [PLUGIN_REF]: true };
  return next;
}

// --- Migrating away from the `skills` CLI ------------------------------------
//
// Before the plugin existed, customers installed with `npx skills add
// BOOM-TML/skills`, which copies each skill into <root>/.agents/skills/<name>/
// and symlinks it from <root>/.claude/skills/<name>. Those copies never update.
// Left in place next to the plugin, every Boom skill exists twice under two
// names (`analyze-results` and `boom:analyze-results`), and Claude picks by
// description, so it can silently reach for the stale one.
//
// We only move copies we can attribute to Boom, and we move rather than delete,
// so a wrong guess costs the user nothing but a folder to drag back.

function readLock(lockPath) {
  if (!existsSync(lockPath)) return null;
  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    return lock && typeof lock.skills === 'object' ? lock : null;
  } catch {
    return null; // a lock we can't parse is a lock we don't touch
  }
}

// A copy is "locked" when skills-lock.json says it came from our repo — proof,
// not a guess. Otherwise it's a name match inside the CLI's own storage: likely
// ours (global installs write no lockfile at all) but not provable.
function findLegacyCopies(roots) {
  const found = [];
  for (const root of roots) {
    const lockPath = join(root, 'skills-lock.json');
    const lock = readLock(lockPath);
    const filesRoot = join(root, '.agents', 'skills');
    if (!existsSync(filesRoot)) continue;

    for (const name of BOOM_SKILLS) {
      const filesDir = join(filesRoot, name);
      if (!existsSync(filesDir)) continue;
      const entry = lock?.skills?.[name];
      const locked = typeof entry?.source === 'string' && entry.source.includes(REPO);
      found.push({
        root,
        name,
        filesDir,
        link: join(root, '.claude', 'skills', name),
        lockPath: lock ? lockPath : null,
        locked,
      });
    }
  }
  return found;
}

function migrateCopies(copies, stamp) {
  const moved = [];
  const lockPaths = new Set();
  for (const copy of copies) {
    const backupDir = join(copy.root, `.boom-skills-backup-${stamp}`);
    mkdirSync(backupDir, { recursive: true });
    renameSync(copy.filesDir, join(backupDir, copy.name));

    // The symlink in .claude/skills now dangles. It has to go by unlink, not
    // rmSync: rmSync resolves the link, finds nothing there, and silently
    // succeeds without removing anything, leaving Claude Code a broken skill.
    // A real directory instead of a link is a copy in its own right, so it
    // follows the files into the backup.
    const stat = lstatSync(copy.link, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) unlinkSync(copy.link);
    else if (stat) renameSync(copy.link, join(backupDir, `${copy.name}-claude-dir`));
    if (copy.lockPath) lockPaths.add(copy.lockPath);
    moved.push({ ...copy, backupDir });
  }

  // Drop only our entries from each lockfile; anything else in there belongs to
  // another publisher and stays exactly as it was.
  for (const lockPath of lockPaths) {
    const lock = readLock(lockPath);
    if (!lock) continue;
    writeFileSync(`${lockPath}.bak`, readFileSync(lockPath));
    for (const copy of moved) {
      if (copy.lockPath === lockPath) delete lock.skills[copy.name];
    }
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  }
  return moved;
}

async function ask(rl, question, fallback) {
  if (!rl) return fallback;
  const a = (await rl.question(question)).trim();
  return a === '' ? fallback : a;
}

async function main() {
  const { values } = parseArgs({
    options: {
      scope: { type: 'string' },
      'auto-update': { type: 'boolean' },
      'no-auto-update': { type: 'boolean' },
      clean: { type: 'boolean' },
      'no-clean': { type: 'boolean' },
      settings: { type: 'string' },
      yes: { type: 'boolean', short: 'y' },
      print: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help) return help();

  // undefined means "decide for me": migrate provable copies, ask when we can.
  const cleanFlag = values['no-clean'] ? false : values.clean ? true : undefined;

  const interactive =
    !values.yes && !values.print && process.stdin.isTTY && process.stdout.isTTY;
  const rl = interactive
    ? createInterface({ input: process.stdin, output: process.stdout })
    : null;

  try {
    console.log(paint('\nBoom · Claude Code skills setup\n', c.bold));

    // 1) Scope
    let scope = values.scope;
    if (!scope) {
      const ans = await ask(
        rl,
        `${paint('?', c.cyan)} Install for ${paint('(1)', c.bold)} just me  ${paint('(2)', c.bold)} this project  [1]: `,
        '1',
      );
      scope = ans === '2' || ans.toLowerCase() === 'project' ? 'project' : 'user';
    }
    if (scope !== 'user' && scope !== 'project') scope = 'user';

    // 2) Auto-update
    let autoUpdate = true;
    if (values['no-auto-update']) autoUpdate = false;
    else if (values['auto-update']) autoUpdate = true;
    else {
      const ans = await ask(
        rl,
        `${paint('?', c.cyan)} Auto-update so you always get the latest Boom skills? ${paint('(Y/n)', c.dim)}: `,
        'y',
      );
      autoUpdate = !/^n/i.test(ans);
    }

    const path = values.settings ? resolve(values.settings) : scopePath(scope);
    const current = readSettings(path);
    const updated = applyBoom(current, { autoUpdate });
    const json = `${JSON.stringify(updated, null, 2)}\n`;

    // 3) Pre-plugin copies from the `skills` CLI, which would otherwise sit
    //    beside the plugin as stale duplicates.
    const legacy = cleanFlag === false ? [] : findLegacyCopies([process.cwd(), homedir()]);
    const provable = legacy.filter((l) => l.locked);
    const unprovable = legacy.filter((l) => !l.locked);
    let clean = provable.length > 0;

    if (values.print) {
      console.log(paint(`\n// ${path}`, c.dim));
      console.log(json);
      if (legacy.length) {
        console.log(paint(`// would move ${provable.length} pre-plugin copies:`, c.dim));
        for (const l of provable) console.log(paint(`//   ${l.filesDir}`, c.dim));
      }
      return;
    }

    if (legacy.length && rl) {
      console.log(
        `\n  ${paint('Found skills installed the old way', c.bold)} (npx skills add), which don't\n` +
          `  auto-update. Left in place you'd have each skill twice: ${paint('analyze-results', c.dim)}\n` +
          `  and ${paint('boom:analyze-results', c.dim)}.\n`,
      );
      for (const l of provable) console.log(`    • ${l.name}  ${paint(l.filesDir, c.dim)}`);
      if (provable.length) {
        const ans = await ask(
          rl,
          `\n${paint('?', c.cyan)} Move those aside (reversible, kept in a backup folder)? ${paint('(Y/n)', c.dim)}: `,
          'y',
        );
        clean = !/^n/i.test(ans);
      }
    }

    // Always surface the ones we won't touch, prompt or no prompt: staying quiet
    // here is how someone ends up with a stale duplicate they never knew about.
    for (const l of unprovable) {
      console.log(
        paint(
          `! ${l.name} at ${l.filesDir} looks like ours, but no lockfile says so.\n` +
            `  Leaving it alone — check it yourself, and remove it if it's the old copy.`,
          c.yellow,
        ),
      );
    }

    // Confirm (interactive only)
    if (rl) {
      console.log(
        `\n  ${paint('Will update', c.bold)} ${path}\n` +
          `    • marketplace ${paint(REPO, c.cyan)}\n` +
          `    • plugin ${paint(PLUGIN_REF, c.cyan)} enabled\n` +
          `    • auto-update ${autoUpdate ? paint('on', c.green) : paint('off', c.yellow)}\n` +
          (clean ? `    • ${provable.length} old copies moved to a backup folder\n` : ''),
      );
      const ok = await ask(rl, `${paint('?', c.cyan)} Write these changes? ${paint('(Y/n)', c.dim)}: `, 'y');
      if (/^n/i.test(ok)) {
        console.log(paint('\nCancelled — nothing written.\n', c.yellow));
        return;
      }
    }

    // Back up an existing file before overwriting.
    if (existsSync(path)) {
      const backup = `${path}.bak`;
      writeFileSync(backup, readFileSync(path));
      console.log(paint(`  backed up existing settings → ${backup}`, c.dim));
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, json);

    console.log(paint(`\n✓ Done — wrote ${path}`, c.green));

    if (clean) {
      const moved = migrateCopies(provable, new Date().toISOString().slice(0, 10));
      const folders = [...new Set(moved.map((m) => m.backupDir))];
      console.log(
        paint(`✓ Moved ${moved.length} pre-plugin copies aside, so nothing is duplicated.`, c.green),
      );
      for (const folder of folders) console.log(paint(`  kept at ${folder}`, c.dim));
    } else if (provable.length) {
      console.log(
        paint(
          `! Left ${provable.length} pre-plugin copies in place. Each Boom skill will exist twice\n` +
            `  until you remove them (npx skills remove), and the old copies never update.`,
          c.yellow,
        ),
      );
    }

    console.log(
      `\nNext:\n` +
        `  1. Restart Claude Code (so it picks up the new settings).\n` +
        (autoUpdate
          ? `  2. It auto-installs the Boom plugin and keeps it updated. Skills appear as ${paint('boom:<skill-name>', c.cyan)}.\n`
          : `  2. It installs the Boom plugin. Update later with ${paint('/plugin update ' + PLUGIN_REF, c.cyan)}.\n`) +
        `  3. Approve Boom's MCP server and sign in to Boom when it asks. No API key needed.\n`,
    );
  } finally {
    rl?.close();
  }
}

main().catch((err) => {
  console.error(paint(`\n✗ ${err.message}\n`, c.red));
  process.exit(1);
});
