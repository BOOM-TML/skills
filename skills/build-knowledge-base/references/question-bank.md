# Question bank

Adaptive prompts for each of the seven sections. Ask **one at a time**. These are a
menu, not a script — skip anything already answered by research or an earlier answer,
and reorder to follow the conversation. Pre-fill from the customer's website whenever
you can and ask them to confirm rather than starting blank.

Prefer multiple-choice when it speeds things up. Always push for **concrete examples**
over adjectives.

Sections 1–7 are the **durable identity** (gathered once). The **use-case** questions
(what the agent actually does) live in `references/use-case-briefs.md` — ask them per
use case after the identity is captured.

---

## 0 — Use case discovery (ask early, right after framing)

- In one sentence, what do you want this agent to *do* for you?
- Map their answer to Boom's use cases (offer them, plain-language, multi-select):
  - **Research / discovery** — "talk to customers to understand their experience, NPS, why they leave."
  - **Churn recovery / win-back** — "reach out to customers who left and invite them back."
  - **Data collection / conversion** — "qualify leads, book appointments, onboard, or collect information."
- If they pick more than one: which do you want to launch **first**?
- (Reassure) "We can add more later — the brand identity we're about to capture is shared, so a second use case is just another short brief."
- For each selected use case, run its brief questions from `references/use-case-briefs.md`.

---

## 1 — Brand & identity → `01-brand-and-identity.md`

- In one sentence, what does your company do, and for whom?
- What's the full brand/company name, and any short name or how customers refer to you?
- Why does the company exist — the mission or the origin story? (Only if real/published.)
- What makes you different from the obvious alternatives — in your customers' eyes?
- What should the AI agent call itself, and does it represent *your brand* directly, or
  a specific program/sub-brand?
- When a customer asks "is this a bot / a person?", how do you want the agent to answer?
- Are there any brands, partners, or internal tools the agent should **never** name?

## 2 — Voice & tone → `02-voice-and-tone.md`

- Paste a real message (or two) your team has sent that sounds *exactly right*.
- Now paste something you'd never want the agent to say, or a style you dislike.
- Formal or casual? (e.g. Spanish "tú" vs "usted"; first-name vs title.)
- What language(s) and, if relevant, which regional variant? (e.g. Mexican Spanish, not
  Argentine; Brazilian Portuguese; US vs UK English.) Any words/phrases that would sound
  "off-region"?
- Emojis — yes/no, and any you love or ban?
- Give me 3 do-say lines and 3 don't-say lines. (If they struggle, offer candidates from
  their site and let them react.)
- How should the agent sound when the customer is **frustrated / angry**?
- How should it sound when the customer is **confused or hesitant**?
- Anything about formatting? (Short messages? No walls of text? No bullet lists in chat?)

## 3 — Glossary → `03-glossary.md`

- What are the words specific to your business a newcomer wouldn't know? (products,
  features, plans, internal names customers see.)
- For each: a one-line plain definition.
- Are there terms you **don't** want used — jargon, an old product name, a competitor's
  word, or an internal codename that leaked? (These become "aliases to avoid".)
- Do any of your terms get confused with each other? Which, and how do you keep them
  straight?

## 4 — Product & company → `04-product-and-company.md`

- What exactly do you sell or offer? Walk me through the products/services or plans.
- How does a customer actually *use* it, start to finish? (the buying/onboarding/using
  flow.)
- What operational things do customers contact you about — payments, billing/invoices,
  delivery/pickup, returns, account access, technical issues? Briefly, how does each work?
- Where do customers self-serve? (portal, app, help center URLs.)
- Any eligibility, coverage, or restriction rules? (regions you serve, who qualifies,
  product limits.)
- Company facts worth knowing: founding year, size, notable partners/customers, any
  published numbers. (Published/confirmed only.)

## 5 — Customers, ICP & personas → `05-customers-icp-personas.md`

- Who is your ideal customer? (industry, size, role, life stage — whatever fits.)
- What are the 2–4 main *types* of customers the agent will talk to? Give each a short
  name and a one-line description.
- For each type: what do they want, what worries them, and how tech-savvy are they?
- What words do *your customers* use for your product or their problem (which may differ
  from your internal terms)?
- Are there customer segments the agent should treat differently?

## 6 — Policies & guardrails → `06-policies-and-guardrails.md`

- What must the agent **never** say or do? (hard rules.)
- Any claims it must avoid — promises about price, results, approval, timing, medical/
  legal/financial advice?
- Sensitive topics that need care, and how to handle them?
- Has an agent, a rep, or a message ever gotten something wrong in a way you want to
  prevent? Tell me what happened — those become specific "never do this" rules.
- Anything regulatory or compliance-related the agent must respect?
- How should it handle an angry or abusive person?

## 7 — Scope & escalation → `07-scope-and-escalation.md`

- What are the specific jobs you want the agent to do?
- What should it explicitly **not** try to handle on its own?
- When must it hand off to a human — what situations, requests, or red flags?
- When it hands off, what happens? (same chat picked up by a teammate? a callback?
  a ticket?) What can it promise vs. not promise?
- **Data question (important):** will the agent look up and tell a customer their *own*
  account details — order status, balance, appointments, records? (yes/no.)
  - If yes: how should it verify it's really them before sharing? what can it reveal,
    and what must it never reveal?
  - If no: it's a research/collection/outreach agent that doesn't disclose records —
    note that so Boom configures it accordingly.
- Are there hours, time zones, or availability rules the agent should respect?
