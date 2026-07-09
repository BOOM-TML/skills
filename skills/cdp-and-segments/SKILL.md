---
name: cdp-and-segments
description: Use when the user wants to query Boom's customer data platform (persons, custom objects, attributes) or build/refresh a saved segment — "who are our churned premium users?", "build an audience of June trial signups", "what attributes do we track?". Segments define WHO an initiative reaches; pair with launch-research-initiative to target one.
---

# CDP & Segments

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `cdp_persons_search` | Find persons by attribute filters | read |
| `cdp_person_get` | One person + relationships | read |
| `cdp_object_types_list` | Discover the org's custom object types and attributes | read |
| `segments_list` / `segments_get` | Existing saved audiences | read |
| `segments_create` / `segments_update` | Define/refresh a segment | write |

> The CDP surface is the newest part of Boom's MCP — expect this table to change the most while in beta.

## When to use

- "Who are our churned premium users?", "build a segment of trial signups from June", "what attributes do we track?"
- Pair with `launch-research-initiative`: segment first, then enroll the segment as participants.

## Workflow

1. **Discover the schema first** (`cdp_object_types_list`) — every org's CDP is different. Never guess attribute names; show the user what exists.
2. **Prototype the filter** with `cdp_persons_search`, paginating with `next_cursor`. Sanity-check counts with the user ("~1,240 match — expected?").
3. **Save it** as a segment (`segments_create`) only once the filter is agreed — segments are shared org-wide, so name them descriptively (`churned-premium-2026-q2`, not `test-3`).
4. **Use it**: enrolling a segment into an initiative directly is done from the Boom app for now — there is no segment-enrollment MCP tool yet. Via MCP, page the matching persons with `cdp_persons_search` (same filters as the segment) and pass them as rows to `participants_add` (see `manage-participants` for the row shape and DNC behavior).

## Boom best practices

- Prefer editing an existing segment (`segments_update`) over near-duplicate new ones.
- CDP data is PII. Query and aggregate freely, but don't paste raw person rows into chat unless the user explicitly asks; summarize counts and distributions.
- `phoneNumber` is the canonical phone attribute in person records too.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `error.code: "not_found"` on an attribute filter | Attribute doesn't exist in this org | Re-run `cdp_object_types_list`; ask the user |
| Segment count ≠ participants added later | DNC suppression at enroll time | Expected — see `manage-participants` |

See [`CONTEXT.md`](../../CONTEXT.md) for the domain model.
