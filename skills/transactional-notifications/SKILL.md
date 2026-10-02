---
name: transactional-notifications
description: Use when the user wants Boom to send a WhatsApp and/or email message every time something happens in their system (a payment link is created, an order is received, an appointment is booked), driven by an event their backend sends. Sets up a Transactional with one call, binds template variables to event fields, explains the Events API request, and launches it. Not for one-time sends to a list (send-campaign) or conversations with a goal (launch-initiative).
---

# Transactional notifications

A **Transactional** sends a notification every time an event arrives: one event, one message per channel (an email first, then a WhatsApp). There is no audience, no schedule and no conversation to design. Your system sends Boom the event; Boom sends the customer the template.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `initiatives_create` with `transactional` | Create it with its whole setup in one call | write |
| `initiatives_transactional_configure` | Change the setup, including `businessHours` and `stopEventNames`; only the fields you pass change | write |
| `initiatives_transactional_get` | Read the setup and `missing`: what still blocks launch | read |
| `initiatives_launch` | Go live: every matching event from now on sends | **admin** |
| `journeys_message_channels` / `journeys_message_templates` | WhatsApp sending numbers and their APPROVED templates | read |
| `journeys_email_templates` | PUBLISHED email templates | read |
| `journeys_message_variables` | The exact binding paths for this journey, including event fields | read |
| `cdp_people_upsert` / `cdp_events_record` | Save the person and send one event, to test it | write |

> Tool names may drift while Boom's MCP is in beta. On `tool_not_found`, list tools and match the `domain_action` pattern.

## When to use / when not to

- Use when the timing belongs to the user's system: payment links, order confirmations, appointment reminders, shipping updates.
- One message to a list, once → `send-campaign`. Waits, reminders, branches, sends held for approval, or a conversation with a goal → an Initiative (`launch-initiative`, `design-journey`).
- A Transactional never holds a send for review and has no follow-up: a notification must go out when its event fires.

## Workflow

1. **Messages.** WhatsApp: an APPROVED template on a sending number (`journeys_message_channels`, then `journeys_message_templates`). Email: a PUBLISHED template (`journeys_email_templates`).
2. **The event.** Agree its name with the user, for example `payment_link_created`. Letters, numbers and underscores only (`payment_link_created`, not `payment_link.created`).
3. **Create** with `initiatives_create`: `name` plus a `transactional` object with the event, the messages and their bindings. It is created as a DRAFT with Smart Sending set to "Always send" (`FORCE`, whatever you pass), because a notification must go out.
4. **Check** with `initiatives_transactional_get`: `missing` must be empty, and each item says how to fix it (`event_missing`, `no_message`, `whatsapp_template_missing`, `whatsapp_variables_unbound`, `email_domain_unverified`, `shape_changed`).
5. **Launch** with `initiatives_launch` after the user confirms. From then on every matching event sends a real message.
6. **Test** with one event for a test contact (below), then hand the user the request their system must send.

```json
{
  "name": "Payment link",
  "transactional": {
    "eventName": "payment_link_created",
    "parallelRunsBy": "paymentLinkId",
    "whatsapp": {
      "templateId": "TEMPLATE_ID",
      "channelId": "CHANNEL_ID",
      "templateBindings": { "1": "person.firstName", "2": "EVENT_FIELD_PATH" }
    },
    "email": { "templateId": "EMAIL_TEMPLATE_ID" }
  }
}
```

## Binding template variables

Each variable comes from a field of the event, a field of the customer's profile (`person.firstName`), or fixed text (`literal:Hola`). For an event field, read the exact path from `journeys_message_variables` for the Transactional's journey, or from the example in the `whatsapp_variables_unbound` hint; never guess it. **Every WhatsApp placeholder must be bound**: a missing one blocks launch rather than reaching the customer as a raw `{{1}}`. Email variables without a binding use the template's own value.

## One notification per event, or per value

