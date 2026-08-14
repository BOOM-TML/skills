---
name: cdp-and-segments
description: Use when the user wants to query Boom's customer data platform (persons, custom objects, attributes) or build/refresh a saved segment — "who are our churned premium users?", "build an audience of June trial signups", "what attributes do we track?". Segments define WHO an initiative reaches; pair with launch-initiative to target one.
---

# CDP & Segments

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `cdp_people_list` / `cdp_people_get` | Find persons by attribute filters; one person + relationships | read |
| `cdp_custom_object_types_list` / `cdp_custom_object_types_get` | Discover the org's custom object types and attributes | read |
| `segments_catalog` | Every attribute/event a segment filter can reference | read |
| `segments_list` / `segments_get` / `segments_members_list` | Existing saved audiences + who's in them | read |
| `segments_validate` / `segments_preview` | Check a filter compiles; preview a match count *without saving* | read |
| `segments_create` / `segments_update` | Define/refresh a segment | write |
| `segments_evaluate` | Force a re-evaluation now | write |
| `segments_delete` | Remove a segment | **admin** |

## When to use

- "Who are our churned premium users?", "build a segment of trial signups from June", "what attributes do we track?"
- Pair with `launch-initiative`: segment first, then either point a journey's trigger at it or enroll its members as participants.

## Workflow

1. **Discover the schema first** (`segments_catalog`, plus `cdp_custom_object_types_list` for object detail) — every org's CDP is different. Never guess attribute names; show the user what exists.
2. **Prototype the filter** with `segments_validate` then `segments_preview` — preview returns a count without saving anything. Sanity-check with the user ("~1,240 match — expected?").
3. **Measure the coverage of every attribute you plan to put in a message** before you save (see "Measure coverage before you bind").
4. **Save it** (`segments_create`) only once the filter is agreed. Segments are shared org-wide, so name them descriptively (`churned-premium-2026-q2`, not `test-3`). Creating never evaluates: it comes back with `memberCount: 0` no matter how many people actually match. Set `evaluationCadence` explicitly, the API default is `REACTIVE_ONLY` (re-evaluates only the people a CDP write touches, plus a daily backstop sweep), so a filter that turns true from the calendar alone, like "no payment in 30 days," can sit stale for a day with no new data to trigger it. Use `HOURLY` or `DAILY` for anything time-based. `segments_update` resets any field you omit, so send the full state you want, cadence included, and read the response back.
5. **Project what the message will need** in `outputColumns` (see "Project the data the message needs"). A binding can only reach what the segment projects.
6. **Use it.** `segments_evaluate` forces a refresh now; it runs **synchronously** over MCP, unlike the dashboard's background button, so on a large org it can hold the request open a while. Then wire the journey's entry to the segment (next section), or page members with `segments_members_list` and pass them to `initiatives_participants_add` for a one-shot batch (see `manage-participants`).

### Wiring a segment trigger

`journeys_set_trigger` takes `segmentId` = **the segment's internal `id`**, the one `segments_create` and `segments_list` return alongside the slug. Pass the id, never the slug: a slug is rejected with `unknown_segment` and the message tells you to pass the id instead.

Then verify it resolved, because a trigger stored against a segment the lookup can't resolve fails silently in the one way that matters: **run `journeys_message_variables` on that journey and confirm a `SEGMENT_OUTPUT` group comes back**. If the group is missing, no message in that journey can say anything that lives in a related object (order number, tracking number, amount), and nothing else in the platform will tell you.

### Reading an evaluation's numbers

`segments_evaluate` returns `entrants`, `leavers` and `total`. **`total` is the segment's current size**, the full result set of the filter. `entrants` is only the delta this run added, so it is legitimately far smaller than `total`, and zero on a steady-state segment. Report `total` when the user asks how big an audience is.

## Negating a relationship

`has_relationship` takes `exists: false` to mean "does not have one of these", and conditions inside the hop apply to the negation, so "bought A but never B" is one expression. Four things decide whether it does what you meant:

**Put the filters in a `path`, not at the top level.** When `path` is present, the top-level `attributeFilters` must be empty (the schema rejects it otherwise) and each hop carries its own filters.

```jsonc
{ "kind": "has_relationship", "customObjectType": "shopify_order_line_item",
  "attributeFilters": [],
  "exists": false,
  "path": [
    { "customObjectType": "shopify_order", "relationshipType": "placed", "attributeFilters": [] },
    { "customObjectType": "shopify_order_line_item", "relationshipType": "has_line_item",
      "direction": "parent_to_child",
      "attributeFilters": [ { "attr": "object.attributes.sku", "type": "STRING", "op": "in", "value": ["SKU-1"] } ] }
  ] }
```

