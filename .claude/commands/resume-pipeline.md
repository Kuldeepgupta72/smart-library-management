---
description: Resume the Agentic SDLC pipeline for a story after a crash, token-limit, or network failure, using its saved resume-context.md.
argument-hint: AISDLC-{{NUMBER}}
---

Read `docs/$ARGUMENTS/resume-context.md` in full — it always reflects
the last approved stage, every artifact produced so far, and exactly
which agent to invoke next with what input.

Then invoke the agent named in that file's "Next Action" section
(via the Task tool), handing it exactly what that section specifies.
Do not re-run any stage that resume-context.md already shows as
completed and approved.

If `docs/$ARGUMENTS/resume-context.md` does not exist, tell the human
this story has no saved resume point and offer to start it fresh with
`/run-pipeline $ARGUMENTS` instead.
