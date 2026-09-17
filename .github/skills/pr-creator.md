# PR Creator Skill

## Purpose
Create a Pull Request in either the app repo or the test repo
via the GitHub REST API.

## Used By
- developer-agent (app repo — Dev PR)
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
- pr_body: must contain the required sections for repo_target:
  - App repo: Summary, Changes Made, Known Limitations,
    Reviewer Checklist
  - Test repo: Summary, Scenarios Covered, Files Changed

## Pre-flight Checks
- Verify GITHUB_TOKEN is set
- Verify the env variable for the selected repo_target is set
- Verify source_branch exists on remote
- Verify pr_body contains all required sections for repo_target
- If any section missing: stop and request missing content

## Steps
1. Run pre-flight checks
2. Resolve target repo from repo_target
3. Validate all required PR body sections present
4. Check if PR already exists for this branch in that repo
5. If PR exists: return existing PR URL and stop
6. Make POST request:
   https://api.github.com/repos/{{repo}}/pulls
   Authorization: Bearer {{GITHUB_TOKEN}}
   Body: title, head branch, base branch, body
7. Return PR URL and PR number

## Output
On success:
- repo: which repo was used
- pr_url: full URL to PR on GitHub
- pr_number: PR number
- pr_title: confirmed title
- status: created or already_exists

## Error Handling
- GITHUB_TOKEN missing:
  → Show: "Set GITHUB_TOKEN in your .env file"
- Insufficient token permissions:
  → Show: "GITHUB_TOKEN needs repo and pull_requests scope"
- Source branch not found:
  → Show: "Branch {{source_branch}} not found on remote.
           Ensure git-committer pushed the branch"
- PR already exists:
  → Show existing PR URL, do not create duplicate
- Missing PR sections:
  → List exactly which sections are missing
  → Do not create PR until all sections present
- 422 Validation error:
  → Show full error message from GitHub API
