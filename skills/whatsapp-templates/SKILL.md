---
name: whatsapp-templates
description: Use when the user needs to create, fix, or choose a WhatsApp message template on Boom — the pre-approved opener that starts every conversation — or when a template was REJECTED by Meta, is stuck PENDING, needs variables/placeholders, buttons, or a follow-up-round version. Triggers on "template", "opening message", "mensaje de apertura", "plantilla", "Meta rejected", "quick reply buttons".
---

# WhatsApp Templates

Every WhatsApp conversation on Boom opens with a **template pre-approved by Meta**. A rejected or mediocre opener stalls the whole initiative, so this skill covers both getting **approved** and getting **replies**.

Review is usually fast. Text UTILITY templates come back APPROVED in minutes: across four production batches most were approved inside 15 minutes and nearly all inside an hour. Meta's stated window is 24 to 48 hours, so treat that as the outer limit rather than the expectation, and treat anything still PENDING after a day as worth a second look.

**A template you have submitted cannot be edited or deleted.** There is no update or delete tool, and none is coming: a submitted template is a record at Meta. Every change of copy is a new template under a new name, and the old ones stay in the account's list forever. So close the copy with the user **before** you call `templates_create`, not after, and when orphans do pile up, tell the user to archive them in the Boom app so nobody on their team picks the wrong one later.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `templates_list` / `templates_get` | Existing templates + approval status (`DRAFT`/`PENDING`/`APPROVED`/`REJECTED` + `rejectionReason`) | read |
| `templates_create` | Create and auto-submit a template for review | write |
| `whatsapp_numbers_list` | Sender numbers a template can attach to | read |
| `initiatives_templates_get` / `initiatives_templates_set` | Wire opener + follow-up templates to an initiative | read / write |

## Creating a template — the contract

`templates_create` needs: `name` (unique per number, snake_case), `language`, `category`, `contentType`, `content`, `variables`, optional `phoneNumbers[]` (E.164; **omitting uses only the org's first active number**). Approval is **async**: it returns PENDING; re-check with `templates_list` later — never poll in a loop.

**`language` takes the bare code for most languages** — `es`, `en`. A regional variant like `es_MX` or `en_US` is accepted but normalized down to its base, so the two are equivalent and `es` is the canonical form. The exceptions are **`pt` and `zh`, which require a region suffix** (`pt_BR`, `pt_PT`, `zh_CN`) because Meta rejects the bare code.

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

Boom checks a few things before submitting (placeholders numbered from `{{1}}` with no gaps, an example value for every one, a button URL that resolves), but the rules below are Meta's and Boom does not pre-screen them. They come back as `rejectionReason` on `templates_get` / `templates_list`.

| Rule | Real rejection it prevents |
|---|---|
| No variable at the **start or end** of the body | `Variables can't be at the start or end of the template` — open with a greeting, close the last sentence with a word, not a value. "Tu número de guía es {{2}}." ends in a period and passes; "Tu número de guía: {{2}}" does not |
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
| `REJECTED` | See rejection catalog — read `rejectionReason` | Fix the specific violation; resubmit under a **new name**. The rejected one cannot be deleted and stays in the list |
| Still `PENDING` after a day | Meta review queue (MARKETING is slower) | Text UTILITY usually clears in minutes, so a day is already long. Wait, or re-frame as UTILITY if honest |
| A journey publishes, then every send fails | **Publishing does not check template approval.** The graph goes live referencing a PENDING or REJECTED template, and the send is what refuses | Check the status yourself before publishing. `journeys_validate` does not look at it either |
| `templates_create` times out | The template may still have been created | Never blind-retry a write that timed out. `templates_list` first: a duplicate is immutable forever |
| Template sends from the wrong number | `phoneNumbers[]` omitted at creation | Recreate with explicit numbers from `whatsapp_numbers_list` |
| Journey publish blocked | Template not APPROVED yet, or not attached | Approve first; attach with `initiatives_templates_set` |
| Variables render literally (`{{1}}`) | Binding missing in the journey's SEND_MESSAGE node | Set `templateBindings` on the node (via `journeys_update_node` or the builder) — bind every placeholder; see `design-journey` |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model.
