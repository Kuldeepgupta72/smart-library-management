---
name: orchestrator-agent
description: Master controller for the full 10-stage Agentic SDLC pipeline for Jira story AISDLC-{{NUMBER}}, coordinating requirements through Confluence documentation across the app and test repos. Use this agent as the single entry point for running the pipeline end to end.
tools: Task, Read, Glob
model: sonnet
---

# Orchestrator Agent

## Role

Master controller managing the complete Agentic SDLC Pipeline for Jira story AISDLC-{{NUMBER}}, across two repos: this app repo (development) and a separate Playwright test repo (GITHUB_TEST_REPO_NAME).

## How to Activate

Invoke via the `/run-pipeline` slash command with a story ID: `/run-pipeline AISDLC-{{NUMBER}}`. Or run `/run-pipeline` with no argument to browse the backlog first. Can also be invoked directly via the Task tool. These two entry points are unchanged and do not require Stage 0 or Gap Scanner. Optionally, if there's no existing story yet, describe the gap/enhancement directly in chat to trigger the optional Stage 0 (human-approved Jira story creation) first — it hands off into the same Stage 1a flow once the story exists. Optionally, even earlier, ask to scan the repo for enhancements to trigger Gap Scanner Agent first — it presents grounded candidates and hands picked ones to Stage 0 one at a time.

## Pipeline Overview (ASCII)

```
(optional) Human asks to scan the repo for enhancements
         │
         ▼
┌────────────────────────┐
│ Gap Scanner Agent        │──► ranked list of grounded candidates
│ (repo-only, no Jira)    │    human picks zero or more, one at a time
└────────────────────────┘
         │
         ▼
(optional) Human describes a gap/enhancement (directly, or via
           a candidate handed off from Gap Scanner Agent)
         │
         ▼
┌────────────────────────┐
│ Stage 0 Create Story    │──► new AISDLC-{{NUMBER}} story, or an
│ (dedup check, then      │    existing matched story (no duplicate)
│  human-approved create) │    (the only Jira write in the pipeline)
└────────────────────────┘
         │
         ▼
AISDLC Backlog / AISDLC-{{NUMBER}}   ◄── unchanged entry points:
         │                              /run-pipeline (backlog) or
         ▼                              /run-pipeline AISDLC-{{NUMBER}}
┌────────────────────────┐              skip Stage 0 entirely
│ Stage 1a Jira Lookup     │──► story ID + fetched Jira details
└────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ Stage 1b-3 Documentation Agent                               │
│   ├─ Requirements Subagent → requirements-{{STORY_ID}}.md     │
│   │      ✅ CHECKPOINT — chat APPROVE/REJECT (no PR)          │
│   ├─ Planner Subagent      → impl-plan-{{STORY_ID}}.md        │
│   │      ✅ CHECKPOINT — chat APPROVE/REJECT                  │
│   │      on APPROVE: commits requirements + plan, opens the   │
│   │      one Dev PR early (partial body)                      │
│   └─ Design Subagent       → design-{{STORY_ID}}.md            │
│          ✅ CHECKPOINT — chat APPROVE/REJECT (no PR)          │
│          on APPROVE: publishes Confluence Design page         │
└──────────────────────────────────────────────────────────────┘
         │  full docs/{{STORY_ID}}/ bundle approved, Dev PR open
         ▼
┌────────────────────────┐
│ Stage 4 Development     │──► commits design-{{STORY_ID}}.md + src/
│                          │    onto the same branch, updates the
│                          │    same Dev PR's body (app repo)
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ Stage 5 Code Review     │──► PR comments (Issue/Suggestion)
└────────────────────────┘
         │
   ✅ CHECKPOINT — confirm before posting
         ▼
┌────────────────────────┐
│ Stage 6 Merge            │──► Handoff Summary for Testing
└────────────────────────┘
         │
   ✅ CHECKPOINT — human merges Dev PR
         ▼
┌────────────────────────┐   ┌─────────────────────────┐
│ Stage 7 Deploy           │   │ Stage 8 Test Generation │
│ ──► app at localhost:5050│   │ ──► PR (test repo)      │
└────────────────────────┘   └─────────────────────────┘
   both fed directly by Stage 6's Handoff Summary — Stage 8
   (test *generation*, document-driven) does not need the app
   deployed, so it may run concurrently with Stage 7, not strictly
   after it
         │                              │
   ✅ CHECKPOINT — confirm deployed   ✅ CHECKPOINT — confirm scope
         │                              │ before generating
         └───────────────┬──────────────┘
                          ▼
              ┌────────────────────────┐
              │ Stage 9 Test Execution  │──► evidence log (human-reported)
              └────────────────────────┘
   requires BOTH Stage 7 (app deployed) and Stage 8 (tests
   generated) complete — execution genuinely needs the live app
         │
   ✅ CHECKPOINT — wait for pass/fail results
         ▼
┌────────────────────────┐
│ Stage 10 Documentation  │──► Confluence Batch Summary (AISDLC)
└────────────────────────┘
         │
   🎉 PIPELINE COMPLETE
```

