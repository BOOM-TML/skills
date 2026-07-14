---
name: launch-research-initiative
description: Use when the user wants to launch, start, or set up a NEW customer research initiative on Boom — AI-led interviews over WhatsApp or email to answer a product question (churn reasons, feature feedback, discovery, activation, NPS follow-up). Covers writing the objective/context/guiding questions, choosing a template and WhatsApp number, adding the first participants, and launching. For an initiative that already exists, use manage-participants or analyze-results instead.
---

# Launch a Research Initiative

An initiative's quality is decided by three text fields — `objective`, `context`, and the guiding questions — because they are injected directly into the AI interviewer's prompt. This skill encodes how Boom's highest-performing production initiatives write them.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `initiatives_create` / `initiatives_update` | Create/edit the initiative (DRAFT only is editable) | write |
| `initiatives_get` | Verify configuration before launch | read |
| `whatsapp_numbers_list` | Discover the org's WhatsApp sender numbers | read |
| `templates_list` / `templates_create` | Pick or create the opening template — see `whatsapp-templates` | read / write |
| `initiatives_templates_get` / `initiatives_templates_set` | Attach opener + follow-up templates to the initiative | read / write |
| `initiatives_participants_add` | Enroll people | **admin** |
| `initiatives_launch` | Start outreach | **admin** |

> Tool names may drift while Boom's MCP is in beta. On `tool_not_found`, list tools and match the `domain_action` pattern.

## When to use / when not to

- Use for a *research or learning* goal: churn reasons, feature feedback, activation blockers, discovery.
- NOT for one-off broadcasts or support replies — initiatives run structured multi-turn interviews.
- Only reading existing results → `analyze-results`. Audience building → `cdp-and-segments`.

## Workflow

1. **Clarify the decision.** One sentence: what decision will this research inform? Push back on survey-shaped asks — Boom does deep interviews with AI follow-ups.
2. **Draft the three core fields** using the formulas below. Show them to the user before creating anything.
3. **Create** with `initiatives_create` — only `name` is required, but always send: `objective`, `context`, `guidingQuestions[]`, `language` (default `es`), `identityDeflection`, `flagCondition`, `maxAttempts`. It's created as **DRAFT**; a journey and outreach templates are auto-scaffolded from `maxAttempts`.
4. **Attach the opener**: `whatsapp_numbers_list` → pick/create the template (see `whatsapp-templates`) → `initiatives_templates_set`. New templates take ~24–48h for Meta approval — create them early.
5. **Enroll participants** (`initiatives_participants_add`, E.164 `phoneNumber`; per-participant `context` keys must match the initiative's `contextSchema`).
6. **Verify** with `initiatives_get`; read back name/objective/template/participant count. **Launching messages real customers — get explicit confirmation.**
7. **Launch** with `initiatives_launch` (admin key).

## Writing the `objective` (≤2000 chars; aim for 1–3 sentences)

This becomes the agent's *entire purpose*. State **what to understand, about whom, at which moment**:

> "Entender por qué los usuarios que mostraron interés en un financiamiento recibieron el mensaje con éxito pero no abrieron el link para completar su onboarding digital."

Not a topic ("churn feedback"), not a question list — one understanding-goal.

## Writing the `context` (≤5000 chars Markdown) — the formula

Production initiatives with the best interview quality all include these five blocks:

1. **Business flow** — how the product/process works, step by step, so the agent never guesses. Name internal projects, partners, plans.
2. **What the participant already experienced** — quote verbatim any prior messages they got, the screen they abandoned, the plan they canceled. The agent can then reference reality: "el mensaje donde te compartimos el link…"
3. **Who the participants are** — customers? churned? leads who never converted? their relationship to the brand ("no son clientes de Nexu, solo leads que iniciaron con otra financiera").
4. **Brand presentation rules** — what name to present as (sub-brands per partner: "preséntate como KIA Trust, nunca como Nexu"), tone constraints, language/formality.
5. **No-go topics** — words and topics to avoid ("no destaques la palabra 'rechazo'", "nada que deje mal a Inbursa"), plus what to do when asked something off-script.

Optionally: behavioral-science framing ("sé respetuoso y no invasivo al explorar el porqué de su inacción"). Files can be referenced with `[name](asset:<id>)` mentions if uploaded in the app.

## Guiding questions — use the whole schema

4–8 questions is the production sweet spot (≤50 allowed). Each supports:

| Field | Values | Use |
|---|---|---|
| `questionText` | ≤280 chars | The question, in the initiative's language |
| `answerType` | `OPEN` \| `MULTIPLE_CHOICE` \| `BOOLEAN` \| `SCALE` | `OPEN` for research; `SCALE` needs `scaleMin`/`scaleMax`; `MULTIPLE_CHOICE` takes `options[]` (≤20) |
| `priority` | 1–5 | Interview order/importance — the agent covers high-priority first |
| `followUpDepth` | `NONE` \| `LIGHT` \| `STANDARD` \| `DEEP` | How hard the AI digs. `DEEP` on the 1–2 questions the decision hinges on; `LIGHT` elsewhere keeps interviews short |
| `evaluationCriterion` | free text | What counts as a *complete* answer — drives the analyzer ("respuesta completa = causa concreta + si volvería a intentarlo") |

Pattern from winners: Q1 = the core "why" (DEEP), Q2 = reaction to the concrete artifact they saw (quote it in context), Q3 = what would have changed their behavior, Q4 = situational factors (timing, alternatives).

## The supporting fields

- **`identityDeflection`** — how the agent answers "are you a bot?". Honest + warm + human-oversight works best in production: *"Sí, soy un bot pero del bueno 😊 — todas las respuestas las lee una persona del equipo, y tu opinión de verdad nos ayuda a mejorar."* Never instruct it to deny being an AI.
- **`flagCondition`** — natural-language condition that flags a conversation for human review. Flag *actionable* moments, not sentiment: "el usuario expresa que aún le interesa obtener su préstamo", "menciona una mala práctica del asesor". One condition, concrete and observable.
- **`maxAttempts`** (1–5, default 3) — outreach rounds; the auto-scaffolded journey gets one follow-up template per extra round.
- **`contextSchema`** — declares per-participant variables (e.g. `{"credit_line": "monto de línea aprobada"}`). Participant `context` keys are validated against it; the agent can then personalize. Keep keys snake_case and short.
- **End conditions** — `endConditionType`: `MANUAL` (default), `DATE` (+`endDate`), or `RESPONSE_COUNT` (+`endResponseTarget`). `isRecurring` + `reportCadence` (`WEEKLY`/`BIWEEKLY`/`MONTHLY`) for always-on programs.

## Boom best practices

- 50–300 participants per batch; WhatsApp response rates far exceed email.
- Spanish (`es`) is the default and >98% of production volume; write all agent-facing text in the participant's language.
- DNC is enforced server-side — a lower participant count than the list you sent means suppression; report the delta, never retry those entries.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `forbidden` on participants/launch | Key not admin-scoped | Ask for an admin key or launch from the Boom app |
| `initiatives_update` rejected | Initiative left DRAFT | Only DRAFT is editable; changes after activation go through the app |
| Template stuck in PENDING | Meta review (~24–48h) | Create templates first; check back with `templates_list` |
| Participant `context` rejected | Keys don't match `contextSchema` | Align keys exactly (case-sensitive) |
| Interviews feel generic | `context` missing blocks 2/4/5 of the formula | Rewrite context; quote the actual artifacts participants saw |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model.
