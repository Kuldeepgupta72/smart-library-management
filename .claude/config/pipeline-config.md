# Pipeline Configuration

Central non-sensitive configuration for the SDLC pipeline.
All agents and skills read config values from here.
Safe to commit — no tokens or passwords in this file.

## Hooks
Every agent/subagent's on_start (verify Input files exist) and
on_complete (append to docs/{{STORY_ID}}/pipeline-log.md, overwrite
docs/{{STORY_ID}}/resume-context.md) behavior is implemented as real
executable hooks, not prose. Full definition: `.claude/settings.json`
(`hooks` key) and the scripts under `.claude/hooks/`.
on_complete is batched: one write per top-level agent, not per
internal stage/subagent.

## Rules
Every agent/subagent follows the shared, numbered guardrail set in
AGENTS.md's Pipeline Rules section:
Jira read-only, GitHub/Confluence write boundaries, data integrity,
security, checkpoints, scope discipline — instead of repeating rules
inline per agent.

## Repositories
- App repo (development): env var `GITHUB_REPO_NAME`
- Test repo (Playwright/Gherkin automation): env var `GITHUB_TEST_REPO_NAME`
- Application under test runs locally at: http://localhost:5050

## Jira Configuration
- Project key: AISDLC
- Story ID format: AISDLC-{{NUMBER}}
- Fields to extract from each story:
  - summary (story title)
  - description (story details)
  - acceptance criteria (custom field)
  - story points
  - status
  - assignee
