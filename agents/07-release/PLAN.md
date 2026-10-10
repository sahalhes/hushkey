# Agent 07-release: Packaging & Release Readiness

## Objective and scope
Deliver the packaging & release readiness workstream for the local Hushkey MVP.

## Ownership
package.json, tsconfig.json, README.md, LICENSE, examples/, .github/, docs/release-checklist.md; this plan. Do not modify other agents’ files.

## Dependencies and prerequisites
Stable commands and integration behavior. Node 22; synthetic secrets only.

## Detailed implementation tasks
1. Prepare npm package and entrypoint.
2. add CI build/typecheck/lint/test.
3. examples.
4. installation smoke test.
5. reconcile guarantees with evidence..

## Expected deliverables
Installable package, docs, CI and release checklist.

## Acceptance criteria
Local install runs; all required checks reproducible.

## Required tests
npm pack, local install, executable smoke, build/typecheck/lint/test. Run applicable tests before handoff and record exact results.

## Risks and security constraints
No real credentials, network credential access, publishing, deployment or remote pushes. Deterministic detection has false negatives. Never claim universal interception. Fail closed on verification errors; never log original values. Shared workspace: coordinate interfaces, retain exclusive file ownership.

## Progress checklist
- [x] Prerequisites reviewed
- [x] Implementation/research complete
- [x] Packaging tests/review complete
- [x] Handoff delivered; lead final suite review passed

## Handoff instructions
Update this plan with final status, file list, executed checks, limitations and interface changes. Send lead concise evidence; do not mark complete without deliverables.

## Current status
Completed packaging handoff. Owned deliverables: package.json, tsconfig.json,
README.md, LICENSE, examples/{README.md,synthetic-prompt.txt,config.json},
.github/workflows/ci.yml, docs/release-checklist.md and this plan.

Lead retrieved real TypeScript 5.9.3 official Microsoft artifacts and cached
official Node type definitions 14.18.63 after npm DNS EAI_AGAIN. Manifest pins
both versions; no registry-backed lockfile is claimed. CI uses npm install with
pinned dependencies. Exports cover core, vault, Codex and companion modules.

Verified npm run lint and npm run typecheck (exit 0); npm pack rebuilt a 31-file
tarball and offline local npm install succeeded. Installed symlink CLI smoke
checked nonempty help, real private vault initialization, repeated synthetic
placeholder output, unauthorized restoration denial, authorized byte-exact
restoration, doctor/status and companion export. Artifact at
/tmp/hushkey-0.1.0.tgz; smoke directory /tmp/hushkey-pack-smoke-f1wu4yil.

Full npm test run at handoff passed ChatGPT, CLI, core and security test files;
Codex file failed under test runner (exit 1). Lead notified for integration fix
and final rerun; packaging is verified but project-wide test completion is not
claimed. No publishing, deployment, remote push or real credential access.
Residual limitations and dependency provenance are stated in README/checklist.

## Lead final acceptance — 2026-10-09
Complete. Reviewed deliverables and npm pack, offline local installation, and installed executable artifact smoke. Final build, lint, typecheck, all five test files (37 named tests), and installed-package smoke pass. Earlier blocked/interim evidence is superseded by this acceptance. Protection remains scoped as documented; no live provider interception was established.
