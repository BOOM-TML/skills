---
name: analyze-results
description: Use when the user wants to analyze or learn from a Boom initiative that is already running — "what did we learn?", "why are customers churning?", "summarize the interviews" — by reading the aggregate data summary and sampling participant transcripts to synthesize themes and insights. Read-only; safe with any key scope. To add, stop, or check individual participants instead, use manage-participants.
---

# Analyze Initiative Results

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `initiatives_list` / `initiatives_get` | Find the initiative and its status | read |
| `initiatives_summary` | Aggregated results for an initiative (`/data/summary`) | read |
| `initiatives_participants_list` | Enumerate participants + per-person status | read |
| `initiatives_participant_messages_list` | Full transcript for one participant (flat, chronological, with direction + author) | read |

## When to use

- "What did we learn from X?", "why are customers churning?", "summarize the interviews".
- Everything here is read-only — safe with any key scope.

## Workflow

1. **Locate the initiative** (`initiatives_list`, paginate with `next_cursor`). Confirm with the user if more than one matches.
2. **Start with the aggregate** (`initiatives_summary`): completion counts, extracted themes, flagged conversations. Present this before diving into transcripts.
3. **Sample transcripts deliberately** — don't read all of them. Pull via `initiatives_participant_messages_list`:
   - all *flagged* conversations (the initiative's `flagCondition` matched — each flag result carries the AI's reasoning, worth quoting),
   - 5–10 completed interviews across different outcomes,
   - a couple of drop-offs (where the participant went silent).
4. **Synthesize.** Lead with the answer to the initiative's `objective`. Structure: top 3–5 themes with participant counts, verbatim quotes (attributed as "a participant", never by name/phone), contradictions worth a follow-up study, and recommended actions.

## Boom best practices

- Quote participants verbatim — the interviews are the product. But strip PII: no names, no `phoneNumber` values in reports.
- Distinguish *extracted* themes (Boom's pipeline) from *your* synthesis; label which is which.
- Small-n honesty: with <30 completed interviews, report counts, not percentages.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `initiatives_summary` empty | Initiative not launched or no completions yet | Check `initiatives_get` status; report timeline instead |
| Transcript has only outbound messages | Participant never replied | Count as non-responder, not as negative feedback |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model.