- Minimum clarifying questions to ask human: 3
- Optional Stage 0 (Gap/Enhancement → Story): the one narrow Jira
  write exception, human-approved create-only via `jira-reader`
  Mode 3 — never required, existing Stage 1a entry points are
  unaffected (see Rule 1, AGENTS.md's Pipeline Rules section)
- Stage 0 always runs a dedup check first, via `jira-reader` Mode 4
  (exact/near-exact title phrase match) — an existing match is
  presented instead of drafting a duplicate Story
- Optional Gap Scanner (before Stage 0): `gap-scanner-agent` scans
  this repo for grounded enhancement candidates and hands picked
  ones to Stage 0 one at a time — it never calls the Jira API itself
  (Rule 1 — only `jira-agent` may)
- Gap Scanner auto-triggers whenever Stage 1a's Backlog Mode query
  returns zero open Story issues — no explicit human request needed
  for the scan itself (read-only, repo-only); the human still picks
  which candidate(s) to send into Stage 0, and Stage 0's create step
  is still fully human-gated

## Branch Naming Convention
- App repo: feature/claude-{{STORY_ID}}-{{short-description}}
  Example: feature/claude-AISDLC-1-payment-gateway
- Test repo: feature/tests-{{STORY_ID}}
  Example: feature/tests-AISDLC-1
- Short description: max 5 words, lowercase, hyphen separated
- Always branch from: GITHUB_DEFAULT_BRANCH

## Commit Message Format
- Format: [{{STORY_ID}}] {{description}}
- Example: [AISDLC-1] add requirements documentation
- Keep description under 72 characters
- Use lowercase imperative tense

## PR Conventions
- Requirements/Design subagents (Stage 1b-3) never open a PR — they
  write local, uncommitted files only.
- Planner Subagent is the one exception: on human APPROVE of the
  plan, it commits the already-approved requirements + plan docs and
  opens the story's one Dev PR early, with a **partial** body
  (`allow_partial: true` on `pr-creator`) — real Summary, other
  sections marked `[pending: code not yet implemented]`.
- Developer Agent (Stage 4) reuses that same branch/PR — it never
  opens a second PR — and calls `pr-creator` with `action: "update"`
  to fill in the remaining sections once code exists. If Planner was
  skipped for a run, `pr-creator`'s create-or-return-existing check
  transparently creates the PR fresh at Stage 4 instead.
- App repo Dev PR title: [{{STORY_ID}}] {{story-title}}
- Test repo PR title: [{{STORY_ID}}] Test automation — {{story-title}}
- Dev PR required sections (full, non-partial form):
  1. Summary — 2-3 sentence overview
  2. Changes Made — bulleted list of files with reasons
     (docs/{{STORY_ID}}/ bundle + src/ code)
  3. Known Limitations — out of scope or not found items
  4. Reviewer Checklist — tick list for human reviewer
- Test PR required sections:
  1. Summary — what scenarios were automated
  2. Scenarios Covered — bulleted list of Gherkin scenarios,
     including the requirement-to-scenario traceability list (every
     Functional Requirement / Acceptance Criteria item mapped to
     the scenario covering it, gaps called out explicitly)
  3. Files Changed — features/pages/steps/data touched

## Code Review
- Review checklist areas: Correctness, Scope Discipline, Error
  Handling, Consistency, Security, Regression Risk, Test
  Coverage Gaps (informational only)
- Findings posted as GitHub PR comments, tagged Issue or
  Suggestion, only after human confirms

## Confluence Page Configuration
- Space key: AISDLC (both page types below, no exceptions)
- Batch Summary page (owned by `confluence-agent`, Stage 10):
  - Page title format: {{STORY_ID}} - {{story-title}} - Batch Summary
  - Sections in order:
    1. Story Overview
    2. Design Doc Link
    3. Code Changes Summary
    4. Code Review Findings
    5. QA Results (from human-reported test execution)
    6. Build/Deploy Outcome
    7. PR References (app repo + test repo)
- Design page (owned by `design-subagent`, Stage 1b-3, on human
  APPROVE of the design doc):
  - Page title format: {{STORY_ID}} - {{story-title}} - Design
  - Content: the approved `design-{{STORY_ID}}.md` content in full
- Both: update page if already exists, create if not
- Mark genuinely missing info as [pending] rather than blocking

## Pipeline Stage Configuration
- Stage timeout: 10 minutes per stage (excludes human checkpoints)
- Retry attempts on API failure: 1
- Stages that can NEVER be skipped:
  - Stage 1a Jira Lookup
  - Requirements Subagent (Stage 1b-3)
  - Stage 4 Development
  - Stage 8 Test Generation
- Skippable with human confirmation: Planner Subagent, Design
  Subagent (Stage 1b-3), Stage 9 Test Execution

## Test Configuration
- Test repo structure: features/, src/pages/, src/steps/,
  src/data/ (see GITHUB_TEST_REPO_NAME repo for conventions)
- Feature file naming: features/library-{{STORY_ID}}.feature
- Real selectors sourced from: public/index.html,
  src/client/app.ts, src/routes/*.ts in the app repo
- Test execution: manual, human runs locally at localhost:5050
- App tables (never invent others): books, members, loans

## Output Documents Location
All pipeline generated documents go to a per-story folder,
docs/{{STORY_ID}}/, so multiple stories in flight never collide:
- docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md (Requirements Subagent output)
- docs/{{STORY_ID}}/impl-plan-{{STORY_ID}}.md    (Planner Subagent output)
- docs/{{STORY_ID}}/design-{{STORY_ID}}.md       (Design Subagent output)

All three files are written locally by Documentation Agent's
subagents. Planner Subagent commits `requirements-{{STORY_ID}}.md`
and `impl-plan-{{STORY_ID}}.md` (and opens the story's one Dev PR,
partial body) as soon as its plan is human-approved.
`design-{{STORY_ID}}.md` stays uncommitted until Developer Agent
(Stage 4), which commits it alongside the code it writes to src/ and
updates the same Dev PR's body.

Every agent/subagent also appends to
docs/{{STORY_ID}}/pipeline-log.md and overwrites
docs/{{STORY_ID}}/resume-context.md via the real `.claude/settings.json`
hooks, giving a running audit trail of which stage ran when, what it
produced, and its checkpoint result, plus crash-recoverable state.

Source code goes to: src/
Handoff summary (Stage 6) is posted in chat, not a repo file
