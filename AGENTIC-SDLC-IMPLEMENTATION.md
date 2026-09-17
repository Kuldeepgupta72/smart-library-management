# Agentic SDLC Pipeline — Implementation Guide (Demo Reference)

This document explains everything implemented under `.github/` in this
repo: the **orchestrator + 7 stage agents + 3 documentation subagents**,
the **7 reusable skills**, and the **pipeline configuration**. Use it
as the script/reference for demoing the GitHub Copilot agent picker
workflow end to end.

---

## 1. The Big Idea

This repo turns GitHub Copilot Chat into a **10-stage Agentic SDLC
pipeline** that takes a Jira story (`AISDLC-{{NUMBER}}`) all the way from
requirements to a published Confluence summary — spanning **two
repositories**:

- **App repo** (this repo) — Node.js/Express/TypeScript app, port 5050
- **Test repo** (`GITHUB_TEST_REPO_NAME`) — separate Playwright/Gherkin
  automation repo

Copilot does the writing (docs, code, tests, PRs, review comments); a
human approves at every meaningful checkpoint. Nothing destructive
(merge, deploy, publish) happens without an explicit human action.

Stages 1b–3 (Requirements, Planning, Design) no longer each open
their own PR. They run as three **subagents** under one
**Documentation Agent**, writing local files to `docs/{{STORY_ID}}/`
with chat-based APPROVE/REJECT checkpoints. Nothing is committed
until Stage 4 (Developer Agent), which commits the whole
`docs/{{STORY_ID}}/` bundle plus the code it writes, and opens a
single Dev PR covering both.

```
.github/
├── copilot-instructions.md        ← global rules Copilot always applies
├── agents/                        ← 8 agent definition files (picker entries)
│   ├── orchestrator-agent.agent.md
│   ├── jira-agent.agent.md
│   ├── docs-agent.agent.md        ← Stage 1b-3 parent, calls 3 subagents
│   ├── developer-agent.agent.md
│   ├── reviewer-agent.agent.md
│   ├── deploy-agent.agent.md
│   ├── tester-agent.agent.md
│   └── confluence-agent.agent.md
├── subagents/                     ← 3 subagents called only by docs-agent
│   ├── requirements-subagent.agent.md
│   ├── planner-subagent.agent.md
│   └── design-subagent.agent.md
├── templates/                     ← exact output shape per doc type
│   ├── requirements-template.md
│   ├── impl-plan-template.md
│   └── design-template.md
├── hooks/
│   └── pipeline-hooks.md          ← on_start/on_complete, referenced
│                                     by every agent/subagent
├── rules/
│   └── pipeline-rules.md          ← shared numbered guardrails,
│                                     referenced by every agent/subagent
├── skills/                        ← 7 reusable technical actions
│   ├── jira-reader.md
│   ├── file-writer.md
│   ├── git-committer.md
│   ├── pr-creator.md
│   ├── pr-commenter.md
│   ├── confluence-publisher.md
│   └── test-results-recorder.md
└── config/
    └── pipeline-config.md         ← single source of truth for formats/rules
```

Supporting files at repo root:
- `.env.example` — every environment variable the pipeline needs (Jira,
  Confluence, GitHub), safe to commit (no real secrets)
- `docs/{{STORY_ID}}/` — per-story folder where each story's
  generated pipeline documents land (`requirements-{{STORY_ID}}.md`,
  `impl-plan-{{STORY_ID}}.md`, `design-{{STORY_ID}}.md`)
- `CHANGELOG.md` — updated by the final stage

---

## 2. How Agents Work in GitHub Copilot

Each file in `.github/agents/*.agent.md` has YAML frontmatter
(`name`, `description`) that makes it selectable from the **Copilot
Chat agent picker** in VS Code. Selecting an agent loads its
instructions as the active system prompt for that chat session — the
agent then follows its own `Steps`, calls the `Skills Used` it
declares, and respects its `Human Checkpoint` rule before advancing.

