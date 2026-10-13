---
name: lead-capture
description: Use when the user wants to create, edit, install, or launch a Lead Capture pop-up on their website through Boom (the on-site form that collects email and WhatsApp with consent, optionally with a game, a quiz and a promo code), read the leads it collected, or build the welcome journey on its lead_captured event. Triggers on "pop-up", "lead capture", "captura de leads", "modal", "spin to win", "ruleta", "quiz", "código de bienvenida", "lead_captured".
---

# Lead Capture

A Lead Capture pop-up is a form on the customer's own website. A visitor leaves an email and/or a WhatsApp number (with a consent box for WhatsApp), optionally answers a short quiz or plays a game, and wins a promo code. Each entry becomes a **lead** in Boom's CDP and a **`lead_captured`** event, and a journey on that event sends the welcome and lets the agent take the conversation from there.

Lead Capture is an add-on. Every tool answers `lead_capture_unavailable` until Boom switches it on for the organization.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `lead_capture_forms_list` | Every pop-up with status, game, allowed sites and install key | read |
| `lead_capture_forms_get` | One pop-up in full: its `config`, `installTag`, `buttonTag`, and `liveIssues` (what still stops it from going live) | read |
| `lead_capture_forms_create` | Create a pop-up, always PAUSED, optionally from a `template` | write |
| `lead_capture_forms_update` | Restyle with a template, patch the `config`, replace `allowedOrigins`, set `status` ACTIVE or PAUSED | write |
| `lead_capture_leads_list` | The leads one pop-up collected, newest first, with consent, prize and quiz answers | read |

Creating and changing pop-ups needs the **Owner** or **Admin** role. Reading leads also needs access to customer data (People), or it answers `forbidden`. Rotating the install key and archiving a pop-up stay in the Boom app.

## Read before you write

Always `lead_capture_forms_get` first, then send **only what changes** in `config`:

- **Objects merge key by key.** `{ "copy": { "headline": { "es": "¿Quieres un 10%?" } } }` changes only the Spanish headline.
- **Lists and plain values replace.** Sending `prizes` replaces the whole prize list; sending `quiz.questions` replaces every question. Send the full list you want to keep.
- **Unknown fields are refused**, with their path, instead of ignored. Copy field names from the `config` that `get` returned.
- Text fields are `{ "en": "…", "es": "…", "pt": "…" }`. `en` is required; a blank language falls back to `en`. To clear a stale translation, send `""` for it.
- `template` restyles first (look, image, words and game) and keeps the prizes, trigger, logo and phone country; `config` then applies on top. Templates: `bold_coupon`, `warm_newsletter` (email only), `midnight`, `editorial` (a yes/no screen first, code sent by message), and the games `wheel`, `cards`, `plinko`, `scratch` (need prizes).
- Visitors see a change within about five minutes.

## What's in the config

| Part | Keys |
|---|---|
| Look | `layout` (`centered`, `split`, `corner`, `fullscreen`), `phoneSize` (`fit`, `half`, `full`: how much of a phone it covers), `imageStyle` (`inset`, `banner`, `background`), `imageUrl` / `logoUrl` (https only), `theme`, `accentColor`, `style` (colors, `font`, `buttonShape`, `radius`, `labelStyle`, `uppercase`) |
| Words | `copy`: `headline`, `leadIn`, `offer`, `body`, `submitLabel`, `dismissLabel`, `teaserButton`, `consentText`, `successHeadline`, `successBody`, `applyLabel`, `messageSent`, `linkLabel`. Wrap words in `*asterisks*` to highlight them |
| Form | `fields.email` / `fields.phone` / `fields.name`: `required`, `optional` or `hidden`; `defaultCountry` (ISO code, e.g. `MX`) |
| Flow | `flow.teaser` (a yes/no screen first), `flow.reveal` (`show` or `message`), `flow.applyUrl`, `flow.consentStyle` (`checkbox` or `notice`), `flow.termsUrl` |
| When it opens | `trigger.kind` (`delay`, `scroll`, `exit_intent`, `click`), `delaySeconds`, `scrollPercent`, `showOnMobile`, `dismissCooldownDays` |
| Game | `game` (`none`, `pick_one`, `wheel`, `plinko`, `scratch`, `slots`, `gift`), `gameStyle`, `prizes` (up to 6) |
| Quiz | `quiz.enabled`, `quiz.questions` (up to 3) |

## Going live

`status: "ACTIVE"` is refused with `lead_capture_not_ready`, and the reasons, until `liveIssues` is empty. The rules:

- at least one allowed site;
- it asks for an email or a WhatsApp number;
- a game has at least one prize;
- if it asks for a WhatsApp number, it has a consent sentence, and uses the **checkbox** (`notice` is only allowed on email-only forms);
- a quiz that is on has at least one question, two to six answers each, and valid keys.

While ACTIVE, a change that would break one of these is refused too. Pause first, or fix it in the same call. Show the user `liveIssues` instead of guessing.

