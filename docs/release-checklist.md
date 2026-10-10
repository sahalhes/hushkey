# Release readiness

This is a local MVP, not a published package. Publishing, deployment, and remote
pushes require separate explicit authorization.

- [x] Node 22 ESM executable and typed library exports configured.
- [x] Exact development dependency versions declared; runtime has no dependencies.
- [x] MIT license, synthetic examples, installation and usage documentation provided.
- [x] CI runs lint, typecheck, build/test, and npm pack.
- [x] Documentation states Codex supplied-prompt boundary and ChatGPT pre-paste workflow.
- [x] Documentation explains plaintext local mappings and deterministic false negatives.
- [x] Package rebuilt and local installed executable checked after CLI symlink fix.
- [x] Lead full security suite and handoff reviewed.

The restricted implementation environment could not fetch the npm registry.
TypeScript 5.9.3 was obtained from official Microsoft GitHub artifacts and Node
type definitions 14.18.63 from an existing official npm cache. No registry-backed
lockfile is committed. CI fetches pinned direct dependencies with `npm install`.
Before a public release, generate and review a registry-backed lockfile and rerun
`npm ci` in a clean Node 22 environment. Type definitions should be updated to
Node 22 once dependencies are available, then typecheck and test again.

Finite tests establish only documented synthetic coverage. No live authenticated
Codex transmission test was run. Proxy/global interception, encoded or fragmented
credential completeness and vault encryption remain outside this MVP's guarantees.
Vault updates use an exclusive lock and append-only merge; lock contention fails
closed and an abandoned lock requires manual local recovery. The lead must rerun
final checks after any additional implementation fixes.

Packaging validation: `npm pack` built a 31-file tarball, then
`npm install --prefix /tmp/hushkey-final-install /tmp/hushkey-0.1.0.tgz --offline
--ignore-scripts --cache /tmp/hushkey-npm-cache` installed it successfully.
The installed `.bin/hushkey` produced nonempty help and real init/sanitize/export
artifacts. Synthetic smoke checks confirmed repeated placeholders, unauthorized
restore denial, authorized byte-exact restoration, doctor/status, and ChatGPT
companion output. Process output was captured through regular files because
the implementation environment's child-process stream capture was unreliable.

Final lead validation: 37 named tests across five passing test files; lint, typecheck, build, final npm tarball and offline local installation pass. Reproduce installed checks with `node scripts/package-smoke.mjs PATH_TO_INSTALLED_HUSHKEY`. CI also runs this smoke test.
