# Use-case briefs

On top of the durable identity (`knowledge-base/`), each thing the agent *does* is a
**use case** with its own **brief**, saved to `knowledge-base/use-cases/<name>.md`.

**A brief captures the goal and the rules — not a step-by-step playbook.** Boom writes
the playbook from your brief. This matters: hand-written playbooks tend to leak internal
mechanics (tier codes, coupon codes, internal system/table names) and bake in
assumptions that don't fit the runtime. So capture the **envelope and the intent**, and
keep internal specifics out.

Ask **one question at a time**, same as the identity interview. Pre-fill from research
where you can. Below are the brief questions and file template for each of Boom's
common use cases. These are the common ones; other jobs are possible and follow the
same shape, brief questions plus a template.

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
- Which few facts should every conversation come back with as data you can count or export? (each one becomes a typed field: yes/no, a number, a choice from a list, or free text.)

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

## What to extract
- <field>: yes/no
- <field>: <choice, e.g. option a / option b / other>
- <field>: number
- summary: free text
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
- Which few facts should every conversation come back with as data you can count or export? (each one becomes a typed field: yes/no, a number, a choice from a list, or free text.)
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

## What to extract
- accepted_offer: yes/no
- reason_for_leaving: <choice, e.g. price / missing feature / bad experience / other>
- would_return_if: free text
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
- Which few facts should every conversation come back with as data you can count or export? (each one becomes a typed field: yes/no, a number, a choice from a list, or free text.)

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

## What to extract
- completed: yes/no
- <each field you set out to collect>: <its type>
- blocker: <choice or free text, why it wasn't completed>
```

---

## Support → `use-cases/support.md`

**When it applies:** they want the agent to answer inbound questions and resolve
issues customers already have, escalating what it shouldn't handle.

**Brief questions:**
- What is the agent trying to resolve on its own, and what stays with a person no matter what?
- Who does it talk to? (any customer who reaches out, or a specific tier/segment.)
- What can it actually do to close the loop, answer from a known set of answers, look something up, apply a simple fix?
- When must the agent **stop and hand off to a human**? (an upset customer, a safety or billing dispute, anything outside the list above, a fix it can't confirm worked.)
- **What should the agent never say?** (a guarantee it can't back, internal ticket or system names, blaming another team.)
- What should the conversation capture as structured data afterward (resolved or not, a category, a short summary)?

**Template:**
```markdown
# Use case: Support (<Brand>)

## Goal
Answer inbound questions and resolve what it can on its own.

## Who it talks to
<any customer who reaches out / a specific tier or segment>

## What it can resolve on its own
<the known answers, lookups, or simple fixes it's allowed to do>

## What stays with a person
<what it must not attempt itself>

## Escalate / hand off when
- <upset or frustrated customer>
- <safety, legal, or billing dispute>
- <anything outside the list above>
- <a fix it can't confirm worked>

## Never say
<guarantees it can't back, internal ticket/system names, blame on another team>

## What to extract
- issue_resolved: yes/no
- category: <choice, e.g. billing / product / account / other>
- escalated: yes/no
- summary: free text
```

---

## Onboarding / activation → `use-cases/onboarding.md`

**When it applies:** they want to get a new customer to their first real value and
unblock them if they stall.

**Brief questions:**
- What does "activated" mean here, the one thing that tells you they're set up?
- Who does it talk to, and when does it reach out? (right after signup, after a few days of no activity.)
- What are the steps it should walk them through, in your words?
- Where do people usually get stuck, and what can the agent do at each point?
- What can it do on its own (send a link, mark a step done, resend an invite) versus what needs a person?
- When must it **hand off to a human**?
- What should the conversation capture as structured data afterward (activated or not, where they got stuck)?

**Template:**
```markdown
# Use case: Onboarding / activation (<Brand>)

## Goal
Get a new customer to <the one thing that counts as activated>.

## Who it talks to & when it reaches out
<new signups / after N days of no activity>

## Steps it walks them through
- <step>
- <step…>

## Where people get stuck
- <stuck point> → <what the agent can do about it>

## What it can do on its own
<send a link, mark a step complete, resend an invite>

## Escalate / hand off when
<…>

## Never promise
<…>

## What to extract
- activated: yes/no
- stuck_at: <choice, the step name, or "none">
- needs_follow_up: yes/no
```

---

## Lead qualification → `use-cases/lead-qualification.md`

**When it applies:** they want to qualify an inbound lead, capture the facts that
decide fit, and book or hand off.

**Brief questions:**
- What makes someone a good fit? (company size, budget, timeline, use case, whatever actually decides it.)
- Who does it talk to, and how do they arrive? (a form, an inbound message, someone we reached out to first.)
- What exactly should it ask or confirm to qualify them?
- What counts as **qualified**, and what happens then? (book a call, hand to sales, add to a list.)
- What makes someone **not** a fit, and how should it close that out?
- When must it **hand off to a human** instead of deciding itself?
- **What should the agent never say?** (pricing it's not authorized to quote, promises about the product.)

**Template:**
```markdown
# Use case: Lead qualification (<Brand>)

## Goal
Qualify an inbound lead and book or hand off.

## Who it talks to & how they arrive
<a form / inbound message / outbound-initiated>

## Qualifying criteria
<what actually makes someone a good fit>

## What to ask or confirm
- <field / question>
- <field…>

## Qualified means
<the outcome> → then <book a call / hand to sales / add to a list>

## Not a fit when
<disqualification criteria> → <how to close it out>

## Escalate / hand off when
<…>

## Never say
<pricing it's not authorized to quote, product promises>

## What to extract
- qualified: yes/no
- <criterion 1>: <type>
- <criterion 2>: <type>
- next_step: <choice: book call / handed to sales / disqualified>
```

---

## NPS / post-purchase follow-up → `use-cases/nps-follow-up.md`

**When it applies:** they want to act on a score just given, or reach out after a
purchase, to understand the why and close the loop.

**Brief questions:**
- What triggers this conversation, a score just given, or a purchase just made?
- Does treatment differ by score or event? (a detractor vs. a promoter, a first purchase vs. a repeat one.)
- What is the agent actually trying to understand beyond the number?
- For a low score or a problem raised, what can the agent do about it, and when does it hand off?
- For a high score, is there anything worth asking for, kept light? (a review, a referral.)
- **What should the agent never say?** (a promise to fix something it can't verify, defensiveness about the score.)
- What should the conversation capture as structured data afterward (the score, the reason, whether follow-up is needed)?

**Template:**
```markdown
# Use case: NPS / post-purchase follow-up (<Brand>)

## Goal
Understand the why behind a score or a purchase, and close the loop.

## Trigger
<a score just given / a purchase just made>

## Treatment by segment
- <detractor / low score> → <what the agent does>
- <passive / neutral> → <what the agent does>
- <promoter / high score> → <what the agent does, if anything>

## What it's trying to understand
<the why behind the number>

## Escalate / hand off when
<a specific complaint, a request it can't resolve, a high-value account>

## Never say
<a promise to fix something it can't verify, defensiveness about the score>

## What to extract
- score: number
- reason: free text
- follow_up_needed: yes/no
```

---

## Adding a use case later

If the customer already has an identity bundle and wants to add a use case, you don't
re-gather the identity — just run that use case's brief questions above and drop a new
file in `use-cases/`, then update the README's "Use cases covered" list.
