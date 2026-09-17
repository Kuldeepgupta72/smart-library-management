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
`.claude/rules/pipeline-rules.md` (also folded into `CLAUDE.md`):
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
- Requirements/Planner/Design subagents (Stage 1b-3) never open a
  PR — they write local, uncommitted files only. The single Dev PR
  from Stage 4 covers docs + code together.
- App repo Dev PR title: [{{STORY_ID}}] {{story-title}}
- Test repo PR title: [{{STORY_ID}}] Test automation — {{story-title}}
- Dev PR required sections:
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
- Space key: AISDLC
- Page title format: {{STORY_ID}} - {{story-title}} - Batch Summary
- Batch Summary sections in order:
  1. Story Overview
  2. Design Doc Link
  3. Code Changes Summary
  4. Code Review Findings
  5. QA Results (from human-reported test execution)
  6. Build/Deploy Outcome
  7. PR References (app repo + test repo)
- Update page if already exists, create if not
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

These three files are written locally and left uncommitted by
Documentation Agent's subagents. Developer Agent (Stage 4) is the
first to commit them — as its first commit on the feature branch,
alongside the code it writes to src/.

Every agent/subagent also appends to
docs/{{STORY_ID}}/pipeline-log.md and overwrites
docs/{{STORY_ID}}/resume-context.md via the real `.claude/settings.json`
hooks, giving a running audit trail of which stage ran when, what it
produced, and its checkpoint result, plus crash-recoverable state.

Source code goes to: src/
Handoff summary (Stage 6) is posted in chat, not a repo file
