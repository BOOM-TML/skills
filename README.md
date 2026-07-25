# Boom Skills

> **Beta** — these skills target Boom's MCP server, which is launching soon. Tool names may change before GA.

Agent Skills that teach Claude how to run customer research on [Boom](https://useboom.ai): launch AI-led customer interviews over WhatsApp and email, manage participants, and turn transcripts into insight — using Boom's MCP tools the way they were designed to be used.

## Install

### Option 1 — one command (Claude Code, skills + MCP + auto-update)

```bash
npx @useboom/skills-setup
```

It asks who the skills are for, then writes the marketplace and plugin into your
Claude Code settings with **auto-update on**, so new skills and fixes reach you
without reinstalling. Start Claude Code, confirm the install prompt, and sign in
to Boom when it opens. There's no API key to create: the MCP server uses your
Boom login.

Auto-update is why the command exists. Marketplaces other than Anthropic's own
arrive with auto-update off, and no `claude plugin` flag turns it on, so the
value has to be written into settings:

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

Paste that yourself if you'd rather not run the installer. `~/.claude/settings.json`
covers every project on your machine; a committed `.claude/settings.json` covers a
repo and its team.

### Option 2 — the `/plugin` menu (no files to edit)

```
/plugin marketplace add BOOM-TML/skills
/plugin install boom
```

Then open **Marketplaces → boom → Enable auto-update**, or new skills won't
reach you.

### Option 3 — skills CLI, skills only (any agent)

```bash
npx skills@latest add BOOM-TML/skills
```

Pick the skills you want and the agent(s) to install them for. This copies the
skill files without Boom's MCP server and without auto-update, so connect the
MCP separately (see below) and re-run the command to update.

### The MCP server

Options 1 and 2 configure it for you. Everywhere else, point your tool at:

```
https://www.useboom.ai/mcp
```

Use that exact URL. Claude Code matches plugin-provided servers to manually
configured ones **by endpoint**, so an identical URL means one connection
instead of two copies of the same tools. Access follows your Boom login, and
[docs.useboom.ai/use-mcp](https://docs.useboom.ai/use-mcp) covers Cursor, VS
Code, and the Claude app.

## How skills are named

Installed via the **plugin**, skills are automatically namespaced under the plugin, so they appear and can be invoked as `boom:<skill>` — e.g. `boom:launch-research-initiative`. You don't prefix the skill names yourself; the `boom:` comes from the plugin. Installed via the **`skills` CLI** (Option 1), they keep their bare names (`launch-research-initiative`).

Either way, Claude selects the right skill from its `description` — typing the name is optional. That's why the skill folders stay unprefixed: adding `boom-` manually would collide with the plugin's automatic `boom:` and produce `boom:boom-…`.

## Skills

| Skill | Use it to |
|---|---|
| [`boom-overview`](skills/boom-overview/SKILL.md) | Get oriented: Boom's object model, lifecycle, and which skill to use when |
| [`onboarding`](skills/onboarding/SKILL.md) | Brand new to Boom? A guided, hands-on first run — build your first journey, send a Hello World, and learn the mental model |
| [`build-knowledge-base`](skills/build-knowledge-base/SKILL.md) | Prepare your agent context to hand to Boom — durable brand identity + a brief per use case (research, churn recovery, data collection). Guided interview + own-site research. |
| [`connect-your-data`](skills/connect-your-data/SKILL.md) | Sync your Postgres/MySQL/Shopify data into Boom's CDP (read-only user, SSH tunnel, mapping SQL) |
| [`cdp-and-segments`](skills/cdp-and-segments/SKILL.md) | Query Boom's CDP and build segments to target |
| [`launch-research-initiative`](skills/launch-research-initiative/SKILL.md) | Create and launch a customer research initiative end-to-end, with the context-authoring formula from Boom's best-performing initiatives |
| [`whatsapp-templates`](skills/whatsapp-templates/SKILL.md) | Write WhatsApp openers that pass Meta review and earn replies |
| [`design-journey`](skills/design-journey/SKILL.md) | Design or debug the workflow graph behind an initiative (follow-up rounds, branching, timing) |
| [`manage-participants`](skills/manage-participants/SKILL.md) | Add, monitor, and stop participants in an initiative |
| [`analyze-results`](skills/analyze-results/SKILL.md) | Turn initiative data and transcripts into insight |

## Domain model

Read [`CONTEXT.md`](CONTEXT.md) for Boom's object model and vocabulary (initiatives, participants, journeys, segments).

## Contributing

PRs welcome. CI validates skill frontmatter and links. Skills are agent instructions — every change is reviewed before merge.

## License

[MIT](LICENSE)
