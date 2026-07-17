---
name: design-journey
description: Use when the user wants to build, design, review, debug, or understand a Boom journey — the workflow graph behind an initiative that controls which template is sent, how long to wait, when the AI converses, follow-up rounds, branching by customer attributes, calling an external endpoint, or scheduling. Triggers on "build a journey", "follow-up rounds", "workflow", "why didn't the second message send", "branch by plan/attribute", "call our API from the journey", "re-engage after timeout".
---

# Design a Journey

A journey is the versioned workflow graph that runs each participant through an initiative: nodes emit **signals**, edges route on them. You can author a journey end-to-end through the MCP — create a draft, add and connect nodes, set the trigger, validate, and publish — or review and debug an existing one. Journeys can also be edited in Boom's visual builder; the MCP and the builder operate on the same graph, so you can hand off in either direction.

Your job with this skill: *build or debug the graph precisely*, then either publish it or give the user an exact node-by-node spec they can finish in the builder.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `journeys_list` / `journeys_get` / `journeys_get_definition` | Read a journey's versions and its full node + edge definition | read |
| `journeys_authoring_catalog` | The machine-readable node-kind catalog (kinds, inputs, output signals) — read this before building | read |
| `journeys_condition_catalog` / `journeys_event_catalog` | Valid DECISION predicate terms and dispatchable/reserved event names | read |
| `journeys_message_channels` / `journeys_message_templates` | Sending channel ids and approved template ids for SEND_MESSAGE | read |
| `journeys_message_variables` | The exact variable paths a SEND_MESSAGE template binding can reference for a journey (`customer.*`, `person.<key>`, and run-produced values) — read this before binding placeholders | read |
| `journeys_create_draft` / `journeys_create_draft_from_published` | Start a new editable draft (blank or copied from the live version) | write |
| `journeys_add_node` / `journeys_update_node` / `journeys_delete_node` | Add, edit, or remove a node | write |
| `journeys_connect_nodes` / `journeys_disconnect_nodes` | Wire (or unwire) an edge on a specific signal handle | write |
| `journeys_set_trigger` | Set how people enter (manual / segment / cdp_event) | write |
| `journeys_update_draft` | Replace the whole draft definition at once | write |
| `journeys_validate` | Check a draft against the publish rules without going live | read |
| `journeys_publish` | Publish the draft — **this goes live to real customers**; confirm first | write |
| `initiatives_get` | The initiative the journey belongs to | read |

Tool names follow `domain_action`; if a call fails with `tool_not_found`, list available tools and match by that pattern.

## Node kinds and the signals they emit

| Kind | Group | Purpose | Key inputs | Emits |
|---|---|---|---|---|
| `ENTRY` | trigger | How people enroll | `triggerType: manual \| segment \| cdp_event`; `segmentId` / `eventName`; optional frequency cap `maxEnrollments` + `enrollmentWindow` | `SENT` |
| `SEND_MESSAGE` | action | Send a WhatsApp template | `templateId` **and** `channelId` (both required to publish), `templateBindings` (see "Bind your variables") | `SENT` |
| `WAIT_FOR_REPLY` | action | Passive wait for the first reply (no AI) | `maxTimeout` | `REPLIED`, `TIMEOUT` |
| `MANAGE_CONVERSATION` | action | The AI-led conversation | `mode: AGENT \| ESCALATE`, optional `inactivityTimeout` (`1h`–`24h`) | `CLOSED`, `STALE`, + `INACTIVE` (only when `inactivityTimeout` is set) |
| `CONVERSATION_BLOCK` | action | **Legacy** combined wait + AI conversation | `mode`, `maxTimeout`, `goal` | `CLOSED`, `TIMEOUT`, `STALE` |
| `DELAY` | logic | Wait | `mode: duration` (`2d`) \| `until_date` (ISO instant) \| `until_weekday` (weekdays + time window + IANA timezone) | `SENT` |
| `DECISION` | logic | Two-way branch | `logic: AND \| OR` + conditions: person attribute predicate, event occurred, custom-object match, or a runtime value | `YES`, `NO` |
| `CASE` | logic | Multi-way switch on one person attribute (≤10 branches) | `selectionPath` + `branches[]`; a wired **default** is mandatory | `case:<branchId>` + `case:default` |
| `HTTP_REQUEST` | action | Call an external endpoint (your API / a webhook) | `method`, `url` (supports `{{variable}}`), `headers`, `body`, `credentialId`, `timeoutMs` (≤30s), `maxAttempts` (≤5) | `SUCCESS`, `FAILED` |
| `DISPATCH_EVENT` | action | Record a CDP event for the person | `eventName`, static or bound `properties` | `SENT` |
| `EXIT` | terminal | End the journey | optional `outcome` label; optional `nextInitiativeId` to chain into another initiative | — |

