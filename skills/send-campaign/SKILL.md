---
name: send-campaign
description: Use when the user wants to send one WhatsApp and/or email message to a group of people, once, now or at a set time (a launch, a promotion, a reminder, a win-back blast), optionally with a WhatsApp follow-up for whoever does not reply. Sets it up with the campaign tools, checks it, and schedules it. Not for ongoing automations or conversations with a goal (launch-initiative) or one message per event from your system (transactional-notifications).
---

# Send a Campaign

A **Campaign** sends one message per channel to a fixed audience, once, then closes itself. You give Boom the setup (who, what, when) and Boom builds and publishes the flow for you. Never build a one-time send as a journey by hand.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `initiatives_create` with `campaign` | Create the campaign with its whole setup in one call | write |
| `initiatives_campaign_configure` | Change any part of the setup; only the fields you pass change | write |
| `initiatives_campaign_get` | Read the setup and `missing`: what still blocks scheduling | read |
| `initiatives_launch` | Schedule it (it sends at `sendAt`, or now) | **admin** |
| `initiatives_participants_add` | Add people to a hand-picked audience, after scheduling | **admin** |
| `segments_list` / `segments_get` / `segments_members_list` | Pick the audience and sample real data | read |
| `journeys_message_channels` / `journeys_message_templates` | WhatsApp sending numbers and their APPROVED templates | read |
| `journeys_email_templates` | PUBLISHED email templates and usable senders | read |
| `initiatives_pause` / `initiatives_resume` / `initiatives_cancel` | Stop or restart enrollment | **admin** |

> Tool names may drift while Boom's MCP is in beta. On `tool_not_found`, list tools and match the `domain_action` pattern.

## Campaign, Initiative or Transactional?

| The user wants | Use |
|---|---|
| One message to a list, once (with at most one WhatsApp follow-up) | **Campaign**, this skill |
| A conversation with a goal, several rounds, branches, or people who keep joining over time | **Initiative**, see `launch-initiative` and `design-journey` |
| One message every time something happens in their system (payment link, order) | **Transactional**, see `transactional-notifications` |

A segment-triggered journey is the wrong tool for a one-time send: it keeps enrolling everyone who joins the segment later.

## Workflow

1. **Audience.** A segment (`segments_get`; report its size back), or people the user adds by hand. For a segment, ask whether it is read **at send time** (`readAtSend: true`, the default choice: someone who leaves the segment before the send drops out) or **now**, when it is scheduled (`readAtSend: false`). Uploading a CSV is done in the Boom app.
2. **Messages.** WhatsApp: an APPROVED template on the sending number (`journeys_message_channels`, then `journeys_message_templates` for that number), with a binding for every placeholder. Email: a PUBLISHED template (`journeys_email_templates`). Email goes out first, then WhatsApp. To write a new WhatsApp template, see `whatsapp-templates`; new ones need 24 to 48 hours of Meta review.
3. **Check the bindings against real data** before you set them (see "Personalize safely").
4. **Create** with `initiatives_create`: `name` plus a `campaign` object. It is created as a **DRAFT**: nothing is sent and nothing is scheduled until step 6.
5. **Check** with `initiatives_campaign_get`. `missing` must be empty; each item says how to fix it. Report `audienceCount` and `audienceMissing` (members with no email / no phone, who are skipped).
6. **Schedule** with `initiatives_launch`, only after the user confirms the audience, the copy and the time. It messages real customers. It refuses a `sendAt` that has passed.
7. **Hand-picked audience:** add people with `initiatives_participants_add` after scheduling (it needs an ACTIVE campaign). Before `sendAt` they wait for it; after it, they get the message at once. Add one test contact first when the send is immediate.

```json
{
  "name": "Night routine launch",
  "campaign": {
    "audience": { "kind": "segment", "segmentId": "SEGMENT_ID", "readAtSend": true },
    "sendAt": "2026-10-08T09:15:00-06:00",
    "whatsapp": {
      "templateId": "TEMPLATE_ID",
      "channelId": "CHANNEL_ID",
      "templateBindings": { "1": "person.firstName" }
    },
    "email": { "templateId": "EMAIL_TEMPLATE_ID" },
    "reviewBeforeSending": false
  }
}
```

## The fields

