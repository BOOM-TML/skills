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
| `--no-clean` | Keep pre-plugin copies from `npx skills add` where they are |
| `--settings <path>` | Target a specific settings file (advanced/testing) |
| `--yes`, `-y` | Accept defaults, no prompts (scriptable) |
| `--print` | Show the resulting settings without writing (dry run) |

Non-interactive example (CI, dotfiles):

```bash
npx @useboom/skills-setup --yes --scope user
```

## Upgrading from `npx skills add`

If you installed the skills the old way, you have **copies** in
`.agents/skills/<name>/` symlinked from `.claude/skills/<name>`, and those copies
never update. Beside the plugin they'd give you every Boom skill twice, under two
names (`analyze-results` and `boom:analyze-results`), and Claude picks a skill by
its description, so it can quietly reach for the stale one.

The installer handles that. It finds those copies, moves them into a
`.boom-skills-backup-<date>/` folder next to where they lived, and drops only our
entries from `skills-lock.json` (anything from another publisher stays). Nothing
is deleted, so you can drag a folder back if you disagree. Skip it with
`--no-clean`.

Copies it can't attribute to Boom, which is what global installs look like since
they write no lockfile, are reported and left alone rather than guessed at.

## Notes

- **No API key.** The plugin brings Boom's MCP server with it, and that server
  authenticates with your Boom login over OAuth. Nothing to create, nothing to
  store.
- **Zero dependencies** — plain Node (>=18), nothing to audit, fast `npx`.
- **Safe & idempotent** — re-running just re-asserts the Boom entries; your other
  settings are untouched, and a malformed settings file aborts instead of being
  overwritten.
- **Teams / orgs:** an admin can put the same JSON in `managed-settings.json` once
  to enable it for everyone — see the [Skills docs](https://docs.useboom.ai/skills).
- Prefer to pin instead of auto-updating? Run with `--no-auto-update`, or install
  once with `npx skills@latest add BOOM-TML/skills`.

## Publishing (maintainers)

Push a `v*` tag. `.github/workflows/publish.yml` runs the repo's validation, smoke
tests the installer, and publishes with npm provenance from CI, which is why we
don't publish from a laptop.
