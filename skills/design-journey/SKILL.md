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
| `MANAGE_CONVERSATION` | action | The AI-led conversation | `mode: AGENT \| ESCALATE`, optional `inactivityTimeout` (`1h`–`24h`; AGENT-mode only, and gated by the `journey-inactivity-timeout` flag — without it the node falls back to a single 7-day wait) | `CLOSED`, `STALE` — a configured `inactivityTimeout` *closes* the conversation, so it routes `CLOSED`; there is no separate inactivity handle |
| `CONVERSATION_BLOCK` | action | **Legacy** combined wait + AI conversation | `mode`, `maxTimeout`, `goal` | `CLOSED`, `TIMEOUT`, `STALE` |
| `DELAY` | logic | Wait | `mode: duration` (`2d`) \| `until_date` (ISO instant) \| `until_weekday` (weekdays + time window + IANA timezone) | `SENT` |
| `DECISION` | logic | Two-way branch | `logic: AND \| OR` + conditions: person attribute predicate, event occurred, custom-object match, or a runtime value. Reads `engagement.workflowState.*`, `engagement.extracted.*`, `engagement.nodeOutputs.*` | `YES`, `NO` |
| `CASE` | logic | Multi-way switch on one attribute (≤10 branches) | `selectionPath` + `branches[]`; a wired **default** is mandatory. Reads `attributes.*`, `engagement.extracted.*`, `engagement.nodeOutputs.*` | `case:<branchId>` + `case:default` |
| `HTTP_REQUEST` | action | Call an external endpoint (your API / a webhook) | `method`, `url` (supports `{{variable}}`), `headers`, `body`, `credentialId`, `timeoutMs` (≤30s), `maxAttempts` (≤5) | `SUCCESS`, `FAILED` |
| `DISPATCH_EVENT` | action | Record a CDP event for the person | `eventName`, static or bound `properties` | `SENT` |
| `EXIT` | terminal | End the journey | optional `outcome` label; optional `nextInitiativeId` to chain into another initiative | — |

**`CASE` cannot read `engagement.workflowState.*`**, so it cannot switch on data that arrived with the segment or the event. That is exactly the shape a branch-by-reason flow wants (a failed payment's error code, a shipment's carrier), and the fix is to chain `DECISION` nodes, which do read it. Reach for `CASE` when you are switching on a person attribute or on something the conversation extracted.

For new journeys, prefer **`WAIT_FOR_REPLY` + `MANAGE_CONVERSATION`** over the legacy `CONVERSATION_BLOCK` — the split gives you separate handles for "never replied" (`TIMEOUT`) vs "replied then the AI closed the conversation" (`CLOSED`), which most follow-up logic needs.

The visual builder also has an email-send node, outbound only with no reply of its own, that isn't in this table because it isn't in `journeys_authoring_catalog`: `journeys_add_node` can't create one. Build it in the app. There's also no email-template tool; `templates_create` / `templates_list` are WhatsApp only. A journey built with one in the app still runs and reads back fine here, and the one rule to know if you touch it: only a delay, an exit, or another non-conversational node may follow it, never a reply-driven one.

Routing rule: an edge fires when its `sourceHandle` equals the signal the node emitted. **Every signal a node can emit must have exactly one outgoing edge** — this is the #1 publish error.

## Authoring workflow (MCP)

1. **Learn the graph.** Call `journeys_authoring_catalog` for the node kinds and their inputs; `journeys_message_channels` / `journeys_message_templates` for the ids a SEND_MESSAGE needs; `journeys_message_variables` for the paths a template binding can reference; `journeys_condition_catalog` for DECISION predicate terms; `journeys_event_catalog` for valid event names.
2. **Open a draft.** `journeys_create_draft` for a blank one, or `journeys_create_draft_from_published` to iterate on the live version. Only a DRAFT is editable; a PUBLISHED version is frozen.
3. **Build the nodes.** `journeys_add_node` per node, `journeys_connect_nodes` per edge (name the `sourceHandle` — the signal the edge routes on). Positions are optional; the server auto-lays-out the graph.
4. **Set the trigger** with `journeys_set_trigger`. All three types work from here. A `segment` trigger takes `segmentId` = the segment's **`id`**, the value `segments_create` and `segments_list` return next to the slug; passing the slug fails with `unknown_segment`. Then **verify it resolved: call `journeys_message_variables` and confirm a `SEGMENT_OUTPUT` group comes back.** That group is what carries the segment's projected columns into every message, and when the trigger does not resolve it is simply absent, with no error. Run this check on every segment-triggered journey before you publish.
5. **Bind template variables** on every SEND_MESSAGE (see below), the most common thing to forget.
6. **Validate** with `journeys_validate` and fix every `error` (warnings are advisory).
7. **Publish** with `journeys_publish` once validation is clean. **Publishing starts real outreach, get explicit confirmation from the user first.** Publishing a new version supersedes the previous one; versions are immutable. This works on any journey, whatever its steps send, so you can take a whole flow live from here. One shortcut: if the initiative is set to the WhatsApp channel, `initiatives_launch` (see `launch-initiative`) publishes the current draft for you, so you can skip this call in that case.