For new journeys, prefer **`WAIT_FOR_REPLY` + `MANAGE_CONVERSATION`** over the legacy `CONVERSATION_BLOCK` — the split gives you separate handles for "never replied" (`TIMEOUT`) vs "replied then the AI closed the conversation" (`CLOSED`), which most follow-up logic needs.

Routing rule: an edge fires when its `sourceHandle` equals the signal the node emitted. **Every signal a node can emit must have exactly one outgoing edge** — this is the #1 publish error.

## Authoring workflow (MCP)

1. **Learn the graph.** Call `journeys_authoring_catalog` for the node kinds and their inputs; `journeys_message_channels` / `journeys_message_templates` for the ids a SEND_MESSAGE needs; `journeys_message_variables` for the paths a template binding can reference; `journeys_condition_catalog` for DECISION predicate terms; `journeys_event_catalog` for valid event names.
2. **Open a draft.** `journeys_create_draft` for a blank one, or `journeys_create_draft_from_published` to iterate on the live version. Only a DRAFT is editable; a PUBLISHED version is frozen.
3. **Build the nodes.** `journeys_add_node` per node, `journeys_connect_nodes` per edge (name the `sourceHandle` — the signal the edge routes on). Positions are optional; the server auto-lays-out the graph.
4. **Set the trigger** with `journeys_set_trigger` (manual / segment / cdp_event).
5. **Bind template variables** on every SEND_MESSAGE (see below) — the most common thing to forget.
6. **Validate** with `journeys_validate` and fix every `error` (warnings are advisory).
7. **Publish** with `journeys_publish` once validation is clean. **Publishing starts real outreach — get explicit confirmation from the user first.** Publishing a new version supersedes the previous one; versions are immutable.

You can also assemble the whole definition and send it in one `journeys_update_draft` call instead of node-by-node — useful when you already have the full graph designed.

## Bind your variables (the most common miss)

A SEND_MESSAGE references an approved template that has placeholders (`{{1}}`, `{{2}}`, a name, a link). The node will not fill them in unless you set **`templateBindings`** — a map from each template placeholder to the value it should carry (a participant attribute, or a value produced earlier in the flow). **Adding the SEND_MESSAGE node is not enough: set `templateBindings` for every placeholder in the template**, or the message sends with empty or literal `{{1}}` values. Confirm the template's placeholders with `journeys_message_templates`, then bind each one.

**Use the right path.** A binding value is a dot-path, and it must be one the send-time resolver can reach. Call **`journeys_message_variables`** for the exact set this journey offers, then copy a returned `path` verbatim. The paths fall into three families:

| Family | What it is | Example |
|---|---|---|
| `customer.<field>` | Built-in contact fields | `customer.name`, `customer.phoneNumber` |
| `person.<key>` | **Custom person attributes** (from people upsert / your CDP) | `person.bank`, `person.plan` |
| run-produced values | Answers extracted in the conversation, or event/segment data carried into the run | copy the exact `path` from `journeys_message_variables` |

So a binding is **not** always `person.*` — built-in fields are `customer.*`, and extracted/event/segment data has its own paths that `journeys_message_variables` returns.

> ⚠️ A custom person attribute is `person.<key>` (e.g. `person.bank`) — **not** `attributes.bank` and **not** `customer.attributes.bank`. `attributes.<key>` is the DECISION/CASE **condition** syntax (from `journeys_condition_catalog`); it does not resolve in a message binding and the message will arrive blank. `journeys_validate` now rejects such a binding before publish.

## Publish-time validation

`journeys_validate` checks dozens of rules; the ones that trip people up most:

- Exactly **one ENTRY**, at least **one EXIT**; unique node ids; every edge references existing nodes; every node named.
- One out-edge per `(node, signal)` — a handle may wire to **at most one** node (no fan-out), and no signal may be left unwired. `WAIT_FOR_REPLY` needs both `REPLIED` and `TIMEOUT`; `MANAGE_CONVERSATION` needs `CLOSED`; `DECISION` needs both `YES` and `NO`; `CASE` needs every branch **plus** `case:default`; `HTTP_REQUEST` needs both `SUCCESS` and `FAILED`.
- `SEND_MESSAGE`: `templateId` and `channelId` both set — there is no silent fallback number.
- Timeouts and durations use the `30m` / `24h` / `3d` format; DELAY `until_date` must be in the future; DELAY timezones must be valid IANA zones.
- Foot-gun warnings: a `DISPATCH_EVENT` emitting the same event the ENTRY listens to (self-trigger loop), or an event that both enrolls and cancels the run.

Drafts can be incomplete; only **publish** requires a clean validation.

## Proven topologies (from production)

