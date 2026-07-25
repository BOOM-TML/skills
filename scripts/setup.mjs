#!/usr/bin/env node
// One-command installer for the Boom skills.
//
// Writes two keys into a Claude Code settings file: the marketplace (with
// `autoUpdate: true`) and the enabled plugin. Both are declarative, so this is
// a JSON merge, not a sequence of CLI calls — and `autoUpdate` is the reason the
// merge exists at all: marketplaces other than Anthropic's own default to
// auto-update OFF, and neither `claude plugin marketplace add` nor
// `claude plugin install` has a flag to turn it on.

import { createInterface } from 'node:readline/promises';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const MARKETPLACE = 'boom';
const REPO = 'BOOM-TML/skills';
const PLUGIN_KEY = 'boom@boom';

const SCOPES = {
  user: {
    label: 'Just me (every project on this machine)',
    file: () => join(homedir(), '.claude', 'settings.json'),
  },
  project: {
    label: 'This project (commit it, so the team gets it too)',
    file: () => resolve('.claude', 'settings.json'),
  },
};

const c = {
  bold: (s) => `[1m${s}[0m`,
  dim: (s) => `[2m${s}[0m`,
  green: (s) => `[32m${s}[0m`,
  yellow: (s) => `[33m${s}[0m`,
  red: (s) => `[31m${s}[0m`,
};

function parseArgs(argv) {
  const args = { scope: null, autoUpdate: true, yes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--scope') {
      args.scope = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--scope=')) {
      args.scope = arg.slice('--scope='.length);
    } else if (arg === '--no-auto-update') {
      args.autoUpdate = false;
    } else if (arg === '--yes' || arg === '-y') {
      args.yes = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (args.scope && !SCOPES[args.scope]) {
    throw new Error(`--scope must be "user" or "project", got "${args.scope}"`);
  }
  return args;
}

function help() {
  console.log(`
${c.bold('Boom skills setup')}

  npx ${REPO.split('/')[1]}            interactive
  npx … --scope user --yes    non-interactive

${c.bold('Options')}
  --scope user|project   where to write settings (default: ask, or "user" with --yes)
  --no-auto-update       install without auto-updating skills
  -y, --yes              skip the prompt
  -h, --help             this message
`);
}

// Reads a settings file, tolerating a missing one. A file we can't parse is
// fatal on purpose: silently overwriting someone's Claude Code config is worse
// than telling them to paste four lines themselves.
function readSettings(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { settings: {}, existed: false };
    throw error;
  }
  if (raw.trim() === '') return { settings: {}, existed: true };
  try {
    return { settings: JSON.parse(raw), existed: true };
  } catch {
    throw new Error(
      `${file} isn't valid JSON, so it wasn't touched.\n\nAdd this to it by hand:\n${JSON.stringify(block(true), null, 2)}`,
    );
  }
}

function block(autoUpdate) {
  return {
    extraKnownMarketplaces: {
      [MARKETPLACE]: {
        source: { source: 'github', repo: REPO },
        ...(autoUpdate ? { autoUpdate: true } : {}),
      },
    },
    enabledPlugins: { [PLUGIN_KEY]: true },
  };
}

// Merge only the two keys we own, at the leaf level, so nothing else in the
// user's settings is disturbed.
function merge(settings, autoUpdate) {
  const next = { ...settings };
  const marketplaces = { ...(next.extraKnownMarketplaces ?? {}) };
  const previous = marketplaces[MARKETPLACE] ?? {};
  marketplaces[MARKETPLACE] = {
    ...previous,
    source: { source: 'github', repo: REPO },
    ...(autoUpdate ? { autoUpdate: true } : {}),
  };
  next.extraKnownMarketplaces = marketplaces;
  next.enabledPlugins = { ...(next.enabledPlugins ?? {}), [PLUGIN_KEY]: true };
  return next;
}

async function pickScope(preset, yes) {
  if (preset) return preset;
  if (yes || !process.stdin.isTTY) return 'user';

  console.log(`\n${c.bold('Who are these skills for?')}\n`);
  console.log(`  ${c.bold('1')}  ${SCOPES.user.label}`);
  console.log(`  ${c.bold('2')}  ${SCOPES.project.label}\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question('Pick 1 or 2 [1]: ')).trim();
    return answer === '2' ? 'project' : 'user';
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    help();
    return;
  }

  const scope = await pickScope(args.scope, args.yes);
  const file = SCOPES[scope].file();
  const { settings, existed } = readSettings(file);

  // Keep a copy of anything we're about to rewrite, so a bad merge is undoable.
  if (existed) copyFileSync(file, `${file}.boom-backup`);

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(merge(settings, args.autoUpdate), null, 2)}\n`);

  console.log(`\n${c.green('✓')} Boom skills configured in ${c.bold(file)}`);
  if (existed) console.log(`  ${c.dim(`previous version saved as ${file}.boom-backup`)}`);
  console.log(
    args.autoUpdate
      ? `${c.green('✓')} Auto-update on. New skills and fixes arrive on their own.`
      : `${c.yellow('!')} Auto-update off. Run \`claude plugin update boom\` to get new skills.`,
  );

  console.log(`\n${c.bold('One more step:')} start Claude Code. It asks you to confirm`);
  console.log('installing the marketplace and plugin, and to approve Boom\'s MCP');
  console.log('server. Then sign in to Boom when it opens. No API key needed.\n');
  console.log(c.dim(`Skills then appear as boom:<skill-name>. Docs: https://docs.useboom.ai/skills`));
}

main().catch((error) => {
  console.error(`\n${c.red('✗')} ${error.message}\n`);
  process.exitCode = 1;
});
