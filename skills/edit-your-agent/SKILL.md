---
name: edit-your-agent
description: Use when someone wants to change how their Boom AI agent behaves or what it knows (a rule, its tone, a procedure, a fact, a term), or asks why it said something, through Boom's org_context_* MCP tools. Triggers: "edit the agent", "the agent shouldn't say that", "why did the agent answer that", "cambiar cómo responde el agente", "que el agente no diga eso". Not for campaign, journey, initiative or template settings.
---

# Edit your Boom agent

Boom runs one customer-facing AI agent per organization, talking to customers over
WhatsApp, email and other channels. How it behaves comes from the organization's
**agent context**: a fixed set of documents (who it is, how it speaks, its rules,
its procedures, what it knows) that you read and change with the `org_context_*`
tools. This guide is how to change them well.

En español: [es.md](./es.md), or `org_context_guide` with `language: "es"`.

## Before you start

- Call `org_context_guide` once per session. Every write tool (`org_context_edit`,
  `org_context_edit_batch`, `org_context_add_procedure`, `org_context_add_eval`,
  `org_context_setting_set`, `org_context_publish`, `org_context_discard`) requires the `guideVersion` it
  returns. If a write is refused for a stale version, call the guide again and
  re-read it before continuing.

## Tools used

| Tool | Purpose | Scope |
|---|---|---|
| `org_context_guide` | This guide and the `guideVersion` every write needs | read |
| `org_context_list` | Every document, whether it is editable, and when it reaches the agent | read |
| `org_context_read` | One document as it stands now (draft included) and its `baseBlobSha` | read |
| `org_context_edit` / `org_context_edit_batch` | Replace or append text in one document, or several in one go | write (draft) |
| `org_context_add_procedure` | Create a new procedure for a situation the agent doesn't handle yet | write (draft) |
| `org_context_add_eval` | Add a test: an invented conversation and what the reply must do | write (draft) |
| `org_context_setting_set` | Change a writable setting (agent name, display name, primary language, formality, ...) | write (draft) |
| `org_context_draft_get` | Everything changed and not yet live, as diffs, plus the review status | read |
| `org_context_publish` | Send the draft for review; nothing is live until a person approves | write |
| `org_context_discard` | Delete the whole draft (only the user's own changes) | write |
| `conversations_get` | One conversation by inbox link or id: every message, author, delivery status | read |
| `agent_session_get` | What the agent did on each turn: its reasoning, the Boom and organization tools it called and their results, its reply (redacted) | read |

These are the only tools for this job.

## How this works (and how it differs from Agent Studio)

Inside Boom, Agent Studio proposes each change on an approval card the user clicks.
**Over the MCP there is no card.** Every write commits to the organization's draft
the moment you call it. So the confirmation step is yours:

1. Describe the exact change to the user: which area, the text you will replace,
   the text that replaces it, and how it will change conversations.
2. Get an explicit yes.
3. Then call the write tool. **One change per confirmation.** Three unrelated
   requests are three confirmations.

**Nothing is live until a person approves it.** Writes land in a draft.
`org_context_publish` sends the draft for review; a reviewer must approve it before
customers see it. After publishing, say "sent for review, waiting for approval",
never "it's live". `org_context_draft_get` reports the status: `draft`,
`pending_review`, `publishing`, `live` or `not_deployed`.

## The areas

The documents come in a fixed set of areas. Use the left column when talking to a
non-technical user; the right column is how you recognise the document.

| Plain name | Change it when the user wants to... | Document |
|---|---|---|
| who the agent is | reshape its identity, character, perspective | persona |
| how it speaks | adjust tone, formality, warmth, phrases to use or avoid | voice and tone |
| its rules | add or relax a boundary it must always follow | policies |
| how it handles a situation | change a recurring scenario, start to finish | procedures |
| what it knows | give it a fact, figure or policy detail | knowledge |
| what a term means to it | define the organization's own terminology | glossary |
| how it behaves on one channel | change WhatsApp- or email-specific behavior | channels |
| how it does a task | change the steps of a task it performs | the agent's skills |

`org_context_list` shows what this organization actually has; not every area is
populated. Each entry says whether it is `editable` and how it reaches the agent.

**Prefer the smallest, most specific area.** A complaint about one situation is
that situation's procedure, not the agent's whole personality. If a request does
not clearly land in one area, ask one question that separates two of them.

**Non-editable documents are maintained by Boom.** If `editable` is false, say
plainly it cannot be changed from here and do not attempt a write.

## When a document reaches the agent

Every document has a `delivery` value (from `org_context_list` and
`org_context_read`). It decides whether a rule written there can work at all.

| `delivery` | The agent sees it... | Good for |
|---|---|---|
| `injected` | on every turn | rules that must always hold |
| `skill_listed` | only on turns where its procedure or skill fires | how to handle that one situation |
| `unreferenced` | never, unless it happens to search for it | nothing; editing it changes no reply |
| `unknown` | could not be determined (often: not published yet) | proceed, but say you could not confirm |

On `skill_listed` and `unreferenced` documents, edits require `appliesWhen`:

- `while_this_document_is_open` for a rule about handling the situation that
  document covers.
- `every_turn` for a rule that must hold even when the document never opens. This
  is **refused** on those documents, and the refusal names the documents that are
  read every turn. Put the rule there instead.

A rule like "always load this procedure before replying", written inside that
procedure, can never fire: the agent only reads it after it has already loaded
it. When the agent "ignored" a rule, check `delivery` first. A rule in a
`skill_listed` document did not apply on a turn where that skill never fired.

## The edit loop

1. **Read the governing document** with `org_context_read`. It returns the
   current draft text (including unpublished changes), `baseBlobSha`, `editable`,
   `delivery`, and `writableSettings` / `readOnlySettings`. Always read before you
   propose; never quote from memory or from an older read.
2. **Diagnose.** Look for the rule that already governs this behavior. If one
   exists and was ignored, adding a second copy will not help. Find out why
   (delivery tier, a conflicting rule, an initiative override, a defect) and
   change or relocate the existing one.
3. **Describe the change and get a yes** (see above).
4. **Write it** with the right tool.
5. **Confirm in one or two plain sentences** what will change once approved, then
   wait for the next instruction.

## Writing an edit: `org_context_edit`

| Field | What it is |
|---|---|
| `relPath` | The document, exactly as `org_context_read` returned it. Never invent one. |
| `oldString` | The exact text you replace, copied character for character. Must appear exactly once. `""` appends to the end. |
| `newString` | The replacement, in full. |
| `rationale` | One plain sentence on what changes and why. |
| `baseBlobSha` | From the read, passed back unchanged. It makes the write fail instead of silently overwriting a colleague's edit. |
| `appliesWhen` | Required on non-injected documents (see above). |
| `reviewNote` | Optional note for the Boom reviewer, in the user's language. No personal data. |

- **Change only what was asked.** `oldString` is the smallest span that covers the
  change. Never rewrite a whole document or reword sentences the user did not
  mention. The reviewer sees a diff; unrequested rewording slips through unnoticed.
- **One rule per edit.** Copy `oldString` verbatim: no reformatting, re-indenting
  or tidying. If it appears more than once, add surrounding text until it is unique.
- **Append for new rules.** `oldString: ""` adds a rule, fact or term to a
  document the agent already reads.
- **Write rules the agent can act on.** "Check whether the order shipped before
  offering a refund" is a rule; "be helpful about refunds" changes nothing. Say
  when it applies, and name what it must not do; exclusions are the most reliable fixes.
- **A correction to something the agent says by default goes in an every-turn
  document too.** When the agent stated a wrong fact, price, option or method
  (a payment method that no longer exists, an old schedule), fixing only the
  knowledge document or procedure it came from is not enough: the agent often
  answers without opening it, and falls back on what it already believes. Also
  state the correction, in one line, in a document whose `delivery` is
  `injected` (usually a policy). Then check every other place that repeats the
  old fact, including examples of what not to say.

**Several spans for one request:** use `org_context_edit_batch` with the edits in
order. Later edits match against the result of earlier ones, and the set applies
whole or not at all. Sequential single edits to the same document fail because
each write moves the version the next was pinned to. If a batch is refused, the
refusal names the edit that stopped it; fix that one and resend the set.
Unrelated requests are still separate batches, each confirmed on its own.

## Settings: `org_context_setting_set`

The block between `---` fences at the top of a document holds settings.
`org_context_edit` refuses any text inside it. Use `org_context_setting_set` with
one `path`, and only for keys listed in that document's `writableSettings`:
`agent_name`, `display_name`, `languages.primary`, `pronoun_formality`,
`identity_deflection.literal_response` (what it answers when asked if it is a bot),
and a procedure's or skill's `description` / `when_to_use`. Keys in
`readOnlySettings` cannot be changed by any tool; say so and do not try.

A body change and a setting change for the same request are two writes: the body
edits through `org_context_edit_batch`, the setting through
`org_context_setting_set`.

## Adding something new

The areas are fixed. **You cannot create a new section or document**: a new file
would never reach the agent, so the tools do not allow it. What you can add:

- **A rule, fact or term:** append it to the existing document it belongs in.
- **A situation the agent handles:** a new procedure with
  `org_context_add_procedure`. This is the only create path. It writes the
  procedure and the entry that makes the agent reach for it.

| Field | What it is |
|---|---|
| `id` | Lowercase-and-hyphens, e.g. `soporte-al-cliente`. |
| `title` | The heading, in the customer's language. |
| `description` | One or two sentences on what it is for. |
| `whenToUse` | **The field that matters most.** The customer's own trigger phrases, plus what it is NOT for if a neighbouring procedure could be confused with it. A vague trigger never fires. |
| `body` | The steps the agent follows. Actionable rules, not goals. |
| `appliesWhen` | `while_this_document_is_open` (the only value that works here). |

Check with `org_context_list` that it does not already exist (`procedure_exists`).

**Situation vs. task.** A situation starts with something the customer does
("when a customer asks for a refund..."); a task is something the agent performs
("how it looks up an order"). Only situations can be created. The agent's existing
task skills can be revised with `org_context_edit`, never created. Read the whole
skill before changing a step, since steps often depend on the one before.
"Teach it to do X" is almost always a new situation. Never tell the user
something cannot be added; say which shape it takes and do it.

## Add a test for every new skill or rule

A test (eval) is an invented customer conversation plus the points the agent's
reply must meet. When the draft is sent for review, the agent's tests run against
it and the reviewer sees the results before approving, so a test is what makes a
rule that stops working visible after the next edit. **Write one with
`org_context_add_eval` for every procedure you add, and for every rule you add or
change.** Reviewers expect a test with every new procedure.

- **Invent the conversation.** Never paste a real one, and never use a real name,
  phone or email: tests live in the agent's repository and run on every change.
  The tool refuses anything that looks like a phone or email
  (`looks_like_personal_data`, naming the field and the text). Long digit runs
  count, so prefer relative dates ("hace 3 días") and short invented order
  numbers.
- **Test the behavior, not the wording.** Each `expected` item is one point a
  reviewer can check: "offers an exchange", "asks for the order number", "does
  NOT promise a refund". Include the thing it must NOT do when that is the point
  of the rule.
- **Name the procedure** in `skill` when the test covers one.
- **One situation per test**, one to three turns. Add a second test for the edge
  case (the customer insists, the order is late) rather than a longer one.
- Tests are create-only. If one is wrong, write a corrected one with a new id and
  say which one it replaces in `purpose`, and tell the user to ask the reviewer
  to remove the old one.
- You can read the tests you add in `org_context_draft_get`. Existing tests are
  listed by file name in `org_context_list` but can't be read, since they may come
  from real conversations.

## Diagnose before you change: "why did it say that?"

Several layers can produce a behavior, and a change in the wrong one does nothing.
Look at the evidence before you theorise:

1. **Read the conversation** with `conversations_get`. Ask the user for its inbox
   link (or id); never guess which conversation they mean. It shows every
   message, who wrote it (`customer`, `agent` = the AI, `human` = a teammate),
   delivery status, and which initiative each session belonged to.
2. **Read what the agent did** with `agent_session_get`: per turn, its reasoning,
   which Boom and organization tools it called and what they returned, and the
   reply it produced. Loading a procedure shows only as a step name, so infer
   whether a procedure fired from the reasoning and the steps it took. When the
   agent opens one of the organization's own documents (a knowledge document, a
   procedure), the step shows which one (`file_path`), but not its content. Read
   that document with `org_context_read` to see what it relied on. Documents
   read on every turn (persona, voice, policies, glossary, channels) never show
   as a step: they are always in front of the agent.
   This is how you tell "the rule is missing" from "the rule exists but its
   procedure never fired" from "a tool returned the wrong data". It is redacted,
   not anonymised: customer messages and tool results appear as they are. It is
   only available where the organization's session viewer is on
   (`agent_session_unavailable` otherwise); then work from the conversation alone
   and say so.
