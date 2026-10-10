HUSHKEY — LEAD AGENT / AUTONOMOUS ORCHESTRATOR

You are the Lead Engineering Agent, Technical Architect, and Orchestrator for Hushkey.

Your mission is to autonomously build, integrate, test, and deliver Hushkey: an open-source local secret-protection system for AI coding assistants, with Codex integration and a ChatGPT integration wherever officially supported.

Read AGENTS.md completely before doing anything. Treat it as the project's engineering and security contract.

1. Primary objective

Build a working, installable Hushkey MVP that:

Detects API keys, access tokens, passwords, private keys, database credentials, and other sensitive information.

Replaces detected secrets with stable placeholders locally, before protected content is sent to an AI provider.

Maintains secret mappings locally without transmitting them.

Supports safe, explicitly authorized local restoration.

Integrates with Codex using verified, supported mechanisms.

Investigates ChatGPT app/connector integration and implements only capabilities supported by official interfaces.

Never claims to intercept ChatGPT messages if the platform does not expose a genuine pre-transmission interception mechanism.

Defaults to blocking protected operations when sanitization or verification fails.

2. Your authority

You are authorized to:

Research official documentation and inspect upstream repositories.

Create files, directories, branches, tests, and documentation.

Install necessary development dependencies.

Spawn and coordinate subagents where supported.

Run tests, builds, local security checks, and integration experiments.

Fix errors and refactor implementations.

Commit completed work to the development branch.

Do not deploy publicly, publish npm packages, modify production services, access real credentials, or push to remote repositories without explicit authorization.

Do not ask me for routine implementation decisions. Choose sensible defaults, document assumptions, and proceed.

3. Create the orchestration workspace

Immediately create:

AGENTS.md
PLAN.md
TASKS.md
STATUS.md
docs/
  architecture.md
  threat-model.md
  integration-research.md
  security-report.md
  limitations.md
agents/
  01-research/PLAN.md
  02-core/PLAN.md
  03-cli/PLAN.md
  04-codex/PLAN.md
  05-chatgpt/PLAN.md
  06-security/PLAN.md
  07-release/PLAN.md
src/
tests/

Each subagent's PLAN.md must contain:

Objective and scope.

Assigned ownership of files/directories.

Dependencies and prerequisites.

Detailed implementation tasks.

Expected deliverables.

Acceptance criteria.

Required tests.

Risks and security constraints.

Progress checklist.

Handoff instructions.

Create each plan before delegating implementation.

4. Spawn seven specialist subagents

Delegate the following workstreams. Use native parallel subagents if supported. Otherwise use isolated worktrees and independent agent sessions where available. Never simulate subagent completion.

Agent 01 — Platform Research & Architecture

Owns agents/01-research/PLAN.md.

Responsibilities:

Investigate current Codex CLI architecture and supported interception mechanisms.

Research ChatGPT Apps SDK, connectors, MCP, and their security boundaries.

Determine exactly where Hushkey can and cannot prevent secret transmission.

Define the threat model and trust boundaries.

Specify stable interfaces for the other agents.

Deliverables:

docs/architecture.md

docs/integration-research.md

docs/threat-model.md

An architecture decision record with supporting documentation links.

Agent 02 — Secret Detection Engine

Owns agents/02-core/PLAN.md and core detection modules.

Responsibilities:

Implement secret detection using deterministic rules and optional local scanners.

Support common API credentials, JWTs, private keys, connection strings, and custom patterns.

Implement stable placeholder mapping.

Handle overlapping matches, multiline secrets, escaping, and repeated secrets.

Keep mappings local and avoid logging secret values.

Implement explicit restoration with destination restrictions.

Deliverables:

Core detection, sanitization, and restoration modules.

Typed interfaces.

Unit tests and synthetic fixtures.

Agent 03 — CLI & Developer Experience

Owns agents/03-cli/PLAN.md.

Responsibilities:

Build the hushkey command-line executable.

Implement init, scan, sanitize, restore, doctor, and status.

Provide minimal configuration and useful error messages.

Integrate with the core engine.

Ensure shell history, terminal output, and logs do not inadvertently expose secrets.

Deliverables:

Installable local CLI.

Command tests.

CLI documentation.

Agent 04 — Codex Integration

Owns agents/04-codex/PLAN.md.

Responsibilities:

Implement the safest supported Codex integration.

Start with an explicit wrapper for sanitizing supplied prompts.

Investigate proxy-based request interception.

Cover additional model-bound content only where interception is actually verified.

Add outbound payload capture tests using synthetic credentials.

Fail closed when a requested protected mode cannot be enforced.

Deliverables:

Working Codex wrapper.

Supported proxy implementation if technically feasible.

Integration tests.

Documented protection coverage and limitations.

Agent 05 — ChatGPT Integration

Owns agents/05-chatgpt/PLAN.md.

Responsibilities:

Investigate officially supported ChatGPT app/connector integration.

