---
name: onboarding
description: Use when someone is brand-new to Boom and wants a guided, hands-on first run — build their first initiative and journey together (a "Hello World"), create a WhatsApp opener, add a test contact to the CDP, trigger the journey, and watch the agent converse. Triggers on "get started with Boom", "onboard me", "first journey", "hello world", "set up my first campaign", "how do I start", "walk me through Boom".
---

# Onboarding — your first journey on Boom

This skill runs a **guided, interactive first run**. You (the agent) walk a brand-new user through building one small, real journey end to end, explaining each concept the moment it becomes relevant, and pausing between steps so they follow along and feel the product working. The goal is a satisfying "Hello World": a message they receive on their own phone and a short conversation with the AI, plus a clear mental model of how Boom fits together.

**How to run it:** go one step at a time. Explain briefly, do the step, show what happened, then pause and confirm before moving on. Never dump the whole plan at once. Before anything that sends a real WhatsApp message or writes data, say what you're about to do and get a yes.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `initiatives_create` | Create the first initiative (the campaign + its objective) | write |
| `journeys_create_draft` / `journeys_add_node` / `journeys_connect_nodes` / `journeys_set_trigger` / `journeys_validate` / `journeys_publish` | Build and publish the Hello World journey | write |
| `journeys_authoring_catalog` / `journeys_message_channels` / `journeys_message_templates` | Look up node kinds, sender channels, and template ids while building | read |
| `whatsapp_numbers_list` / `templates_create` / `templates_list` | Find the sender number, create the opener, check its approval status | read / write |
| `cdp_people_upsert` | Add the user's test contact (name + phone) with a test external id | write |
| `cdp_events_record` | Fire the event that drops the test contact into the journey | write |
| `initiatives_participants_add` | Alternative: add the test contact to the initiative manually | admin |
| `segments_list` / `segments_catalog` | Show how audiences work (later step, read-only) | read |

Full mechanics live in the specific skills; link out rather than re-teaching: [`launch-research-initiative`](../launch-research-initiative/SKILL.md), [`design-journey`](../design-journey/SKILL.md), [`whatsapp-templates`](../whatsapp-templates/SKILL.md), [`cdp-and-segments`](../cdp-and-segments/SKILL.md).

## Step 0 — What Boom is (60 seconds)

Explain, in plain terms:

- Boom runs **natural conversations with your customers over WhatsApp** (and email). You decide who to reach and what the conversation should accomplish; Boom's AI runs the conversation and hands off to a human on the rare hard cases.
- People use it for many jobs: recovering customers who dropped off, collecting documents or information, following up after a purchase, understanding why someone churned, running customer research. Same building blocks, different objective.
- The two pieces you'll touch today:
  - **The journey** — a flow *you* design and control: send a message, wait, branch, call an external system, hand off. It's programmatic and deterministic.
  - **The conversation** — the moment a person replies, Boom's AI takes over and carries the conversation **toward the objective you set on the initiative**. This is the part people most often misunderstand, so be explicit: *you own the journey; the AI owns the live conversation, and it drives it toward your objective.*

Then: "Let's build your first journey together." Confirm they're ready.

## Step 1 — Create the initiative (and explain what it is)

An **initiative** is one campaign with one clear **objective**. Everything hangs off it. Explain the split again in context: what you want to happen *while a conversation is active* is defined here as the objective — that's what the AI will steer toward. The outbound flow (when to message, waits, branches) lives in the journey.

Stress the key rule: **one objective per initiative.** If you try to make a single initiative do two different jobs, the AI can't carry the conversation cleanly. Keep it focused; you chain initiatives later for multi-step flows.

Create a simple DRAFT initiative with `initiatives_create` — a `name` and a one-line `objective` are enough for Hello World (e.g. objective: greet the contact and have a short friendly conversation). Show them what you created.

## Step 2 — Build the Hello World journey

Now open a draft (`journeys_create_draft`) on that initiative and build the simplest meaningful flow. Peek at `journeys_authoring_catalog` first if you need the node shapes. The classic Hello World:

