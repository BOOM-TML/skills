---
name: boom-overview
description: Use when the user is new to Boom, asks "what is Boom", "how does Boom work", "what can I do with Boom", wants a tour of the platform's objects (initiatives, journeys, templates, segments, CDP), or when it's unclear which Boom skill applies to their request. Orientation and router — read this first, then hand off to the specific skill.
---

# Boom Overview

Boom runs **AI-led conversations with your customers** over WhatsApp and email — for product research (deep interviews, not surveys), churn recovery, and data collection. You configure *what to learn and from whom*; Boom's agent handles ~95% of each conversation and flags the rare ones needing a human.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `initiatives_list` / `initiatives_get` | See what's already running | read |
| `whatsapp_numbers_list` | The org's WhatsApp sender numbers | read |
| `templates_list` | Pre-approved opening messages | read |
| `segments_list` / `segments_catalog` | Saved audiences + filterable attributes | read |
| `journeys_list` | Message workflows behind initiatives | read |

All read-only — safe to call while orienting. Tool names follow `domain_action`; if a call fails with `tool_not_found`, list available tools and match by that pattern.

## The object model — 60 seconds

```
Segment / CSV / API  ──►  Participants  ──►  Initiative  ──►  Insights & reports
       (who)                (enrolled)      (the campaign)      (what you learned)
                                  │
                          Journey (workflow: which template,
                          when to follow up, when the AI converses)
                                  │
                          WhatsApp Template (pre-approved opener)
```

- **Initiative** — the campaign. Carries the research `objective`, a Markdown `context` briefing the AI, guiding questions, and lifecycle (`DRAFT → ACTIVE → COMPLETED`). Everything hangs off it.
- **Participant** — one person enrolled in one initiative. No global list, no delete (stopping retains data).
- **Journey** — the workflow graph behind the initiative (send template → wait → AI conversation → follow-ups). Auto-scaffolded on creation; **read-only via MCP**, edited in Boom's builder UI.
- **Template** — a WhatsApp opener pre-approved by Meta (~24–48h review). Required to start any WhatsApp conversation.
- **Segment / CDP** — persons, custom objects, and events; segments are saved filters that define WHO an initiative reaches.

## Lifecycle of a typical project

1. **Prepare context** — brand voice + product knowledge the agent speaks with → `build-knowledge-base`
2. **(Optional) sync your data** — connect a database/Shopify so audiences stay fresh → `connect-your-data`
3. **Define the audience** — query the CDP, build a segment → `cdp-and-segments`
4. **Create the initiative** — objective, context, guiding questions → `launch-research-initiative`
5. **Get the opener approved** — WhatsApp template → `whatsapp-templates`
6. **Shape the workflow** — follow-up rounds, branching, timing → `design-journey`
7. **Enroll & launch** — add participants, start outreach → `launch-research-initiative` / `manage-participants`
8. **Read the results** — summaries, transcripts, themes → `analyze-results`

## Which skill do I need?

| The user wants to… | Skill |
|---|---|
| Understand Boom / decide what's possible | this one |
| Prepare brand/agent context for Boom | `build-knowledge-base` |
| Connect a Postgres/MySQL/Shopify data source | `connect-your-data` |
| Find people, build or refresh an audience | `cdp-and-segments` |
| Create & launch a new research campaign | `launch-research-initiative` |
| Write or fix a WhatsApp opening message | `whatsapp-templates` |
| Design follow-up rounds, branching, timing | `design-journey` |
| Add/stop/inspect people in a running initiative | `manage-participants` |
| Summarize what an initiative learned | `analyze-results` |

## Key scopes & guardrails

- Read tools work with any API key. **Outreach writes** — adding participants, launching, canceling — need an **admin-scoped** key.
- Launching messages **real customers**. Always confirm with the user before `initiatives_launch` or `initiatives_participants_add`.
- **Do Not Contact is enforced server-side** — suppressed people are silently skipped; never work around it.
- Spanish-first: >98% of production initiatives run in Spanish (`language: "es"` is the default). Phone numbers are E.164 (`+5215512345678`).

See [`CONTEXT.md`](../../CONTEXT.md) for the full domain model and vocabulary rules.