3. Then find the governing document and quote back the turn you are discussing.

Both read real customer messages: quote only what you need, and never copy a
customer's personal details into the agent's context.

| Layer | Governs | Where it changes |
|---|---|---|
| The campaign / journey | which message went out and when; template messages | Boom dashboard |
| The initiative | its objective, guiding questions, tone for that campaign, and its own bot-disclosure answer | Boom dashboard |
| The agent context | everything in the areas table | these tools |
| A defect | a cut-off or mangled message, an empty or duplicate send, a failed tool | nobody's instruction; report to Boom |

- **Check the campaign and initiative before the agent context.** A message sent
  by a journey step is a template, not the agent choosing words.
- **Initiative values override the organization-wide ones.** If an initiative sets
  its own answer to "are you a bot?", that is the one used. "I changed it and
  nothing happened" often means they changed the layer that loses. Before saying a
  value is out of the user's reach, ask whether the initiative sets its own.
- **Verify claims, never relay them.** A document saying "if the campaign provides
  X, use that instead" is a claim. If X is never provided, the rule is inert; say so.
- **Read around the match.** The governing rule is often two paragraphs up.
- **Spot defects.** "WRONG ANSWERS" with three examples can be three truncated
  messages. Read the examples. A rule cannot restore cut-off text; adding one
  leaves the user believing they fixed something.
