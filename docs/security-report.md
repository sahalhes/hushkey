# Security validation report

Independent review date: 2026-10-09. All credentials in tests are synthetic. No provider requests, real credentials, publishing, or deployment were used.

## Reproducible evidence

Run `npm run build`, then `node tests/security.test.mjs` and `node tests/codex.test.mjs` from the repository root.

| Check | Result | Tested boundary |
|---|---|---|
| Independent security suite | 10/10 passed | Core, local persistence/restoration, CLI exported main, blocked Codex launch, local ChatGPT companion |
| Codex integration suite | 6/6 passed | Fake executable captures sanitized stdin and fixed arguments; vault persisted first; unrelated environment omitted; unsupported modes, persistence faults, child failure and timeout |
| Core regression suite | 12/12 passed | Stable mapping, restoration, append-only stale snapshots, concurrent writers, held locks, conditional empty regex, UTF-8 vault size bound |
| TypeScript build | Passed | Compilation only; does not imply security |

The ten independent tests verify known-value propagation to unlabelled occurrences; overlap handling; metadata without originals; invalid rules and reserved placeholder injection; unchanged vault on failed sanitization; encoded/fragmented false negatives; escaped quoted input; symlink ancestors; unknown restoration placeholders; no overwrite; explicit restoration authorization; malformed configuration/vault; invalid UTF-8 file input; unsupported Codex modes and failed persistence before launch; the local companion's sanitized-only return shape and unchanged caller state after persistence failure; held/symlink lock bypass attempts; conditional zero-length custom regex matches; and post-merge companion verification against a disk-known bare secret missing from the caller snapshot.

CLI diagnostics tests call the exported `main` function using file inputs and capture its stdout and error messages in process. They are not a substitute for installation and executable tests owned by CLI/release workstreams. Sandbox subprocess tests initially exposed unreliable asynchronous stdin completion and misleading `spawnSync` status alongside `EPERM`; these were reported to the lead. CLI input and Codex fixtures now synchronously read file descriptor 0; Codex tests confirm a real capture file exists. Tests do not accept an exit status alone as evidence that sanitized data reached a child.

## Independent code review

Reviewed `src/core.ts`, `src/vault.ts`, `src/cli.ts`, `src/codex.ts`, and `src/chatgpt.ts`. Findings contain offsets and categories only. Vault validation rejects invalid keys and secret values containing reserved placeholder syntax. Sanitization verifies both known original values and detector findings are absent from its result before replacing caller mappings. Private vault storage checks permissions/owner, rejects symlinks, acquires an exclusive private lock, and merges existing mappings append-only before writing via a private temporary file followed by rename and parent-directory fsync. Conflicting keys or different placeholders for the same original value block persistence. A 16 MiB UTF-8 serialization bound prevents successful writes of vaults that the reader cannot load. Restoration requires explicit authorization, a new file within an approved directory, and rejects symlinks and unresolved placeholders.

Codex persists mappings before spawning and passes only sanitized supplied prompt text over stdin. Its fixed arguments and empty working directory reduce incidental repository context. They do not prove that Codex cannot read other paths, use built-in tools, access login/configuration material, or transmit additional model context. After persistence merges existing mappings, Codex, CLI sanitize, and the companion verify sanitized output again before releasing it. This blocks bare values newly learned from disk that were not known when the original snapshot was sanitized. Child stdout/stderr are withheld; failures produce a generic error. Timeout terminates the direct child, not a guaranteed complete process tree.

The ChatGPT companion performs local sanitization and private persistence without importing a network client. It returns sanitized text and a replacement count, and has no global message interception capability.

## Residual risks and untested boundaries

- Base64, fully percent-encoded values, and fragmented unlabelled values are reproducible false negatives. Tests deliberately assert those limitations. A matching explicit custom pattern can protect a known representation.
- Unknown formats and short/unlabelled passwords can remain undetected. False positives are possible. A finite suite cannot establish complete absence of leakage.
- No real Codex-provider traffic was captured. Protection evidence covers supplied prompt transfer to a synthetic executable; later context/tool messages and remote proxy protection remain unsupported.
- Local account ownership is trusted. Symlink checks cannot eliminate all races against a concurrent process with equivalent privileges. No malicious filesystem race or kernel compromise was tested.
- Contention fails immediately rather than waiting. A crashed writer can leave a stale lock; recovery requires confirming no active writer before manually removing it. File and parent-directory fsync improve durability but power-loss/crash behavior was not experimentally established. If directory fsync fails after rename, mappings may already exist on disk while the operation blocks output; review confirms this is conservative, but injected fsync failure was not tested.
- Custom regex rules are trusted configuration; catastrophic backtracking can cause denial of service. Memory, swap, backups, external shell history/logging, and privileged local access are outside tested protection.
- Network failures were not exercised against an actual provider. Synthetic missing executable, nonzero child exit and timeout exercise local execution failure paths.

No unresolved secret-disclosure defect was established within the tested local boundaries. This is scoped test evidence and review, not a claim of universal secrecy or interception.
