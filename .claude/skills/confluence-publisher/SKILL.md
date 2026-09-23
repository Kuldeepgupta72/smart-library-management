---
name: confluence-publisher
description: Create or update a Confluence page (Batch Summary or Design), scoped to the AISDLC space, one named page per story per caller, via the project's `confluence` MCP server. Use only from confluence-agent or design-subagent, and never invent page content — missing info stays [pending].
---

# Confluence Publisher Skill

## Purpose
Create or update a Confluence page via the project-scoped
`confluence` MCP server (configured in `.mcp.json`, backed by
`@aashari/mcp-server-atlassian-confluence`) — either the Batch
Summary page (confluence-agent) or the Design page (design-subagent).
The create/update mechanics (search-by-title, then update-or-create)
are identical for both; only `page_title`/`page_content` differ.

## Used By
- `confluence-agent` (`.claude/agents/confluence-agent.md`) — Batch
  Summary page
- `design-subagent` (`.claude/agents/design-subagent.md`) — Design
  page

## Required Tools
- `mcp__confluence__conf_get` — search for an existing page by title
- `mcp__confluence__conf_post` — create a new page
- `mcp__confluence__conf_put` — update an existing page's content
- **Never call** `mcp__confluence__conf_patch` or
  `mcp__confluence__conf_delete` — the `confluence` MCP server
  exposes all five HTTP-verb tools, but this skill only ever needs
  get/post/put, and Rule 3 (AGENTS.md's Pipeline Rules section) forbids deleting
  pages entirely.

## Required Environment Variables (for context only — do not read these)
The `confluence` MCP server holds `CONFLUENCE_URL`/`CONFLUENCE_EMAIL`/
`CONFLUENCE_API_TOKEN` itself (loaded from `.env` at server startup,
per `.mcp.json`). This skill still needs, from `.env` via the agent's
normal config/env lookup (not by reading `.env` into context):
- `CONFLUENCE_SPACE_KEY`: target space key (AISDLC)

## Optional Environment Variables
- `CONFLUENCE_PARENT_PAGE_ID`: parent page to nest under

## Configuration
Read from `.claude/config/pipeline-config.md`:
- Page title format
- Batch Summary sections structure

## Input
- page_title: AISDLC-{{NUMBER}} - {{story-title}} - Batch Summary
- page_content: full page content in markdown, covering all 7
  Batch Summary sections
- parent_page_id: optional, from `CONFLUENCE_PARENT_PAGE_ID`

## Pre-flight Checks
- Verify `CONFLUENCE_SPACE_KEY` is set (this is the only credential-
  adjacent value this skill needs directly; the MCP server handles
  the rest)
- Verify page_title is not empty
- Verify page_content is not empty
- Never invent facts — any missing input must be marked [pending]
- If the `mcp__confluence__*` tools aren't available, stop and tell
  the human: "The `confluence` MCP server isn't connected — run
  `claude mcp list` to check its status, or restart the session
  after approving it."

## Steps
1. Run pre-flight checks
2. Search for existing page with same title in space — call
   `mcp__confluence__conf_get` with `path: "/wiki/rest/api/content"`
   and `queryParams: {"title": "{{page_title}}", "spaceKey": "{{CONFLUENCE_SPACE_KEY}}"}`
3. If page exists:
   - Get current version number from the search result
   - Update page via `mcp__confluence__conf_put` (Step 5)
   - Increment version number by 1
4. If page does not exist:
   - Create new page via `mcp__confluence__conf_post` (Step 5)
   - Set parent page if `CONFLUENCE_PARENT_PAGE_ID` provided
5. Return page URL and page ID

## API Details
`body.storage` MUST include `"representation": "storage"` alongside
`"value"` — omitting it causes a server-side 500
(`NullPointerException: ... "fromFormat" is null`), not a 400, so it
is easy to miss until it actually fails against a real instance:
```json
{"type": "page", "title": "{{page_title}}", "space": {"key": "{{CONFLUENCE_SPACE_KEY}}"}, "ancestors": [{"id": "{{CONFLUENCE_PARENT_PAGE_ID}}"}], "body": {"storage": {"value": "{{html_body}}", "representation": "storage"}}}
```
`value` is Confluence storage-format XHTML (not raw markdown) —
convert headings/lists/links/code spans to `<h2>`/`<ul><li>`/`<a
href>`/`<code>` etc. before sending.

Create: call `mcp__confluence__conf_post` with
`path: "/wiki/rest/api/content"` and `body: {{json_body above}}`

Update: call `mcp__confluence__conf_put` with
`path: "/wiki/rest/api/content/{{PAGE_ID}}"` and
`body: {{json_body above, plus "version": {"number": currentVersion + 1}}}`
(the version bump is required per Step 3)

## Output
On success:
- page_url: full URL to Confluence page
- page_id: Confluence page ID
- version: page version number
- action: created or updated
- status: success

## Error Handling
- 401 from a tool call:
  → Show: "The `confluence` MCP server's credentials are invalid —
    check CONFLUENCE_EMAIL/CONFLUENCE_API_TOKEN in .env and restart
    the session so the MCP server reloads them"
- `CONFLUENCE_SPACE_KEY` missing:
  → Show: "Set CONFLUENCE_SPACE_KEY in your .env file"
- Space not found:
  → Show: "Space AISDLC not found.
           Check CONFLUENCE_SPACE_KEY in .env file"
- Permission denied (403):
  → Show: "Token lacks permission to write to this space"
- Page title conflict:
  → Append story ID to make title unique, retry creation
- Content too large:
  → Split into parent page and child pages
- MCP tool call times out or errors with a connection failure:
  → "Cannot reach the `confluence` MCP server. Run `claude mcp list`
    to check its status"