You can also assemble the whole definition and send it in one `journeys_update_draft` call instead of node-by-node — useful when you already have the full graph designed.

## Bind your variables (the most common miss)

A SEND_MESSAGE references an approved template that has placeholders (`{{1}}`, `{{2}}`, a name, a link). The node will not fill them in unless you set **`templateBindings`** — a map from each template placeholder to the value it should carry (a participant attribute, or a value produced earlier in the flow). **Adding the SEND_MESSAGE node is not enough: set `templateBindings` for every placeholder in the template**, or the message sends with empty or literal `{{1}}` values. Confirm the template's placeholders with `journeys_message_templates`, then bind each one.

**Use the right path.** A binding value is a dot-path, and it must be one the send-time resolver can reach. Call **`journeys_message_variables`** for the exact set this journey offers, then copy a returned `path` verbatim. The paths fall into three families:

| Family | What it is | Example |
|---|---|---|
| `customer.<field>` | Built-in contact fields | `customer.name`, `customer.phoneNumber` |
| `person.<key>` | **Custom person attributes** (from people upsert / your CDP) | `person.bank`, `person.plan` |
| `engagement.workflowState.<key>` | What the trigger delivered: the event's properties, or the segment's projected columns, frozen at enrollment | `engagement.workflowState.plan` |
| `engagement.context.<key>` | Per-participant data you supplied at enrollment, against the initiative's context schema | `engagement.context.cohort` |
| `engagement.extracted.<key>` | An answer the conversation extracted, available to steps after it | `engagement.extracted.churn_reason` |
| `engagement.nodeOutputs.<nodeId>.<key>` | An earlier `HTTP_REQUEST`'s response | `…<nodeId>.body.result` |

So a binding is **not** always `person.*`. Built-in fields are `customer.*`, and extracted, event and segment data lives under `engagement.*`.

### Three ways a binding fails without failing

`journeys_validate` checks that a path is *reachable*, not that it will *carry data*. All three of these validate clean.

**The path is not offered for this trigger.** The set of variables is not the same for a manual, segment, and event trigger, and the catalog is the only reliable answer. Run `journeys_message_variables` **on that journey** and confirm the exact path appears. Two cases worth knowing: a segment trigger only offers `SEGMENT_OUTPUT` when the trigger actually resolved (see step 4), and the initiative-context group is offered on segment triggers too even though it resolves blank there, which its own description says.

**The path is offered but the data is empty.** `customer.name` is offered for every trigger, and that is a statement about the path, not the column. It reads the contact's `name`, which is populated by list enrollment, so a contact Boom knows only from WhatsApp can have it blank while the display name is set. Same story for any person attribute: coverage is usually split by how the person arrived. **Measure it before you bind**, with `segments_preview` and `<attribute> is_null` over the real audience (see `cdp-and-segments`). A blank slot in a greeting is a brand's first impression.

**The segment does not project it.** `engagement.workflowState.<type>.0.<attribute>` resolves only if the segment's `outputColumns` project that type and attribute, and `.0` is decided by the projection's `orderBy`. Without `orderBy` it is the first object by internal id, which is arbitrary, so someone with two open orders gets told about the wrong one. The variable's own description in the catalog tells you which case you are in: it names the ordering attribute when there is one, and says it resolves the first object by internal id when there is not. Read that description, it is the cheapest check available.

### Check the shape of the value, not just that it exists

A binding can resolve perfectly and still produce a broken message, because the slot has a shape. The one that bites is a URL button: the template declares a static domain with the variable as the trailing path (`https://shop.com/{{1}}`). Boom strips the declared prefix off the bound value when the value starts with it, so binding a full URL works. It is a literal string match though, so a value on `www.shop.com` or on `http://` when the template says `https://` is not recognized, and the domain doubles into a dead link. Nothing warns you at authoring or publish time, and the message still gets replies, so it does not show up in conversation metrics either.

