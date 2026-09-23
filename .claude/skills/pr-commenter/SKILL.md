---
name: pr-commenter
description: Post code review findings as comments on an existing GitHub PR via the project's `github` MCP server, only after explicit human confirmation. Use only from reviewer-agent — never auto-posts.
---

# PR Commenter Skill

## Purpose
Post code review findings as comments on an existing GitHub PR via
the project-scoped `github` MCP server (configured in `.mcp.json`,
backed by `@modelcontextprotocol/server-github`).

## Used By
- `reviewer-agent` (`.claude/agents/reviewer-agent.md`)

## Required Tools
- `mcp__github__add_issue_comment` — GitHub stores PR comments on the
  underlying issue record, so this is the correct tool for posting a
  top-level PR comment (there is no separate "add PR comment" tool)

## Required Environment Variables (read by the `github` MCP server itself)
- `GITHUB_REPO_NAME`: app repo, owner/repo format

This skill does not read `GITHUB_TOKEN` itself — the `github` MCP
server holds it (loaded from `.env` at server startup, per
`.mcp.json`).

## Input
- pr_number: number of the Dev PR to comment on
- findings: list of findings, each tagged Issue or Suggestion,
  with file/line reference and description

## Pre-flight Checks
- Resolve `owner`/`repo` from `GITHUB_REPO_NAME`
- Verify pr_number exists and is open
- Verify findings list is not empty
- Verify human has confirmed before posting (never auto-post)
- If the `mcp__github__*` tools aren't available, stop and tell the
  human: "The `github` MCP server isn't connected — run `claude mcp
  list` to check its status, or restart the session after approving
  it."

## Steps
1. Run pre-flight checks
2. Show numbered findings list to human for confirmation
3. Wait for explicit human confirmation
4. For each finding, format as: **[Issue|Suggestion]** description
   (file: {{path}}, line: {{line}})
5. Call `mcp__github__add_issue_comment` with `owner`, `repo`,
   `issue_number: {{pr_number}}`, `body: "{{formatted_finding}}"`
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
- `mcp__github__*` tool call fails with an auth/permission error:
  → Show: "The `github` MCP server's credentials are invalid or
    lack permission to comment on this PR — check GITHUB_TOKEN in
    .env and restart the session so the MCP server reloads it"
- PR not found or closed:
  → Show: "PR #{{pr_number}} not found or already closed"
- Human has not confirmed:
  → Do not post anything, wait for confirmation
- Partial failure (some comments posted, some failed):
  → Report exactly which findings posted and which failed
- MCP tool call times out or errors with a connection failure:
  → "Cannot reach the `github` MCP server. Run `claude mcp list` to
    check its status"
