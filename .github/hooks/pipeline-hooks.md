---
name: Pipeline Hooks
description: Shared lifecycle hooks (on_start, on_complete) every agent and subagent in the pipeline applies. Documentation-enforced, not executable — each agent follows these as explicit steps.
---

# Pipeline Hooks

Every agent and subagent in this pipeline applies these two hooks.
They are referenced, not repeated, from each agent's own `## Hooks`
section — this file is the single source of truth for what each
hook means.

## on_start

Runs before an agent/subagent does anything else in its `Steps`.

1. Read the agent's own `Input` / `Trigger` section
2. For each input file listed, verify it exists on disk
3. If any required input is missing:
   - Halt immediately, do not proceed to Steps
   - Show the human: which file is missing, which stage was
     supposed to produce it, and ask whether to run that stage
     first or abort
4. If `Input` is "Nothing" (e.g. Jira Agent backlog mode) or the
   only input is data handed off in-chat (not a file), skip this
   check — there is nothing to verify on disk

## on_complete

Fires **once per top-level agent invocation** (i.e. once per
`.github/agents/*.agent.md` picker entry that ran) — not once per
internal stage or subagent. An agent that covers multiple internal
stages (Documentation Agent's 3 subagents, Reviewer Agent's Stage
5+6, Tester Agent's Stage 8+9) accumulates one log row per internal
stage **in memory** as it goes, then writes them **all in a single
file-writer call** at the very end, right before control returns to
the caller (Orchestrator or the next agent).

1. Determine the current story ID (AISDLC-{{NUMBER}})
2. If docs/{{STORY_ID}}/pipeline-log.md does not exist yet, create
   it with this header:
   ```markdown
   # Pipeline Log — {{STORY_ID}}

   | Timestamp | Stage/Agent | Output | Checkpoint Result |
   |---|---|---|---|
   ```
3. Append all accumulated rows for this agent's run in one write.
   Each row MUST be actual markdown table syntax, on one line,
   starting and ending with `|` — copy this shape exactly, do not
   write each field as its own paragraph/line:
   `| {{ISO timestamp}} | {{stage/agent name}} | {{output file path
   or action taken}} | {{APPROVE / REJECT / N-A}} |`
   One row per internal stage covered, same single file-writer call.
4. Never overwrite prior rows from earlier agents
5. In the same file-writer call, also overwrite
   docs/{{STORY_ID}}/resume-context.md with the template below —
   this is a running snapshot, always reflecting "everything
   approved so far," not an append-only log like pipeline-log.md

This gives a running, human-readable audit trail per story —
which stage ran when, what it produced, and whether it was
approved — without needing to reconstruct it from git history or
chat scrollback, while keeping file-writer calls down to one per
top-level agent instead of one per internal stage.

## Resume Context (crash / token-limit / network-failure recovery)

The whole point of `resume-context.md`: if a session dies mid-pipeline
(token limit hit, network drop, human accidentally closes the chat),
nothing about *how* to continue should live only in that dead
session's scrollback. Every completed, approved stage leaves behind
a self-contained block the human can paste into a **brand-new**
Copilot Chat session to pick up exactly where things left off —
without re-deriving context or re-explaining the story.

Overwrite (not append) docs/{{STORY_ID}}/resume-context.md with:

```markdown
# Resume Context — {{STORY_ID}}

> Paste this whole file into a new Copilot Chat session, then
> select the agent named in "Next Action" below.

## Story
{{STORY_ID}}: {{story-title}}

## Last Completed Stage
{{stage/agent name}} — {{ISO timestamp}} — Checkpoint: {{APPROVE / N-A}}

## Artifacts Produced So Far
- {{output file path or PR link}} (one line per completed stage,
  pulled from pipeline-log.md — always the full list, not just the
  latest stage)

## Next Action
Select: {{next agent's .agent.md name}}
Hand it: {{exactly what that agent needs as Input — story ID,
which files to read, or what to hand off — copied from that
agent's own Input/Trigger section}}
```

A stage that fails mid-run (before reaching on_complete) leaves the
PREVIOUS stage's resume-context.md untouched — so on_start of the
next attempt, the human always has a valid, working resume point
for "everything that passed a checkpoint," even if the failed
attempt itself produced nothing usable.

## Skip Conditions
- Stage 1a (Jira Agent) Backlog Mode — no story ID chosen yet, skip
  both hooks until Single Story Mode confirms one
- Any agent with `Human Checkpoint: No` — on_complete still logs,
  just with Checkpoint Result `N-A`
