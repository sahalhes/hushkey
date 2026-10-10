# Agent 05-chatgpt: ChatGPT Integration

## Objective and scope
Deliver the chatgpt integration workstream for the local Hushkey MVP.

## Ownership
src/chatgpt.ts, tests/chatgpt.test.mjs, docs/chatgpt.md; this plan. Do not modify other agents’ files.

## Dependencies and prerequisites
Stable core and official research. Node 22; synthetic secrets only.

## Detailed implementation tasks
1. Review researched official MCP, plugin reference, and composer-extension boundaries; preserve direct source links and distinguish documented capabilities from assumptions.
2. Implement `runLocalCompanion(text, vault, vaultPath, options?)` against the stable core and persistence interface. Clone mappings, sanitize, verify no findings or known values, and save privately before returning output.
3. Export only sanitized text and replacement count. On sanitization or persistence failure return no export and expose no original values through error messages.
4. Coordinate the CLI `chatgpt` command with Agent 03: explicit input file/stdin and local file or sanitized stdout output; no provider request.
5. Document that original messages, uploaded files, and remote tool arguments may reach the platform before a tool executes. Explicitly decline global interception claims.
6. Provide a synthetic pre-paste demonstration and tests for repeated placeholders, mapping exclusion, persistent consistency, unsupported input, invalid rules, and failed persistence.

## Expected deliverables
Local companion module; synthetic automated tests; `docs/chatgpt.md` with working CLI usage, official sources, threat boundary, privacy limits, and exported interface; updated plan and evidence-based handoff.

## Acceptance criteria
No global interception claim; local-only sanitized export; mappings saved before export and excluded from results; repeated values remain stable across vault reload; failure returns no export and leaves caller mappings unchanged; generic errors contain no source values.

## Required tests
Sanitized export; mapping exclusion; error behavior. Run applicable tests before handoff and record exact results.

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
Complete, ready for independent security review and lead integration.

## Handoff evidence

Files: `src/chatgpt.ts`, `tests/chatgpt.test.mjs`, `docs/chatgpt.md`, this plan. The CLI agent wired `runLocalCompanion` to `hushkey chatgpt`. No network, deployment, credential access, or unsupported interception was added.

Checks: `npm run build` passed; `npm run lint` passed; `node tests/chatgpt.test.mjs` passed all four tests. `node --test tests/chatgpt.test.mjs` also exited successfully (the environment's runner reports a file-level count; direct execution provided named-test evidence).

Tested: sanitized-only shape and no synthetic value in returned serialization; repeated placeholders and persistence stability; persistence failure blocks export without changing caller mappings; invalid custom rules and reserved input block before vault write; non-sensitive text creates no mapping.

Limitations: no ChatGPT composer interception, app connector, or provider request; only exported text is covered; deterministic rules may miss unknown, encoded, or fragmented values; local mappings are plaintext with filesystem access restrictions. Official boundary evidence comes from Agent 01 research in `docs/integration-research.md`, reproduced with source links in companion documentation. No core interface changes required.

## Lead final acceptance — 2026-10-09
Complete. Reviewed deliverables and 4 local companion tests. Final build, lint, typecheck, all five test files (37 named tests), and installed-package smoke pass. Earlier blocked/interim evidence is superseded by this acceptance. Protection remains scoped as documented; no live provider interception was established.
