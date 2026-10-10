# Threat model

## Assets and trust boundaries

Assets are original local secrets, the placeholder map, raw inputs, restored files, and the accuracy of protection claims. Trusted components are the local OS/account, audited Hushkey implementation, configuration, and local file permissions. AI providers, remote MCP services, generated model content, untrusted project files, and other software are outside the local protection boundary. Same-user malware and administrative access can read plaintext mappings and process memory.

Raw text enters the trusted sanitizer. Only verified sanitized text leaves through the explicit output boundary. The vault never crosses that boundary. Restoration intentionally returns originals to an explicitly authorized local destination, making that destination sensitive again.

## Threats and controls

| Threat | Required mitigation | Residual risk |
| --- | --- | --- |
| Recognized secret in supplied text | Deterministic detection, overlap handling, output verification | Unknown/fragmented/encoded secrets may escape recognition |
| Same value revealed in a new context | Replace known vault originals, stable mapping | Transformed originals may evade exact matching |
| Mapping transmitted or logged | Keep vault separate; findings only kinds/offsets; generic errors | Debuggers, crash dumps, OS backups and same-user access remain outside guarantee |
| Corrupt config/vault or write failure | Validate before output; persist before transmission; block on error | OS/filesystem reliability and crash consistency need platform tests |
| Placeholder collision/injection | Opaque unique identifiers; validate mappings and reject unsafe ambiguity | Placeholder presence reveals count/repetition and correlates a vault's use |
| Restore through traversal/symlink | Explicit authorization, root restriction, exclusive restrictive file creation | Concurrent directory changes can create race risks; filesystem controls are not sandboxing |
| Untrusted generated response requests restoration | Never auto-restore; unknown placeholders reject | Authorized users can still choose unsafe downstream handling |
| CLI process/shell leakage | Input from stdin or local files, never raw secret argument; safe diagnostics | Caller shell history and input-file naming are user's responsibility |
| Codex re-reads secret files | State supplied-prompt-only coverage; reject requested global mode | Read-only execution can read originals, including a local vault if reachable |
| ChatGPT sanitize tool runs too late | Local preprocessing before paste | Raw chat and uploads bypass companion; provider may already have original |
| Regex denial of service | Input bounds, restricted patterns, explicit trusted config | JavaScript regex is synchronous; malicious custom patterns need bounded execution strategy |

## Out of scope and assumptions

No guarantee against arbitrary encodings, secret fragments, steganography, screenshots, binaries, unknown formats, direct user bypass, compromised local account, arbitrary Codex tools, network services, or provider-side storage. No guarantee that a secret-like value is genuine: false positives can impair usefulness. Synthetic fixtures and finite outbound capture tests establish observed coverage, not complete absence of leakage.

Vault files must remain outside directories exposed to assistants, remote sync, version control, backups, or shared workspaces where possible. Their exclusion from npm packages and Git is necessary but does not prevent another local tool reading them. Restoration is local, explicit, and never a model-controlled workflow.

## Validation expectations

Tests must cover detection/repetition/distinct values; overlapping and multiline spans; literal known originals; malformed custom rules; placeholder collisions; map/config corruption; no originals in successful diagnostics or failure text; permission and destination checks; unsupported protection modes; failures before process launch; synthetic fake-Codex payload capture; and a zero-network ChatGPT companion demo. Reports must distinguish known unsupported transforms from implementation defects and state tests actually executed.