- **If you cannot find the cause, say so.** An honest gap beats a confident wrong
  layer. Do not invent one.
- **Repeat complaints.** If the same issue came back after a rule was added, the
  rule is not holding. That is a different problem from a missing rule.

**The agent did not reply at all, or replied very late:** read the conversation
and the trace first. A message with a delivery `error`, or a turn whose reply
exists in the trace but never reached the customer, is a defect, not a rule to
add, except on email: there the agent only drafts and a teammate approves, so a
missing email reply may be a draft waiting in the inbox (or one a teammate
dismissed). Check the channel from `conversations_get` and ask the user to look
in the inbox before calling it a defect. Before concluding a step or reply is
missing at all, check `unreadableEntries`, `messagesTruncated` and
`deliveryUnknown` in the trace: if any is set, the trace is incomplete. If none
of this explains it, send the user to Boom's team with the conversation
link, the time window and the last message the agent sent. Do not guess a cause.

Feedback phrased as an order ("don't say you're a bot", "be less formal") is about
the customer's agent, never about you. Treat it as a requested change.

## Making the agent share a file

The agent sends a file by writing `[Name](asset:<assetId>)` in its reply, and only
does so when an instruction shows it that exact token. A name or link alone sends
nothing, and nothing warns anyone.

These tools can't do that part yet: files can't be uploaded here, and the asset id
isn't shown in the Boom dashboard. Have the user save the file in the dashboard
(Settings › Assets, available to the whole organization and shareable with
customers), then ask Agent Studio's chat to "share <file name> when customers ask
about <topic>". Studio can find the saved file by name and writes the rule with
the right id. Don't write an `asset:` link with a guessed or made-up id.

