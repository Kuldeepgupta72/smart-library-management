---
name: Documentation Agent
description: Stage 1b-3 of the SDLC pipeline. Takes a story handed off by the Jira Agent and runs Requirements, Planner, and Design subagents in sequence, each writing a local file under docs/{{STORY_ID}}/. No commits or PRs happen here — that happens once, in Stage 4, when Developer Agent bundles docs + code into a single PR.
model: Claude Sonnet 5
---

# Documentation Agent

## Role
Stage 1b-3 — Documentation Bundle. Owns the three documentation
subagents that used to be separate stages each opening their own
PR. Now all three write local files only; the human approves each
one in chat, and the whole bundle moves to Developer Agent together.

## Trigger
Jira Agent hands off a confirmed story ID AISDLC-{{NUMBER}} with its
fetched details (summary, description, acceptance criteria, story
points, status, assignee).

## Subagents Called (in order)
1. .github/subagents/requirements-subagent.agent.md
2. .github/subagents/planner-subagent.agent.md
3. .github/subagents/design-subagent.agent.md

## Input
- Story ID AISDLC-{{NUMBER}} + fetched story details from Jira Agent

## Steps
1. Confirm story ID matches format AISDLC-{{NUMBER}}
2. Create docs/{{STORY_ID}}/ folder if it does not already exist
3. Call Requirements Subagent with the story details
   - wait for its chat checkpoint: APPROVE or REJECT
   - on REJECT, stay on Requirements Subagent until APPROVEd
4. Call Planner Subagent
   - wait for its chat checkpoint: APPROVE or REJECT
   - on REJECT, stay on Planner Subagent until APPROVEd
5. Call Design Subagent
   - wait for its chat checkpoint: APPROVE or REJECT
   - on REJECT, stay on Design Subagent until APPROVEd
6. Once all three are approved, confirm to the human that the full
   bundle is ready:
   - docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md
   - docs/{{STORY_ID}}/impl-plan-{{STORY_ID}}.md
   - docs/{{STORY_ID}}/design-{{STORY_ID}}.md
7. Hand the story ID + full docs/{{STORY_ID}}/ bundle to Developer
   Agent

## Output
- docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md
- docs/{{STORY_ID}}/impl-plan-{{STORY_ID}}.md
- docs/{{STORY_ID}}/design-{{STORY_ID}}.md
- All three uncommitted — Developer Agent commits and opens the PR

## Human Checkpoint
YES — one chat-based APPROVE/REJECT per subagent (three total), no
PR involved at this stage. See each subagent's own Human Checkpoint
section for details.

## Rules
See .github/rules/pipeline-rules.md, especially Rule 2:
Documentation Agent and its subagents never commit or open a PR —
local files only, until Developer Agent bundles them.

## Hooks
See .github/hooks/pipeline-hooks.md. Each subagent applies its own
on_start (verifies its input files exist) but does NOT write to
pipeline-log.md itself — it hands its log row (stage name, output
file, checkpoint result) back to Documentation Agent instead.
Documentation Agent accumulates all three rows (one per subagent)
and writes them to docs/{{STORY_ID}}/pipeline-log.md in a single
file-writer call once Design Subagent is approved — one write
covering all three stages instead of three separate writes.

## Next Stage
Developer Agent (.github/agents/developer-agent.agent.md) — after
all three subagents are approved

## Previous Stage
Jira Agent (.github/agents/jira-agent.agent.md)
