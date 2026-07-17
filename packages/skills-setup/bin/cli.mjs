#!/usr/bin/env node
// One-command setup for Boom's Claude Code skills.
// Registers the Boom marketplace, enables the plugin, and (opt-in) turns on
// auto-update — by safely merging into the user's Claude Code settings.json.
// Zero dependencies on purpose: fast `npx`, nothing to audit.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import process from 'node:process';

const MARKETPLACE = 'boom';
const PLUGIN_REF = 'boom@boom';
const REPO = 'BOOM-TML/skills';

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
  --api-key <key>          Set BOOM_API_KEY in settings env
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
function applyBoom(settings, { autoUpdate, apiKey }) {
  const next = { ...settings };
  next.extraKnownMarketplaces = { ...(next.extraKnownMarketplaces ?? {}) };
  next.extraKnownMarketplaces[MARKETPLACE] = {
    source: { source: 'github', repo: REPO },
    autoUpdate,
  };
  next.enabledPlugins = { ...(next.enabledPlugins ?? {}), [PLUGIN_REF]: true };
  if (apiKey) next.env = { ...(next.env ?? {}), BOOM_API_KEY: apiKey };
  return next;
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
      'api-key': { type: 'string' },
      settings: { type: 'string' },
      yes: { type: 'boolean', short: 'y' },
      print: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help) return help();

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

    // 3) API key (optional)
    let apiKey = values['api-key'];
    if (apiKey === undefined && rl) {
      const ans = await ask(
        rl,
        `${paint('?', c.cyan)} Boom API key to save (starts with boom_sk_, or Enter to skip): `,
        '',
      );
      apiKey = ans || undefined;
    }
    if (apiKey && !/^boom_sk_/.test(apiKey)) {
      console.log(
        paint(
          `  note: that doesn't look like a Boom API key (expected boom_sk_…) — saving it anyway.`,
          c.yellow,
        ),
      );
    }

    const path = values.settings ? resolve(values.settings) : scopePath(scope);
    const current = readSettings(path);
    const updated = applyBoom(current, { autoUpdate, apiKey });
    const json = `${JSON.stringify(updated, null, 2)}\n`;

    if (values.print) {
      console.log(paint(`\n// ${path}`, c.dim));
      console.log(json);
      return;
    }

    // Confirm (interactive only)
    if (rl) {
      console.log(
        `\n  ${paint('Will update', c.bold)} ${path}\n` +
          `    • marketplace ${paint(REPO, c.cyan)}\n` +
          `    • plugin ${paint(PLUGIN_REF, c.cyan)} enabled\n` +
          `    • auto-update ${autoUpdate ? paint('on', c.green) : paint('off', c.yellow)}\n` +
          (apiKey ? `    • BOOM_API_KEY saved\n` : ''),
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
    console.log(
      `\nNext:\n` +
        `  1. Restart Claude Code (so it picks up the new settings).\n` +
        (autoUpdate
          ? `  2. It auto-installs the Boom plugin and keeps it updated. Skills appear as ${paint('boom:<skill-name>', c.cyan)}.\n`
          : `  2. It installs the Boom plugin. Update later with ${paint('/plugin update ' + PLUGIN_REF, c.cyan)}.\n`) +
        (apiKey ? '' : `  3. Set your Boom API key (Boom → Settings → API Keys), then re-run with --api-key, or add it to settings env.\n`),
    );
  } finally {
    rl?.close();
  }
}

main().catch((err) => {
  console.error(paint(`\n✗ ${err.message}\n`, c.red));
  process.exit(1);
});