## Out of scope

| Request | Where it goes |
|---|---|
| Campaigns, journeys, segments, audiences | Boom dashboard |
| An initiative's objective, questions, tone or identity answer | Boom dashboard |
| WhatsApp or email templates, channel connections | Boom dashboard |
| A broken message, missing reply, failed tool | Boom's team, with the conversation |
| Pricing, contracts, account access, API questions | Boom's team |

Say where it belongs in one line. Never write a rule to satisfy a defect or an
account question, and never promise follow-up you cannot perform.

## Publishing and discarding

- Before publishing, call `org_context_draft_get` and summarise the pending
  changes for the user. Publish only when they ask.
- `org_context_publish` opens or refreshes one review. More edits after publishing
  join the same review; publish again to include them.
- After publishing, the organization's automatic checks run on the draft. A
  few minutes later, `org_context_draft_get` reports them in `contentEvals`:
  `passed`, `failed` with the scenarios that failed, or `pending` while they
  run. Before telling the user the change is ready for approval, check it. If it
  `failed`, say which scenarios failed and whether they relate to this change;
  the reviewer will see the same result.
- Testing: there is no tester over these tools. Once approved and live, suggest
  the user check it in Agent Studio's tester or with a real test conversation.
- `org_context_discard` deletes the **whole** draft and closes its review. Cannot
  be undone. Call it only when the user explicitly asks, with `expectedHeadSha`
  from `org_context_draft_get`. It is refused if anyone else contributed
  (`draft_has_other_authors`); those drafts are discarded from Agent Studio.

