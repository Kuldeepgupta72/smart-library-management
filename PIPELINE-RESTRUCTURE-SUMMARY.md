# Agentic SDLC Pipeline — Restructure Summary (Review Reference)

This documents every change made to `.github/` in this session, and why,
for review purposes. Full up-to-date reference for how the pipeline works
end to end is `AGENTIC-SDLC-IMPLEMENTATION.md`; this file is the
**changelog + rationale** — what changed, driven by which review comment.

---

## 1. Why — Source of the Changes

A set of review comments were given for the demo, calling out:
- Too much PR overhead — Requirements/Planner/Design each opened their
  own PR before any code existed
- No formal structure for where generated docs should live, especially
  once multiple stories are in flight
- No use of subagents, hooks, or per-agent rules
- No model pinned per agent
- No recovery path if a session died mid-pipeline (token limit, network)
- Jira access needed an explicit, enforced read-only boundary

Each change below maps to one of these.

---

## 2. Structural Change — Docs-Agent + Subagents (biggest change)

**Before:** `requirements-agent.agent.md`, `planner-agent.agent.md`,
`design-agent.agent.md` were three separate top-level agents. Each wrote
its output file, committed it, and opened its own PR — meaning a human
reviewed and merged 3 PRs before a single line of code existed.

**After:**
- `.github/agents/docs-agent.agent.md` (Documentation Agent) — new thin
  parent agent, Stage 1b-3
- `.github/subagents/requirements-subagent.agent.md`,
  `planner-subagent.agent.md`, `design-subagent.agent.md` — called only
  by Documentation Agent, never directly selectable from the picker
- These three now write **local, uncommitted files only** — no commit,
  no PR. Checkpoint is chat-based APPROVE/REJECT instead of "PR
  reviewed/merged"
- `developer-agent.agent.md` (Stage 4) is now the **first** agent to
  touch git: it commits the whole docs bundle + the code it writes, and
  opens **one** Dev PR covering both

**Why subagents, not just 3 renamed agents:** they should not be
independently selectable from the Copilot Chat agent picker the way a
real pipeline stage is — they only make sense with the story context
Documentation Agent hands them. Keeping them in a separate
`.github/subagents/` folder (not `.github/agents/`) makes that
non-selectability visible from the folder structure itself.

**Deleted:** `requirements-agent.agent.md`, `planner-agent.agent.md`,
`design-agent.agent.md` (backed up to `.github-backup-2026-09-10/`
before deletion).

**Files touched:** `jira-agent.agent.md` (handoff target updated),
`orchestrator-agent.agent.md` (pipeline diagram, stage table, checkpoint
list, failure handling), `pipeline-config.md`, `reviewer-agent.agent.md`
/ `tester-agent.agent.md` / `confluence-agent.agent.md` (stale
`docs/requirements.md` path references fixed to the new per-story path).

---

## 3. Per-Story Docs Folder + Story-Suffixed Filenames

**Before:** flat `docs/requirements.md`, `docs/impl-plan.md`,
`docs/design-{{STORY_ID}}.md` — would collide if two stories were ever
in flight at once, and only the design doc's filename identified which
story it belonged to.

**After:** `docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md`,
`impl-plan-{{STORY_ID}}.md`, `design-{{STORY_ID}}.md` — every file is
self-identifying and collision-proof per story.

**Still open:** the *existing* files in `docs/` (`requirements.md`,
`impl-plan.md`, `design-AISDLC-18.md`, `design-AISDLC-19.md`,
`implementation-plan-AISDLC-19.md`, plus two legacy multi-story batch docs:
`design-batch1.md`, `implementation-plan.md`) have **not yet been
physically moved** into the new `docs/{{STORY_ID}}/` structure. That's
the next step, pending a decision on what to do with the two legacy
batch files that don't map to a single story ID.

---

## 4. Templates — Exact Output Shape Per Doc Type

New `.github/templates/` folder: `requirements-template.md`,
`impl-plan-template.md`, `design-template.md` — the exact section
structure for each output doc, extracted out of the subagent files (was
previously duplicated inline in each subagent *and* in the
implementation guide) into one canonical place each subagent references.

Each template also now has a **worked example** (based on AISDLC-18)
showing real filled-in content, not just abstract placeholders — closes
the "no examples" gap identified when reviewing this against standard
prompt-structuring frameworks (CREATE: Character/Request/Examples/
Adjustments/Type/Extras).

---

## 5. Model Selection

Added `model: Claude Sonnet 5` to the YAML frontmatter of all 11
agent/subagent files (8 agents + 3 subagents), pinning a consistent
model across every stage instead of leaving it unspecified.

---

## 6. Hooks — `.github/hooks/pipeline-hooks.md`

Two lifecycle hooks, referenced (not repeated) from every agent's own
`## Hooks` section:

- **on_start** — verify every file listed in the agent's `Input`
  section actually exists before proceeding; halt and ask the human
  rather than assuming
