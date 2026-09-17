---
name: Design Template
description: Exact section structure Design Subagent must follow when writing docs/{{STORY_ID}}/design-{{STORY_ID}}.md
---

# Design Template

Used by: `.github/subagents/design-subagent.agent.md`
Output file: `docs/{{STORY_ID}}/design-{{STORY_ID}}.md`

Fill in every section below. Constrained to the app's real schema
(`books`, `members`, `loans` only) — never invent tables.

```markdown
# Design — {{STORY_ID}}: {{story-title}}

## Architecture Document
{{Mermaid or ASCII diagram + description of new/changed components
  and their responsibilities}}

## HLD (High-Level Design)
{{functional changes per story: tables, endpoints, UI screens
  affected}}

## LLD (Low-Level Design)
{{exact schema changes, API signatures, validation logic}}

## Wireframes
{{one ASCII wireframe per affected screen}}

## Self-Review Findings
| Severity | Finding | Recommendation |
|---|---|---|
| HIGH/MEDIUM/LOW | {{finding}} | {{recommendation}} |

## Overall Decision
{{APPROVED or NEEDS CHANGES, with one-line justification}}
```

## Worked Example (AISDLC-18, filter/sort books)

```markdown
## LLD
GET /api/books?available=true&sort=title&page=1&pageSize=20
- available: boolean, optional
- sort: enum(title, author), optional, default title
- page/pageSize: integers, optional, default 1/20
- Validation: reject unknown sort values with 400 + message

## Self-Review Findings
| Severity | Finding | Recommendation |
|---|---|---|
| LOW | No max pageSize cap | Cap pageSize at 100 to avoid abuse |

## Overall Decision
APPROVED — contained to existing schema, one LOW finding is
non-blocking
```