```
ENTRY(event) ─SENT→ DELAY(short) ─SENT→ SEND_MESSAGE(opener) ─SENT→ WAIT_FOR_REPLY ─REPLIED→ MANAGE_CONVERSATION ─CLOSED→ DISPATCH_EVENT(done) ─SENT→ EXIT
                                                                          └─TIMEOUT→ EXIT                                     
```

Explain each node as you add it: the wait, the message, the conversation the AI runs, and — the nice touch — a `DISPATCH_EVENT` at the end so they see that a journey can emit an event back out (useful later for chaining or notifying their own systems). Wire every signal (see [`design-journey`](../design-journey/SKILL.md) for the rules). Don't publish yet — you still need the template (Step 3). Once it's built, tell them they can open it in Boom's visual builder to *see* the graph — that "I can see my flow" moment lands well.

## Step 3 — Create the WhatsApp opener and connect it

WhatsApp conversations must open with a template pre-approved by Meta. Help them write a short, friendly opener and submit it with `templates_create` (see [`whatsapp-templates`](../whatsapp-templates/SKILL.md) for what passes review). Find the sender number with `whatsapp_numbers_list`. Then:

- Set the template and channel on the SEND_MESSAGE node.
- **Bind the variables.** If the opener has a placeholder (like a name), map it on the node — otherwise the message goes out with blanks. This is the single most common miss.

Approval is async (usually a day or two). Tell them we can only actually send once the template shows APPROVED (`templates_list`), and continue setting up meanwhile.

## Step 4 — Add a test contact to the CDP

Explain the CDP simply: **every contact you add to Boom stays there**, and each contact has an **external id** (your own id for that person). Boom uses it to *update-or-create* — send the same external id again and you update that contact instead of making a duplicate. Contacts get into Boom three ways: connect your database, push them via the API, or add them directly here through the assistant.

For Hello World, ask the user for **their own name and phone number** (they'll be the test recipient), and add them with `cdp_people_upsert` using an obvious test external id like `prueba-1`. Confirm before writing.

## Step 5 — Drop the contact into the journey

Two ways to enroll someone; walk through the **event** path since the journey's trigger is an event:

- The journey's ENTRY listens for an event (you set that in Step 2).
- You fire that event for the test contact with `cdp_events_record`, and they enter the journey.

(The manual alternative is `initiatives_participants_add` — mention it exists.) Once the template is APPROVED and you fire the event, the opener sends to their phone. Have them reply — now they're talking to the agent, and they can watch the conversation run toward the objective you set. That's the Hello World moment.

## Step 6 — Where to go next (two more concepts)

Close by pointing at the two things that make Boom scale, without building them today:

1. **Segments** — just like you fired one event by hand, if Boom has your customer data you can define an **audience** (a saved filter over the CDP) and feed those people into a journey automatically. Show `segments_catalog` / `segments_list` read-only so they see the idea. Details in [`cdp-and-segments`](../cdp-and-segments/SKILL.md).
2. **The shared inbox** — in the Boom app they can watch every conversation as it happens, jump in, and see where the AI handed off to a human.

Then give them a few concrete use cases other teams run, so they can imagine their own:
- **Abandoned cart / drop-off recovery** — reach people who started something and stopped, and help them finish.
- **Document / information collection** — ask a customer for what's missing, then `HTTP_REQUEST` the result to your own system.
- **Churn recovery** — ask people who left why, and try to win them back.
- **Research & NPS follow-up** — deeper, follow-up conversations instead of a flat survey.

End by asking which of these is closest to what *they* want to build — that's the bridge from Hello World to their real first initiative.

## Guardrails

- Go step by step; confirm before each write and before any real send.
- Only publish / send once the user says go — Hello World still sends a real WhatsApp message to a real phone.
- Keep it encouraging and concrete. The win is that they *see it work* and leave with the mental model: journey (you) + conversation-toward-an-objective (the AI) + CDP (your contacts).

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model and [`boom-overview`](../boom-overview/SKILL.md) for the full map of skills.