When the value is a URL you do not control the exact form of, put it in the **body** instead of the button. The body applies no transformation, WhatsApp makes it clickable anyway, and a full URL is safe there. Just do not leave it as the last thing in the body (see `whatsapp-templates`). To check a binding's shape before sending, read one real value: `cdp_events_list` or `cdp_custom_objects_list` on a row that would enroll.

> ⚠️ A custom person attribute is `person.<key>` (e.g. `person.bank`) — **not** `attributes.bank` and **not** `customer.attributes.bank`. `attributes.<key>` is the DECISION/CASE **condition** syntax (from `journeys_condition_catalog`); it does not resolve in a message binding and the message will arrive blank. `journeys_validate` now rejects such a binding before publish.

## Publish-time validation

`journeys_validate` checks dozens of rules; the ones that trip people up most:

- Exactly **one ENTRY**, at least **one EXIT**; unique node ids; every edge references existing nodes; every node named.
- One out-edge per `(node, signal)` — a handle may wire to **at most one** node (no fan-out), and no signal may be left unwired. `WAIT_FOR_REPLY` needs both `REPLIED` and `TIMEOUT`; `MANAGE_CONVERSATION` needs `CLOSED`; `DECISION` needs both `YES` and `NO`; `CASE` needs every branch **plus** `case:default`; `HTTP_REQUEST` needs both `SUCCESS` and `FAILED`.
- `SEND_MESSAGE`: `templateId` and `channelId` both set — there is no silent fallback number.
- Timeouts and durations use the `30m` / `24h` / `3d` format; DELAY `until_date` must be in the future; DELAY timezones must be valid IANA zones.
- Foot-gun warnings: a `DISPATCH_EVENT` emitting the same event the ENTRY listens to (self-trigger loop), or an event that both enrolls and cancels the run.

- A `cdp_predicate` condition's value has to match the shape its operator wants, and this **is** checked, both when you write the node and again at publish. A relative date operator takes an object (`{"unit":"days","amount":7}`), `between` takes `{from, to}`, a list operator takes an array, and a scalar comparison takes the value's own JSON type (`true`, `7`), the same as a segment filter. Strings still work for booleans and numbers, left over from the old editor, so a journey you read back may show `"7"`. An operator that does not apply to the attribute's type is rejected too. What is **not** checked is that `attr` names an attribute that exists, so a typo there still passes.

Drafts can be incomplete; only **publish** requires a clean validation.

### What a clean validation does not tell you

Validation is about the graph, not about the world. **A journey can validate clean, publish, enroll people, and send nothing at all.** Two causes, both real:

- **The conditions compare against values the data never produces.** A guard testing an error code against a vocabulary the upstream system does not use sends everybody down the NO branch, straight to the exit, with no message and no error. Verify the vocabulary against the actual data before you write the comparison, never against another vendor's documentation. A `cdp_predicate` term can also be tested on its own by running the same condition as a filter in `segments_preview`, which persists nothing.
- **The templates are not approved.** Nothing in the publish path checks a WhatsApp template's approval status: a journey referencing a PENDING or REJECTED template publishes fine, and the send is what refuses. Check the status yourself.

So after publishing, watch the first real runs. A campaign that enrolls people and closes them out with zero messages sent is this failure, and the only thing that reports it is the participant data.

## Proven topologies (from production)

**1. Single outbound + conversation** (the simplest shape):
```
ENTRY ─SENT→ SEND_MESSAGE ─SENT→ WAIT_FOR_REPLY ─REPLIED→ MANAGE_CONVERSATION ─CLOSED→ EXIT(done)
                                        └─TIMEOUT→ EXIT(no_response)              └─STALE→ EXIT(stalled)
```

**2. Open the send window before the first message** (use this on almost every outbound flow):
```
ENTRY ─SENT→ DELAY(until_weekday: Mon–Fri, 10:00–11:00) ─SENT→ SEND_MESSAGE(round 1) ─SENT→ …
```
Enrollment and outreach become two separate decisions. You can load the whole audience whenever it suits you (the night before, in pieces, while templates are still in review) and everyone parks at the gate until the window opens, instead of getting messaged the moment they land. A run that reaches this node while the window is already open continues immediately, so it costs nothing when you enroll during business hours.

`DELAY` in `until_weekday` mode takes `weekdays` (ISO, 1=Mon), `windowStartMinutes`/`windowEndMinutes` (minutes past local midnight, so 600–660 is 10:00–11:00), and an optional IANA `timezone` that **defaults to the organization's timezone** — set it explicitly when the audience isn't in the org's home timezone. If a run becomes eligible after the window closed, it waits for the next allowed weekday rather than sending late.

