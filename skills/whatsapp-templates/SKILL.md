---
name: whatsapp-templates
description: Use when the user needs to create, fix, or choose a WhatsApp message template on Boom — the pre-approved opener that starts every conversation — or when a template was REJECTED by Meta, is stuck PENDING, needs variables/placeholders, buttons, or a follow-up-round version. Triggers on "template", "opening message", "mensaje de apertura", "plantilla", "Meta rejected", "quick reply buttons".
---

# WhatsApp Templates

Every WhatsApp conversation on Boom opens with a **template pre-approved by Meta** (~24–48h review). A rejected or mediocre opener stalls the whole initiative, so this skill covers both getting **approved** and getting **replies**.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `templates_list` / `templates_get` | Existing templates + approval status (`DRAFT`/`PENDING`/`APPROVED`/`REJECTED` + `rejectionReason`) | read |
| `templates_create` | Create and auto-submit a template for review | write |
| `whatsapp_numbers_list` | Sender numbers a template can attach to | read |
| `initiatives_templates_get` / `initiatives_templates_set` | Wire opener + follow-up templates to an initiative | read / write |

## Creating a template — the contract

`templates_create` needs: `name` (unique per number, snake_case), `language` (WhatsApp code: `es_MX`, `en_US` — not bare `es`), `category`, `contentType`, `content`, `variables`, optional `phoneNumbers[]` (E.164; **omitting uses only the org's first active number**). Approval is **async**: it returns PENDING; re-check with `templates_list` later — never poll in a loop.

### Content shape per `contentType`

| Type | Shape |
|---|---|
| `TEXT` | `{ "body": "..." }` |
| `MEDIA` | `{ "body?": "...", "media": ["https://…"] }` |
| `QUICK_REPLY` | `{ "body": "...", "actions": [{ "title": "Sí, cuéntame", "id": "yes" }] }` |
| `CALL_TO_ACTION` | `{ "body": "...", "actions": [{ "type": "URL"\|"PHONE_NUMBER", "title": "...", "url"\|"phone": "..." }] }` |
| `CARD` | `{ "headerType", "headerText"\|"mediaUrl", "body", "footer?", "actions?" }` |

Placeholders are numbered `{{1}}`, `{{2}}`… and **every one needs an example value** in `variables`, e.g. `{"1": "Ana"}` — Meta reviews with the examples filled in.

## Meta's rejection catalog (all seen in production)

| Rule | Real rejection it prevents |
|---|---|
| No variable at the **start or end** of the body | `Variables can't be at the start or end of the template` — open with a greeting, close with a question |
| Footers: no newlines, no emojis | `The message footer can't have any newlines or emojis` |
| Button URLs must be full valid URIs | `buttons[0]['url'] is not a valid URI` — include `https://`, no bare domains |
| One template per (name, language) | `There is already Spanish content for this template` — new content = new name |
| Category must match content | Marketing-sounding UTILITY gets rejected or reclassified; see below |

## UTILITY vs MARKETING — choose deliberately

- **UTILITY**: relates to an existing relationship/transaction — research follow-up on *their* account, order, or experience qualifies when framed that way ("en seguimiento a la solicitud que iniciaste…"). Approves fast and reliably (the bulk of production approvals).
- **MARKETING**: promotional or acquisition tone. Higher scrutiny, slower approval, higher per-message price — production shows a large batch of MARKETING templates languishing in review while UTILITY sails through.
- Never miscategorize to save money: Meta reclassifies and can reject. If the message references the participant's own prior action/relationship, UTILITY is honest and optimal.

## Writing an opener that earns replies

The formula from high-response production templates:

1. **Greeting + name variable** — `Hola {{1}} 😊` (variable is inside the body, not at the start — the greeting is).
2. **Who you are** — first person, human name + brand: `Soy Nar de Grupalia`.
3. **Why you're contacting them** — reference *their* specific experience: the request they started, the plan they left, the purchase they made.
4. **One low-friction question** that invites a reply — end with it: `¿Te interesaría conocer más sobre esta oportunidad?`

Anti-patterns: pitching ("¡Aprovecha 20% de descuento!" → rejected as UTILITY *and* ignored as an opener), multiple questions, walls of text (>3 short paragraphs), links in the first message (save them for the conversation, where no approval is needed).

## Follow-up rounds

An initiative with `maxAttempts: N` needs an **INITIAL_OUTREACH** template plus a **FOLLOW_UP** template per extra round, attached via `initiatives_templates_set`. Follow-ups should acknowledge the silence, not repeat the opener: `Hola {{1}}, hace unos días te escribí sobre… ¿tendrías 2 minutos?` Keep follow-ups shorter than the opener.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `REJECTED` | See rejection catalog — read `rejectionReason` | Fix the specific violation; resubmit under a **new name** |
| Stuck `PENDING` >48h | Meta review queue (MARKETING is slower) | Wait, or re-frame as UTILITY if honest |
| Template sends from the wrong number | `phoneNumbers[]` omitted at creation | Recreate with explicit numbers from `whatsapp_numbers_list` |
| Journey publish blocked | Template not APPROVED yet, or not attached | Approve first; attach with `initiatives_templates_set` |
| Variables render literally (`{{1}}`) | Binding missing in the journey's SEND_MESSAGE node | Fix `templateBindings` in the builder — see `design-journey` |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model.