- **`audience`**: `{ "kind": "manual" }`, or `{ "kind": "segment", "segmentId", "readAtSend" }`. `segmentId` is the id, not the slug. Once the audience is in, it is locked: add people instead of swapping it.
- **`sendAt`**: an ISO instant with an explicit offset, in the future. `null` or absent sends when it is scheduled. It cannot move once people are waiting for it; to change it then, cancel and create a new campaign.
- **`whatsapp`**: `templateId`, `channelId`, `templateBindings` (every `{{n}}` bound), and the optional `followUp` below. Replies go to the organization's agent.
- **`email`**: `templateId`, `bindings` (unbound variables use the template's own value), `fromSenderIdOverride` (a sender with `usableAsFrom: true` in `journeys_email_templates`; null = the template's sender, else the org default) and `replyToSenderIdOverride`.
- **`reviewBeforeSending`**: every send waits in the campaign's **Drafts** tab until someone approves it. Offer it for a first send to a new audience. Approving sends exactly that content; rejecting sends nothing for that person.

On `initiatives_campaign_configure`, only what you pass changes, and `null` clears a field.

## WhatsApp follow-up

When the user wants to re-contact people who did not answer, add `followUp` inside `whatsapp` instead of building rounds by hand:

```json
{
  "whatsapp": {
    "templateId": "TEMPLATE_ID",
    "channelId": "CHANNEL_ID",
    "templateBindings": { "1": "person.firstName" },
    "followUp": {
      "templateId": "SECOND_APPROVED_TEMPLATE_ID",
      "templateBindings": { "1": "person.firstName" },
      "afterDays": 3,
      "businessHours": { "weekdays": [1, 2, 3, 4, 5], "start": "09:00", "end": "18:00" }
    }
  }
}
```

- `afterDays`: 1 to 30 days without a reply before it goes out. It sends from the same number. Bind every placeholder of its template.
- `businessHours` (optional): ISO weekdays, 1 = Monday to 7 = Sunday, and a `start` before `end` in `HH:mm`, in the organization's timezone. Outside those hours it waits for the next opening. Same-day windows only.
- Anyone who replies first, including while it waits for business hours, goes to the agent and **never gets the follow-up**.
- It **does not count against Smart Sending**: a campaign set up with these tools (or the app's campaign form) counts once per person, so the follow-up is never skipped by the frequency limit. Only the follow-up itself is free: a message you add to the campaign's journey with the journeys tools is limited, and so is every send in a one-time flow built by hand.
- With `reviewBeforeSending`, the follow-up waits in Drafts too.
- In a `whatsapp` patch, leaving `followUp` out keeps it, and `"followUp": null` removes it.
- It is **locked once people are in the campaign**: set it before scheduling. Changing or removing it then is refused; cancel and create a new campaign.
- WhatsApp only. Email has no follow-up, and a Transactional never has one.
- `missing` reports follow-up problems with `follow_up_*` codes.

## Personalize safely

A binding resolves per recipient at send time. **An empty value does not fail the send: it renders as a blank** ("Hola !"), and there is no fallback value. Before binding a name, sample 20 or more real members (`segments_members_list`) and look at what the field holds. `person.firstName` is usually the cleanest. A display-name field can fall back to an email or a phone number. If no field is populated and clean for most of the audience, write a greeting that needs no name and tell the user why.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `campaigns_unavailable` | Campaigns are being turned on per organization. Ask the user's Boom contact. Until then, build it with `launch-initiative` and `design-journey` as a manual-trigger journey with a one-send cap, enrolled once. |
| `campaign_not_ready` (422) | The change was refused. The message says why: a past `sendAt`, a template not approved, a sender that cannot send From, a locked audience or follow-up. |
| `not_a_campaign` (400) | The id is an ongoing initiative or a Transactional. Use their own tools. |
| `formBuilt: false` | A one-time initiative built by hand. It has no campaign setup; edit its journey (`design-journey`). |
| Fewer people reached than the segment size | Members with no phone or email (`audienceMissing`), Do Not Contact, or the organization's Smart Sending limits on the first message. To skip the limits, pass `smartSendingMode: "FORCE"` ("Always send") on `initiatives_create` or `initiatives_update`. |
| Nothing sent on a hand-picked campaign | Nobody was added. Add people with `initiatives_participants_add`. |

## Notes

- The campaign completes by itself once its whole audience is in, the send time has passed and every conversation has ended (after the follow-up, when there is one), and its report is generated then.
- `initiatives_pause` stops enrollment; `initiatives_resume` picks up where it left off. `initiatives_cancel` stops it for good, including anyone not yet enrolled.
- Each person gets a campaign at most once, even if added again.
- For a large blast, remind the user to check the WhatsApp number's Meta messaging tier.
