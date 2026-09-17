# File Writer Skill

## Purpose
Write or update files in the repository safely.

## Used By
- requirements-agent, planner-agent, design-agent,
  developer-agent (all write to docs/ or src/ in the app repo)

## Required Environment Variables
None — operates on local filesystem

## Input
- file_path: path relative to repo root
- content: file content as string
- overwrite: boolean flag (default: true)

## Pre-flight Checks
- Validate file_path does not start with /
- Validate file_path does not contain ../
- Validate file_path is not .env (never write to .env)
- Validate content is not empty

## Steps
1. Run pre-flight checks on file_path
2. Resolve full path from repo root
3. Create parent directories if they do not exist
4. If file exists and overwrite is false: skip and notify
5. Write content to file
6. Confirm write with file path and byte size

## Output
On success:
- file_path: where file was written
- size: file size in bytes
- action: created or updated
- status: success

## Error Handling
- Permission denied: cannot write to path
  → Show: "Permission denied writing to {{file_path}}"
- Path escapes repo root: security violation
  → Show: "Invalid path. Cannot write outside repo root"
- Attempt to write .env: security rule
  → Show: "Cannot write to .env file directly.
           Use .env.example for reference only"
- Disk full: no space available
  → Show: "Disk full. Free up space and try again"
- Empty content: nothing to write
  → Show: "Content is empty. File not written"
