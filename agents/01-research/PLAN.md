# Agent 01-research: Platform Research & Architecture

## Objective and scope
Deliver the platform research & architecture workstream for the local Hushkey MVP.

## Ownership
docs/architecture.md, docs/integration-research.md, docs/threat-model.md, docs/adr-001.md; this plan. Do not modify other agents’ files.

## Dependencies and prerequisites
None. Node 22; synthetic secrets only.

## Detailed implementation tasks
1. Search and fetch official Codex stdin, provider, app-server, transport, and hook documentation.
2. Search and fetch current ChatGPT Apps SDK/plugin/MCP/UI/composer documentation; separate tool invocation from pre-send interception.
3. Send a concrete typed scan/sanitize/vault/restore contract immediately to unblock core and CLI implementation.
4. Define local operation ordering, persistence, verification, metadata safety, and explicitly authorized restoration.
5. Document asset boundaries, bypass paths, plaintext map risks, deterministic detection limits, and tests needed to establish narrow protection.
6. Record an ADR accepting supplied-prompt Codex protection and zero-network ChatGPT companion; reserve proxy/global modes until independently verified.

## Expected deliverables
Official source links, architecture, threat model and ADR.

## Acceptance criteria
Interfaces actionable; protection boundaries explicit.

## Required tests
Review source claims and interface compatibility. Run applicable tests before handoff and record exact results.

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
Complete. Delivered docs/architecture.md, docs/integration-research.md, docs/threat-model.md, docs/adr-001.md. Official sources fetched and findings reviewed; provisional typed contract sent to lead/security before implementation. Local Markdown relative-link check passed for all four documents. This workstream has no runtime implementation tests; integration implementation agents must verify subprocess payloads and installed-version behavior. Limits: no live provider test, no global interception established, proxy not implemented; current plugin composer extensions were reviewed and do not establish a universal text filter. No commit attempted because lead reported the existing .git placeholder is unusable/read-only.

## Lead final acceptance — 2026-10-09
Complete. Reviewed deliverables and official-source architecture and local documentation checks. Final build, lint, typecheck, all five test files (37 named tests), and installed-package smoke pass. Earlier blocked/interim evidence is superseded by this acceptance. Protection remains scoped as documented; no live provider interception was established.
