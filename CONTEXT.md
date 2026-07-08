# Boom Domain Model (for agents)

Boom is a multi-tenant platform where AI agents run natural conversations with customers over WhatsApp and email, for three jobs: **churn recovery**, **product research** (deep interviews, not surveys), and **data collection / conversion**.

## Objects

- **Initiative** — a research/outreach campaign. Everything hangs off an initiative. Create → configure → add participants → launch. Key create/update fields: `name`, `goal`, `isRecurring`, `flagConditionPrompt` (natural-language condition that flags a conversation for review), `identityDeflection` (how the agent responds when asked if it is an AI).
- **Participant** — a person enrolled in an initiative. Participants live ONLY under initiatives (`/initiatives/{id}/participants`). There is no delete: stopping a participant (`POST .../participants/{id}/stop`) halts outreach but retains data.
- **Journey** — the workflow-step setup behind an initiative. Read-only via the API/MCP; you cannot enroll people into a journey directly.
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