- **Unset `parallelRunsBy`** (the default): one notification per event, one at a time per customer.
- **`parallelRunsBy: "orderId"`** (an event property, usually an id): one notification per value. Each value sends **once per customer, ever**, so a retry of the same order never sends twice, and an event without that property sends nothing. Use it when a customer can have several at once.

## Only during business hours

`businessHours` makes events that arrive outside a window wait for the next opening, in the organization's timezone; inside the window they send right away.

```json
{ "businessHours": { "weekdays": [1, 2, 3, 4, 5], "start": "09:00", "end": "18:00" } }
```

- ISO weekdays, 1 = Monday to 7 = Sunday; `start` before `end`, `HH:mm`, same day only.
- Pass it in the `transactional` object or on `initiatives_transactional_configure`. Omit it to keep what is set; `null` sends at any time again.
- Boom builds it as one wait step right after the trigger. It is never a send window on the message, and it works with `parallelRunsBy`. Do not add waits to a Transactional's journey with the journeys tools; any other wait is refused at publish.
- **Stop events**: with business hours a run can wait overnight, so an event that should cancel the notification can matter now. See "Stop events" below.

## Stop events

`stopEventNames` lists events that cancel a notification still waiting to send. Set them when business hours are on; without business hours a run ends in seconds, so a stop event almost never arrives in time.

```json
{ "stopEventNames": ["payment_link_accepted"] }
```

- Pass it on `initiatives_transactional_configure`. It **replaces the whole list**; `[]` clears it; omit it to keep what is set. At most 10 names, letters, numbers and underscores only.
- **With `parallelRunsBy`, a stop event cancels only the run whose key it carries**, so record it with the same property (`paymentLinkId`). Without that field it cancels nothing.
- `shopify_checkout_completed` **never stops anything**: Boom ingests it without passing it to journeys. Use an event your own system records instead.
- `initiatives_transactional_get` returns the current list.

## Sending the event

Save the person first, with the phone number and email Boom should use, then record the event:

```bash
curl -X POST "https://www.useboom.ai/api/v1/cdp/events" \
  -H "Authorization: Bearer $BOOM_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payment_link_created",
    "externalId": "evt_001",
    "personExternalId": "cus_42",
    "properties": { "paymentLinkId": "pl_9", "paymentUrl": "https://pay.example.com/pl_9" }
  }'
```

- `externalId` is the user's own id for this event and its idempotency key: recording the same one twice stores the event once, but with one notification per event a retry still sends again. Only `parallelRunsBy` guarantees a value never sends twice.
- `personExternalId` is the customer's id in the user's system. Phone and email come from the profile, not the event.
- `properties` carries the fields the messages bind, plus the `parallelRunsBy` field.
- **Saving a person replaces their whole profile**: a field left out is cleared, including `phoneNumber`. Send the complete profile every time.
- **Use the single-event endpoint.** Bulk ingest (`cdp_events_batch_record`) stores events but never sends a notification.

Full reference: https://docs.useboom.ai/events

## Troubleshooting

| Error or symptom | What it means |
|---|---|
| `422 transactional_not_ready` | It cannot be created as asked, for example a template is not approved, or Transactional is not enabled for the organization yet. |
| `422 journey_not_ready` | Launch was refused because the setup is incomplete, for example a variable nothing fills. The message says what to fix. |
| `422 transactional_event_only` | People cannot be added by hand. A Transactional starts only from its event. |
| `400 transactional_not_recurring` | A Transactional cannot also be recurring. |
| `400 not_transactional` | A Transactional tool was called on another kind of initiative. |
| Event recorded, nothing sent | It went through bulk ingest, the name does not match `eventName`, the Transactional is not launched, the event lacks the `parallelRunsBy` field, it arrived outside business hours and is waiting, or a stop event cancelled it. |
| A stop event did not cancel | Under `parallelRunsBy` it lacks the same property, or it is `shopify_checkout_completed`, which never reaches journeys. |
| WhatsApp stopped arriving for one customer | Their profile was saved without `phoneNumber`. Save the complete profile. |
