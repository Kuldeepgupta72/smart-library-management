# Session Context — Agentic SDLC Pipeline Work (Handoff)

Paste/reference this file at the start of a new chat so I don't need
to re-derive it. Delete this file once you're done with it — it's a
scratch handoff note, not permanent project documentation.

## What this repo is
`.github/` implements a 10-stage Agentic SDLC pipeline driven by
GitHub Copilot Chat agents (`.github/agents/*.agent.md`), reusable
skills (`.github/skills/*.md`), and central config
(`.github/config/pipeline-config.md`). Full explanation lives in
`AGENTIC-SDLC-IMPLEMENTATION.md` at repo root — read that first for
the complete picture (agent list, skill list, checkpoints, demo
script).

## Changes already made this session (all committed to disk, not yet reviewed as a batch)
1. **Split Stage 1** into two agents:
   - New file `.github/agents/jira-agent.agent.md` (Stage 1a) — owns
     all Jira REST API access (backlog browse + single-story fetch),
     read-only, hands off to Requirements Agent
   - `.github/agents/requirements-agent.agent.md` (Stage 1b) — no
     longer talks to Jira; takes the handoff, asks clarifying
     questions, writes `docs/design-batch1/requirements.md`
2. **Jira backlog query filtered to Story issue type only** — updated
   `.github/skills/jira-reader.md` Mode 2 JQL to
   `AND issuetype=Story` so sub-tasks no longer appear in backlog
   listings. Also called out explicitly in `jira-agent.agent.md`.
3. **Requirements Agent now opens a real PR + has a human checkpoint**
   — previously it only committed `docs/design-batch1/requirements.md` with no PR
   and no checkpoint (flowed straight to Planner Agent). Now it uses
   `pr-creator`, opens a PR, and waits for `APPROVE`/`REJECT` in chat
   before Stage 2 starts. Updated in `requirements-agent.agent.md`,
   `orchestrator-agent.agent.md` (diagram, context flow, checkpoint
   detail list).
4. **Requirements Agent asks all 5 clarifying questions in one message**
   instead of one-at-a-time turns, to cut back-and-forth during demos.
5. **`AGENTIC-SDLC-IMPLEMENTATION.md`** kept in sync with all of the
   above (pipeline table, stage descriptions, skills table, full
   checkpoint list, demo script).
6. Verified (no changes needed): every other agent's Human Checkpoint
   is a chat-driven text confirmation (`APPROVE`, `"PR merged"`,
   `"deployed"`, `"TESTING COMPLETE..."`, etc.) — none of them
   actually poll the GitHub API for PR approval/merge state. This is
   consistent by design across the whole pipeline, not a bug.

## Known current repo state
- On branch `feature/copilot-AISDLC-18-filter-sort-books`
- `docs/design-batch1/requirements.md` for AISDLC-18 was already committed to that
  branch during an *earlier* run — before the PR+checkpoint change
  landed, so no PR exists yet for it
- Decision not yet made: continue AISDLC-18 by manually opening a PR for
  that existing branch (retroactively satisfying the new checkpoint),
  or pick a fresh story for a clean end-to-end demo run

## What's next (per user, in the new chat)
User has a list of **review comments for the demo** to implement —
not yet stated in this session. In the new chat, ask the user to
paste/state those review comments, then implement them against the
files listed above (primarily `.github/agents/*.agent.md`,
`.github/skills/*.md`, `.github/config/pipeline-config.md`, and keep
`AGENTIC-SDLC-IMPLEMENTATION.md` in sync with any behavioral change,
as has been done consistently throughout this session).

## Useful facts
- Git branch: `feature/copilot-AISDLC-18-filter-sort-books`
- Full agent list (10): orchestrator, jira, requirements, planner,
  design, developer, reviewer, deploy, tester, confluence
- Full skill list (7): jira-reader, file-writer, git-committer,
  pr-creator, pr-commenter, confluence-publisher, test-results-recorder
- App stack: Node.js/Express/TypeScript/SQLite, port 5050, tables
  limited to books/members/loans
- Two repos involved: this app repo + separate `GITHUB_TEST_REPO_NAME`
  Playwright/Gherkin test repo
