---
name: design-journey
description: Use when the user wants to design, review, debug, or understand a Boom journey — the workflow graph behind an initiative that controls which template is sent, how long to wait, when the AI converses, follow-up rounds, branching by customer attributes, or scheduling. Triggers on "follow-up rounds", "workflow", "journey", "why didn't the second message send", "branch by plan/attribute", "re-engage after timeout".
---

# Design a Journey

A journey is the versioned workflow graph that runs each participant through an initiative: nodes emit **signals**, edges route on them. Journeys are **read-only over MCP** (`journeys_list`, `journeys_get`) — they are edited in Boom's builder UI, and every new initiative gets one auto-scaffolded from `maxAttempts`. Your job with this skill: *design or debug the graph precisely*, then give the user an exact node-by-node spec (or diagnosis) they can apply in the builder.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `journeys_list` / `journeys_get` | Read a journey's definition (nodes + edges) | read |
| `initiatives_get` | The initiative the journey belongs to | read |
| `templates_list` | Template ids/names referenced by SEND_MESSAGE nodes | read |
| `whatsapp_numbers_list` | Channel (sender) ids referenced by SEND_MESSAGE | read |
| `segments_list` | Segments referenced by segment-triggered entries | read |

## Node kinds and the signals they emit

| Kind | Purpose | Key inputs | Emits |
|---|---|---|---|
| `ENTRY` | How people enroll | `triggerType: manual \| segment \| cdp_event`; `segmentId` / `eventName`; optional frequency cap `maxEnrollments` + `enrollmentWindow` | `SENT` |
| `SEND_MESSAGE` | Send a WhatsApp template | `templateId` **and** `channelId` (both required to publish), `templateBindings` | `SENT` |
| `CONVERSATION_BLOCK` | The AI interview | `mode: AGENT \| ESCALATE`, `maxTimeout` (`4h`, `24h`, `3d`…), optional `goal` override | `CLOSED`, `TIMEOUT` |
| `WAIT_FOR_REPLY` | Passive wait (no AI) | `maxTimeout` | `REPLIED`, `TIMEOUT` |
| `DECISION` | Yes/no branch | `logic: AND \| OR` + conditions: person attribute (`cdp_predicate`), event occurred, custom-object match, or runtime value | `YES`, `NO` |
| `CASE` | Multi-way switch on one person attribute | `attributes.<key>` + `branches[]`; a wired **default** is mandatory | `case:<branchId>` |
| `DELAY` | Wait | `duration` (`2d`) \| `until_date` \| `until_weekday` (weekdays + time window + IANA timezone) | `SENT` |
| `DISPATCH_EVENT` | Emit a CDP event | `eventName`, static `properties` | `SENT` |
| `EXIT` | Terminal | optional `outcome` label; optional `nextInitiativeId` to chain | — |

Routing rule: an edge fires when its `sourceHandle` equals the signal the node emitted. **Every signal a node can emit must have exactly one outgoing edge** — this is the #1 publish error.

## Publish-time validation (the builder enforces ~40 rules; the big ones)

- Exactly **one ENTRY**, at least **one EXIT**; every node reachable; no dangling edges.
- One out-edge per `(node, signal)` — no duplicates, none missing. A `CONVERSATION_BLOCK` needs **both** `CLOSED` and `TIMEOUT` wired; `DECISION` needs both `YES` and `NO`; `CASE` needs every branch **plus default**.
- `SEND_MESSAGE`: `templateId` and `channelId` both set — there is no silent fallback number.
- Timeouts match `^\d+[smhd]$` (e.g. `30m`, `24h`, `3d`).
- Foot-gun warnings: a `DISPATCH_EVENT` emitting the same event the ENTRY listens to (self-trigger loop); enrolling and canceling on the same event.
- Drafts can be loose; only **publish** validates. One published version per initiative — publishing v(n+1) supersedes v(n); versions are immutable.

## Proven topologies (from production)

**1. Single outbound + interview** (the auto-scaffold):
```
ENTRY ─SENT→ SEND_MESSAGE ─SENT→ CONVERSATION_BLOCK ─CLOSED→ EXIT(done)
                                        └─TIMEOUT→ EXIT(no_response)
```

**2. Multi-round research** (maxAttempts N — re-engage non-responders):
```
… CONVERSATION_BLOCK ─TIMEOUT→ DELAY(2d) ─SENT→ SEND_MESSAGE(follow-up round 2)
        │                                            └─SENT→ CONVERSATION_BLOCK ─… (round 3)
        └─CLOSED→ EXIT(interviewed)
```
Each round uses its own approved FOLLOW_UP template. Keep rounds ≤ maxAttempts; space them 1–3 days.

**3. Attribute-personalized opener** (CASE/DECISION before sending):
```
ENTRY ─SENT→ CASE(attributes.plan) ─case:pro→ SEND_MESSAGE(template_pro) ─┐
                       ├─case:basic→ SEND_MESSAGE(template_basic) ────────┼→ CONVERSATION_BLOCK → …
                       └─case:default→ SEND_MESSAGE(template_generic) ────┘
```
All branches converge on one CONVERSATION_BLOCK. Used in production to pick a template per party size / plan / language.

**4. Always-on, segment-triggered**:
```
ENTRY(segment: "churned último mes", maxEnrollments 1 per 90d) ─SENT→ …
```
People entering the segment enroll automatically; the frequency cap prevents re-contacting the same person too often. Pair with `isRecurring` + `reportCadence` on the initiative.

## Design review checklist

Before handing the user a spec, verify:
1. Every `CONVERSATION_BLOCK`/`WAIT_FOR_REPLY`/`DECISION`/`CASE` has **all** its signals wired (TIMEOUT paths are the ones people forget).
2. Every `SEND_MESSAGE` names an **APPROVED** template (`templates_list`) and a channel id (`whatsapp_numbers_list`).
3. Follow-up templates exist for every round (round 2..N need their own).
4. DELAY timezones are IANA (`America/Mexico_City`) and windows respect the audience's waking hours.
5. Segment-triggered ENTRY has a frequency cap unless the user explicitly wants unlimited re-enrollment.
6. EXIT `outcome` labels are meaningful (`interviewed`, `no_response`) — they show up in analysis.

## Debugging a live journey

`journeys_get` returns the graph; `initiatives_get` shows the published version pointer. Typical diagnoses:
- **"Second message never sent"** → TIMEOUT edge missing on the conversation node, or follow-up template not APPROVED.
- **"Some people got nothing"** → CASE without matching branch value falling to an unwired default, or DNC suppression (expected, server-side).
- **"Person enrolled twice"** → segment-triggered ENTRY without `maxEnrollments`/`enrollmentWindow`.

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model. Template authoring: `whatsapp-templates`. Segments: `cdp-and-segments`.
