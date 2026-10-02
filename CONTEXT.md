# Boom Domain Model (for agents)

Boom is multi-tenant infrastructure for AI conversations with customers. One central agent per organization, briefed from that organization's knowledge base, runs the conversations; the customer configures what each one is for. The same objects serve win-backs and reactivation, support, product research, onboarding and activation, lead qualification, document and data collection, NPS follow-up, and drip sequences. No job is privileged in the model, so never describe Boom as a research product.

**Channels.** WhatsApp is the conversational channel: the agent sends and replies, and handles images, voice notes and location. Email is **outbound only** right now, a send step inside a flow, so never present it as two-way or promise a reply loop through it.

## Objects

- **Initiative** — one outreach mission: an audience, an objective, and the flow that carries it out. Everything hangs off an initiative. Create → configure → add participants → launch. Key create/update fields: `name` (the only required one), `objective` (what the agent is trying to accomplish, injected into its prompt), `context` (Markdown briefing), `guidingQuestions[]`, `language` (`es` default), `maxAttempts` (1–5 outreach rounds), `isRecurring`, `flagCondition` (natural-language condition that flags a conversation for review), `identityDeflection` (how the agent responds when asked if it is an AI). Created as DRAFT; only DRAFT is editable via the API. Initiatives carry an internal `type` that the API neither accepts nor returns: ignore it, it is on its way out and it changes nothing about how an initiative behaves.
- **Campaign**: a one-time initiative (`isRecurring: false`) set up through `initiatives_create`'s `campaign` field and `initiatives_campaign_configure`/`_get`: an audience (a segment, read at send time or now, or people added by hand), an optional `sendAt`, an email and/or WhatsApp message with bindings, optional `reviewBeforeSending`, and an optional WhatsApp `followUp` for non-responders. Boom derives and publishes its journey; `initiatives_launch` schedules it, and it completes by itself. Each person gets it once, and it counts once against Smart Sending (a one-time journey built by hand does not: every send in it is limited).
- **Transactional**: an initiative that sends one notification per CDP event, set up through `initiatives_create`'s `transactional` field and `initiatives_transactional_configure`/`_get`: `eventName`, optional `parallelRunsBy` (one per value of an event property), optional `businessHours` and `stopEventNames`, and an email and/or WhatsApp message whose variables bind to event fields. Never recurring, never held for approval, Smart Sending always "Always send". People cannot be added by hand; the single-event endpoint enrolls them.
- **Participant** — a person enrolled in an initiative. Participants live ONLY under initiatives (`/initiatives/{id}/participants`). There is no delete: stopping a participant (`POST .../participants/{id}/stop`) halts outreach but retains data.
- **Journey** — the versioned workflow graph behind an initiative (send template → wait → AI conversation → follow-ups; nodes emit signals, edges route on them). Auto-scaffolded on initiative creation from `maxAttempts`. Authored and published via the API/MCP (create draft → add/connect nodes → validate → publish) or in Boom's visual builder — both operate on the same graph. Read the current graph with `journeys_get_definition`. You cannot enroll people into a journey directly; enrollment is via the initiative's participants and the journey's trigger.
- **Email template** — the designed email a journey's `SEND_EMAIL` step sends, authored as blocks or hand-written HTML with `email_templates_*`. No external approval: a template is created DRAFT and is sendable once PUBLISHED. It sends from the org's verified email domain, not a WhatsApp number.
- **Segment** — a saved audience filter over the CDP, used to target initiatives.
- **CDP (`/cdp/`)** — persons + custom object types with attributes and relationships.
- **Template** — a pre-approved WhatsApp message used to open conversations. Templates send from WhatsApp numbers you select via `phoneNumbers[]` (omit = the org's first active number). Discover numbers with `whatsapp_numbers_list`.
- **Extraction schema** — the typed fields an initiative pulls out of its conversations (yes/no, number, choice, free text). This is how a conversation becomes structured data you can export or segment on, and it works for any kind of conversation, not just research. Read and set it per initiative with `extraction_schema_get` / `extraction_schema_set`.

Two things a customer sees that live outside this API: the **shared inbox**, where a person takes over a conversation the agent escalated, and the **knowledge base** that briefs the agent. Point people at the Boom app for both instead of inventing tools for them.

## Vocabulary rules

- The word is **participant** — never "engagement".
- The only phone field is **`phoneNumber`** (E.164, e.g. `+5215512345678`).
- Collections return `{ "data": [...], "next_cursor": "..." }` — pass `next_cursor` back to paginate; `null` means done.
- Errors return `{ "error": { "code": "snake_case_code", "message": "..." } }`.

## Guardrails the platform enforces (you don't have to)

- **Do Not Contact** is enforced server-side. Adding a suppressed person to an initiative silently skips or rejects them — never try to work around it.
- Outreach writes (launching initiatives, adding participants) require the signed-in user to be an **admin of the Boom organization**. The check is the user's role on MCP, not a property of a key.
- WhatsApp templates must be pre-approved; you cannot send arbitrary first messages.
