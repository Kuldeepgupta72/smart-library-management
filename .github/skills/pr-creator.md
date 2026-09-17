# PR Creator Skill

## Purpose
Create or update a Pull Request in either the app repo or the test
repo via the GitHub REST API.

## Used By
- planner-subagent (app repo — opens the Dev PR early, partial body)
- developer-agent (app repo — reuses the same Dev PR, updates its body)
- tester-agent (test repo — Test PR)

## Required Environment Variables
- GITHUB_TOKEN: must have repo and pull_requests scope
- GITHUB_REPO_NAME: app repo, owner/repo format
- GITHUB_TEST_REPO_NAME: test repo, owner/repo format
- GITHUB_DEFAULT_BRANCH: base branch for PR target

## Input
- repo_target: "app" or "test"
- source_branch: feature branch to merge from
- pr_title: format from pipeline-config.md (differs per repo)
- pr_body: for a normal (full) create/update, must contain the
  required sections for repo_target:
  - App repo: Summary, Changes Made, Known Limitations,
    Reviewer Checklist
  - Test repo: Summary, Scenarios Covered, Files Changed
- allow_partial: optional, default false. When true
  (planner-subagent's early-PR call only), skip the full-section
  check — pr_body only needs a Summary section; any other section
  not yet knowable must be marked [pending: ...] rather than omitted
- action: optional, default "create". Set to "update" to PATCH an
  already-existing PR's title/body in place (developer-agent uses
  this to fill in the sections planner-subagent marked [pending])

## Pre-flight Checks
- Verify GITHUB_TOKEN is set
- Verify the env variable for the selected repo_target is set
- Verify source_branch exists on remote
- Verify pr_body contains all required sections for repo_target,
  unless allow_partial is true (then only Summary is required)
- If any required section missing: stop and request missing content

## Steps
1. Run pre-flight checks
2. Resolve target repo from repo_target
3. Validate PR body sections present (full check, or partial check
   if allow_partial)
4. Check if PR already exists for this branch in that repo
5. If PR exists and action is "create" (default): return existing
   PR URL and stop — never open a second PR for the same branch
6. If PR exists and action is "update": PATCH its title/body:
   https://api.github.com/repos/{{repo}}/pulls/{{pr_number}}
   Authorization: Bearer {{GITHUB_TOKEN}}
   Body: only the fields being changed (typically body). Return the
   updated PR URL and stop
7. If PR does not exist (regardless of action): make POST request:
   https://api.github.com/repos/{{repo}}/pulls
   Authorization: Bearer {{GITHUB_TOKEN}}
   Body: title, head branch, base branch, body
8. Return PR URL and PR number

## Output
On success:
- repo: which repo was used
- pr_url: full URL to PR on GitHub
- pr_number: PR number
- pr_title: confirmed title
- status: created, updated, or already_exists

## Error Handling
- GITHUB_TOKEN missing:
  → Show: "Set GITHUB_TOKEN in your .env file"
- Insufficient token permissions:
  → Show: "GITHUB_TOKEN needs repo and pull_requests scope"
- Source branch not found:
  → Show: "Branch {{source_branch}} not found on remote.
           Ensure git-committer pushed the branch"
- PR already exists and action is "create":
  → Show existing PR URL, do not create duplicate
- action is "update" but no PR exists for the branch:
  → Show: "No existing PR found on {{source_branch}} to update —
           create one first"
- Missing PR sections (full check):
  → List exactly which sections are missing
  → Do not create/update PR until all required sections present
- Missing Summary under allow_partial:
  → Even a partial PR body must have a Summary — stop and request it
- 422 Validation error:
  → Show full error message from GitHub API
