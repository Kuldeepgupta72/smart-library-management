---
name: Implementation Plan Template
description: Exact section structure Planner Subagent must follow when writing docs/{{STORY_ID}}/impl-plan-{{STORY_ID}}.md
---

# Implementation Plan Template

Used by: `.github/subagents/planner-subagent.agent.md`
Output file: `docs/{{STORY_ID}}/impl-plan-{{STORY_ID}}.md`

Fill in every section below. Task IDs must be stable (T1, T2, ...)
so Developer Agent can reference them during implementation.

```markdown
# Implementation Plan — {{STORY_ID}}: {{story-title}}

## Phase Overview
{{short description of each logical phase, in order}}

## Task List
| ID | Description | Complexity | Depends On |
|---|---|---|---|
| T1 | {{task}} | LOW/MEDIUM/HIGH | {{none or task ID}} |

## Blocked Tasks
{{task ID + what it is blocked by, or "None"}}

## Complexity Summary
{{count of LOW/MEDIUM/HIGH tasks, overall story complexity estimate}}
```

## Worked Example (AISDLC-18, filter/sort books)

```markdown
## Task List
| ID | Description | Complexity | Depends On |
|---|---|---|---|
| T1 | Add query param parsing to books route | LOW | none |
| T2 | Add filter/sort SQL to books query | MEDIUM | T1 |
| T3 | Add pagination to books query | MEDIUM | T2 |
| T4 | Add filter UI + sort headers | MEDIUM | T3 |

## Complexity Summary
1 LOW, 3 MEDIUM. Overall story complexity: MEDIUM — no schema
changes, contained to one endpoint and one UI section
```