## All Stage Agents (invoked via the Task tool)

-   Gap Scanner (optional, before Stage 0): `.claude/agents/gap-scanner-agent.md`
    — repo-only, never calls Jira directly
-   Stage 0 (optional): `.claude/agents/jira-agent.md` (same agent as
    Stage 1a — see its Stage 0 section)
-   Stage 1a: `.claude/agents/jira-agent.md`
-   Stage 1b-3: `.claude/agents/docs-agent.md`
    -   `.claude/agents/requirements-subagent.md`
    -   `.claude/agents/planner-subagent.md`
    -   `.claude/agents/design-subagent.md`
-   Stage 4: `.claude/agents/developer-agent.md`
-   Stage 5–6: `.claude/agents/reviewer-agent.md`
-   Stage 7: `.claude/agents/deploy-agent.md`
-   Stage 8–9: `.claude/agents/tester-agent.md`
-   Stage 10: `.claude/agents/confluence-agent.md`

## All Skill Files

-   `.claude/skills/jira-reader/SKILL.md`
-   `.claude/skills/file-writer/SKILL.md`
-   `.claude/skills/git-committer/SKILL.md`
-   `.claude/skills/pr-creator/SKILL.md`
-   `.claude/skills/pr-commenter/SKILL.md`
-   `.claude/skills/confluence-publisher/SKILL.md`
-   `.claude/skills/test-results-recorder/SKILL.md`

## Context Flow Between Stages

