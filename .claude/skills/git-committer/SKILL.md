---
name: git-committer
description: Stage, commit, and push files to a feature branch in either the app repo or the test repo, with .env staging protection. Use whenever a pipeline agent needs to commit generated docs, code, or test files.
---

# Git Committer Skill

## Purpose
Stage, commit, and push files to a feature branch in either
the app repo or the test repo.

## Used By
- `developer-agent` (app repo — docs + code bundle)
- `tester-agent` (test repo)
- `confluence-agent` (app repo — `CHANGELOG.md`)

## Required Environment Variables
- `GITHUB_TOKEN`: for authentication
- `GITHUB_REPO_NAME`: app repo, owner/repo format
- `GITHUB_TEST_REPO_NAME`: test repo, owner/repo format
- `GITHUB_DEFAULT_BRANCH`: base branch e.g. main

## Configuration
Read from `.claude/config/pipeline-config.md`:
- Branch naming format (differs per repo)
- Commit message format

## Input
- repo_target: "app" or "test" — selects `GITHUB_REPO_NAME` or
  `GITHUB_TEST_REPO_NAME`
- files: list of file paths to stage
- commit_message: message following config format
- branch_name: target branch (auto generate if not provided)
- story_id: AISDLC-{{NUMBER}} for branch name generation

## Pre-flight Checks
Before running any git/GitHub command, load environment variables
from `.env` into the same shell invocation. Do NOT use `source .env`
/ `set -a; source .env` — `.env` values may contain shell-special
characters (`&`, `$`, backticks, etc.) that `source` will interpret
as shell syntax instead of literal text, silently dropping the
assignment. Instead read it line-by-line and export each value
literally:
```
while IFS='=' read -r key value; do
  case "$key" in ''|'#'*) continue ;; esac
  value="${value%$'\r'}"
  export "$key=$value"
done < .env
```
(or the PowerShell equivalent, splitting each line on the first `=`
only). This keeps values out of context — never printed, never
opened via the Read tool (per Rule 5). `GITHUB_TOKEN` is the same
token used for both the app repo and the test repo — one load
covers both `repo_target` values. Then:
- Verify `GITHUB_TOKEN` is set
- Verify the env variable for the selected repo_target is set
- Verify files list is not empty
- Verify none of the files is .env
- Verify commit_message is not empty

## Steps
1. Run pre-flight checks
2. Resolve target repo from repo_target
3. Check if feature branch exists in that repo
4. If branch does not exist, create from `GITHUB_DEFAULT_BRANCH`:
   - App repo: `feature/claude-AISDLC-{{NUMBER}}-{{description}}`
   - Test repo: `feature/tests-AISDLC-{{NUMBER}}`
5. Checkout feature branch
6. Stage specified files only (not all changes)
7. Verify .env is not staged — remove if accidentally staged
8. Commit with message format: `[AISDLC-{{NUMBER}}] {{description}}`
9. Push to remote feature branch
10. Return commit SHA, branch name, and repo used

## Output
On success:
- repo: which repo was used
- commit_sha: full commit hash
- branch_name: feature branch name
- files_committed: list of committed files
- remote_url: link to branch on GitHub
- status: success

## Error Handling
- `GITHUB_TOKEN` missing:
  → Show: "Set GITHUB_TOKEN in your .env file"
- Repo env variable missing:
  → Show: "Set GITHUB_REPO_NAME or GITHUB_TEST_REPO_NAME
           depending on which repo this stage targets"
- Branch already exists:
  → Use existing branch, do not recreate
  → Notify: "Using existing branch {{branch_name}}"
- .env accidentally staged:
  → Remove from staging immediately
  → Show: "Removed .env from staging. Never commit credentials"
- Push rejected:
  → Show error with reason
  → Suggest: git pull and retry
- Merge conflict:
  → Show: "Conflict detected. Resolve manually then retry"
