# Boom Skills

> **Beta** — these skills target Boom's MCP server, which is launching soon. Tool names may change before GA.

Agent Skills that teach Claude how to run customer research on [Boom](https://useboom.ai): launch AI-led customer interviews over WhatsApp and email, manage participants, and turn transcripts into insight — using Boom's MCP tools the way they were designed to be used.

## Install

### Option 1 — skills CLI (any agent)

```bash
npx skills@latest add BOOM-TML/skills
```

Pick the skills you want and the agent(s) to install them for.

### Option 2 — Claude Code plugin (skills + Boom MCP in one step)

```
/plugin marketplace add BOOM-TML/skills
/plugin install boom
```

The plugin also configures Boom's MCP server. Set your API key first:

```bash
export BOOM_API_KEY=boom_sk_...   # create one in Boom → Settings → API Keys
```

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
