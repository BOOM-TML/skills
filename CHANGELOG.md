# Changelog

## Unreleased

- `design-journey`: document the SEND_MESSAGE binding path families and the new `journeys_message_variables` catalog. Custom person attributes bind as `person.<key>` — not `attributes.bank` / `customer.attributes.bank` (that is the DECISION/CASE condition syntax and renders the message blank). `journeys_validate` now rejects an unresolvable binding path before publish; the troubleshooting entry for blank values covers the wrong-path case.

- Rework `design-journey` for the MCP journey **authoring** surface: journeys are no longer read-only over MCP — the skill now documents the full author-and-publish loop (`journeys_create_draft` → `journeys_add_node` / `journeys_connect_nodes` → `journeys_set_trigger` → `journeys_validate` → `journeys_publish`) plus the read/catalog tools. Add the `HTTP_REQUEST` and `MANAGE_CONVERSATION` node kinds; mark `CONVERSATION_BLOCK` as legacy and recommend `WAIT_FOR_REPLY` + `MANAGE_CONVERSATION`; add a "bind your variables" (`templateBindings`) section, a chaining topology, and a "one objective per initiative" guideline. Update `boom-overview` and `CONTEXT.md` to match (journeys authored/published via MCP or the builder). Fix the `whatsapp-templates` "variables render literally" remedy to point at `journeys_update_node` / `templateBindings`.

- Add `boom-overview`: orientation + router skill — Boom's object model, project lifecycle, key scopes, and which skill to use for which request.
- Add `whatsapp-templates`: content shapes per template type, UTILITY-vs-MARKETING strategy, variable rules, the real Meta rejection catalog, and opener copywriting that passes review and earns replies.
- Add `design-journey`: the journey workflow DSL (node kinds, signal routing, publish validation rules), four proven production topologies, and a debugging guide. Honest about the MCP read-only boundary.
- Add `connect-your-data`: least-privilege read-only DB user, direct vs SSH-tunnel connections, the incremental sync SQL contract (`external_id`/cursor/soft-delete), Shopify/Skio, and verification steps.
- Deepen `launch-research-initiative` with the context-authoring formula extracted from Boom's best-performing production initiatives, the full guiding-question schema (`answerType`, `followUpDepth`, `evaluationCriterion`), `identityDeflection` patterns, `contextSchema`, and end conditions.
- Align all skills with the real MCP tool names (`initiatives_participants_*`, `cdp_people_*`, `initiatives_summary`, `cdp_custom_object_types_*`) and add the full segment authoring loop (`segments_validate`/`preview`/`evaluate`/`catalog`/`members_list`) to `cdp-and-segments`.
- Update `CONTEXT.md` (initiative fields: `objective`, `context`, `flagCondition`, `maxAttempts`; journey scaffolding) and the README skills table.

- Add `build-knowledge-base`: a guided-interview skill that helps customers prepare their agent context and outputs a structured markdown bundle to hand to Boom. Captures a **durable brand identity** (brand, voice, glossary, product, customers, guardrails, scope) once, plus a **brief per use case** (research, churn recovery, data collection/conversion) that can be added over time. Captures use-case briefs (goal + envelope + rules), never hand-written playbooks. Researches the customer's own website when given a URL; no MCP tools required.

## 0.1.0 — 2026-07-07

- Initial release: `launch-research-initiative`, `analyze-results`, `manage-participants`, `cdp-and-segments`.
- Claude Code plugin `boom` bundling Boom MCP server config (beta).