- **on_complete** — append a row to `docs/{{STORY_ID}}/pipeline-log.md`
  (timestamp, stage, output, checkpoint result). **Batched**: fires once
  per top-level agent invocation (7 writes across a full pipeline run),
  not once per internal stage/subagent (would have been 11) — agents
  covering multiple internal stages (Documentation Agent's 3 subagents,
  Reviewer Agent's Stage 5+6, Tester Agent's Stage 8+9) accumulate rows
  in-session and flush them in one `file-writer` call
- **on_complete also writes `docs/{{STORY_ID}}/resume-context.md`** —
  a paste-ready recovery block (story ID, last approved stage,
  artifacts produced so far, next agent to select) so a session that
  dies mid-pipeline (token limit, network drop, accidental close) can
  be picked back up in a brand-new chat with zero re-explanation.
  Orchestrator's new "Session Recovery" section documents exactly this
  flow.

These are documentation-enforced (explicit steps each agent follows),
not executable hooks — GitHub Copilot custom agents have no native
pre/post lifecycle hooks, so this is the closest equivalent within the
framework.

---

## 7. Rules — `.github/rules/pipeline-rules.md`

Shared, numbered guardrail set every agent's own `## Rules` section
points to instead of repeating inline:

1. **Jira — read-only, no exceptions.** Only Jira Agent talks to Jira,
   GET-only (browse backlog / fetch one story). No agent may
   create/update/transition/delete a Jira issue, ever — this was the
   specific, explicit ask behind this rule.
2. **GitHub — scoped write access.** Only the named skills write; no
   agent ever merges a PR (always manual); no direct pushes to `main`.
3. **Confluence — single page, scoped space** (`AISDLC` only).
4. **Data integrity — never invent.** Every fact traces to a real
   source; missing info is marked `[pending]`, never guessed.
5. **Security.** No hardcoded credentials; `.env` never touched by any
   skill.
6. **Checkpoints.** Never skip silently; nothing publishes externally
   without the human seeing it first.
7. **Scope discipline + targeted-diff REJECT.** Each stage only touches
   files it owns. On REJECT, agents now make a **targeted edit** to just
   the affected section(s) instead of regenerating the whole document —
   applied to all 3 subagents and Reviewer Agent's Stage 5 checkpoint.

`copilot-instructions.md` (the always-on global file) was updated to
point at this file and to list the new folders (`subagents/`,
`templates/`, `rules/`, `hooks/`) it previously didn't mention.

---

## 8. Self-Review Steps (Requirements/Planner Subagents)

Design Subagent already had a self-review pass (severity-tagged
findings before presenting). Extended the same pattern to Requirements
Subagent (checks every requirement traces to Jira data or a human
answer) and Planner Subagent (checks every task traces to a requirement
and dependency ordering is actually valid) — both now self-check before
writing/presenting, catching gaps before a human REJECT would.

---

## 9. Discussed but NOT Implemented (suggestions only, awaiting decision)

- **Environment variable handling** — reviewer flagged direct
  `process.env.X` usage. Suggested options (centralized typed config
  module, schema validation via zod/envalid, single env-var registry in
  `pipeline-config.md`, dotenv-safe, secrets manager for CI/prod) were
  given but nothing implemented yet.
- **MCP servers** — discussed replacing the prose-based Jira/Confluence/
  GitHub skills with real MCP tool servers (more reliable than the model
  improvising HTTP calls from instructions, but adds an infra
  dependency). Not implemented — flagged as a future upgrade path.
- **Physical docs/ restructure** — per-story folder convention is
  defined and all agents reference it, but the *existing* files in
  `docs/` haven't been moved into it yet (see Section 3).

---

## 10. Full File Inventory

**New files:**
- `.github/agents/docs-agent.agent.md`
- `.github/subagents/requirements-subagent.agent.md`
- `.github/subagents/planner-subagent.agent.md`
- `.github/subagents/design-subagent.agent.md`
- `.github/templates/requirements-template.md`
- `.github/templates/impl-plan-template.md`
- `.github/templates/design-template.md`
- `.github/hooks/pipeline-hooks.md`
- `.github/rules/pipeline-rules.md`
- `.github-backup-2026-09-10/` (full pre-restructure backup)

**Deleted:**
- `.github/agents/requirements-agent.agent.md`
- `.github/agents/planner-agent.agent.md`
- `.github/agents/design-agent.agent.md`

**Modified:**
- `.github/agents/orchestrator-agent.agent.md`
- `.github/agents/jira-agent.agent.md`
- `.github/agents/developer-agent.agent.md`
- `.github/agents/reviewer-agent.agent.md`
- `.github/agents/deploy-agent.agent.md`
- `.github/agents/tester-agent.agent.md`
- `.github/agents/confluence-agent.agent.md`
- `.github/config/pipeline-config.md`
- `.github/copilot-instructions.md`
- `AGENTIC-SDLC-IMPLEMENTATION.md`
