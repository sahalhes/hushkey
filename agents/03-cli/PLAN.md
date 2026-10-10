# Agent 03-cli: CLI & Developer Experience

## Objective and scope
Deliver the cli & developer experience workstream for the local Hushkey MVP.

## Ownership
src/cli.ts, tests/cli.test.mjs, docs/cli.md; this plan. Do not modify other agents’ files.

## Dependencies and prerequisites
Architecture and core interface. Node 22; synthetic secrets only.

## Detailed implementation tasks
1. Implement init, scan, sanitize, restore, doctor, status.
2. stdin/file input.
3. safe errors.
4. local mappings.
5. wire integration commands..

## Expected deliverables
Executable CLI and command documentation.

## Acceptance criteria
No secret-bearing diagnostic output; explicit restore authorization.

## Required tests
Command success/failure, unsafe destinations, stdin, missing config. Run applicable tests before handoff and record exact results.

## Risks and security constraints
No real credentials, network credential access, publishing, deployment or remote pushes. Deterministic detection has false negatives. Never claim universal interception. Fail closed on verification errors; never log original values. Shared workspace: coordinate interfaces, retain exclusive file ownership.

## Progress checklist
- [x] Prerequisites reviewed
- [x] Implementation/research complete
- [x] Tests/review complete
- [x] Handoff delivered

## Handoff instructions
Update this plan with final status, file list, executed checks, limitations and interface changes. Send lead concise evidence; do not mark complete without deliverables.

## Current status
Complete; implementation and CLI tests verified.

## Implementation evidence
Owned files: src/cli.ts, tests/cli.test.mjs, docs/cli.md. Commands init, scan, sanitize, restore, doctor, status, Codex prompt workflow and ChatGPT local companion workflow are implemented. Config accepts custom patterns; input is UTF-8 stdin/file limited to 10 MiB. Output and restoration refuse existing files; restoration needs explicit authorization and allowed directory. Vault persistence precedes sanitized output. Error text does not echo inputs or paths.

Attempted npm run build: blocked because tsc is not installed yet; lead is installing development dependencies. Four CLI test groups authored; execution pending build.

## Handoff status
Implementation handed to lead; all interfaces wired, including runCodex and runLocalCompanion. CLI tests now verified after compiler setup. No claim of global Codex/ChatGPT interception.

## Final verification
- npm run build: passed.
- node tests/cli.test.mjs: 4 tests passed, 0 failed; genuine stdin consumption tested using regular input descriptor. All child process launches assert absence of spawn errors.
- node --test tests/cli.test.mjs: passed.
- npm run lint && npm run typecheck && npm test: passed; all five current test files executed successfully.
- Sandbox pipe-stream behavior returned empty process.stdin content despite descriptor bytes; CLI uses bounded readSync(0) chunks to read exact supplied bytes and reject oversized input. Tests capture child stdout/stderr through private regular descriptors to avoid sandbox subprocess pipe anomalies.

## Packaging regression follow-up
The actual npm executable is a symlink. Fixed the CLI entrypoint guard to compare canonical real paths, preserving import safety. Added a regression that requires nonempty help text, an initialized vault artifact, and sanitized output when invoked via a bin symlink. Verified `npm run build`, `node tests/cli.test.mjs` (5 passed, 0 failed), `npm run lint`, and `npm run typecheck`. Release agent notified to repeat actual npm installation.

## Lead final acceptance — 2026-10-09
Complete. Reviewed deliverables and 5 CLI tests, including executable symlink and stdin. Final build, lint, typecheck, all five test files (37 named tests), and installed-package smoke pass. Earlier blocked/interim evidence is superseded by this acceptance. Protection remains scoped as documented; no live provider interception was established.
