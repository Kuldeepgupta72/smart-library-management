# Copilot Instructions

This repo implements an Agentic SDLC Pipeline: GitHub Copilot
drives planning, design, development, review, testing, and
documentation for Jira story AISDLC-{{NUMBER}}, with human
approval at nearly every stage. Two repos are involved: this
app repo (development) and a separate Playwright/TypeScript
test automation repo (GITHUB_TEST_REPO_NAME).

## Folder Structure
- `.github/agents/` — stage agents + orchestrator, selectable
  from the Copilot Chat agent picker
- `.github/subagents/` — narrower helpers called only by
  Documentation Agent (requirements/planner/design)
- `.github/templates/` — exact output section structure per doc type
- `.github/rules/` — shared numbered guardrails, referenced by
  every agent/subagent's own Rules section
- `.github/hooks/` — shared on_start/on_complete lifecycle hooks
- `.github/skills/` — reusable technical actions, read by agents
- `.github/config/` — pipeline configuration
- `docs/{{STORY_ID}}/` — generated SDLC documentation, per story
- `src/` — application source code (Node.js/Express/TypeScript)

## Coding Standards
- Prefer TypeScript/JavaScript for this app; Python only if asked
- JavaScript/TypeScript: camelCase
- Use meaningful, descriptive function and variable names
- Every function must include error handling

## Security
- Never hardcode credentials, tokens, or passwords
- Always read secrets from environment variables
- See `.env.example` for required variables

## Pointers
- Pipeline control: `.github/agents/orchestrator-agent.agent.md`
- Configuration values: `.github/config/pipeline-config.md`
- Shared rules: `.github/rules/pipeline-rules.md`
- Shared hooks: `.github/hooks/pipeline-hooks.md`
- Environment variables: `.env.example`

## Behavior
- Always ask clarifying questions before making assumptions
- Always wait for human approval at checkpoints before proceeding
- Never invent app data — tables are only: books, members, loans
- Jira is READ-ONLY — only Jira Agent talks to it, and only to
  browse/fetch, never to create/update/delete an issue. See
  `.github/rules/pipeline-rules.md` Rule 1 for full detail.