`copilot-instructions.md` is the always-on global rule file Copilot
applies regardless of which agent is active (folder structure, coding
standards, security rules, "never invent data beyond books/members/
loans").

---

## 3. The Orchestrator Agent

**File:** `.github/agents/orchestrator-agent.agent.md`

The master controller. Given a story ID (or nothing, to browse the
backlog), it walks the human through all 10 stages, delegating each
stage to the matching specialist agent, and enforces checkpoints
between them.

### Pipeline flow

| Stage | Name | Agent | Output |
|---|---|---|---|
| 1a | Jira Lookup | jira-agent | story ID + fetched Jira details |
| 1b-3 | Documentation | docs-agent → requirements-subagent | `docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md` (local, uncommitted) — **chat checkpoint** |
| 1b-3 | Documentation | docs-agent → planner-subagent | `docs/{{STORY_ID}}/impl-plan-{{STORY_ID}}.md` (local, uncommitted) — **chat checkpoint** |
| 1b-3 | Documentation | docs-agent → design-subagent | `docs/{{STORY_ID}}/design-{{STORY_ID}}.md` (local, uncommitted) — **chat checkpoint** |
| 4 | Development | developer-agent | commits `docs/{{STORY_ID}}/` bundle + `src/` code, single Dev PR (app repo) |
| 5 | Code Review | reviewer-agent | PR comments (Issue/Suggestion) — **checkpoint before posting** |
| 6 | Merge | reviewer-agent | Handoff Summary — **checkpoint: human merges PR** |
| 7 | Deploy | deploy-agent | app running at `localhost:5050` — **checkpoint** |
| 8 | Test Generation | tester-agent | PR (test repo) — **checkpoint on scope** |
| 9 | Test Execution | tester-agent | evidence log — **checkpoint: human reports results** |
| 10 | Documentation | confluence-agent | Confluence Batch Summary page |

### Context handoff between stages
Each stage's output becomes the next stage's input — e.g. the story
details Jira Agent fetches feed Documentation Agent; within
Documentation Agent, requirements feeds the planner subagent, and
both requirements + plan feed the design subagent; the full
`docs/{{STORY_ID}}/` bundle feeds Stage 4, which is also where it
first gets committed; the merged Dev PR feeds stages 7–8; reported
test results feed the final Confluence summary. This is documented
explicitly in the orchestrator so no stage has to guess what
upstream produced.

### Failure handling
On a stage failure: show the stage name + cause, ask the human to
retry or skip (only the Planner Subagent, Design Subagent, and
Stage 9 are skippable — Stage 1a, Requirements Subagent, Stage 4,
Stage 8 never are), then re-run just that stage rather than
restarting the pipeline.

---

## 4. The Stage Agents

### Stage 1a — Jira Agent
The pipeline's entry point for anything Jira-related, and the **only**
agent that talks to the Jira REST API. If given no story ID, browses
the `KAN` backlog (all stories not Done, grouped by Epic) and asks the
human to pick one. If given a story ID directly, fetches that story's
full details (summary, description, acceptance criteria, story
points, status, assignee). Purely read-only — writes no files, makes
no commits. Hands the confirmed story ID + details off to Requirements
Agent. **No human checkpoint** beyond picking a story from the list.
Uses `jira-reader` only.

### Stage 1b-3 — Documentation Agent (+ 3 subagents)
`docs-agent.agent.md` is a thin parent that calls three subagents in
sequence. None of them commit or open a PR — they only write local
files to `docs/{{STORY_ID}}/`. Each has its own chat-based
APPROVE/REJECT checkpoint before the next one runs.

- **Requirements Subagent** — takes the story handed off by Jira
  Agent, asks 5 fixed clarifying questions (constraints,
  dependencies, definition of done, NFRs, out-of-scope), writes
  `docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md`. No longer talks
  to Jira itself.
- **Planner Subagent** — reads the requirements file, breaks the
  story into a dependency-ordered task list with LOW/MEDIUM/HIGH
  complexity per task, writes
  `docs/{{STORY_ID}}/impl-plan-{{STORY_ID}}.md`.
- **Design Subagent** — reads requirements + plan, produces one
  design doc covering Architecture (with a Mermaid/ASCII diagram),
  HLD, LLD (exact schema/API/validation), and one ASCII wireframe
  per screen — plus a **self-review** pass that assigns
  HIGH/MEDIUM/LOW severity to its own findings and an overall
  APPROVED/NEEDS CHANGES verdict. Constrained to the app's real
  schema (`books`, `members`, `loans` only). Writes
  `docs/{{STORY_ID}}/design-{{STORY_ID}}.md`.

Once all three are approved, Documentation Agent hands the full
`docs/{{STORY_ID}}/` bundle to Developer Agent. Uses `file-writer`
only (no `git-committer`, no `pr-creator` — those come later).

### Stage 4 — Developer Agent
The first agent in the pipeline to actually touch git. Commits the
full `docs/{{STORY_ID}}/` bundle from Documentation Agent as its
first commit, then implements the approved design directly in the
Copilot Agent Mode session, task by task in dependency order,
committing after each task. Enforces: error handling in every
function, secrets only from env vars, no invented data. Opens **one**
Dev PR covering both docs and code, with Summary / Changes Made /
Known Limitations / Reviewer Checklist. **No checkpoint** — flows
straight to review.

### Stage 5–6 — Reviewer Agent
**Stage 5:** Reviews the Dev PR diff against the design doc across 7
areas (Correctness, Scope Discipline, Error Handling, Consistency,
Security, Regression Risk, Test Coverage Gaps), shows findings to the
human, and only posts them as GitHub PR comments after explicit
confirmation — nothing is ever auto-posted.
**Stage 6:** After the human merges the PR manually and confirms it,
produces a Handoff Summary for Testing (story ID, PR link, files
changed, what to test).

### Stage 7 — Deploy Agent
The lightest agent — no skills, just instructs the human through
pulling `main`, building, and running the app locally at
`localhost:5050`, then waits for confirmation. Purely a manual-step
gate so later automated tests have something real to hit.

### Stage 8–9 — Tester Agent
**Stage 8:** Confirms test scope with the human, then generates
Gherkin feature files + Playwright/TypeScript step definitions/page
objects/locators/test data in the **separate test repo**, following
that repo's existing conventions (`LibraryBasePage`, `bddTest.ts` +
`createBdd()`, `DataLoader`). Prefers real selectors read from this
app's `public/index.html` / `src/client/app.ts` / `src/routes/*.ts`
over placeholders. Opens a Test PR.
**Stage 9:** Does **not** execute tests itself — waits for the human
to run them locally and report "TESTING COMPLETE. Results: X passed,
Y failed", then records an evidence log via `test-results-recorder`.

