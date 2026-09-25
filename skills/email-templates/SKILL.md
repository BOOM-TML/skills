---
name: email-templates
description: Use when the user wants to create, edit, publish, or send an email template on Boom, the designed email a journey's SEND_EMAIL step delivers. Covers block documents vs hand-written HTML, sanitizing, variables, publishing, editing a live template, and wiring it into a journey. Triggers on "email template", "send an email", "plantilla de correo", "mandar un email", "newsletter", "HTML email", "email builder".
---

# Email Templates

An email template is the designed email a journey sends from a **`SEND_EMAIL`** node. Email is **outbound only**: nobody replies into Boom through it, so it never opens an AI conversation. Unlike WhatsApp there is no Meta review, and a template is usable as soon as you publish it.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `email_templates_list` | Every template, drafts and published, with status, authoring mode and variables | read |
| `email_templates_get` | One template in full: its `document` or `html` source, the rendered HTML and plain text, variables, sender picks | read |
| `email_templates_create` | Create a template (always as DRAFT) | write |
| `email_templates_update` | Rename, change subject/senders, replace content, publish/unpublish | write |
| `journeys_email_templates` | What a SEND_EMAIL node can use: PUBLISHED templates only, the org's email readiness, and the senders | read |

`templates_create` / `templates_list` are the **WhatsApp** tools. They don't list email templates.

## Creating a template: the contract

`email_templates_create` needs `name` (internal) and `subject` (may hold `{{path}}` variables). It also takes **exactly one** of:

- **`document`**: blocks, like the drag-and-drop builder. `{ "body"?: {...styles}, "blocks": [...] }`. Block types are `heading`, `text`, `button`, `image`, `divider`, `spacer`, `html` (a sanitized snippet), `social`, `footer`, `columns` (1–4, leaf blocks only) and `container` (a framed card that can hold one level of columns).
- **`html`**: hand-written markup. The template becomes an HTML template.

The server renders the deliverable HTML and plain text; you never send them. HTML is **sanitized on save**: scripts, event handlers and external stylesheets are stripped, and the response's **`removed`** lists what was dropped. Read it back to the user, since a stripped piece may have been load-bearing.

**Unknown fields are rejected**, not ignored. A typo or an invented property fails the whole call, so copy field names from the tool schema.

Rules that trip people up:

- **The footer is top level only.** A `footer` block inside `columns` or a `container` is refused. Put the company name and postal address there. `unsubscribeLabel` sets the one-click unsubscribe link text: omit it for the language default, or pass `""` for no link (transactional email only).
- **Blocks → HTML is one way.** Sending `html` to a block template converts it to an HTML template, and an HTML template can't take a `document` again. Say so before converting.
- **Variables** are `{{path}}` tokens in the subject, text, button `href`, preheader or HTML, e.g. `{{customer.name}}`. `journeys_message_variables` lists the bindable paths, including the link that opens this run's web chat. A token that resolves to nothing renders empty.
- Set `body.language` (`es` default, `en`, `pt`): it picks the default unsubscribe wording.

Minimal blocks example:

```json
{
  "name": "Recordatorio de pago",
  "subject": "Hola {{customer.name}}, tu pago vence pronto",
  "document": {
    "blocks": [
      { "type": "heading", "text": "Tu pago vence pronto" },
      { "type": "text", "text": "Hola {{customer.name}},\n\nTe recordamos que..." },
      { "type": "button", "text": "Pagar", "href": "https://..." },
      { "type": "footer", "text": "Empresa S.A., Calle 1, Ciudad" }
    ]
  }
}
```

## Publishing and editing

- **New templates are DRAFT.** A SEND_EMAIL node can only use a PUBLISHED one, so publish with `email_templates_update` `{ templateId, status: "PUBLISHED" }` once the user has reviewed it. `email_templates_get` returns the rendered HTML and text to check first.
- **A PUBLISHED template is live.** Journeys that send it pick up any change from their next send. Every update to a published template needs **`confirm: true`**. Call without it first, show the user the refusal and what will change, and only then resend with `confirm: true`.
- Setting `status: "DRAFT"` withdraws a template, and **journeys that send it then fail to send**. Check which journeys use it before unpublishing.
- Omitted fields are unchanged, so send only what you're changing.

## Sending one: a journey with a SEND_EMAIL node

There is no "send this email now" tool. An email goes out when a journey reaches a `SEND_EMAIL` node (see `design-journey`):

1. `journeys_email_templates` gives you the PUBLISHED template ids, their `variables[].key`, the org's `readiness`, and the senders (`usableAsFrom`).
2. Add a `SEND_EMAIL` node with `templateId` (and `templateName`). `bindings` is optional: an unbound variable resolves its own authored `path`. `fromSenderIdOverride` / `replyToSenderIdOverride` override the template's senders for this node only.
3. It emits **`SENT`** only. Its successor may **not** be `WAIT_FOR_REPLY`, `MANAGE_CONVERSATION` or `CONVERSATION_BLOCK` (`SEND_EMAIL_INVALID_SUCCESSOR`): email has no reply. Follow it with a `DELAY`, an `EXIT`, or another send/logic node.
4. Publish is refused unless the template is PUBLISHED **and** a From address resolves, meaning `readiness.verified` and `readiness.hasSender` are true, or the node sets a `fromSenderIdOverride` that is `usableAsFrom`. A domain that isn't verified is set up in the Boom app, not over MCP.

Handles are easy to guess wrong. `DELAY`'s output is **`SENT`**, not `DONE`. Read `journeys_authoring_catalog` for every node's `outputHandles` rather than assuming.

**Enrolling people.** `initiatives_launch` publishes an email initiative's journey, same as on WhatsApp. Then enroll with `initiatives_participants_add`, sending `email` for each person in place of `phoneNumber` (see `manage-participants`). Do Not Contact is enforced on email addresses too. To start runs on customer behavior instead of a list, give the journey a `cdp_event` trigger and fire it with `cdp_events_record` (the single-event call; the batch one doesn't enroll). **Test on one address you own before enrolling a list.**

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Template missing from `journeys_email_templates` | It's still DRAFT | Publish it via `email_templates_update` |
| `SEND_EMAIL_INVALID_SUCCESSOR` on validate | A reply-driven node follows the email | Put a `DELAY` / `EXIT` / send node there |
| Publish refused for the From address | Domain not verified, or no default sender | Verify the domain in the Boom app, or set a `usableAsFrom` override |
| Update refused on a live template | Missing `confirm: true` | Confirm with the user, then resend with it |
| A section vanished after save | The sanitizer stripped it (see `removed`) | Rewrite it without scripts, handlers or external CSS |
| A variable renders blank | The path resolved to nothing for that person | Check the path against `journeys_message_variables` and the person's CDP data |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model and [`design-journey`](../design-journey/SKILL.md) for building the journey around the send.
