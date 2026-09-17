# Jira Reader Skill

## Purpose
Fetch a single story or query the backlog from Jira via REST API.
Mode 3 is the one narrow exception to read-only: creating a new Story
issue, and only from a human-approved draft (see Rule 1,
pipeline-rules.md).

## Used By
- jira-agent (.github/agents/jira-agent.agent.md)

## Required Environment Variables
- JIRA_URL: base URL of Jira instance
- JIRA_EMAIL: email for authentication
- JIRA_API_TOKEN: API token for authentication
- JIRA_PROJECT_KEY: project key (our project: AISDLC)

## Pre-flight Checks
Before making any API call:
- Verify JIRA_URL is set — if not: stop and show error
- Verify JIRA_EMAIL is set — if not: stop and show error
- Verify JIRA_API_TOKEN is set — if not: stop and show error
- If mode is single-story: verify ID matches format AISDLC-{{NUMBER}}
- If any check fails: show clear message and stop

## Modes

### Mode 1 — Fetch Single Story
Input: Story ID AISDLC-{{NUMBER}}
Steps:
1. Build auth header: Basic base64(JIRA_EMAIL:JIRA_API_TOKEN)
2. GET {{JIRA_URL}}/rest/api/3/issue/{{STORY_ID}}
3. Extract: summary, description, customfield_10016 (points),
   status.name, assignee.displayName, acceptance criteria
4. Return structured story data

### Mode 2 — Query Backlog
Input: none (queries whole AISDLC project)
Steps:
1. GET {{JIRA_URL}}/rest/api/3/search
   ?jql=project="AISDLC" AND status!=Done AND issuetype=Story
   ORDER BY parent ASC
   (quote the project key — Atlassian's JQL parser rejects an
   unquoted value followed by AND with a 400 error)
   Only issuetype=Story is returned — Sub-tasks, Tasks, and Bugs
   are excluded so the human only picks from real user stories
2. Group results by Epic
3. Return numbered list grouped by Epic for human to choose from
4. This mode is READ-ONLY — never creates or modifies issues

### Mode 4 — Search by Title (dedup check before drafting/creating)
Input: a candidate title (e.g. from gap-scanner-agent or a human's
Stage 0 description)
Steps:
1. Build auth header: Basic base64(JIRA_EMAIL:JIRA_API_TOKEN)
2. GET {{JIRA_URL}}/rest/api/3/search/jql
   ?jql=project="AISDLC" AND summary ~ "\"{{candidate_title}}\""
   (the escaped double-quotes force Jira's text search to match the
   quoted phrase as a whole — this is an exact/near-exact phrase
   match, not a loose keyword/OR match, so a genuinely different
   story is never mistaken for a duplicate)
3. Return matches: list of {story_id, summary, status} — empty list
   if no near-exact match found
4. This mode is READ-ONLY — never creates or modifies issues. It
   only informs whether Stage 0 should skip straight to presenting
   an existing match instead of drafting a new Story.

### Mode 3 — Create Story (the one write exception, human-approved only)
Input: human-approved title, description, acceptance_criteria (from
jira-agent's optional Stage 0 — never invoke this mode without a
prior explicit human APPROVE of this exact content, per Rule 6)
Steps:
1. Build auth header: Basic base64(JIRA_EMAIL:JIRA_API_TOKEN)
2. Build payload:
   `{"fields": {"project": {"key": "AISDLC"}, "issuetype": {"name": "Story"}, "summary": "{{title}}", "description": "{{description + acceptance_criteria}}"}}`
3. POST {{JIRA_URL}}/rest/api/3/issue with that payload
4. Return the new issue key (e.g. AISDLC-{{NUMBER}}) and its URL
5. This mode may ONLY create — never update, transition, comment on,
   or delete any issue, including the one it just created

## Output
Mode 1: title, description, acceptance_criteria, story_points,
status, assignee, story_id
Mode 2: list of {epic, story_id, summary, status} grouped by epic
— Story-type issues only, no sub-tasks
Mode 3: new story_id and its URL
Mode 4: list of {story_id, summary, status} matches, or empty list

## Error Handling
- 401 Unauthorized: → "Check JIRA_API_TOKEN in your .env file"
- 404 Not Found: → "Story AISDLC-{{NUMBER}} not found.
  Verify story exists in AISDLC project"
- 400 Bad Request (Mode 1/2/4): → "Invalid request. Check JIRA_URL format"
- 400/422 Bad Request (Mode 3 — create payload rejected): →
  "Story creation failed — check the project/issuetype fields are
  valid for this Jira instance"
- Network timeout: retry once after 5 seconds, then show
  "Cannot reach Jira. Check JIRA_URL"
- Missing fields: return available fields, flag missing ones
- Empty backlog query result: → "No pending stories found in AISDLC"
