#!/usr/bin/env node
// PreToolUse hook (matcher: Write) — real on_start replacement.
// Blocks a docs/{{STORY_ID}}/impl-plan-*.md or design-*.md write if
// the file(s) that stage depends on haven't been produced yet.
const fs = require('fs');
const path = require('path');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    process.exit(0);
  }

  if (input.tool_name !== 'Write') process.exit(0);

  const filePath = String((input.tool_input && input.tool_input.file_path) || '').replace(/\\/g, '/');
  const cwd = input.cwd || process.cwd();

  const implMatch = filePath.match(/docs\/(AISDLC-\d+)\/impl-plan-\1\.md$/);
  const designMatch = filePath.match(/docs\/(AISDLC-\d+)\/design-\1\.md$/);

  let storyId, required;
  if (implMatch) {
    storyId = implMatch[1];
    required = [`requirements-${storyId}.md`];
  } else if (designMatch) {
    storyId = designMatch[1];
    required = [`requirements-${storyId}.md`, `impl-plan-${storyId}.md`];
  } else {
    process.exit(0);
  }

  const missing = required.filter(
    (f) => !fs.existsSync(path.join(cwd, 'docs', storyId, f))
  );

  if (missing.length > 0) {
    console.error(
      `on_start check failed: docs/${storyId}/ is missing prerequisite file(s): ${missing.join(', ')}. Run the stage that produces them first.`
    );
    process.exit(2);
  }

  process.exit(0);
}

main();