### Stage 10 — Confluence Agent
Consolidates everything (requirements, design, PR links, review
findings, QA results, deploy confirmation) into one Confluence
**Batch Summary** page in space `AISDLC`, creating or updating as
needed, and updates `CHANGELOG.md`. Rule: never invent facts — mark
genuinely missing info `[pending]` instead of blocking. **Checkpoint**
before publishing.

---

## 5. The 7 Skills

Skills are the reusable, low-level "verbs" agents call — each is a
self-contained spec with required env vars, pre-flight checks, steps,
output shape, and explicit error-handling messages. This separation
means an agent's `.agent.md` stays focused on *when/why* to act, while
the skill defines *how*.

| Skill | Purpose | Used by |
|---|---|---|
| `jira-reader.md` | Fetch one story or query the backlog (read-only) via Jira REST API | jira-agent |
| `file-writer.md` | Safely write/update repo files (blocks path traversal, blocks `.env` writes) | requirements-subagent, planner-subagent, design-subagent, developer agent |
| `git-committer.md` | Branch, stage, commit, push to app or test repo; strips `.env` if accidentally staged | developer-agent, tester-agent (subagents never commit) |
| `pr-creator.md` | Open a PR via GitHub REST API in app or test repo with required body sections | developer-agent, tester-agent (subagents never open a PR) |
| `pr-commenter.md` | Post confirmed review findings as PR comments — never posts without human confirmation | reviewer-agent |
| `confluence-publisher.md` | Create/update the Confluence Batch Summary page via REST API | confluence-agent |
| `test-results-recorder.md` | Write a human-reported pass/fail evidence log (never fabricates results) | tester-agent |

### Common safety patterns across every skill
- Every skill lists **required env vars** and runs **pre-flight
  checks** before doing anything (missing token → clear error, not a
  silent failure)
- `.env` can never be written to or committed — enforced in both
  `file-writer` and `git-committer`