## Install

1. **Allowed sites.** `allowedOrigins` lists every site that hosts the pop-up, as bare origins. Matching is exact: `https://example.com` does not cover `https://www.example.com`. For a Shopify store, add both the public domain and the `*.myshopify.com` domain (the theme editor preview runs on the latter). Sending `allowedOrigins` replaces the whole list.
2. **The tag.** `installTag` from `get` goes at the end of the page body on every page that should show it. The install key is public; it identifies the pop-up and authorizes nothing.
3. **Opening from a button.** Any element with `data-boom-lead-capture-open="<installKey>"` opens it on click (`buttonTag` is a ready one), even for a visitor who closed it before. Set `trigger.kind: "click"` to open it only that way.
4. **Shopify.** If the store's Boom app exposes a Lead Capture option under **Online Store → Themes → Customize → App embeds**, turning it on and pasting the install key replaces the manual tag. Otherwise paste the tag in the theme's `theme.liquid`.

## Prizes and codes

- Each prize: `id` (stable), `label`, optional `shortLabel` for small spaces, `code`, and `weight` (relative odds, 1 to 100). Boom draws the prize on its side; the page never sees a code before the draw, and a returning visitor (same inbox or number) gets their first prize again.
- **The code must exist in the store.** Boom hands it out; it does not create discounts. Confirm with the user that the code is real before going live.
- `flow.applyUrl` adds a button that opens the store with the code applied; write `{code}` where it goes, e.g. `https://your-store.com/discount/{code}`.

## Show the code, or send it by message

- `flow.reveal: "show"`: the last screen shows the code with a copy button.
- `flow.reveal: "message"`: the last screen says the code is on its way (`copy.messageSent`) and the code never reaches the browser. **A journey on `lead_captured` must send it**, or nobody gets it. Build that journey before going live.

## Consent

When a WhatsApp number is asked, `copy.consentText` shows beside an unticked box, and the visitor must tick it. Boom stores whether they ticked it, the exact sentence and language they saw, and when. Name the brand in the sentence. A visitor who leaves the box unticked (email-only form) is saved as a lead but never enters a journey.

Set `flow.termsUrl` (https) to link the store's terms: the `*highlighted*` phrase in `consentText` becomes a link to it, opened in a new tab, and the lead records `consent_terms_url`. Without it, the phrase is only highlighted. A pop-up with a terms link but no `*marked*` phrase in the English sentence cannot go live.

## Quiz

Up to three one-tap questions, after the yes/no screen (if any) and before the form. Each question: `id`, `key`, `prompt`, and two to six `options`, each `{ id, label, link?, linkLabel? }`.

- **`key`** is where the answer is saved: snake_case, unique, and not a name every lead already carries (`email`, `phone`, `promo_code`, `source`, …). It becomes a person attribute and a `lead_captured` property.
- **The saved value is the answer's English (`en`) label**, whatever language the visitor saw, so one condition matches everyone. Set `en` to the value you want to branch on, e.g. `"Sueño"`. A person's first answer is kept on their record; the event always carries this visit's answer.
- **`link`** sends the visitor somewhere fitting, such as the matching collection. The last screen shows it as a button (`linkLabel`, else `copy.linkLabel`), and it reaches journeys as `link_url`. `{code}` in a link applies the code; with `reveal: "message"` such a link stays off the screen and only reaches the journey.
- The answer key shows up in the journey builder's conditions once the pop-up has been set ACTIVE.
- Renaming a live key, or relabeling an answer, starts a new value from the next lead: a condition on the old one stops matching new leads.

## The `lead_captured` event

Every entry records it, a repeat one included. Its properties reach the journey as event data: take the exact binding path for each from `journeys_message_variables` on the journey.

| Property | |
|---|---|
| `email`, `phone`, `displayName` | What the visitor entered (only what they gave) |
| `promo_code`, `prize_label`, `prize_id` | The prize they won |
| `form_id`, `form_name` | Which pop-up |
| `consent`, `consent_method`, `consent_text`, `consent_terms_url` | The opt-in record |
| `locale`, `page_url`, `repeat` | Context; `repeat` is `true` for a returning visitor |
| `link_url` | The tapped quiz answer's link, code filled in |
| one per quiz key | e.g. `interes: "Sueño"` |

Leads are kept apart from existing customers: each is a person with an id starting `lead_` and `source: lead_capture`, and a submission never changes a customer's details, opt-ins or journeys. Target leads in a segment with `source` is `lead_capture`.

## The welcome journey

Build it with `design-journey`. What's specific to Lead Capture:

