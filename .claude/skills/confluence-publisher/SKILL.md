---
name: confluence-publisher
description: Create or update a Confluence Batch Summary page via REST API, scoped to the AISDLC space. Use only from confluence-agent, and never invent page content — missing info stays [pending].
---

# Confluence Publisher Skill

## Purpose
Create or update a Confluence Batch Summary page via REST API.

## Used By
- `confluence-agent` (`.claude/agents/confluence-agent.md`)

## Required Environment Variables
- `CONFLUENCE_URL`: base URL of Confluence instance
- `CONFLUENCE_EMAIL`: Atlassian account email associated with the API token
- `CONFLUENCE_API_TOKEN`: API token for authentication
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
Before making any API call, load environment variables from `.env`
into the same shell invocation that will run the API call. Do NOT
use `source .env` / `set -a; source .env` — `.env` values may
contain shell-special characters (`&`, `$`, backticks, etc., e.g. a
Confluence URL with a query string) that `source` will interpret as
shell syntax instead of literal text, silently dropping the
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
opened via the Read tool (per Rule 5). `CONFLUENCE_URL` may be a
full page/UI URL rather than a bare origin — derive just the origin
for API calls, e.g.
`CONFLUENCE_BASE=$(echo "$CONFLUENCE_URL" | grep -oE '^https?://[^/]+')`,
and build requests as `{{CONFLUENCE_BASE}}/wiki/rest/api/content` (or
the correct API path for this instance). Auth is Basic (Confluence
Cloud classic API tokens reject `Authorization: Bearer` with 403) —
use `-u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN"`, same pattern as
`jira-reader`. Then:
- Verify `CONFLUENCE_URL` is set
- Verify `CONFLUENCE_EMAIL` is set
- Verify `CONFLUENCE_API_TOKEN` is set
- Verify `CONFLUENCE_SPACE_KEY` is set
- Verify page_title is not empty
- Verify page_content is not empty
- Never invent facts — any missing input must be marked [pending]

## Steps
Always use this exact curl flag order/shape (auth header first) so
calls match the pipeline's permission allowlist — see
`.claude/settings.json`:
1. Run pre-flight checks
2. Search for existing page with same title in space:
   `curl -s -G -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" --data-urlencode "title={{page_title}}" --data-urlencode "spaceKey=$CONFLUENCE_SPACE_KEY" "$CONFLUENCE_BASE/wiki/rest/api/content"`
3. If page exists:
   - Get current version number
   - Update page with PUT request
   - Increment version number by 1
4. If page does not exist:
   - Create new page with POST request
   - Set parent page if `CONFLUENCE_PARENT_PAGE_ID` provided
5. Return page URL and page ID

## API Details
Create: `curl -s -X POST -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" -H "Content-Type: application/json" -d '{{json_body}}' "$CONFLUENCE_BASE/wiki/rest/api/content"`
Update: `curl -s -X PUT -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" -H "Content-Type: application/json" -d '{{json_body}}' "$CONFLUENCE_BASE/wiki/rest/api/content/{{PAGE_ID}}"`

## Output
On success:
- page_url: full URL to Confluence page
- page_id: Confluence page ID
- version: page version number
- action: created or updated
- status: success

## Error Handling
- `CONFLUENCE_EMAIL` missing:
  → Show: "Set CONFLUENCE_EMAIL in your .env file"
- `CONFLUENCE_API_TOKEN` missing:
  → Show: "Set CONFLUENCE_API_TOKEN in your .env file"
- Space not found:
  → Show: "Space AISDLC not found.
           Check CONFLUENCE_SPACE_KEY in .env file"
- Permission denied:
  → Show: "Token lacks permission to write to this space"
- Page title conflict:
  → Append story ID to make title unique, retry creation
- Content too large:
  → Split into parent page and child pages
- 401 Unauthorized:
  → Show: "CONFLUENCE_API_TOKEN is invalid or expired"
