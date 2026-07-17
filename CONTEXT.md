# Boom Domain Model (for agents)

Boom is a multi-tenant platform where AI agents run natural conversations with customers over WhatsApp and email, for three jobs: **churn recovery**, **product research** (deep interviews, not surveys), and **data collection / conversion**.

## Objects

- **Initiative** — a research/outreach campaign. Everything hangs off an initiative. Create → configure → add participants → launch. Key create/update fields: `name` (the only required one), `objective` (the research goal, injected into the agent prompt), `context` (Markdown briefing), `guidingQuestions[]`, `language` (`es` default), `maxAttempts` (1–5 outreach rounds), `isRecurring`, `flagCondition` (natural-language condition that flags a conversation for review), `identityDeflection` (how the agent responds when asked if it is an AI). Created as DRAFT; only DRAFT is editable via the API.
- **Participant** — a person enrolled in an initiative. Participants live ONLY under initiatives (`/initiatives/{id}/participants`). There is no delete: stopping a participant (`POST .../participants/{id}/stop`) halts outreach but retains data.
- **Journey** — the versioned workflow graph behind an initiative (send template → wait → AI conversation → follow-ups; nodes emit signals, edges route on them). Auto-scaffolded on initiative creation from `maxAttempts`. Authored and published via the API/MCP (create draft → add/connect nodes → validate → publish) or in Boom's visual builder — both operate on the same graph. Read the current graph with `journeys_get_definition`. You cannot enroll people into a journey directly; enrollment is via the initiative's participants and the journey's trigger.
- **Segment** — a saved audience filter over the CDP, used to target initiatives.
- **CDP (`/cdp/`)** — persons + custom object types with attributes and relationships.
- **Template** — a pre-approved WhatsApp message used to open conversations. Templates send from WhatsApp numbers you select via `phoneNumbers[]` (omit = the org's first active number). Discover numbers with `whatsapp_numbers_list`.

## Vocabulary rules

- The word is **participant** — never "engagement".
- The only phone field is **`phoneNumber`** (E.164, e.g. `+5215512345678`).
- Collections return `{ "data": [...], "next_cursor": "..." }` — pass `next_cursor` back to paginate; `null` means done.
- Errors return `{ "error": { "code": "snake_case_code", "message": "..." } }`.

## Guardrails the platform enforces (you don't have to)

- **Do Not Contact** is enforced server-side. Adding a suppressed person to an initiative silently skips or rejects them — never try to work around it.
- Outreach writes (launching initiatives, adding participants) require an **admin-scoped** key on MCP.
- WhatsApp templates must be pre-approved; you cannot send arbitrary first messages.
