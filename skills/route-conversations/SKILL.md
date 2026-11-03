---
name: route-conversations
description: Use when a flow spans several initiatives and a live WhatsApp conversation must move from one to another so a different agent takes over — an inbound router on one number, support then a CSAT survey, onboarding then formalization. Covers the ROUTE_TO_INITIATIVE node. Triggers on "route to another initiative", "hand the conversation to", "one number, several agents", "router journey", "then send the survey", "chain initiatives".
---

# Route conversations between initiatives

Every initiative has one objective and one agent. When a conversation needs a different job partway through, don't stretch one journey to do both. End the run in one initiative and hand the live conversation to another with a **Route to initiative** step (`ROUTE_TO_INITIATIVE`). The person stays on the same WhatsApp number and the same thread; from that point the target initiative's agent answers.

Build the individual journeys with [`design-journey`](../design-journey/SKILL.md). This skill covers what is specific to the handoff.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `initiatives_list` / `initiatives_get` | Find the target initiative's id and check it is not archived or a Transactional | read |
| `journeys_authoring_catalog` | The node's inputs (`initiativeId`, `context`) and the graph rules | read |
| `journeys_condition_catalog` | Attribute paths for the router's `CASE` | read |
| `journeys_get_definition` | Check that the target's journey opens by sending | read |
| `journeys_create_draft` / `journeys_add_node` / `journeys_update_node` / `journeys_connect_nodes` / `journeys_update_draft` | Author the router and the targets | write |
| `journeys_validate` | Check the graph before publishing | read |
| `journeys_publish` | Publish. This is where the target is checked; **get the user's explicit go-ahead first** | write |
| `initiatives_participants_list` / `initiatives_participant_steps_list` | See whether a person was handed off, and why not | read |

## What the step does

When a participant reaches `ROUTE_TO_INITIATIVE`:

1. Their run in this initiative ends. The conversation so far, and the data extracted from it, stay with this initiative.
2. They are enrolled into the target initiative and its journey starts.
3. The live WhatsApp conversation moves onto the target, and the target's agent takes over.

It is an end point like `EXIT`: no outgoing edges, and it counts as the journey's end point at publish. Inputs:

- `initiativeId`: the target. It must be another initiative in the same organization, not archived, not this journey's own initiative, and not a Transactional.
- `context` (optional): a map of names to values handed to the target. A value is a literal string or `{ "var": "<path>" }`, resolved at the moment of routing (for example `{ "var": "engagement.extracted.<slug>" }` for data this initiative's agent extracted, or a person attribute).

## You need a signed-in user

The MCP accepts this node only when the call comes from a signed-in user: your MCP connection with the user's Boom login, or the in-app assistant once the user approves its change. Routing moves live conversations to another initiative's agent, so a person has to be behind it. A call made with an API key alone is refused with `signed_in_user_required` and nothing is saved. If you see that error, tell the user to add the step through their own MCP login or in the journey builder. Don't retry the call.

## Pattern: one number, a router in front

One WhatsApp number can be owned by only one inbound journey. When different kinds of people write to it and each needs a different agent, put a small router initiative in front:

```
Router initiative
  ENTRY (inbound trigger on the number)
    ─SENT→ CASE(attributes.onboarding_stage)
             ├─case:applying→ ROUTE_TO_INITIATIVE(Formalization)
             ├─case:active→   ROUTE_TO_INITIATIVE(Account management)
             └─case:default→  ROUTE_TO_INITIATIVE(Support)
```

- Pick the `CASE` path from `journeys_condition_catalog`. Wire every branch and the default.
- Send the default to general support, so a person the CASE can't place still reaches an agent.
- Build and publish the targets first, so the router has live initiatives to point at.

Other shapes use the same step: support ends with `MANAGE_CONVERSATION ─CLOSED→ ROUTE_TO_INITIATIVE(CSAT survey)`; onboarding hands off to a formalization initiative once its data is collected.

## Rule: the target must open by sending

The message that caused the routing belongs to the previous initiative. The target's `WAIT_FOR_REPLY` and `MANAGE_CONVERSATION` steps only see messages that arrive after the handoff. A target whose journey starts with a wait sits there until its timeout, and the person never gets an answer.

So every path from the target's `ENTRY` must reach a send before any wait. A `DECISION` first is fine (below), as long as both branches send. Check each target with `journeys_get_definition` before publishing the router.

## Pattern: skip the template notice when the person just wrote

A target is often also entered another way, for example by a CDP event, where it opens with an approved template because the 24-hour window may be closed. A person who arrives by routing wrote seconds ago, so the window is open and a short free-text message reads better than a formal notice. Tell the two apart with context:

1. On the route step: `context: { "entrada": "ruteo" }`.
2. In the target, right after `ENTRY`, a `DECISION` with a runtime-value condition: `engagement.workflowState.entrada` equals `ruteo`. Each context name arrives in the target as `engagement.workflowState.<name>`, readable by `DECISION` and `CASE`, and the target's agent sees it too.
3. `YES` (routed): a free-text `SEND_MESSAGE` (`mode: "free_text"`), then the conversation. Free text also emits `WINDOW_CLOSED`, which must be wired; point it at the `NO` branch's template send.
4. `NO` (entered by the event): the template notice and its reminder, as before.

```
ENTRY ─SENT→ DECISION(engagement.workflowState.entrada = ruteo)
  ├─YES→ SEND_MESSAGE(free text) ─SENT→ WAIT_FOR_REPLY ─REPLIED→ MANAGE_CONVERSATION ─CLOSED→ EXIT
  │              └─WINDOW_CLOSED→ (the NO branch's template send)        ▲
  └─NO──→ SEND_MESSAGE(template) ─SENT→ WAIT_FOR_REPLY ─REPLIED──────────┘
                                                └─TIMEOUT→ SEND_MESSAGE(reminder) → …
```

Branches can rejoin: a node may have several incoming edges. Only outgoing edges are limited, to one per signal.

## When the person already has a run of the target

If the participant already has an active run of the target initiative, no second run starts. The conversation moves onto the run they already have, nothing new is sent, and the `context` values are not added to it. Don't promise the user a fresh opener in that case.

## When routing is refused

A route that can't happen never fails the source run. The source run ends, the conversation stays where it was, and the step records why. It is refused when:

- A person on the team owns the conversation at that moment (assigned to a user), or a teammate replied in the last 7 days and no agent is assigned.
- The target is the same initiative, or it has no agent.
- The person has already been routed 5 times in a row (this stops two initiatives routing to each other forever).
- The target won't take the person: it has no live journey, or its frequency cap refuses them.

## Verify

1. `journeys_validate` on the router: no edges leave the route step, and every `CASE` branch is wired.
2. Check each target with `journeys_get_definition`: it opens by sending on every path.
3. Show the user the plan and get an explicit yes, then `journeys_publish` with `confirm: true`. Publish checks the target and refuses an id from another organization, an archived initiative, the journey's own initiative or a Transactional with `route_target_invalid`. The message names the step, so fix its `initiativeId` and publish again.
4. After real traffic, read `initiatives_participant_steps_list` for a participant in the router. The route step shows whether they were handed off and, if not, the reason. Then find them in the target with `initiatives_participants_list`.

See [`design-journey`](../design-journey/SKILL.md) for node kinds and publishing, and [`CONTEXT.md`](../../CONTEXT.md) for the domain model.
