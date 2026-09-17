---
description: Run the Agentic SDLC pipeline for a Jira story end to end, starting from Stage 1a. Leave the argument empty to browse the AISDLC backlog instead of naming a story.
argument-hint: [AISDLC-{{NUMBER}}]
---

Invoke the `orchestrator-agent` subagent (via the Task tool) to run
the full Agentic SDLC pipeline.

- If an argument was given, it is a story ID in the form
  AISDLC-{{NUMBER}}: `$ARGUMENTS`. Pass it straight to `orchestrator-agent`
  so it hands off to `jira-agent` in Single Story Mode.
- If no argument was given, tell `orchestrator-agent` to start in
  Backlog Mode so `jira-agent` lists the open AISDLC stories for the
  human to choose from.

See `.claude/agents/orchestrator-agent.md` for the full stage table
and `CLAUDE.md` for the pipeline rules every stage follows.