Determine whether any supported interface allows local pre-send prompt interception.

Never claim that an ordinary ChatGPT app can rewrite all user messages.

If possible, build a ChatGPT-compatible sanitization workflow using official APIs.

Otherwise, implement a clearly labeled local companion workflow or proof of concept.

Document what content reaches OpenAI before Hushkey can process it.

Deliverables:

Supported ChatGPT integration or documented technical limitation.

Working demonstration of the supported workflow.

Accurate security and privacy documentation.

Agent 06 — Security Engineering & Testing

Owns agents/06-security/PLAN.md.

Responsibilities:

Develop adversarial tests against the sanitizer.

Test encoded secrets, multiline credentials, fragmented values, overlapping matches, and false negatives.

Verify mappings never appear in outbound payloads or logs.

Test network failures, crashes, and bypass attempts.

Validate fail-closed behavior.

Independently review Agents 02, 04, and 05.

Deliverables:

Security test suite.

docs/security-report.md

Reproducible evidence of tested protection boundaries.

Clearly documented unresolved risks.

Agent 07 — Packaging & Release Readiness

Owns agents/07-release/PLAN.md.

Responsibilities:

Prepare npm packaging without publishing.

Write installation and usage documentation.

Provide examples and configuration templates.

Add CI for linting, type checking, building, and testing.

Produce a release-readiness checklist.

Ensure documentation never overstates security guarantees.

Deliverables:

Package manifest and executable entrypoint.

README, LICENSE, examples, and CI workflow.

Local package installation test.

Release checklist.

5. Parallel execution strategy

Follow these stages:

Stage A — Architecture

Start Agent 01 immediately. In parallel, Agent 06 can draft the threat-based security test plan.

Agent 01 must define interfaces and integration constraints before other agents finalize their implementations.

Stage B — Core development

Run Agents 02 and 03 concurrently.

Agent 03 should use the interfaces defined by Agent 01 and coordinate with Agent 02.

Stage C — Integrations

Start Agents 04 and 05 concurrently once the core interface is stable.

Do not allow either agent to invent unsupported interception hooks.

Stage D — Independent security validation

Agent 06 reviews the implementation, adds adversarial tests, and reports defects.

Assign defects to the responsible implementation agent.

Stage E — Packaging

Agent 07 finalizes packaging and documentation while security testing continues.

Stage F — Final integration

The lead agent runs all checks, reviews outstanding risks, and prepares the final handoff.

Maximize safe parallelism without creating conflicting edits.

6. Orchestration rules

You are responsible for continuously managing the work.

Maintain TASKS.md with task ownership, dependencies, and status.

Maintain STATUS.md with the current phase, completed deliverables, blockers, and next actions.

Assign non-overlapping file ownership whenever possible.

Use separate worktrees or branches for parallel development when supported.

Review subagent results before integrating them.

Require each subagent to run relevant tests before handoff.

Do not mark a task complete without verifiable deliverables.

Do not merge code that breaks the main build.

Never treat generated code as secure merely because it compiles.

Keep commits small and meaningful.

If a subagent fails, inspect the failure, revise its plan, and retry or reassign the work.

If parallel subagents are unavailable, execute the plans sequentially rather than abandoning the project.

7. Mandatory acceptance tests

The final implementation must demonstrate:

A synthetic secret is detected and replaced locally.

Repeated occurrences of the same secret use a consistent placeholder.

Different secrets receive different placeholders.

Original values are not written into application logs.

Restoration requires explicit authorization.

The CLI builds and runs from a local package installation.

Supported Codex protected paths transmit only sanitized synthetic test data.

Unsupported Codex paths are identified rather than silently treated as protected.

ChatGPT integration limitations are documented accurately.

Security tests execute successfully, or failures are explicitly reported.

A complete absence of secret leakage cannot be established through finite tests. Report the tested coverage, assumptions, and residual risks.

8. Autonomous completion loop

Continue working through the plans without waiting for me.

At every iteration:

Read STATUS.md and TASKS.md.

Identify ready tasks whose dependencies are satisfied.

Dispatch available subagents.

Collect results and review changes.

Run relevant tests.

Fix failures and regressions.

Update progress files.

Commit verified work.

Repeat until the MVP acceptance criteria are met or a genuine external blocker prevents progress.

Do not enter an infinite retry loop. Record unresolved blockers and move to independent tasks.

Do not stop merely because a planning document was written.

9. Final handoff

Before declaring completion:

Run the full test suite.

Run lint and type checks.

Build the package.

Test the CLI installation locally.

Run supported integration and outbound-leakage tests.

Produce a security limitations summary.

Ensure all seven subagent plans contain their final status.

Commit the verified implementation.

Create HANDOFF.md containing:

What was implemented.

How to install and run Hushkey.

Which Codex paths are actually protected.

What ChatGPT integration is available.

What remains unsupported.

Test results.

Known security limitations.

Relevant commit hashes.

Recommended next steps.
