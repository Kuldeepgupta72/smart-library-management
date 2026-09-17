# Confluence Publisher Skill

## Purpose
Create or update a Confluence page via REST API — either the Batch
Summary page (confluence-agent) or the Design page (design-subagent).
The create/update mechanics (search-by-title, then update-or-create)
are identical for both; only page_title/page_content differ.

## Used By
- confluence-agent (.github/agents/confluence-agent.agent.md) — Batch
  Summary page
- design-subagent (.github/subagents/design-subagent.agent.md) —
  Design page

## Required Environment Variables
- CONFLUENCE_URL: base URL of Confluence instance
- CONFLUENCE_EMAIL: Atlassian account email associated with the API token
- CONFLUENCE_API_TOKEN: API token for authentication
- CONFLUENCE_SPACE_KEY: target space key (AISDLC)

## Optional Environment Variables
- CONFLUENCE_PARENT_PAGE_ID: parent page to nest under

## Configuration
Read from .github/config/pipeline-config.md:
- Page title format
- Batch Summary sections structure

## Input
- page_title: AISDLC-{{NUMBER}} - {{story-title}} - Batch Summary
- page_content: full page content in markdown, covering all 7
  Batch Summary sections
- parent_page_id: optional, from CONFLUENCE_PARENT_PAGE_ID

## Pre-flight Checks
- Verify CONFLUENCE_URL is set
- Verify CONFLUENCE_EMAIL is set
- Verify CONFLUENCE_API_TOKEN is set
- Verify CONFLUENCE_SPACE_KEY is set
- Verify page_title is not empty
- Verify page_content is not empty
- Never invent facts — any missing input must be marked [pending]

## Steps
1. Run pre-flight checks
2. Search for existing page with same title in space:
   GET {{CONFLUENCE_URL}}/rest/api/content
   ?title={{page_title}}&spaceKey={{CONFLUENCE_SPACE_KEY}}
3. If page exists:
   - Get current version number
   - Update page with PUT request
   - Increment version number by 1
4. If page does not exist:
   - Create new page with POST request
   - Set parent page if CONFLUENCE_PARENT_PAGE_ID provided
5. Return page URL and page ID

## API Details
Create: POST {{CONFLUENCE_URL}}/rest/api/content
Update: PUT {{CONFLUENCE_URL}}/rest/api/content/{{PAGE_ID}}
Auth: Basic {{CONFLUENCE_EMAIL}}:{{CONFLUENCE_API_TOKEN}} (Confluence Cloud
classic API tokens reject Bearer auth with 403)
Content-Type: application/json

## Output
On success:
- page_url: full URL to Confluence page
- page_id: Confluence page ID
- version: page version number
- action: created or updated
- status: success

## Error Handling
- CONFLUENCE_EMAIL missing:
  → Show: "Set CONFLUENCE_EMAIL in your .env file"
- CONFLUENCE_API_TOKEN missing:
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
