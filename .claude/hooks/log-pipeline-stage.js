#!/usr/bin/env node
// PostToolUse hook (matcher: Write) — real on_complete replacement.
// When requirements-subagent/planner-subagent/design-subagent write
// their docs/{{STORY_ID}}/*.md output, automatically append a row to
// pipeline-log.md and overwrite resume-context.md, instead of relying
// on the agent to remember to do it.
const fs = require('fs');
const path = require('path');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

const STAGE_NAMES = {
  requirements: 'Requirements Subagent',
  'impl-plan': 'Planner Subagent',
  design: 'Design Subagent',
};

const NEXT_AGENT = {
  requirements: 'planner-subagent',
  'impl-plan': 'design-subagent',
  design: 'developer-agent',
};

const KIND_ORDER = ['requirements', 'impl-plan', 'design'];

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    process.exit(0);
  }

  if (input.tool_name !== 'Write') process.exit(0);

  const filePath = String((input.tool_input && input.tool_input.file_path) || '').replace(/\\/g, '/');
  const match = filePath.match(/docs\/(AISDLC-\d+)\/(requirements|impl-plan|design)-\1\.md$/);
  if (!match) process.exit(0);

  const storyId = match[1];
  const kind = match[2];
  const stageName = STAGE_NAMES[kind];

  const cwd = input.cwd || process.cwd();
  const storyDir = path.join(cwd, 'docs', storyId);
  const logPath = path.join(storyDir, 'pipeline-log.md');
  const resumePath = path.join(storyDir, 'resume-context.md');
  const timestamp = new Date().toISOString();
  const outputRel = `docs/${storyId}/${kind}-${storyId}.md`;

  fs.mkdirSync(storyDir, { recursive: true });

  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(
      logPath,
      `# Pipeline Log — ${storyId}\n\n| Timestamp | Stage/Agent | Output | Checkpoint Result |\n|---|---|---|---|\n`
    );
  }
  fs.appendFileSync(logPath, `| ${timestamp} | ${stageName} | ${outputRel} | APPROVE |\n`);

  const artifacts = KIND_ORDER
    .filter((k) => fs.existsSync(path.join(storyDir, `${k}-${storyId}.md`)))
    .map((k) => `- docs/${storyId}/${k}-${storyId}.md`);

  const nextAgent = NEXT_AGENT[kind];
  const resumeContent = `# Resume Context — ${storyId}

> Paste this whole file into a new Claude Code session, then invoke
> the agent named in "Next Action" below via the Task tool.

## Story
${storyId}

## Last Completed Stage
${stageName} — ${timestamp} — Checkpoint: APPROVE

## Artifacts Produced So Far
${artifacts.join('\n')}

## Next Action
Invoke: ${nextAgent} (.claude/agents/${nextAgent}.md)
Hand it: story ID ${storyId} and the artifacts listed above.
`;

  fs.writeFileSync(resumePath, resumeContent);
  process.exit(0);
}

main();
