# Use-case briefs

On top of the durable identity (`knowledge-base/`), each thing the agent *does* is a
**use case** with its own **brief**, saved to `knowledge-base/use-cases/<name>.md`.

**A brief captures the goal and the rules — not a step-by-step playbook.** Boom writes
the playbook from your brief. This matters: hand-written playbooks tend to leak internal
mechanics (tier codes, coupon codes, internal system/table names) and bake in
assumptions that don't fit the runtime. So capture the **envelope and the intent**, and
keep internal specifics out.

Ask **one question at a time**, same as the identity interview. Pre-fill from research
where you can. Below: for each of Boom's three use cases, the brief questions and the
file template.

---

## Research / discovery → `use-cases/research.md`

**When it applies:** they want to talk to customers to learn — experience, NPS, why
people stay or leave, reactions to a feature.

**Brief questions:**
- What is the one thing you most want to *learn* from these conversations?
- Who should the agent talk to? (segment / cohort — e.g. recent churned customers, new signups, a specific vertical.)
- What are the 3–6 things you'd love every conversation to cover? (the guiding questions, in your words.)
- How deep should it probe — a quick pulse, or follow-ups until it really understands?
- Should the agent say it's for research, and how should it describe itself if asked "are you a bot?"
- Anything it should flag for your team afterward (a competitor mentioned, a specific complaint)?
- Anything off-limits in these conversations?

**Template:**
```markdown
# Use case: Research / discovery — <Brand>

## Goal (what we want to learn)
<one or two sentences>

## Who the agent talks to
<segment / cohort>

## What to explore (guiding questions)
- <question in plain language>
- <question…>

## How deep
<quick pulse / standard / probe deeply with follow-ups>

## How to frame itself
<research framing; identity answer if asked "are you a bot?">

## Flag for the team when
<signals worth surfacing after the chat — or "none">

## Off-limits
<topics to avoid — or "none">
```

---

## Churn recovery / win-back → `use-cases/churn-recovery.md`

**When it applies:** they want to reach out to customers who left and invite them back.

**Brief questions:**
- Who do we reach out to? (which churned customers — recency, size, any exclusions.)
- **What's on the table?** Describe the *envelope*, not the exact math: "a discount up to X%", "a free month", "a plan downgrade." → Note that *you* own the exact amount per customer and will provide it; the agent just communicates it.
- Who decides the specific offer for each customer — is it precomputed on your side, or should the agent always hand off for the offer?
- When must the agent **stop and hand off to a human**? (high-value account, asks for more than the envelope, billing dispute, a complaint.)
- When the customer says yes, what happens next — who actually applies it, and what may the agent promise (and not promise)?
- **What should the agent never say?** (internal account tiers, coupon codes, margins, internal system names — confirm these stay out.)
- How hard should it push? (recommended: gentle, no pressure, a "no" respected.)

**Template:**
```markdown
# Use case: Churn recovery / win-back — <Brand>

## Goal
Reactivate customers who left.

## Who we reach out to
<cohort + exclusions>

## What's on the table (envelope — NOT exact codes)
<e.g. "a discount up to X% for N months on the plan">
> You own the exact amount per customer and provide it; the agent communicates it,
> never computes it. Coupon codes / internal matrices stay on your side.

## Who decides the offer
<precomputed & provided per customer  |  agent always hands off for the offer>

## Escalate / hand off when
- <high-value account>
- <asks for more than the envelope>
- <billing dispute / unresolved problem>

## On "yes"
Who applies it: <your team / a system>. Agent may promise: <…>. Agent must NOT
promise: <calls, exact timing, anything it can't do>.

## Never say
Internal tiers/levels, coupon codes, margins, internal system names, exact discount
matrices.

## Tone
Gentle, subtle, no pressure; a "no" is respected on the first pass.
```

---

## Data collection / conversion → `use-cases/data-collection.md`

**When it applies:** they want to qualify leads, book appointments, onboard, or collect
specific information.

**Brief questions:**
- What is the agent trying to get by the end — a booking, a qualified lead, a completed form, specific data points?
- Who does it talk to, and how do they arrive (they wrote in, we reached out, a form)?
- What exactly should it collect or confirm? (the fields / questions.)
- What makes someone **not** a fit — when should it politely disqualify or route elsewhere?
- What counts as **success**, and what happens then (hand off to sales, book a slot, confirm)?
- When must it hand off to a human?
- Any data it must NOT ask for or store?

**Template:**
```markdown
# Use case: Data collection / conversion — <Brand>

## Goal (what "done" looks like)
<a booking / a qualified lead / a completed form / specific data captured>

## Who it talks to & how they arrive
<inbound / outbound / from a form>

## What to collect or confirm
- <field / question>
- <field…>

## Not a fit when
<disqualification criteria → where to route them>

## Success = 
<the outcome> → then <hand-off to sales / book / confirm>

## Escalate / hand off when
<…>

## Never collect / store
<sensitive data to avoid — or "none">
```

---

## Adding a use case later

If the customer already has an identity bundle and wants to add a use case, you don't
re-gather the identity — just run that use case's brief questions above and drop a new
file in `use-cases/`, then update the README's "Use cases covered" list.
