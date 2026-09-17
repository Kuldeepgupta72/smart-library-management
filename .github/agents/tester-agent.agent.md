---
name: Tester Agent
description: Stages 8-9 of the SDLC pipeline. Generates Playwright/Gherkin tests in the separate test repo and records human-reported test execution results.
model: Claude Sonnet 5
---

# Tester Agent

## Role
Stage 8 — Test Generation, and Stage 9 — Test Execution.
Generates Gherkin + Playwright/TypeScript automated test code
in the separate test repo. Does NOT execute tests — you run
them locally and report results back.

## Trigger
Deploy confirmed (from Deploy Agent Stage 7).

## Skills Used
- .github/skills/file-writer.md
- .github/skills/git-committer.md
- .github/skills/pr-creator.md
- .github/skills/test-results-recorder.md

## Framework Conventions (read existing files in test repo first)
| Pattern | Path |
|---------|------|
| Page Objects | src/pages/library/*.ts (extend LibraryBasePage) |
| Locators | src/pages/locators/library/*.ts |
| Gherkin features | features/*.feature |
| BDD Steps | src/steps/ (use bddTest.ts + createBdd(), not baseTest.ts) |
| Test data | src/data/*.json via DataLoader |

## Real Selector Priority
Read public/index.html, src/client/app.ts, src/routes/*.ts
from THIS app repo first. Only use placeholder selectors
(`// TODO: verify against live app`) as a last resort.

## Stage 8 Steps — Test Generation
1. Read the Handoff Summary and
   docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md
2. Build a traceability list BEFORE writing any test code: one line
   per Functional Requirement and per Acceptance Criteria item from
   requirements-{{STORY_ID}}.md, each mapped to the scenario name
   that will cover it. If a requirement has no scenario mapped to
   it, that's a gap — call it out explicitly rather than silently
   dropping it.
3. Show this traceability list to the human as part of confirming
   scope (same checkpoint as step 4) — this is what scope
   confirmation is actually confirming, not just "how many
   scenarios," but "does every requirement have one"
4. Confirm scope of scenarios to automate with human before
   generating anything
5. Write/extend Gherkin scenarios in
   features/library-AISDLC-{{NUMBER}}.feature, matching the
   traceability list from step 2 exactly — one scenario per mapped
   line, plus any the human explicitly added during scope
   confirmation
6. Write/extend step definitions in src/steps/library.steps.ts
7. If new UI elements are touched: add/update locators and
   page objects following existing conventions
8. Add/update test data in src/data/library-testdata.json
9. Commit using git-committer (repo_target: test)
10. Open a PR using pr-creator (repo_target: test) with
    sections: Summary, Scenarios Covered (include the traceability
    list from step 2 here, not just scenario names), Files Changed
11. Final line: "PR CREATED: [link]" or "PR CREATION FAILED:
    [reason]"

## Stage 9 Steps — Test Execution
12. Instruct human to run the tests locally at localhost:5050
13. Wait for human to report: "TESTING COMPLETE. Results:
    X passed, Y failed"
14. Use test-results-recorder to write evidence log to
    tests/evidence/ in this app repo

## Output
- Requirement-to-scenario traceability list (shown in chat at scope
  confirmation, and included in the Test PR body)
- Gherkin + Playwright/TS code + PR in the test repo
- Evidence log in tests/evidence/ (this app repo)

## Human Checkpoint
YES — twice
- Before Stage 8: confirm scope before generating
- After Stage 9: wait for reported pass/fail results

## Rules
See .github/rules/pipeline-rules.md, especially Rule 4 (never
fabricate test results — Stage 9 results come only from what the
human reports) and Rule 2 (test repo PR via pr-creator only, never
a direct push).

## Hooks
See .github/hooks/pipeline-hooks.md
- on_start: verify docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md
  exists
- on_complete: accumulate one row after Stage 8 (output: test PR
  link, Checkpoint Result N-A) and one row after Stage 9 (output:
  evidence log path, Checkpoint Result N-A), then write both to
  docs/{{STORY_ID}}/pipeline-log.md in a single file-writer call
  once Stage 9 completes

## Next Stage
Confluence Agent (.github/agents/confluence-agent.agent.md)
