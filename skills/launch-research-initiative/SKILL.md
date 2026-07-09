---
name: launch-research-initiative
description: Use when the user wants to launch, start, or set up a NEW customer research initiative on Boom — AI-led interviews over WhatsApp or email to answer a product question (churn reasons, feature feedback, discovery). Covers creating the initiative, choosing a template and WhatsApp number, adding the first participants, and launching outreach. For an initiative that already exists, use manage-participants or analyze-results instead.
---

# Launch a Research Initiative

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `initiatives_create` | Create the initiative | write |
| `initiatives_get` | Verify configuration before launch | read |
| `whatsapp_numbers_list` | Discover the org's WhatsApp sender numbers | read |
| `templates_list` / `templates_create` | Pick or create the opening WhatsApp template | read / write |
| `participants_add` | Enroll people | **admin** |
| `initiatives_launch` | Start outreach | **admin** |

> Tool names may drift while Boom's MCP is in beta. If a call fails with `tool_not_found`, list available tools and match by the `domain_action` pattern.

## When to use / when not to

- Use for a *research* goal: understanding why customers churn, how they use a feature, what to build next.
- Do NOT use for one-off broadcasts or support replies — Boom initiatives run structured, multi-turn interviews.
- If the user only wants to read existing results, use `analyze-results` instead.

## Prerequisites

- Boom MCP connected and `BOOM_API_KEY` set. Adding participants and launching require an **admin-scoped** key — check with the user before assuming.
- At least one active WhatsApp number (check `whatsapp_numbers_list`) for WhatsApp initiatives.

## Workflow

1. **Clarify the research goal first.** One sentence: what decision will this research inform? Push back on survey-shaped asks — Boom's agents do deep interviews with follow-ups, so the goal should be open ("understand why trial users don't convert"), not a question list.
2. **Create the initiative** with `initiatives_create`:
   - `name`, `goal` (the sentence from step 1)
   - `flagConditionPrompt` — natural-language condition that flags conversations for human review (e.g. "participant mentions a competitor or asks for a refund")
   - `identityDeflection` — how the agent answers "are you a bot?"
   - `isRecurring: false` for a one-shot study
3. **Pick the sender**: call `whatsapp_numbers_list`; show the user the options. Templates select numbers via `phoneNumbers[]` — omitting it uses the org's **first active number only** (not all numbers).
4. **Pick or create the opening template** (`templates_list`, then `templates_create` if needed). WhatsApp openers must be pre-approved; expect a review delay for new templates. The opener should reference why you're reaching out and invite a reply — not pitch.
5. **Add participants** with `participants_add` (see `manage-participants` for shape and DNC behavior). `phoneNumber` is E.164.
6. **Verify before launching**: `initiatives_get` and read back name/goal/template/participant count to the user. **Launching messages real customers — always get explicit confirmation.**
7. **Launch** with `initiatives_launch`.

## Boom best practices

- 50–300 participants is a good research batch; response rates on WhatsApp typically far exceed email.
- Do Not Contact is enforced server-side — suppressed people are skipped automatically; don't try to detect or bypass it.
- LATAM WhatsApp numbers: Boom prefers the `+521` form when matching Mexican numbers; just send valid E.164 and let the server normalize.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `error.code: "forbidden"` on `participants_add` / `initiatives_launch` | Key is not admin-scoped | Ask the user for an admin key or have an admin run launch from the Boom app |
| Template rejected | Opener reads as marketing | Rewrite as a research invitation; resubmit |
| Participant count lower than the list you sent | DNC suppression | Expected — report the delta to the user, never retry the suppressed entries |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model.
