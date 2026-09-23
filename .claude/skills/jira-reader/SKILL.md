---
name: jira-reader
description: Fetch a single story, query the backlog, search by title (dedup check), or (Mode 3 only, human-approved) create a new Story issue via the project's `jira` MCP server. GET-only except Mode 3's narrow create exception — never updates/transitions/deletes issues. Use when jira-agent needs to browse the AISDLC backlog, fetch one story's details, check whether a similar story already exists, or create a new story from an approved gap/enhancement draft.
---

# Jira Reader Skill

## Purpose
Fetch a single story or query the backlog from Jira via the
project-scoped `jira` MCP server (configured in `.mcp.json`, backed
by `@aashari/mcp-server-atlassian-jira`). Mode 3 is the one narrow
exception to read-only: creating a new Story issue, and only from a
human-approved draft (see Rule 1, AGENTS.md's Pipeline Rules section).

## Used By
- `jira-agent` (`.claude/agents/jira-agent.md`) — the only agent
  permitted to invoke this skill

## Required Tools
- `mcp__jira__jira_get` — every read (Modes 1, 2, 4)
- `mcp__jira__jira_post` — Mode 3 only, and only with the exact
  human-approved payload
- **Never call** `mcp__jira__jira_put`, `mcp__jira__jira_patch`, or
  `mcp__jira__jira_delete` — the `jira` MCP server exposes all five
  HTTP-verb tools, but this skill is only ever allowed to use two of
  them. Calling any of the other three would violate Rule 1
  (AGENTS.md's Pipeline Rules section) regardless of what the caller intended.

## Pre-flight Checks
The `jira` MCP server holds `JIRA_URL`/`JIRA_EMAIL`/`JIRA_API_TOKEN`
itself (loaded from `.env` at server startup, per `.mcp.json`) — this
skill never reads `.env` or handles credentials directly. Before
calling a tool:
- If mode is single-story: verify ID matches format AISDLC-{{NUMBER}}
- If the `mcp__jira__*` tools aren't available, stop and tell the
  human: "The `jira` MCP server isn't connected — run `claude mcp
  list` to check its status, or restart the session after approving
  it."

## Modes

### Mode 1 — Fetch Single Story
Input: Story ID AISDLC-{{NUMBER}}
Steps:
1. Call `mcp__jira__jira_get` with
   `path: "/rest/api/3/issue/{{STORY_ID}}"`
2. Extract: summary, description, status.name,
   assignee.displayName, acceptance criteria, and story points —
   the story points custom field ID is instance-specific
   (commonly `customfield_10016`, but not guaranteed); if that
   field is absent from the response, search the returned fields
   for a numeric field whose name/description mentions "points" or
   "story points" before giving up and marking points `[pending]`
3. Return structured story data

### Mode 2 — Query Backlog
Input: none (queries whole AISDLC project)
Steps:
1. Call `mcp__jira__jira_get` with
   `path: "/rest/api/3/search/jql"` and
   `queryParams: {"jql": "project=\"AISDLC\" AND status!=Done AND issuetype=Story ORDER BY parent ASC"}`
   (quote the project key — Atlassian's JQL parser rejects an
   unquoted value followed by AND with a 400 error)
   (the older `/rest/api/3/search` endpoint is retired by Atlassian
   — always use `/search/jql`)
   Only issuetype=Story is returned — Sub-tasks, Tasks, and Bugs
   are excluded so the human only picks from real user stories
2. Group results by Epic
3. Return numbered list grouped by Epic for human to choose from
4. This mode is READ-ONLY — never creates or modifies issues

### Mode 4 — Search by Title (dedup check before drafting/creating)
Input: a candidate title (e.g. from `gap-scanner-agent` or a human's
Stage 0 description)
Steps:
1. Call `mcp__jira__jira_get` with
   `path: "/rest/api/3/search/jql"` and
   `queryParams: {"jql": "project=\"AISDLC\" AND summary ~ \"\\\"{{candidate_title}}\\\"\""}`
   (the escaped double-quotes force Jira's text search to match the
   quoted phrase as a whole — this is an exact/near-exact phrase
   match, not a loose keyword/OR match, so a genuinely different
   story is never mistaken for a duplicate)
2. Return matches: list of {story_id, summary, status} — empty list
   if no near-exact match found
3. This mode is READ-ONLY — never creates or modifies issues. It
   only informs whether Stage 0 should skip straight to presenting
   an existing match instead of drafting a new Story.

### Mode 3 — Create Story (the one write exception, human-approved only)
Input: human-approved title, description, acceptance_criteria (from
jira-agent's optional Stage 0 — never invoke this mode without a
prior explicit human APPROVE of this exact content, per Rule 6)
Steps:
1. Build the request body — `description` MUST be Atlassian Document
   Format (ADF), not a plain string; a plain string is rejected with
   `{"errors":{"description":"Operation value must be an Atlassian
   Document..."}}`. Split `{{description + acceptance_criteria}}` on
   blank lines into paragraphs
2. Call `mcp__jira__jira_post` with
   `path: "/rest/api/3/issue"` and
   `body: {"fields": {"project": {"key": "AISDLC"}, "issuetype": {"name": "Story"}, "summary": "{{title}}", "description": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "{{paragraph}}"}]}, ...]}}}`
3. Return the new issue key (e.g. AISDLC-{{NUMBER}}) and its URL
4. This mode may ONLY create — never update, transition, comment on,
   or delete any issue, including the one it just created. That
   means never calling `jira_put`/`jira_patch`/`jira_delete` even if
   it would be convenient to "fix up" the just-created issue.

## Output
Mode 1: title, description, acceptance_criteria, story_points,
status, assignee, story_id
Mode 2: list of {epic, story_id, summary, status} grouped by epic
— Story-type issues only, no sub-tasks
Mode 3: new story_id and its URL
Mode 4: list of {story_id, summary, status} matches, or empty list

## Error Handling
- 401 Unauthorized: → "The `jira` MCP server's credentials are
  invalid — check JIRA_EMAIL/JIRA_API_TOKEN in .env and restart the
  session so the MCP server reloads them"
- 404 Not Found: → "Story AISDLC-{{NUMBER}} not found.
  Verify story exists in AISDLC project"
- 400 Bad Request (Mode 1/2/4): → "Invalid request. Check the JQL/path passed to jira_get"
- 400/422 Bad Request (Mode 3 — create payload rejected): →
  "Story creation failed — check the project/issuetype fields are
  valid for this Jira instance"
- 400 with `"description":"Operation value must be an Atlassian
  Document..."`: → the `description` field was sent as a plain
  string instead of ADF — rebuild it per Mode 3 Step 1 and retry
  with the exact same approved content, not a regenerated draft
- MCP tool call times out or errors with a connection failure:
  → "Cannot reach the `jira` MCP server. Run `claude mcp list` to
  check its status"
- Missing fields: return available fields, flag missing ones
- Empty backlog query result: → "No pending stories found in AISDLC"
