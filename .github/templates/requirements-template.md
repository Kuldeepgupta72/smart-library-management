---
name: Requirements Template
description: Exact section structure Requirements Subagent must follow when writing docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md
---

# Requirements Template

Used by: `.github/subagents/requirements-subagent.agent.md`
Output file: `docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md`

Fill in every section below. Do not omit a section — mark it
`None identified` if genuinely empty, never delete it.

```markdown
# Requirements — {{STORY_ID}}: {{story-title}}

## Story Overview
{{summary, description, story points, assignee, status — from Jira}}

## Functional Requirements
{{bulleted list of what the system must do}}

## Non Functional Requirements
{{performance, security, scalability — from Q4 answer}}

## Acceptance Criteria
{{from Jira, verbatim or lightly cleaned up}}

## Clarifications and Decisions
{{Q1-Q5 answers, one bullet per question, in order:
  constraints, dependencies, definition of done, NFRs, out-of-scope}}

## Out of Scope
{{from Q5 answer — explicitly excluded items}}
```

## Worked Example (AISDLC-18, filter/sort books)

```markdown
## Functional Requirements
- Books list endpoint accepts `available` (boolean), `sort`
  (title|author), and `page`/`pageSize` query params
- UI adds a filter dropdown and column-header sort controls

## Clarifications and Decisions
- Constraints: must reuse the existing `books` table, no new columns
- Dependencies: none — self-contained within the books list feature
- Definition of done: filter + sort + pagination all work together,
  combinable in a single request
- NFRs: response time under 200ms for the existing dataset size
- Out of scope: no filter/sort added to members or loans lists
```