- **Trigger:** `ENTRY` with `triggerType: "cdp_event"` and `eventName: "lead_captured"`. Add a frequency cap (`maxEnrollments: 1`, `enrollmentWindow: "30d"`) or branch on `repeat`, so a returning visitor isn't welcomed twice.
- **One journey hears every pop-up.** Branch on `form_name` or `form_id` if the org has more than one.
- **Branch on the quiz:** a `CASE` on `attributes.<key>` with one branch per answer `en` label, plus a wired `case:default`.
- **Check the phone before WhatsApp.** Some leads arrive with email only, and a WhatsApp step with no number ends the run. A `DECISION` on the event's `phone` with `isSet` routes WhatsApp or email (the path is in `journeys_message_variables`).
- **The first WhatsApp needs an approved template** with variables for what you send (code, collection link). See `whatsapp-templates`; bind `{{1}}` etc. to the event's `promo_code` and `link_url` paths from `journeys_message_variables`.
- **Email needs a verified domain** (`journeys_email_templates` → `readiness`). See `email-templates`.
- **Tell the agent the code is allowed.** If the org's other initiatives forbid discounts, this initiative's `objective` must name the code it may mention.
- **Publishing starts enrolling** new leads at once. Test with one entry from a number you own first.

## Reading leads

`lead_capture_leads_list` with `formId` returns 50 per page: contact details, `consentGiven`, `prizeLabel`, `prizeCode`, `personId`, `locale` and `answers` (`{ key: answer }`). Pass `next_cursor` back for more.

## Worked example: a quiz that sends the code by WhatsApp

A wellness store ("Raíz") wants: "¿Quieres un 10%?" → "¿Qué te interesa trabajar?" → email + WhatsApp + consent → code by WhatsApp with the matching collection.

1. `lead_capture_forms_create` `{ "name": "Bienvenida quiz", "allowedOrigins": ["https://raiz.mx", "https://raiz-store.myshopify.com"] }`.
2. `lead_capture_forms_update` with:

```json
{
  "config": {
    "flow": { "teaser": true, "reveal": "message", "termsUrl": "https://raiz.mx/pages/terminos" },
    "copy": {
      "headline": { "en": "Want 10% off your first order?", "es": "¿Quieres un *10%* en tu primera compra?" },
      "teaserButton": { "en": "Yes, I want it", "es": "Sí, lo quiero" },
      "submitLabel": { "en": "Get my 10%", "es": "Recibir mi 10%" },
      "consentText": { "en": "I accept the *terms and conditions* and agree to receive messages from Raíz by WhatsApp and email.", "es": "Acepto los *términos y condiciones* y recibir mensajes de Raíz por WhatsApp y correo." },
      "messageSent": { "en": "Your code is on its way to your WhatsApp.", "es": "Tu código va en camino a tu WhatsApp." }
    },
    "prizes": [{ "id": "p10", "label": { "en": "10% off", "es": "10% de descuento" }, "code": "BIENVENIDA10", "weight": 1 }],
    "quiz": {
      "enabled": true,
      "questions": [{
        "id": "q1", "key": "interes",
        "prompt": { "en": "What would you like to work on?", "es": "¿Qué te interesa trabajar?" },
        "options": [
          { "id": "estres", "label": { "en": "Estrés" }, "link": "https://raiz.mx/collections/estres" },
          { "id": "sueno", "label": { "en": "Sueño" }, "link": "https://raiz.mx/collections/sueno" },
          { "id": "energia", "label": { "en": "Energía" }, "link": "https://raiz.mx/collections/energia" },
          { "id": "animo", "label": { "en": "Estado de ánimo" }, "link": "https://raiz.mx/collections/animo" }
        ]
      }]
    }
  }
}
```

3. `lead_capture_forms_get`: check `liveIssues` is empty and the copy reads right.
4. Build and validate the journey: `lead_captured` → `CASE attributes.interes` → a WhatsApp template per branch bound to `promo_code` and `link_url` → `WAIT_FOR_REPLY` → `MANAGE_CONVERSATION`. Keep it unpublished until the template is approved and the code exists in the store.
5. With the user's go: publish the journey, then `lead_capture_forms_update` `{ "status": "ACTIVE" }`, then install the tag (or turn on the Shopify embed).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `lead_capture_unavailable` | The add-on isn't on for the org | Ask Boom to switch it on |
| `lead_capture_not_ready` | A live rule fails | Read the reasons (or `liveIssues`), fix them, retry |
| Update refused with "Unknown field" | A misspelled or invented key | Copy names from the `config` that `get` returned |
| A prize or question vanished | `prizes` / `quiz.questions` were sent partially | Lists replace whole: resend the full list |
| Pop-up doesn't open on the site | Origin not in `allowedOrigins` (e.g. missing `www`), pop-up PAUSED, or tag missing | Fix the origin list; the browser console says why |
| Lead got no code | `reveal: "message"` with no published journey, no WhatsApp number, or consent box unticked | Publish the welcome journey; check the phone branch |
| `CASE` always takes default | Branch values don't match the answers' `en` labels, or the pop-up was never set ACTIVE | Match the `en` labels exactly |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model, [`design-journey`](../design-journey/SKILL.md) for the journey, and [`whatsapp-templates`](../whatsapp-templates/SKILL.md) for the opener.
