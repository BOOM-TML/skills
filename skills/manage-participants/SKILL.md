---
name: manage-participants
description: Use when the user wants to add people to a Boom initiative, check participant status, stop a participant's outreach, or read one participant's conversation. Participants always belong to an initiative.
---

# Manage Participants

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `participants_add` | Enroll people in an initiative | **admin** |
| `participants_list` | List participants + status, paginated | read |
| `participants_get` | One participant's detail | read |
| `participants_stop` | Stop outreach to one participant (data retained) | write |
| `participants_messages` | Full transcript for one participant | read |

## Core rules

- Participants live ONLY under initiatives — there is no global participant list. Always resolve the initiative first.
- **There is no delete.** `participants_stop` halts outreach; transcripts and extracted data are retained. If a user asks to "remove" someone, stop them and explain retention. If they ask to *never contact someone again across all initiatives*, that's Do Not Contact — managed in the Boom app, not via MCP.
- `phoneNumber` (E.164) is the only phone field. Email participants use `email`.

## Workflow: adding participants

1. Confirm the target initiative (`initiatives_list` / user link).
2. Shape rows as `{ "phoneNumber": "+5215512345678", "name": "...", "lastName": "...", ...attributes }` — extra attributes become interview context the agent can use.
3. Call `participants_add`. Compare the accepted count to what you sent: DNC-suppressed people are skipped server-side. **Report the delta; never retry suppressed entries.**
4. This is an admin-scoped operation on MCP — on `error.code: "forbidden"`, tell the user to use an admin key or the Boom app.

## Workflow: monitoring & stopping

- `participants_list` and paginate with `next_cursor`; summarize by status rather than dumping rows.
- Before `participants_stop`, confirm with the user — it's not reversible by re-adding mid-conversation.
- To review a conversation, `participants_messages` returns the flat chronological transcript with direction and author.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `error.code: "forbidden"` | Non-admin key on an outreach write | Admin key or Boom app |
| Person missing after add | DNC suppression | Expected; report, don't retry |
| `next_cursor` keeps returning | You're re-sending the first-page call | Pass the *previous response's* cursor each time; stop at `null` |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model.
