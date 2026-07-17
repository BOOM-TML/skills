# @useboom/skills-setup

One command to set up [Boom](https://useboom.ai)'s Claude Code skills — and keep
them auto-updating.

```bash
npx @useboom/skills-setup
```

It asks a couple of questions, then safely merges the right config into your
Claude Code `settings.json`:

- registers the Boom marketplace (`BOOM-TML/skills`),
- enables the `boom` plugin (Claude Code auto-installs it on next start),
- turns on **auto-update** so new skills and fixes arrive automatically.

Restart Claude Code and the skills show up as `boom:<skill-name>`.

## What it writes

It merges this into your settings (preserving everything else, and backing the
file up to `settings.json.bak` first):

```json
{
  "extraKnownMarketplaces": {
    "boom": {
      "source": { "source": "github", "repo": "BOOM-TML/skills" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "boom@boom": true }
}
```

## Options

| Flag | Effect |
| --- | --- |
| `--scope <user\|project>` | Write to `~/.claude/settings.json` (default) or `./.claude/settings.json` |
| `--auto-update` / `--no-auto-update` | Force auto-update on/off (default: on) |
| `--api-key <key>` | Save `BOOM_API_KEY` into settings `env` |
| `--settings <path>` | Target a specific settings file (advanced/testing) |
| `--yes`, `-y` | Accept defaults, no prompts (scriptable) |
| `--print` | Show the resulting settings without writing (dry run) |

Non-interactive example (CI, dotfiles):

```bash
npx @useboom/skills-setup --yes --scope user --api-key boom_sk_...
```

## Notes

- **Zero dependencies** — plain Node (>=18), nothing to audit, fast `npx`.
- **Safe & idempotent** — re-running just re-asserts the Boom entries; your other
  settings are untouched, and a malformed settings file aborts instead of being
  overwritten.
- **Teams / orgs:** an admin can put the same JSON in `managed-settings.json` once
  to enable it for everyone — see the [Skills docs](https://docs.useboom.ai/skills).
- Prefer to pin a version instead of auto-updating? Run with `--no-auto-update`,
  or install once with `npx skills@latest add BOOM-TML/skills`.

## Publishing (maintainers)

```bash
cd packages/skills-setup
npm publish --access public   # scope @useboom must exist and you must be authed
```
