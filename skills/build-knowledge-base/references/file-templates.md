# File templates

The shape of each file in the `knowledge-base/` bundle. Fill from the interview and
research. Keep everything in **plain customer language** — no Boom jargon. Where a fact
came from the website, add a source line. Where something is unknown, write
`> ⚠️ Gap: <what's missing>` instead of guessing.

Write real prose and concrete examples, not the bracketed hints below.

---

## `knowledge-base/README.md`

```markdown
# <Brand> — Knowledge base for Boom

Prepared <date>. Sources: <their website + any material they provided>.

This folder is the brand context for our Boom AI agent. Files:

1. Brand & identity
2. Voice & tone
3. Glossary
4. Product & company
5. Customers, ICP & personas
6. Policies & guardrails
7. Scope & escalation

## Still to provide (gaps)
- <list every ⚠️ Gap left in the files, or "none">
```

## `01-brand-and-identity.md`

```markdown
# Brand & identity — <Brand>

Source: <their site (date) / provided by X>

## What we do
<one clear sentence: what the company does and for whom>

## Name & how customers refer to us
<full name, short name, what customers call us>

## Mission / why we exist
<real mission or origin story — published/confirmed only, else omit>

## What makes us different
<the honest differentiators, in customers' eyes>

## How the agent should present itself
- Represents: <the brand directly / a specific program or sub-brand named ___>
- If asked "are you a bot/person?": <how to answer>
- Never name: <brands, partners, internal tools the agent must not mention>
```

## `02-voice-and-tone.md`

```markdown
# Voice & tone — <Brand>

## In a nutshell
<2–3 sentences describing how the brand sounds>

## Language & formality
- Language / variant: <e.g. Mexican Spanish, informal "tú">
- Off-region words to avoid: <words that sound wrong for the audience>
- Emojis: <allowed set / banned>
- Formatting: <short messages? no bullet lists in chat? etc.>

## Do say
- "<real example sentence>"
- "<real example sentence>"

## Don't say
- "<real example of the wrong tone>"
- "<phrase or style to avoid>"

## Tone by situation
- Customer is happy: <how to sound>
- Customer is frustrated/angry: <how to sound>
- Customer is confused/hesitant: <how to sound>
```

## `03-glossary.md`

```markdown
# Glossary — <Brand>

| Term | What it means (one line) | Don't call it |
|------|--------------------------|---------------|
| <Term> | <plain definition> | <aliases to avoid> |

## Terms that get confused
<pairs of terms customers/agents mix up, and how to tell them apart — omit if none>
```

## `04-product-and-company.md`

```markdown
# Product & company — <Brand>

Source: <their site (date) / provided>

## What we sell
<products / services / plans, with the essentials of each>

## How customers use it (start to finish)
<the buying / onboarding / using flow, step by step>

## Operations customers ask about
- Payments: <how it works>
- Billing / invoices: <how it works>
- Delivery / pickup: <how it works — omit rows that don't apply>
- Returns / refunds: <how it works>
- Account / self-service: <portal or app URL and what's there>
- Technical issues: <where they go>

## Eligibility / coverage / limits
<regions served, who qualifies, product restrictions — omit if none>

## Company facts
<founding year, size, notable partners/customers, published numbers — confirmed only>
```

## `05-customers-icp-personas.md`

```markdown
# Customers, ICP & personas — <Brand>

## Ideal customer
<who you're built for>

## Personas (the types the agent will talk to)
### <Persona name>
- Who they are: <one line>
- What they want: <…>
- What worries them: <…>
- Tech comfort: <low / medium / high>

(repeat per persona — 2–4 total)

## Words our customers use
<the customer's own vocabulary for the product/problem, where it differs from ours>

## Segments to treat differently
<any segment needing distinct handling — omit if none>
```

## `06-policies-and-guardrails.md`

```markdown
# Policies & guardrails — <Brand>

## Never say / never do
- <hard rule>
- <hard rule>

## Claims to avoid
<price/results/approval/timing promises; medical, legal, financial advice; etc.>

## Sensitive topics
<topic → how to handle>

## Things that have gone wrong before (prevent these)
- <what happened> → <the rule that prevents it>

## Compliance / regulatory
<anything the agent must respect — omit if none>

## Angry or abusive people
<how to handle>
```

## `07-scope-and-escalation.md`

```markdown
# Scope & escalation — <Brand>

## The agent handles
- <job>
- <job>

## The agent does NOT handle (hand off instead)
- <out-of-scope thing>

## Hand off to a human when
- <situation / request / red flag>

## What happens on hand-off
<same chat picked up by a teammate / callback / ticket>. The agent may promise:
<…>. It must NOT promise: <…>.

## Does the agent share a customer's own account data?
- <Yes / No>
- If yes — verify identity by: <method>. May reveal: <…>. Never reveal: <…>.
- If no — this agent does not disclose personal records (research / outreach / collection).

## Availability
<hours, time zones, or "no restriction">
```
