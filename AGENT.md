# ResourceHub - Project Instructions (Codex)

## Project Context

Build a production-oriented `Resource Sharing Website` with Next.js full-stack architecture.

Primary goals:
- User can upload and publish resources.
- Visitors can search, filter, preview, favorite, and download resources.
- Admin can review and moderate pending resources.

---

## MANDATORY: Agent Workflow

Every new Codex session MUST follow this workflow.

### Step 1: Initialize Environment

```bash
./init.sh
```

This script will:
- Locate application directory automatically (or use `APP_DIR`)
- Install dependencies if a Node app exists
- Start development server on `http://localhost:3000`

### Step 2: Select Next Task

Read `task.json` and choose ONE task with `passes: false`.

Selection rules:
1. Complete dependency/foundation tasks first
2. Prefer lower task id when priorities are equal
3. Never work on multiple tasks in one session

### Step 3: Implement the Task

- Follow all steps in selected task
- Reuse existing patterns and folder structure
- Keep changes minimal and focused on this task only

### Step 4: Test Thoroughly

Required checks for all code changes:

```bash
# run inside app directory
npm run lint
npm run build
```

For major UI changes (new page / major interaction updates):
- MUST validate in browser (Playwright MCP preferred)
- Verify critical user flows and visible states

### Step 5: Update Progress

Append a new entry in `progress.txt`:

```text
## [Date] - Task: [task title]

### What was done:
- [specific changes]

### Testing:
- [commands and results]

### Notes:
- [risks / blockers / follow-up]
```

### Step 6: Update Task Status + Commit

1. Update the selected task from `passes: false` to `passes: true`
2. Ensure `progress.txt` is updated
3. Commit all related changes in one commit

```bash
git add .
git commit -m "[task title] - completed"
```

Rules:
- Mark `passes: true` only when all steps are fully verified
- Never delete tasks from `task.json`
- One task, one commit

---

## Blocking Rules

If task cannot be completed due to external dependencies, do NOT fake completion.

### Typical blockers

- Missing secrets / API keys / cloud credentials
- External service outage
- Manual approval required (payment, OAuth consent, account verification)

### Required behavior when blocked

DO:
- Record current progress and blocker details in `progress.txt`
- Clearly state what human action is needed
- Stop task and keep `passes: false`

DON'T:
- Commit partial task as completed
- Set `passes: true` without real verification

---

## Project Structure (Target)

```text
/
├── AGENT.md
├── architecture.md
├── task.json
├── progress.txt
├── init.sh
├── run-automation.sh
└── resource-hub/          # Next.js application (generated during tasks)
```

## Commands

```bash
# In resource-hub/
npm run dev
npm run lint
npm run build
```

## Key Rules

1. One task per session
2. Test before completion
3. Browser test for major UI changes
4. Keep `task.json` and `progress.txt` in sync
5. Stop and report when blocked