**A negation without `path` is a silent no-op when the object only hangs off another object.** The no-path form joins the object directly to the person, so for a type you can only reach through an intermediate (a line item reached through an order), that inner test is false for everyone, the NOT makes it true for everyone, and you get the whole audience back with no error.

**Verify with the three-count test, every time.** Measure the total, the positive, and the negated, and confirm `negated = total − positive`. If `negated == total`, the predicate is being discarded. This is the only check that catches it.

**`not_contains` is not a negation.** Inside a positive card it means "has at least one object whose value is not X", which is true of anyone who bought two different things. Use `exists: false` for exclusion.

**Negate alongside a positive card.** A negated card on its own also matches everyone who has no object of that type at all, so it fills up with people who never bought anything.

**Two hops in one `path` is not the same as two predicates.** "Their recent order contains this product" is one `path` with a filter on each hop. Two separate `has_relationship` predicates are two independent existences, and they can be satisfied by different orders: a recent purchase of something else plus an old purchase of the product.

## Project the data the message needs

`outputColumns` is what a segment carries into a run. A binding to `engagement.workflowState.<type>.0.<attribute>` resolves only if the segment projects that type and that attribute. If it doesn't, the binding resolves **empty, with no error**.

- `outputColumns.customObjects` takes a `path` of relationship hops (up to 3), so you can project an object that does not hang directly off the person.
- It also takes `orderBy: { attribute, direction }`, which decides which object lands in `.0`. **Without `orderBy`, `.0` is the first row by internal id, which is arbitrary**: it does not fail, it just carries the wrong object, and someone with two open orders gets the older one.
- Projecting two types with different `orderBy` means "the most recent" of each can come from different orders. Do not combine an order number and a shipment number in one message unless both come from the same projected chain.
- `segments_members_list` returns identity only (name, phone, email, `externalId`, `enteredAt`) and **not** the projection, so it cannot confirm a projection resolves. The cheap check is `journeys_message_variables`, whose description for a projected variable names the ordering attribute when there is one, and says it resolves the first object by internal id when there is not.

## Measure coverage before you bind

`journeys_validate` returns `valid: true` for a binding that will resolve empty for most of the audience. Before you put an attribute in a template, run `segments_preview` with `<attribute> is_null` over the real audience and look at the ratio.

The failure this prevents is a greeting with a blank name as a brand's first impression. Coverage is usually split by how the person arrived: someone who checked out left a name, someone who only left a phone number did not, so the same binding can be safe for buyers and wrong for leads in the same org. Measure per audience, not per org, and drop the placeholder from the template when coverage is bad. A greeting without a name reads fine; a greeting with an empty slot reads broken.

## Filter values and date operators

- **Values go in raw**, as their JSON type: `false`, not `"false"`; `2`, not `"2"`. A journey `DECISION` condition takes the same shapes, so what you prototype here transfers.
- Relative date operators and their value shapes: `in_last_n` / `in_next_n` / `more_than_n_ago` / `more_than_n_from_now` take `{ amount, unit }`; `between_n_and_m_ago` takes `{ minAmount, maxAmount, unit }`; `exactly_n_from_today` takes `{ daysOffset }`. Absolute ones are `on`, `before`, `after`, `between`.
- **`between_n_and_m_ago` requires a span of at least 2 days**, and says why when it rejects one: a narrower band can fall entirely between two evaluations and never match. For an age cohort, count in days rather than months, because a month band moves with the length of the month.

## Boom best practices

- Prefer editing an existing segment (`segments_update`) over near-duplicate new ones.
- CDP data is PII. Query and aggregate freely, but don't paste raw person rows into chat unless the user explicitly asks; summarize counts and distributions.
- `phoneNumber` is the canonical phone attribute in person records too.
- `segments_get` does not return the `filterExpression`, by design. You cannot audit an existing segment's definition from here; read it in the Boom app.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `error.code: "not_found"` on an attribute filter | Attribute doesn't exist in this org | Re-run `segments_catalog`; ask the user |
| Segment saved but empty | Never evaluated, or time-based filter awaiting its cadence | `segments_evaluate`, then `segments_members_list` |
| A negated card returns the whole audience | Negation without a `path` on an indirectly reached object | Move the hops into `path`; re-run the three-count test |
| `unknown_segment` from `journeys_set_trigger` | Passed the slug | Pass the `id` from `segments_list` |
| Message arrives with a blank slot | The segment doesn't project that attribute, or coverage is poor | Check `journeys_message_variables`; measure with `is_null` |
| Segment count ≠ participants added later | DNC suppression at enroll time | Expected — see `manage-participants` |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model. Journeys: [`design-journey`](../design-journey/SKILL.md).
