# Agent 04-codex: Codex Integration

## Objective and scope
Deliver the codex integration workstream for the local Hushkey MVP.

## Ownership
src/codex.ts, tests/codex.test.mjs, docs/codex.md; this plan. Do not modify other agents’ files.

## Dependencies and prerequisites
Stable core. Node 22; synthetic secrets only.

## Detailed implementation tasks
1. Implement explicit supplied-prompt wrapper.
2. use supported exec stdin.
3. isolate working directory.
4. constrain execution flags.
5. reject unverified broad/proxy protection.
6. capture child stdin in synthetic tests..

## Expected deliverables
Wrapper, capture tests, coverage documentation.

## Acceptance criteria
Only sanitized supplied prompt passed; unsupported modes rejected.

## Required tests
Outbound synthetic capture; failures prevent spawn; bypass rejection. Run applicable tests before handoff and record exact results.

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
Complete: implementation, local build and all six synthetic boundary tests passed; independent security review remains lead-owned.

## Implementation details and coordinated interface

`runCodex(text, vault, vaultPath, options)` is exported from `src/codex.ts`; `options` supports `mode` (only `prompt`), a trusted local `executable`, bounded `timeoutMs`, and core custom detection rules. It returns `{exitCode, replacements}`. Agent 03 has wired this interface into its CLI without executable or arbitrary flag passthrough.

Execution order is mode/options validation, core sanitization with verification, private vault persistence, re-verification against the merged persisted mappings, isolated temporary cwd creation, fixed direct subprocess launch, stdin handoff, successful exit, cleanup. Invalid mode, failed sanitization, and persistence failure never start a child. Child outputs are discarded; runtime environment forwarding is explicitly limited. Authentication remains Codex's existing local login. No vault or authentication contents are opened by the integration.

## Deliverables and evidence

- `src/codex.ts`: typed supplied-prompt subprocess wrapper.
- `tests/codex.test.mjs`: synthetic capture, consistency, env filtering, persistence-before-launch, no-spawn rejection, subprocess failure, timeout, cleanup.
- `docs/codex.md`: exact protection boundary, official flag sources, existing-login requirements, unsupported transports, output limitation.

Executed `npm run build`: passed with the real TypeScript compiler. Executed `node tests/codex.test.mjs`: 6 tests passed, 0 failed. The test harness reads child stdin with `fs.readFileSync(0)`; a Node stream reader in this environment saw empty input despite OS stdin containing bytes. The synchronous fd capture verifies the actual sanitized bytes and fixed arguments handed to the subprocess. The lead will run the full suite through its environment-compatible test runner.

## Remaining risks and handoff

Fake executable tests establish the local stdin handoff only; no live provider transport was tested. Read-only sandboxing does not stop filesystem reads. Current required flags are verified against the official reference; older CLI versions fail without weakening them. Codex response output is currently suppressed, and timeout terminates the direct child rather than asserting process-tree containment. Lead must run the full suite and independent security review before acceptance.

## Final regression verification

After append-only vault merge and locking landed, the missing-executable test now reloads the persisted vault rather than incorrectly creating a second mapping for the same value. A sixth test proves newly merged known secrets block subprocess launch after persistence. `npm run build` passed; `node tests/codex.test.mjs` passed 6/6; `npm test` passed all five test files. Full runner file-level reporting is supplemented by the direct detailed Codex result.

## Lead final acceptance — 2026-10-09
Complete. Reviewed deliverables and 6 synthetic Codex capture/failure tests. Final build, lint, typecheck, all five test files (37 named tests), and installed-package smoke pass. Earlier blocked/interim evidence is superseded by this acceptance. Protection remains scoped as documented; no live provider interception was established.
