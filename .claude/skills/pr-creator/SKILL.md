---
name: pr-creator
description: Create or update a Pull Request in either the app repo or the test repo via the project's `github` MCP server, enforcing required PR body sections. Use whenever planner-subagent, developer-agent, or tester-agent needs to open or update a PR.
---

# PR Creator Skill

## Purpose
Create or update a Pull Request in either the app repo or the test
repo via the project-scoped `github` MCP server (configured in
`.mcp.json`, backed by `@modelcontextprotocol/server-github`).

## Used By
- `planner-subagent` (app repo — opens the Dev PR early, partial body)
- `developer-agent` (app repo — reuses the same Dev PR, updates its body)
- `tester-agent` (test repo — Test PR)

## Required Tools
- `mcp__github__list_pull_requests` — check for an existing PR on the branch
- `mcp__github__create_pull_request` — open a new PR
- `mcp__github__update_issue` — update an existing PR's title/body
  (GitHub stores PR title/body on the underlying issue record, so
  `update_issue` with the PR's number as `issue_number` is the
  correct tool — there is no separate `update_pull_request` tool)
- **Never call** `mcp__github__merge_pull_request` — merging is
  always a manual human action (Rule 2, AGENTS.md's Pipeline Rules section); this
  skill only ever creates or updates PRs, never merges them

## Required Environment Variables (read by the `github` MCP server itself)
- `GITHUB_REPO_NAME`: app repo, owner/repo format
- `GITHUB_TEST_REPO_NAME`: test repo, owner/repo format
- `GITHUB_DEFAULT_BRANCH`: base branch for PR target

This skill does not read `GITHUB_TOKEN` itself — the `github` MCP
server holds it (loaded from `.env` at server startup, per
`.mcp.json`).

## Input
- repo_target: "app" or "test"
- source_branch: feature branch to merge from
- pr_title: format from `pipeline-config.md` (differs per repo)
- pr_body: for a normal (full) create/update, must contain the
  required sections for repo_target:
  - App repo: Summary, Changes Made, Known Limitations,
    Reviewer Checklist
  - Test repo: Summary, Scenarios Covered, Files Changed
- allow_partial: optional, default false. When true (planner-subagent's
  early-PR call only), skip the full-section check — pr_body only
  needs a `Summary` section; any section not yet knowable (e.g.
  `Changes Made` before code exists) must be explicitly marked
  `[pending: ...]` rather than omitted silently
- action: optional, default "create". Set to "update" to update an
  already-existing PR's title/body in place (developer-agent uses
  this to fill in the sections planner-subagent marked `[pending]`)

## Pre-flight Checks
- Resolve `owner`/`repo` from `GITHUB_REPO_NAME` or
  `GITHUB_TEST_REPO_NAME` depending on `repo_target`
- Verify source_branch exists on remote
- Verify pr_body contains all required sections for repo_target,
  unless `allow_partial` is true, in which case only `Summary` is
  required and any other missing section must be marked `[pending: ...]`
- If any required section missing: stop and request missing content
- If the `mcp__github__*` tools aren't available, stop and tell the
  human: "The `github` MCP server isn't connected — run `claude mcp
  list` to check its status, or restart the session after approving
  it."

## Steps
1. Run pre-flight checks
2. Resolve target repo (`owner`, `repo`) from repo_target
3. Validate PR body sections present (full check, or partial check
   if `allow_partial`)
4. Check if PR already exists for this branch — call
   `mcp__github__list_pull_requests` with `owner`, `repo`,
   `head: "{{owner}}:{{source_branch}}"`, `state: "open"`
5. If PR exists and `action` is "create" (default): return existing
   PR URL and stop — never open a second PR for the same branch
6. If PR exists and `action` is "update": call
   `mcp__github__update_issue` with `owner`, `repo`,
   `issue_number: {{pr_number}}`, and only the fields being changed
   (typically `body`, sometimes `title`). Return the updated PR URL
   and stop
7. If PR does not exist (regardless of `action`): call
   `mcp__github__create_pull_request` with `owner`, `repo`, `title`,
   `head: source_branch`, `base: GITHUB_DEFAULT_BRANCH`, `body`
8. Return PR URL and PR number

## Output
On success:
- repo: which repo was used
- pr_url: full URL to PR on GitHub
- pr_number: PR number
- pr_title: confirmed title
- status: created, updated, or already_exists

## Error Handling
- `mcp__github__*` tool call fails with an auth/permission error:
  → Show: "The `github` MCP server's credentials are invalid or
    lack repo/pull_requests scope — check GITHUB_TOKEN in .env and
    restart the session so the MCP server reloads it"
- Source branch not found:
  → Show: "Branch {{source_branch}} not found on remote.
           Ensure git-committer pushed the branch"
- PR already exists and action is "create":
  → Show existing PR URL, do not create duplicate
- `action` is "update" but no PR exists for the branch:
  → Show: "No existing PR found on {{source_branch}} to update —
           create one first"
- Missing PR sections (full check):
  → List exactly which sections are missing
  → Do not create/update PR until all required sections present
- Missing `Summary` under `allow_partial`:
  → Even a partial PR body must have a Summary — stop and request it
- 422 Validation error from the tool call:
  → Show full error message returned by the MCP tool
- MCP tool call times out or errors with a connection failure:
  → "Cannot reach the `github` MCP server. Run `claude mcp list` to
    check its status"
