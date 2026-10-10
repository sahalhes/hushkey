# Hushkey MVP handoff

Delivered and verified on 2026-10-09. All seven real specialist workstreams are complete. No package publication, deployment, remote push, or real credential access occurred.

## Implemented

Node 22 ESM TypeScript with no runtime dependencies. Deterministic rules cover common API key prefixes, bearer/basic credentials, JWTs, multiline private keys, database connection strings, password/credential assignments and trusted custom regex patterns. Overlaps merge; repeated values reuse opaque stable placeholders in the same vault, and different values receive different placeholders. Findings contain kinds and offsets, never values.

Local mappings are plaintext files protected by private POSIX directory/file permissions. Persistence validates mappings, rejects symlinks, uses exclusive locks and append-only conflict-checked merges, limits serialized UTF-8 size, and syncs temporary files and the parent directory around atomic replacement. Lock contention fails immediately; abandoned locks require manual recovery after confirming no active writer. Protected output is verified before and after persistence. Errors and unsupported protection modes block release.

The CLI provides init, scan, sanitize, restore, doctor, status, codex and chatgpt. It accepts bounded UTF-8 file/stdin input, refuses existing output files, and uses generic diagnostics. Restoration requires explicit authorization, a new destination under an approved local directory, and never emits originals to stdout.

## Install and run

The tested local package is `hushkey-0.1.0.tgz` in this checkout (also `/tmp/hushkey-0.1.0.tgz`). Install it with:

```sh
npm install -g /tmp/hushkey-0.1.0.tgz
hushkey --help
hushkey init
hushkey sanitize --input examples/synthetic-prompt.txt --output sanitized.txt
hushkey chatgpt --input examples/synthetic-prompt.txt --output for-chatgpt.txt
mkdir -m 700 restored
hushkey restore --input sanitized.txt --authorize --allowed-directory restored --output restored/example.txt
```

Run the example commands from this checkout, or use your own private input files. The default state directory is `.hushkey`; `--state-dir` selects a private alternative. Keep mappings and raw input outside assistant-accessible contexts and shared storage. Do not put actual secrets in shell literals or command arguments. See README.md and docs/cli.md.

For a source build:

```sh
npm install --ignore-scripts
npm run check
npm pack
```

The implementation environment could not reach the npm registry. Actual TypeScript 5.9.3 compiler/libraries were obtained from Microsoft’s official GitHub artifacts; Node typings 14.18.63 were extracted from an existing official npm cache. Dependencies are pinned; no registry-backed lockfile is claimed. Runtime checks used Node 22.23.3. The older type definitions cover the built-in APIs used here, with a Node 22 upgrade recommended before public release.

## Codex protection

`hushkey codex --input prompt.txt --mode prompt` verifies and persists the locally sanitized supplied prompt before sending it through the officially supported `codex exec -` stdin path. Fixed restrictive flags, a temporary empty working directory, and an environment allowlist reduce incidental exposure. Already installed/authenticated Codex is required; environment API key authentication is not forwarded. Child stdout/stderr are withheld, so this MVP does not display the assistant response.

Six synthetic executable tests capture the actual stdin bytes, arguments and environment; they establish this child handoff boundary. No live authenticated provider traffic was captured. The wrapper does not intercept other Codex content: filesystem reads, global instructions, configuration/authentication, tools, MCP data, images, history or later model context. Read-only sandboxing does not stop secret reads. Full/global/proxy modes and arbitrary passthrough flags are rejected. Provider proxying remains unsupported because complete transport coverage was not verified. Official source links and hook research are in docs/integration-research.md and docs/codex.md.

## ChatGPT integration

`hushkey chatgpt` is a local pre-paste companion. Inspect its sanitized export, then manually paste only that output. It makes no network request and does not install a ChatGPT app or connector. The reviewed official MCP/plugin/composer interfaces do not establish a universal local pre-send rewrite boundary. Raw messages, original attachments and tool arguments may reach OpenAI before an app executes. Later tool sanitization cannot retract that transmission. See docs/chatgpt.md.

## Validation

| Check | Result |
|---|---|
| Core | 12 named tests passed |
| CLI | 5 named tests passed |
| Codex synthetic capture/failure | 6 named tests passed |
| ChatGPT local companion | 4 named tests passed |
| Independent security review/tests | 10 named tests passed |
| Full npm test runner | All five files passed; 37 named tests total |
| Build, lint, typecheck | Passed with actual TypeScript compiler |
| npm pack and offline local install | Passed |
| Installed executable smoke | Passed: nonempty symlink help, init artifacts, stdin, repeated/distinct mapping, denied restore, authorized exact restore, doctor/status, companion, rejected broad mode |

The workspace’s child stream behavior initially obscured stdin and subprocess evidence. CLI input now uses bounded synchronous descriptor reads; subprocess tests capture through actual descriptors/files and assert absence of launch errors. Synthetic Codex fixtures synchronously capture descriptor 0. Passing evidence requires content and artifacts, not only an exit status.

Reproduce checks with `npm run check`. Reproduce installed-package checks with `node scripts/package-smoke.mjs /path/to/installed/node_modules/.bin/hushkey`. CI contains these checks; hosted CI itself was not run in this session.

## Security limitations

Finite tests cannot establish a complete absence of leakage. Unknown formats, base64/percent-encoded unlabelled credentials, fragmented strings, short unlabelled passwords, binaries and screenshots can evade detection. False positives are possible. Verification shares the detector rules. Custom regex configuration is trusted and can cause denial of service.

The vault is not encrypted. Same-account malware, administrators, memory/swap, backups, shared copies and external application logs are outside the guarantee. Same-user filesystem races and process-tree containment are not eliminated. Fsync improves durability, but power-loss/crash behavior was not experimentally established. Stale locks deliberately block operations; mappings already renamed to disk may exist after a later fsync failure, while output remains blocked.

See docs/security-report.md, docs/limitations.md and docs/threat-model.md for tested boundaries and residual risks.

## Local commits

The mounted original `.git` rejects writes. Authorized local commits reside in writable `.hushkey-dev.git`, on its `development` branch:

- `a0a7dfb`: orchestration contract and seven detailed plans.
- `b85aaf0`: official integration boundaries and architecture.
- `97f00b1`: verified MVP implementation, tests, packaging and independent security evidence.

Inspect with `git --git-dir=.hushkey-dev.git --work-tree=. log --oneline`. A final documentation commit records this handoff. No remote repository was modified.

## Recommended next steps

Generate a registry-backed lockfile and upgrade Node 22 type declarations in a clean development environment; run hosted CI. Validate a pinned actual Codex version with synthetic credentials and controlled provider-payload capture before widening claims. Add a verified sanitized response channel. Investigate complete proxy/transport mediation separately, expand detector fixtures, and evaluate encrypted vault storage and crash recovery. Keep all expanded integration claims tied to reproducible evidence.