Prefer a **generous window** over a tight one. A one-hour window means any queue drift pushes the send a full day; a 9:00–18:00 window sends the same morning and only slips to the next day if it genuinely has to.

**3. Multi-round follow-up** (re-contact non-responders). **How you space the rounds depends on whether the campaign runs once or forever, and getting this wrong silently double-messages people.**

The rule behind it: a `DELAY` is a **pure wait — it does not race an incoming reply**. Someone who answers while parked on a `DELAY` still gets answered by the AI (that pipeline is independent of the journey), but the graph never learns about it, so the next round fires anyway. Only `WAIT_FOR_REPLY` and `MANAGE_CONVERSATION` listen.

*One-time campaigns* (research, win-back, a single cohort) — put the **whole gap inside `WAIT_FOR_REPLY`** so every hour between rounds is connected to an agent block:
```
… SEND_MESSAGE(r1) ─SENT→ WAIT_FOR_REPLY(6h) ─TIMEOUT→ SEND_MESSAGE(r2) ─SENT→ WAIT_FOR_REPLY(20h) ─TIMEOUT→ SEND_MESSAGE(r3) → …
                                  └─REPLIED→ MANAGE_CONVERSATION ─CLOSED→ EXIT
```
Size each timeout to the real clock gap you want: a 10:00 opener, a 16:00 nudge and a next-day-noon last touch is `6h` then `20h`. No `DELAY` between rounds at all.

*Recurring campaigns* — you can't do that, because you need a `DELAY` to place the next send in an acceptable window (an audience that hits round 2 on a Friday evening should not be messaged on Saturday). So give `WAIT_FOR_REPLY` **enough time to actually catch a reply, six to eight hours minimum**, and only then hand off to the `DELAY` that carries the run into the next window:
```
… SEND_MESSAGE(r1) ─SENT→ WAIT_FOR_REPLY(8h) ─TIMEOUT→ DELAY(until_weekday, next window) ─SENT→ SEND_MESSAGE(r2) → …
                                  └─REPLIED→ MANAGE_CONVERSATION ─CLOSED→ EXIT
```
The residual risk is real but bounded: someone replying during that `DELAY` gets a follow-up they didn't need. Shrinking the `DELAY` doesn't fix it, lengthening the `WAIT_FOR_REPLY` does.

Each round needs its own approved follow-up template.

**4. Attribute-personalized opener** (branch before sending):
```
ENTRY ─SENT→ CASE(attributes.plan) ─case:pro→ SEND_MESSAGE(template_pro) ─┐
                       ├─case:basic→ SEND_MESSAGE(template_basic) ────────┼→ WAIT_FOR_REPLY → …
                       └─case:default→ SEND_MESSAGE(template_generic) ────┘
```
Use CASE for a **small** fork on a single attribute (plan, language, party size). For anything bigger, don't cram multiple goals into one journey — see "One objective per initiative".

**5. Always-on, segment-triggered**:
```
ENTRY(segment: "churned last month", maxEnrollments 1 per 90d) ─SENT→ …
```
People entering the segment enroll automatically; the frequency cap prevents re-contacting the same person too often. Pair with `isRecurring` + `reportCadence` on the initiative.

An `ENTRY` can also be `cdp_event`-triggered, which lets your own system decide the moment someone starts. **Know the tradeoff before you reach for it on a list you already have:** an event-triggered enrollment carries only the event's own `properties`, and it never fills in the per-participant context that enrolling from a list does, so any field you were counting on won't be there unless you put it in the event payload yourself. When the audience arrives as a spreadsheet, uploading it through the CSV flow (or `initiatives_participants_add`) is the better choice, because that path carries the columns through. Reach for the event trigger when the *timing* genuinely belongs to your system, not as a way to stage a list. Pattern 2 already gives you staging without giving up per-participant data.

**6. Call an external system, then hand off** (chaining):
```
… MANAGE_CONVERSATION ─CLOSED→ HTTP_REQUEST(POST the collected data to your API) ─SUCCESS→ DISPATCH_EVENT(done) ─SENT→ EXIT(nextInitiativeId: next)
                                                                                  └─FAILED→ EXIT(needs_review)
```
`HTTP_REQUEST` posts to your endpoint (authenticated with a stored credential) and its response is available to later nodes; `EXIT.nextInitiativeId` chains the person into a follow-on initiative. This is how you keep each initiative focused on one job and pass the baton between them.

## One objective per initiative

