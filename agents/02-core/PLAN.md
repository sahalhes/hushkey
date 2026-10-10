# Agent 02-core: Secret Detection Engine

## Objective and scope
Deliver the secret detection engine workstream for the local Hushkey MVP.

## Ownership
src/core.ts, src/vault.ts, tests/core.test.mjs; this plan. Do not modify other agents’ files.

## Dependencies and prerequisites
Architecture interface. Node 22; synthetic secrets only.

## Detailed implementation tasks
1. Implement deterministic credential, JWT, PEM, URI and assignment detection.
2. merge overlaps.
3. stable local mapping.
4. persistence with restrictive permissions.
5. authorized destination-limited restoration.
6. custom rules..

## Expected deliverables
Typed core and synthetic unit tests.

## Acceptance criteria
Stable repeated placeholders; distinct values; no logs; fail closed.

## Required tests
Detection, overlapping/multiline matches, persistence, restoration restrictions. Run applicable tests before handoff and record exact results.

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
Implemented; real TypeScript build and 12 core tests pass. Lead review defects fixed; independent security review remains lead-coordinated.

## Implementation evidence
- Implemented typed deterministic detector and overlap merging, credential prefixes, PEM, JWT, credential URI, Bearer/Basic, quoted/escaped assignments and custom patterns.
- Generated opaque random placeholders persisted across sessions. All repeats of detected and previously known values are replaced. Findings contain positions and kinds only. Sanitization verifies absence of known original values and rescans output before mutating vault.
- Strict vault schema, private owner/permissions, no symlink components, bounded reads, atomic private writes.
- Restoration requires `authorized: true`, existing approved directory, new exclusive destination inside it; no stdout and no overwrite. Unknown placeholders block restoration.
- Input reserved `[[HUSHKEY_` syntax is rejected. Sanitization intentionally is not idempotent for already protected text to avoid ambiguous injected placeholders.
- Ran Node 22 stripped-TypeScript core tests: `node tests/core.test.mjs`, 6 passed. `node --test` subprocess wrapper failed without details in restricted runtime; lead investigating. TypeScript build pending missing tsc toolchain.

## Residual risks and handoff
Local filesystem owner is trusted; component checks cannot stop a malicious concurrent filesystem owner. Vault writes use an exclusive private lock: contention fails closed, stale snapshots merge distinct mappings, and ambiguous remapping conflicts are rejected. Abandoned locks require manual recovery after confirming no writer is running. Detection does not decode arbitrary encodings/fragments; custom regexes are trusted configuration and can consume excessive CPU. Platform permissions target Unix Node 22. No runtime network or logging. Independent adversarial review and whole-application final checks remain lead-owned.

## Lead review fixes and final verification
- Fixed concurrent stale-snapshot loss with exclusive `.lock` creation (0600, O_EXCL, NOFOLLOW), append-only merge, conflict rejection, lock ownership cleanup and no automatic stale-lock recovery.
- Persisted file and containing directory are fsynced. UTF8 serialized size is bounded to 16MiB, matching load limits. Caller mappings mutate only after successful persistence.
- Custom regexes producing zero-length matches on nonempty input now fail generically rather than silently skipping.
- `npm run build` using real TypeScript toolchain passes; `node tests/core.test.mjs` passes 12/12 including concurrency/conflict/lock/oversize regressions.
- Exported `verifySanitized(text,vault,options?)`; consumers must call it after persistence to account for concurrently merged mappings before output or subprocess transmission. Added a tested post-merge newly-known-value block.

## Lead final acceptance — 2026-10-09
Complete. Reviewed deliverables and 12 core tests. Final build, lint, typecheck, all five test files (37 named tests), and installed-package smoke pass. Earlier blocked/interim evidence is superseded by this acceptance. Protection remains scoped as documented; no live provider interception was established.
