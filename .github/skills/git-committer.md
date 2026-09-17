# Git Committer Skill

## Purpose
Stage, commit, and push files to a feature branch in either
the app repo or the test repo.

## Used By
- requirements-agent, planner-agent, design-agent,
  developer-agent (app repo)
- tester-agent (test repo)

## Required Environment Variables
- GITHUB_TOKEN: for authentication
- GITHUB_REPO_NAME: app repo, owner/repo format
- GITHUB_TEST_REPO_NAME: test repo, owner/repo format
- GITHUB_DEFAULT_BRANCH: base branch e.g. main
- GITHUB_BRANCH_PREFIX: prefix for app repo feature branches

## Configuration
Read from .github/config/pipeline-config.md:
- Branch naming format (differs per repo)
- Commit message format

## Input
- repo_target: "app" or "test" — selects GITHUB_REPO_NAME or
  GITHUB_TEST_REPO_NAME
- files: list of file paths to stage
- commit_message: message following config format
- branch_name: target branch (auto generate if not provided)
- story_id: AISDLC-{{NUMBER}} for branch name generation

## Pre-flight Checks
- Verify GITHUB_TOKEN is set
- Verify the env variable for the selected repo_target is set
- Verify files list is not empty
- Verify none of the files is .env
- Verify commit_message is not empty

## Steps
1. Run pre-flight checks
2. Resolve target repo from repo_target
3. Check if feature branch exists in that repo
4. If branch does not exist, create from GITHUB_DEFAULT_BRANCH:
   - App repo: feature/copilot-AISDLC-{{NUMBER}}-{{description}}
   - Test repo: feature/tests-AISDLC-{{NUMBER}}
5. Checkout feature branch
6. Stage specified files only (not all changes)
7. Verify .env is not staged — remove if accidentally staged
8. Commit with message format: [AISDLC-{{NUMBER}}] {{description}}
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
- GITHUB_TOKEN missing:
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