**1. Single outbound + interview** (the auto-scaffold):
```
ENTRY ─SENT→ SEND_MESSAGE ─SENT→ WAIT_FOR_REPLY ─REPLIED→ MANAGE_CONVERSATION ─CLOSED→ EXIT(done)
                                        └─TIMEOUT→ EXIT(no_response)              └─STALE→ EXIT(stalled)
```

**2. Multi-round follow-up** (re-contact non-responders):
```
… WAIT_FOR_REPLY ─TIMEOUT→ DELAY(2d) ─SENT→ SEND_MESSAGE(round 2) ─SENT→ WAIT_FOR_REPLY ─… (round 3)
        └─REPLIED→ MANAGE_CONVERSATION ─CLOSED→ EXIT
```
Each round uses its own approved follow-up template. Space rounds 1–3 days apart.

**3. Attribute-personalized opener** (branch before sending):
```
ENTRY ─SENT→ CASE(attributes.plan) ─case:pro→ SEND_MESSAGE(template_pro) ─┐
                       ├─case:basic→ SEND_MESSAGE(template_basic) ────────┼→ WAIT_FOR_REPLY → …
                       └─case:default→ SEND_MESSAGE(template_generic) ────┘
```
Use CASE for a **small** fork on a single attribute (plan, language, party size). For anything bigger, don't cram multiple goals into one journey — see "One objective per initiative".

**4. Always-on, segment-triggered**:
```
ENTRY(segment: "churned last month", maxEnrollments 1 per 90d) ─SENT→ …
```
People entering the segment enroll automatically; the frequency cap prevents re-contacting the same person too often. Pair with `isRecurring` + `reportCadence` on the initiative.

**5. Call an external system, then hand off** (chaining):
```
… MANAGE_CONVERSATION ─CLOSED→ HTTP_REQUEST(POST the collected data to your API) ─SUCCESS→ DISPATCH_EVENT(done) ─SENT→ EXIT(nextInitiativeId: next)
                                                                                  └─FAILED→ EXIT(needs_review)
```
`HTTP_REQUEST` posts to your endpoint (authenticated with a stored credential) and its response is available to later nodes; `EXIT.nextInitiativeId` chains the person into a follow-on initiative. This is how you keep each initiative focused on one job and pass the baton between them.

## One objective per initiative

An initiative's conversation is run by the AI toward the **single objective** you set on the initiative. Journeys are great at *routing* (branch, wait, call an API, hand off), but a journey should not try to make one conversation accomplish two different goals — the agent handles a focused objective far better than a split one. When a flow really has two jobs (e.g. "collect the documents" and then, later, "resolve what was wrong with them"), model them as **two initiatives chained by an event or an `EXIT.nextInitiativeId`**, not one journey with a mode switch.

To keep a person out of two conflicting initiatives at once, two mechanisms help: a `DECISION` guard right before an action (re-check the person's current status; exit if they've moved on), and journey-level `cancelOnEvents` (cancel an in-flight run when a status event arrives). Pick whichever fits — the guard is explicit and easy to reason about.

## Design review checklist

Before publishing (or handing over a spec), verify:
1. Every `WAIT_FOR_REPLY` / `MANAGE_CONVERSATION` / `DECISION` / `CASE` / `HTTP_REQUEST` has **all** its signals wired (the TIMEOUT / FAILED paths are the ones people forget).
2. Every `SEND_MESSAGE` names an **APPROVED** template and a channel id, and **binds every template placeholder** (`templateBindings`).
3. Follow-up templates exist for every round (round 2..N need their own approved template).
4. DELAY timezones are IANA (`America/Mexico_City`) and windows respect the audience's waking hours.
5. Segment-triggered ENTRY has a frequency cap unless the user explicitly wants unlimited re-enrollment.
6. EXIT `outcome` labels are meaningful (`recovered`, `no_response`) — they show up in analysis.

## Debugging a live journey

`journeys_get_definition` returns the full graph; `initiatives_get` shows the published version pointer. Typical diagnoses:
- **"Second message never sent"** → the `TIMEOUT` edge is missing on the wait node, or the follow-up template is not APPROVED.
- **"Message arrived with blank / `{{1}}` values"** → `templateBindings` is missing on the SEND_MESSAGE node, **or** a binding uses a path the resolver can't reach (e.g. `attributes.bank` / `customer.attributes.bank` instead of `person.bank`). Check each binding against `journeys_message_variables`; `journeys_validate` flags an unresolvable path.
- **"Some people got nothing"** → a CASE value with no matching branch falling to an unwired default, or Do Not Contact suppression (expected, server-side).
- **"Person enrolled twice"** → segment-triggered ENTRY without `maxEnrollments` / `enrollmentWindow`.

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model. Template authoring: [`whatsapp-templates`](../whatsapp-templates/SKILL.md). Segments: [`cdp-and-segments`](../cdp-and-segments/SKILL.md).
