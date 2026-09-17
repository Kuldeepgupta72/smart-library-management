---
name: Pipeline Rules
description: Shared, numbered guardrails every agent and subagent in the pipeline follows. Referenced, not repeated, from each agent's own Rules section.
---

# Pipeline Rules

Every agent and subagent in this pipeline follows these rules.
They are referenced from each agent's own `## Rules` section rather
than repeated inline, so a guardrail only ever needs to change in
one place. `copilot-instructions.md` stays the always-on global
file (folder structure, coding standards); this file is the
detailed, per-domain rule set agents point to.

## 1. Jira — Read-Only, One Narrow Create Exception
- Only Jira Agent may call the Jira REST API, and only via the
  `jira-reader` skill
- `jira-reader` is GET-only for browsing the backlog or fetching a
  story (Modes 1-2). The **only** write action permitted anywhere in
  the pipeline is `jira-reader` Mode 3 — creating exactly one new
  Story issue from a human-approved title/description/acceptance
  criteria draft (optional Stage 0, see jira-agent.agent.md). No
  agent — Jira Agent included — may update, transition, comment on,
  or delete a Jira issue, ever
- If a stage would normally reflect a status change back to Jira
  (e.g. "story now in development"), it must NOT do this
  automatically — tell the human to update Jira manually if needed
- No agent other than Jira Agent may reference Jira credentials or
  attempt to reach the Jira API directly
- Stage 0 (create) is optional and additive — the existing Stage 1a
  entry points are unchanged and do not require it

## 2. GitHub — Scoped Write Access
- Only `git-committer` may commit/push; only `pr-creator` may open
  or update a PR; only `pr-commenter` may post PR comments — no
  agent writes git history or calls the GitHub API outside these
  skills
- No agent ever merges a PR — merging is always a manual human
  action, confirmed back to the agent in chat
- No agent pushes directly to `main`/`GITHUB_DEFAULT_BRANCH` —
  always via a feature branch per `pipeline-config.md` naming rules
- Requirements/Design subagents never commit or open a PR (local
  files only). Planner Subagent is the one exception: on APPROVE of
  the plan, it may create the feature branch, commit the
  already-approved requirements + plan docs, and open the one Dev PR
  with a partial body — Developer Agent (Stage 4) reuses that same
  branch/PR rather than opening a second one, and updates its body
  once code exists — see docs-agent.agent.md / planner-subagent.agent.md

## 3. Confluence — Two Named Pages, Scoped Space
- Only Confluence Agent and Design Subagent may call
  `confluence-publisher`
- Each may only create or update its own one named page per story,
  in space `AISDLC` — Confluence Agent: the Batch Summary page;
  Design Subagent: the Design page — never delete pages, never
  touch pages outside that space or that don't match the story's
  title format

## 4. Data Integrity — Never Invent
- Every fact in a generated document must trace back to a real
  source: a Jira API response, a file actually read, or a human's
  answer in chat — never fabricated
- If information is genuinely missing, mark it `[pending]` (or ask
  the human) — never guess or fill a gap silently
- App schema constraint: tables are only `books`, `members`,
  `loans` — never invent additional tables, columns, or endpoints

## 5. Security
- Never hardcode credentials, tokens, or passwords in generated
  code or docs — always read from environment variables
- `.env` is never read into context, written to, or committed by
  any skill (enforced in `file-writer` and `git-committer`)

## 6. Checkpoints
- Never skip a human checkpoint silently, even on a stage marked
  skippable in `pipeline-config.md` — skipping still requires
  explicit human confirmation, and gets logged in
  `docs/{{STORY_ID}}/pipeline-log.md` with a note that it was
  skipped
- Nothing that posts or publishes externally (PR comments,
  Confluence page) proceeds without the human seeing the exact
  content first and confirming

## 7. Scope Discipline
- Each stage only touches the files it owns — e.g. Design Subagent
  never edits `impl-plan-{{STORY_ID}}.md`, Developer Agent only
  implements what's in the approved design/plan, not extra
  "while I'm here" changes
- A rejected checkpoint routes back to the agent that owns the
  rejected file — it does not restart the whole pipeline
- On REJECT: ask what specifically is wrong, then make a targeted
  edit to just the affected section(s) — never regenerate an
  entire document/review from scratch on a REJECT. This keeps
  revisions fast and makes it obvious to the human what actually
  changed between attempts.
