---
name: pr-commenter
description: Post code review findings as comments on an existing GitHub PR, only after explicit human confirmation. Use only from reviewer-agent — never auto-posts.
---

# PR Commenter Skill

## Purpose
Post code review findings as comments on an existing GitHub PR.

## Used By
- `reviewer-agent` (`.claude/agents/reviewer-agent.md`)

## Required Environment Variables
- `GITHUB_TOKEN`: must have repo and pull_requests scope
- `GITHUB_REPO_NAME`: app repo, owner/repo format

## Input
- pr_number: number of the Dev PR to comment on
- findings: list of findings, each tagged Issue or Suggestion,
  with file/line reference and description

## Pre-flight Checks
Before making any API call, load environment variables from `.env`
into the same shell invocation. Do NOT use `source .env` /
`set -a; source .env` — `.env` values may contain shell-special
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
opened via the Read tool (per Rule 5). Then:
- Verify `GITHUB_TOKEN` is set
- Verify `GITHUB_REPO_NAME` is set
- Verify pr_number exists and is open
- Verify findings list is not empty
- Verify human has confirmed before posting (never auto-post)

## Steps
1. Run pre-flight checks
2. Show numbered findings list to human for confirmation
3. Wait for explicit human confirmation
4. For each finding, format as: **[Issue|Suggestion]** description
   (file: {{path}}, line: {{line}})
5. POST request (always this exact flag order/shape so it matches
   the pipeline's permission allowlist — see `.claude/settings.json`):
   `curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" -H "Content-Type: application/json" -d '{{json_body}}' "https://api.github.com/repos/{{GITHUB_REPO_NAME}}/issues/{{pr_number}}/comments"`
   Body: `{ "body": "{{formatted_finding}}" }`
6. Repeat for each finding (one comment per finding)
7. Return count of Issues and Suggestions posted

## Output
On success:
- pr_number: PR commented on
- comments_posted: total count
- issues_count: count tagged Issue
- suggestions_count: count tagged Suggestion
- status: success

## Error Handling
- `GITHUB_TOKEN` missing:
  → Show: "Set GITHUB_TOKEN in your .env file"
- PR not found or closed:
  → Show: "PR #{{pr_number}} not found or already closed"
- Human has not confirmed:
  → Do not post anything, wait for confirmation
- 403 Forbidden:
  → Show: "GITHUB_TOKEN lacks permission to comment on this PR"
- Partial failure (some comments posted, some failed):
  → Report exactly which findings posted and which failed