An initiative's conversation is run by the AI toward the **single objective** you set on the initiative. Journeys are great at *routing* (branch, wait, call an API, hand off), but a journey should not try to make one conversation accomplish two different goals — the agent handles a focused objective far better than a split one. When a flow really has two jobs (e.g. "collect the documents" and then, later, "resolve what was wrong with them"), model them as **two initiatives chained by an event or an `EXIT.nextInitiativeId`**, not one journey with a mode switch.

To keep a person out of two conflicting initiatives at once, two mechanisms help: a `DECISION` guard right before an action (re-check the person's current status; exit if they've moved on), and journey-level `cancelOnEvents` (cancel an in-flight run when a status event arrives). Pick whichever fits — the guard is explicit and easy to reason about.

## When a flow needs an arc, and when one message is the whole job

Two shapes, and they are designed differently.

**A transactional flow carries a fact the person is waiting for**: your order shipped, your payment failed, your appointment is tomorrow. One message is the whole job. The reply matters (the agent answers it), but the flow does not need to branch on it. Adding rounds here is noise.

**A relationship flow is trying to learn something**: how the product is working out, why they stopped, what they would want next. Here the test of whether you built anything is mechanical: **if what the person answers does not change what happens next, the flow is a notifier with a chatbot attached.** That is worth being blunt about with the user, because the fix is one node, not a rewrite.

The mechanism, end to end:

```
a guiding question, or a field in the extraction schema
        ↓
engagement.extracted.<field>
        ↓
DECISION on whether it is set
        ↓
two templates: one that uses what they said, one that asks again
```

That is what makes a later message read as though a person wrote it. It also needs somewhere to land, which is why a relationship flow wants two or three touches rather than one: **what a conversation extracts is scoped to that initiative** and cannot be read by another one, so a single-touch relationship flow throws away the only thing it collected. Flattening such a flow to one message does not cost a message, it costs the point.

## Design review checklist

Before publishing (or handing over a spec), verify:
1. Every `WAIT_FOR_REPLY` / `MANAGE_CONVERSATION` / `DECISION` / `CASE` / `HTTP_REQUEST` has **all** its signals wired (the TIMEOUT / FAILED paths are the ones people forget).
2. Every `SEND_MESSAGE` names an **APPROVED** template and a channel id, and **binds every template placeholder** (`templateBindings`). Check the approval status yourself before you save — a clean `journeys_validate` is not a promise that every template is ready to send.
3. Follow-up templates exist for every round (round 2..N need their own approved template).
4. DELAY windows respect the audience's waking hours, and the `timezone` is right — it falls back to the **organization's** timezone, which is not always the audience's. Set it explicitly when they differ.
5. Segment-triggered ENTRY has a frequency cap unless the user explicitly wants unlimited re-enrollment, **and `journeys_message_variables` returns a `SEGMENT_OUTPUT` group**.
6. EXIT `outcome` labels are meaningful (`recovered`, `no_response`) — they show up in analysis.
7. Every bound attribute has measured coverage over the real audience, and every bound value has a checked shape (a URL is the one that bites).
8. Every guard compares against a vocabulary you read out of the data, not one you assumed.

## Debugging a live journey

`journeys_get_definition` returns the full graph; `initiatives_get` shows the published version pointer. Typical diagnoses:
- **"Second message never sent"** → the `TIMEOUT` edge is missing on the wait node, or the follow-up template is not APPROVED.
- **"Message arrived with blank / `{{1}}` values"** → `templateBindings` is missing on the SEND_MESSAGE node, **or** a binding uses a path the resolver can't reach (e.g. `attributes.bank` / `customer.attributes.bank` instead of `person.bank`). Check each binding against `journeys_message_variables`; `journeys_validate` flags an unresolvable path.
- **"Some people got nothing"** → a CASE value with no matching branch falling to an unwired default, or Do Not Contact suppression (expected, server-side).
- **"Person enrolled twice"** → segment-triggered ENTRY without `maxEnrollments` / `enrollmentWindow`.
- **"People enter and leave without a single message"** → a guard comparing against a value the data never produces, sending everyone down the branch that exits. Read a real row and check the vocabulary. See "What a clean validation does not tell you".
- **"The message says nothing about their order"** → the segment trigger did not resolve, so there is no `SEGMENT_OUTPUT` to bind. Re-set the trigger with the segment's `id` and re-check the variable catalog.
- **"The link in the button is dead"** → the bound URL's domain does not match the template's declared prefix character for character, so it was not stripped and the domain doubled. Move the link to the body.

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model. Template authoring: [`whatsapp-templates`](../whatsapp-templates/SKILL.md). Segments: [`cdp-and-segments`](../cdp-and-segments/SKILL.md).