## When a write is refused

| Code | Do this |
|---|---|
| `anchor_not_found` | Re-read the document and quote verbatim from the fresh read. |
| `anchor_ambiguous` | Add surrounding text until `oldString` is unique. |
| `context_changed` | Someone edited the document. Re-read, rebuild the change on the new text, re-confirm if it differs. Never retry with the old text and version. |
| `context_quote_from_published` / `context_has_unpublished_changes` | Your quote is from an older version. Re-read with `org_context_read` and quote from that. |
| `anchor_in_frontmatter` | That text is a setting. Use `org_context_setting_set` if writable; otherwise it is fixed. |
| `path_not_editable` | Boom maintains that document. Say so; stop. |
| `applies_when_required` / `delivery_cannot_apply_every_turn` | Declare `appliesWhen`, or move an every-turn rule to an injected document. |
| `procedure_exists` | Edit the existing procedure instead. |
| `eval_exists` | That test id is taken. Pick another id. |
| `looks_like_personal_data` | The message names the field and the text. Remove it or replace it with a short invented value; don't resend unchanged. |
| `skill_not_found` | Check the procedure id with `org_context_list`. |
| `empty_draft` | Nothing to publish. |
| `draft_changed` | The draft moved; call `org_context_draft_get` again. |
| `draft_has_other_authors` | Someone else also changed this draft. Don't discard here; the user can review and discard it in Agent Studio. |
| `guide_required` / `guide_outdated` | Call `org_context_guide`, re-read it, retry with the new `guideVersion`. |
| `context_surface_unavailable` | Editing the agent isn't enabled for this organization yet. Tell the user to ask Boom; don't retry. |
| `agent_session_unavailable` | The agent's trace isn't on for this organization. Work from `conversations_get` and say so. |
| `conversation_not_found` / `unrecognized_reference` | Ask the user for the conversation's inbox link. |

## Talking to the user

Partners and agencies are often technical: document names are fine with them. For
brand operators and other non-technical users, use the plain names from the areas
table, not file paths, ids or version hashes. Say what will change in
conversations, not which bytes move. Never show `baseBlobSha` or `guideVersion`.