- Nothing that posts/publishes externally (`pr-commenter`,
  `confluence-publisher`) proceeds without explicit human confirmation
- Every skill defines exact error messages for its failure modes
  (401, 404, 422, missing branch, etc.) so agents never guess at
  troubleshooting

---

## 5b. Hooks

**File:** `.github/hooks/pipeline-hooks.md` — two lifecycle hooks
every agent/subagent applies, referenced (not repeated) from each
agent's own `## Hooks` section:

- **on_start** — before Steps run, verify every file listed in the
  agent's `Input` section actually exists; halt and ask the human
  rather than guessing if something's missing
- **on_complete** — fires once per top-level agent invocation (not
  per internal stage/subagent). Rows are accumulated in-session and
  written to `docs/{{STORY_ID}}/pipeline-log.md` in a **single**
  file-writer call at the end — e.g. Documentation Agent writes all
  3 subagent rows at once, Reviewer Agent writes its Stage 5+6 rows
  at once. Cuts file-writer calls from 11 (one per internal stage)
  down to 7 (one per picker-selectable agent) while keeping the same
  row-per-stage detail in the log

These are documentation-enforced, not executable — GitHub Copilot
custom agents don't have native pre/post hooks, so each agent
follows this as an explicit step. The payoff: a single, running,
human-readable audit trail per story instead of reconstructing what
happened from git history or chat scrollback.

---

## 5c. Rules

**File:** `.github/rules/pipeline-rules.md` — a shared, numbered
rule set every agent/subagent's own `## Rules` section points to
instead of repeating guardrails inline:

1. **Jira — read-only, no exceptions.** Only Jira Agent talks to
   Jira, and only via GET (browse backlog, fetch one story). No
   agent may create/update/transition/delete a Jira issue, ever.
2. **GitHub — scoped write access.** Only `git-committer`/
   `pr-creator`/`pr-commenter` write to GitHub; no agent merges a
   PR (always manual); no direct pushes to `main`.
3. **Confluence — single page, scoped space.** Only Confluence
   Agent publishes, only the one Batch Summary page in `AISDLC`.
4. **Data integrity — never invent.** Every fact traces to a real
   source; missing info is marked `[pending]`, never guessed.
5. **Security.** No hardcoded credentials; `.env` is never
   touched by any skill.
6. **Checkpoints.** Never skip silently; nothing publishes
   externally without the human seeing it first.
7. **Scope discipline.** Each stage only touches the files it
   owns; a rejected checkpoint routes back to that stage, not a
   full pipeline restart.

`copilot-instructions.md` stays the always-on global file (folder
structure, coding standards); `pipeline-rules.md` is the detailed,
per-domain rule set every agent references.

---

## 6. Pipeline Configuration

**File:** `.github/config/pipeline-config.md` — the single source of
truth every agent and skill reads from, so formats stay consistent
without being hardcoded per agent:

- **Repos:** app repo (`GITHUB_REPO_NAME`) vs. test repo
  (`GITHUB_TEST_REPO_NAME`); app runs at `localhost:5050`
- **Jira:** project key `KAN`, story format `AISDLC-{{NUMBER}}`, fields
  to extract, minimum 3 clarifying questions
- **Branch naming:** `feature/copilot-AISDLC-{{N}}-{{desc}}` (app) vs.
  `feature/tests-AISDLC-{{N}}` (test)
- **Commit format:** `[AISDLC-{{N}}] {{description}}`, imperative,
  <72 chars
- **PR conventions:** Requirements/Planner/Design subagents never
  open a PR (local files only); Dev PR needs Summary/Changes Made
  (docs bundle + code)/Known Limitations/Reviewer Checklist; Test PR
  needs Summary/Scenarios Covered/Files Changed
- **Code review checklist:** the 7 review areas, Issue vs. Suggestion
  tagging
- **Confluence page config:** space `AISDLC`, title format, the 7
  Batch Summary sections in order
- **Stage rules:** 10-minute timeout per stage, 1 retry on API
  failure, Stage 1a / Requirements Subagent / Stage 4 / Stage 8 can
  never be skipped
- **Output location:** per-story folder `docs/{{STORY_ID}}/` with
  story-suffixed filenames (`requirements-{{STORY_ID}}.md`,
  `impl-plan-{{STORY_ID}}.md`, `design-{{STORY_ID}}.md`,
  `pipeline-log.md`, `resume-context.md`)
