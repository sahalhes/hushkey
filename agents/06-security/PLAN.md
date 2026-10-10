# Agent 06-security: Security Engineering & Testing

## Objective and scope
Deliver the security engineering & testing workstream for the local Hushkey MVP.

## Ownership
tests/security.test.mjs, docs/security-report.md, docs/limitations.md; this plan. Do not modify other agents’ files.

## Dependencies and prerequisites
Architecture for plan; implementation for review. Node 22; synthetic secrets only.

## Detailed implementation tasks
1. Draft threat-based tests.
2. independently review core and integrations.
3. test encoded, fragmented, overlapping and multiline cases.
4. test bypass/failure paths.
5. report residual risks..

## Expected deliverables
Adversarial tests and security report.

## Acceptance criteria
Independent evidence; failures and unsupported cases explicit.

## Required tests
Logs, mappings, outbound capture, crash/failure, restoration bypass. Run applicable tests before handoff and record exact results.

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
Active: AGENTS.md reviewed. Threat-based tests drafted before implementation.

## Threat-based verification matrix

| Boundary | Attack / fault | Expected evidence |
|---|---|---|
| Detection | Known prefixes, assignments, JWT, database URLs, multiline PEM | Synthetic original absent after sanitization |
| Mapping | Repeated values, different values, overlapping detectors | Stable unique placeholders; no original in findings or public metadata |
| Representation | Escaped newlines, base64, percent encoding, concatenated fragments | Supported variants tested; unsupported variants explicitly documented as false negatives |
| Local persistence | Symlink map, permissive map, malformed map, concurrent creation | Refusal or restrictive permissions; malformed state cannot allow raw output |
| Restoration | Missing authorization, stdout, symlink destination, traversal | Explicit authorization and local file boundary enforced |
| Fail closed | Invalid regex/configuration, corrupt mapping, write failure | Nonzero result before protected output or subprocess launch |
| Codex | Synthetic fake executable captures stdin/argv; unsupported mode | Captured prompt sanitized; no mapping sent; unsupported coverage refused |
| ChatGPT | Companion output; direct-chat claims | Only local sanitized output; no claim of global prompt interception |
| Diagnostics | CLI stdout/stderr on scan and errors | Original values absent except explicitly restored local destination |

Tests will use temporary directories and synthetic values only. Captured subprocess data represents the wrapper boundary, not proof of all Codex network traffic. No real credentials or provider requests are needed. Finite tests cannot establish complete absence of leakage.

## Final status
Complete: independent seven-test suite passes (`npm run build`, `node tests/security.test.mjs`); reviewed core/vault/CLI/Codex/companion; Codex integration suite passes 5/5 (`node tests/codex.test.mjs`). Files: tests/security.test.mjs, docs/security-report.md, docs/limitations.md, this plan. No source edits or interface changes. Reported unreliable sandbox child stdin/status behavior to lead; CLI agent addressed input mechanism. Explicit residual risks include encoded/fragmented false negatives, no real provider capture, concurrent vault writers, filesystem races, custom regex denial of service, and direct-child-only timeout termination.

## Final hardening re-review
Re-reviewed exclusive NOFOLLOW/O_EXCL lock, append-only merge, conflict rejection, parent-directory fsync, 16 MiB serialization bound and conditional empty custom-match rejection. Added independent held/symlink lock and conditional-lookaround tests. Final verified commands: npm run build; node tests/security.test.mjs (9/9); node tests/core.test.mjs (11/11); node tests/codex.test.mjs (5/5). Reports replace obsolete no-lock/lost-update risk with lock contention/stale-lock recovery and untested power-loss behavior. Directory fsync failure after rename blocks output conservatively; no injected-failure claim. No source edits.

## Post-merge verification final check
Reviewed verifySanitized after mapping persistence on CLI, Codex and companion. Added independent companion stale-snapshot test: disk-known bare secret blocks return and keeps caller unchanged. Final independent executions (each exit 0): security 10/10, core 12/12, Codex 6/6. Reports updated to these counts.

## Lead final acceptance — 2026-10-09
Complete. Reviewed deliverables and 10 independent adversarial tests and final source review. Final build, lint, typecheck, all five test files (37 named tests), and installed-package smoke pass. Earlier blocked/interim evidence is superseded by this acceptance. Protection remains scoped as documented; no live provider interception was established.
