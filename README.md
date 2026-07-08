# Boom Skills

> **Beta** — these skills target Boom's MCP server, which is rolling out now. Tool names may change before GA.

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

## Skills

| Skill | Use it to |
|---|---|
| [`launch-research-initiative`](skills/launch-research-initiative/SKILL.md) | Create and launch a customer research initiative end-to-end |
| [`analyze-results`](skills/analyze-results/SKILL.md) | Turn initiative data and transcripts into insight |
| [`manage-participants`](skills/manage-participants/SKILL.md) | Add, monitor, and stop participants in an initiative |
| [`cdp-and-segments`](skills/cdp-and-segments/SKILL.md) | Query Boom's CDP and build segments to target |

## Domain model

Read [`CONTEXT.md`](CONTEXT.md) for Boom's object model and vocabulary (initiatives, participants, journeys, segments).

## Contributing

PRs welcome. CI validates skill frontmatter and links. Skills are agent instructions — every change is reviewed before merge.

## License

[MIT](LICENSE)