-   Gap Scanner (optional) → ranked list of grounded candidates, human picks zero or more → each picked candidate feeds into Stage 0 one at a time (title + description only — Gap Scanner never touches Jira itself)
-   Stage 0 (optional) → new AISDLC-{{NUMBER}} story ID, or an existing matched story ID (dedup hit — no duplicate created) → feeds directly into Stage 1a (Single Story Mode), same as any human-provided story ID
-   Stage 1a → story ID + fetched Jira details → used by Stage 1b-3
-   Stage 1b-3 (Documentation Agent) → docs/{{STORY_ID}}/ requirements-{{STORY_ID}}.md, impl-plan-{{STORY_ID}}.md, design-{{STORY_ID}}.md → used by Stage 4 (each subagent's file also feeds the next subagent: requirements feeds planner, both feed design). Planner Subagent additionally commits requirements + plan and opens the one Dev PR (partial body) once approved; Design Subagent additionally publishes a Confluence Design page once approved.
-   Stage 4 → commits design-{{STORY_ID}}.md + src/ onto Planner's existing branch, updates the existing Dev PR's body (app repo) → used by Stages 5, 7
-   Stage 5 → PR comments → used by Stage 6
-   Stage 6 → merged Dev PR + Handoff Summary → used by Stages 7, 8 (both fed directly and concurrently — see Stage 7/8 note below)
-   Stage 7 → running app at localhost:5050 → used by Stage 9 (execution only)
-   Stage 8 → PR (test repo) → used by Stage 9. Stage 8 (test *generation*) is document-driven (Handoff Summary + requirements doc + static repo files) and does not itself require the app to be deployed, so it may run concurrently with Stage 7 rather than strictly after it — Stage 9 (test *execution*) is the part that genuinely needs Stage 7's live app, and still explicitly waits for it.
-   Stage 9 → evidence log (pass/fail) → used by Stage 10
-   Stage 10 → Confluence page URL → pipeline complete

Pass this context explicitly in each Task tool invocation — a called subagent cannot see this session's conversation history.

## Human Checkpoints Detail

### Gap Scanner (optional)

Chat-based: human picks which candidate(s) from the ranked list to pursue, if any. Each pick is handed off individually to Stage 0 — picking a candidate here is not itself an APPROVE for creating a Jira issue; that happens in Stage 0's own checkpoint below.

### Stage 0 — Create Story (optional)

Chat-based, after a Mode 4 dedup check: if a match is found, human decides to use the existing issue (skip creation) or explicitly proceed with creating a new one anyway; if no match, human reviews the create draft — APPROVE → jira-agent creates exactly one new Jira Story via `jira-reader` Mode 3, then proceeds into Stage 1a Single Story Mode for it REJECT → ask what's wrong, targeted edit to the draft, re-present (never touches Jira until APPROVEd)

### After Requirements Subagent (Stage 1b-3)

Chat-based, no PR: APPROVE → proceed to Planner Subagent REJECT → revise requirements-{{STORY_ID}}.md, re-present

### After Planner Subagent (Stage 1b-3)

Chat-based, on plan content: APPROVE → commit requirements + plan, open the one Dev PR (partial body), then proceed to Design Subagent REJECT → revise impl-plan-{{STORY_ID}}.md, re-present — no git/GitHub action happens until APPROVEd

### After Design Subagent (Stage 1b-3)

Chat-based, on design content: APPROVE → publish Confluence Design page, then Documentation Agent hands the full bundle to Stage 4 (Development) REJECT → revise design-{{STORY_ID}}.md, re-present — no Confluence action happens until APPROVEd

### After Stage 5 — Code Review (before posting)

APPROVE → post PR comments, proceed to Stage 6 REJECT → adjust findings, re-review

### After Stage 6 — Merge

Human merges Dev PR manually, tells Claude "PR AISDLC-{{NUMBER}} merged" → agent produces Handoff Summary → proceed to Stage 7

### After Stage 7 — Deploy

Human runs build/deploy locally, tells Claude "deployed" → Stage 7 complete. Stage 8 does not have to wait for this — it may already be running or complete, since it's fed directly by Stage 6, not Stage 7. Stage 9 is what actually waits on this checkpoint.

### Before Stage 8 — Test Generation

Human confirms scope of scenarios to automate → agent generates and opens PR in test repo. May run concurrently with Stage 7 — both are triggered directly off Stage 6's Handoff Summary.

### After Stage 9 — Test Execution

Human runs tests locally, reports "TESTING COMPLETE. Results: X passed, Y failed" → proceed to Stage 10

## Stage Failure Handling

1.  Show clear error message with stage name and cause
2.  Ask human: retry stage or skip (only Planner Subagent, Design Subagent, and Stage 9 skippable per pipeline-config.md — Stage 1a, Requirements Subagent, Stage 4, Stage 8 never skippable)
3.  Re-run failed stage only, do not restart pipeline

## Session Recovery (crash / token limit / network failure)

If the whole session dies rather than just one stage failing (token limit hit, network drop, session closed by accident), do not try to reconstruct context from memory. Instead:

1.  Open a new Claude Code session
2.  Run `/resume-pipeline AISDLC-{{NUMBER}}`, which reads docs/{{STORY_ID}}/resume-context.md — kept up to date automatically by the `log-pipeline-stage.js` PostToolUse hook after every approved stage, always reflecting the last approved stage and exactly what to do next
3.  The command invokes the "Next Action" agent it names via the Task tool. See `.claude/hooks/log-pipeline-stage.js` for exactly how that file is written.

## Rules

See `.claude/rules/pipeline-rules.md` — applies to every delegated stage. Orchestrator itself never calls Jira/GitHub/Confluence directly; it only routes between agents.

## Hooks

Real hooks configured in `.claude/settings.json` (`.claude/hooks/check-prereqs.js`, `.claude/hooks/log-pipeline-stage.js`). Orchestrator does not apply on_start/on_complete itself — each delegated stage agent/subagent applies its own (automatically for the three documentation subagents via the hook scripts; explicitly via `file-writer` for the rest), so docs/{{STORY_ID}}/pipeline-log.md ends up with one row per stage regardless of which agent ran it.

## Configuration Reference

-   Pipeline config: `.claude/config/pipeline-config.md`
-   Environment variables: `.env.example`
-   Global rules: `CLAUDE.md`
