---
name: test-results-recorder
description: Record human-reported test execution results as an evidence log under tests/evidence/. Never executes tests itself and never fabricates results — use only from tester-agent after the human reports pass/fail counts.
---

# Test Results Recorder Skill

## Purpose
Record human-reported test execution results as an evidence log.
Does NOT execute tests — execution happens locally, done by
the human against the running app at localhost:5050.

## Used By
- `tester-agent` (`.claude/agents/tester-agent.md`)

## Required Environment Variables
None — records locally reported results only

## Input
- story_id: AISDLC-{{NUMBER}}
- passed: count of passed tests, reported by human
- failed: count of failed tests, reported by human
- skipped: count of skipped tests, reported by human
- notes: optional free text from human (e.g. failure details)

## Pre-flight Checks
- Verify story_id matches format AISDLC-{{NUMBER}}
- Verify passed, failed, skipped are all provided as numbers
- Never fabricate results — if human has not reported yet,
  stop and wait

## Steps
1. Run pre-flight checks
2. Wait for human to report: "TESTING COMPLETE. Results:
   X passed, Y failed"
3. Generate evidence filename:
   `test-run-AISDLC-{{NUMBER}}-{{timestamp}}.log`
4. Write evidence log with:
   - Header: story ID, timestamp, reported by human
   - Reported counts: passed / failed / skipped
   - Any notes provided
   - Status: PASSED (0 failures) or FAILED
5. Use `file-writer` to save log to `tests/evidence/` in app repo
6. Return summary

## Output
On success:
- total_tests: passed + failed + skipped
- passed, failed, skipped: as reported
- evidence_file: path to evidence log
- status: PASSED or FAILED

## Error Handling
- Human has not reported results yet:
  → Do not proceed, show: "Waiting for you to run tests
    locally and report pass/fail counts"
- Counts missing or non-numeric:
  → Show: "Please report results as: X passed, Y failed"
- Failed count greater than zero:
  → Record as FAILED, do not block pipeline — ask human
    whether to proceed to Stage 10 or fix and re-test first