- **App domain constraint:** tables are only `books`, `members`,
  `loans` — repeated everywhere so no agent invents schema

---

## 7. Environment Variables (`.env.example`)

Three credential groups, all optional-until-needed per stage:

- **Jira:** `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`,
  `JIRA_PROJECT_KEY`
- **Confluence:** `CONFLUENCE_URL`, `CONFLUENCE_API_TOKEN`,
  `CONFLUENCE_SPACE_KEY`, `CONFLUENCE_PARENT_PAGE_ID` (optional)
- **GitHub:** `GITHUB_TOKEN` (needs `repo`, `pull_requests`,
  `contents` scopes), `GITHUB_REPO_NAME`, `GITHUB_TEST_REPO_NAME`,
  `GITHUB_DEFAULT_BRANCH`, `GITHUB_BRANCH_PREFIX`

`.env.example` is committed (placeholder values only); the real
`.env` is git-ignored and never touched by any skill.

---

## 8. Human Checkpoints — Full List

These are the moments the pipeline stops and waits, in order:

1. **After Requirements Subagent** — chat-based APPROVE/REJECT
   (no PR — local file only)
2. **After Planner Subagent** — chat-based APPROVE/REJECT of the
   impl plan (no PR — local file only)
3. **After Design Subagent** — chat-based APPROVE/REJECT of the
   design doc (no PR — local file only)
4. **Before posting Stage 5 review comments** — confirm findings
5. **After Stage 6** — human merges the Dev PR manually and confirms
6. **After Stage 7** — human confirms the app is deployed locally
7. **Before Stage 8** — human confirms test scope
8. **After Stage 9** — human reports actual pass/fail counts
9. **Before Stage 10 publish** — confirm content before it goes to
   Confluence

Stage 4 (Development) runs without a checkpoint (auto-flow), by
design — code produced there is reviewed downstream at Stage 5 anyway.
Stage 1a (Jira Lookup) also has no approval gate — only a choice from
the backlog list, since nothing is written or committed at that step.

---

## 9. Demo Script Suggestion

1. Open Copilot Chat → agent picker → show the 8 `.agent.md` entries
   under `agents/` plus the 3 `.agent.md` subagents under
   `subagents/` (only reachable via Documentation Agent)
2. Select **Orchestrator Agent** (or **Jira Agent** directly), give it
   `AISDLC-1` (or leave blank to show backlog browsing grouped by Epic)
3. Show the handoff from Jira Agent (Stage 1a, fetched story details)
   into **Documentation Agent** (Stage 1b-3), which calls
   **Requirements Subagent** first — pause at its chat checkpoint
   (`docs/AISDLC-1/requirements-AISDLC-1.md` written locally, no PR,
   APPROVE/REJECT), then **Planner Subagent** — pause again at its
   chat checkpoint (`docs/AISDLC-1/impl-plan-AISDLC-1.md`)
4. Continue to **Design Subagent**, highlight the **self-review**
   section and severity tags, pause at its chat checkpoint
   (`docs/AISDLC-1/design-AISDLC-1.md`)
5. Continue to Stage 4 (Development) — show Developer Agent's first
   commit bundling the whole `docs/AISDLC-1/` folder, then code landing
   in `src/` with commits per task, then the single Dev PR covering
   both
6. Stage 5 — show the reviewer findings list *before* it posts
   anything, to demonstrate the confirm-before-post safety rule
7. Stage 7 — show the pure manual-gate agent (no skills) as a contrast
   to the automated ones
8. Stage 10 — show the Confluence Batch Summary page and the
   `CHANGELOG.md` update
9. **Crash recovery** — open `docs/AISDLC-1/resume-context.md`, show
   it's been kept up to date after every approved stage (not just
   the last one), then simulate a dead session: open a **brand-new**
   Copilot Chat window, paste the file's contents in, and show it
   picks the pipeline back up at the correct next agent with zero
   re-explanation — this is the answer to "what happens if this
   times out or the network drops mid-story"
10. Close by pointing at `.github/config/pipeline-config.md` as the
    single config source every stage/skill reads from, and
    `.env.example` as the credential contract
