# Hushkey

Hushkey replaces detectable secrets with stable placeholders locally before you explicitly share the resulting text with an AI assistant. Mappings remain in a private local vault. This MVP supports an installable CLI, a narrow Codex supplied-prompt wrapper, and a local ChatGPT pre-paste companion.

Requires Node.js 22 or later. No package has been published. Build and install a local tarball:

```sh
npm install --ignore-scripts
npm run check
npm pack
npm install -g ./hushkey-0.1.0.tgz
hushkey --help
```

The development dependencies are pinned. This repository currently has no registry-backed lockfile: dependency fetching was restricted in the implementation environment. CI installs the pinned versions. The Node type definitions cover the built-in APIs used here; they are version 14 definitions, while the required runtime is Node 22.

Run these commands in a private local directory. Input should come from files or stdin, never secret-bearing command arguments or shell literals:

```sh
hushkey init
hushkey scan --input examples/synthetic-prompt.txt
hushkey sanitize --input examples/synthetic-prompt.txt --output sanitized.txt
hushkey doctor
hushkey status
mkdir -m 700 restored
hushkey restore --input sanitized.txt --authorize \
  --allowed-directory restored --output restored/example.txt
```

Output files must not already exist. Scan output contains detection kinds and offsets, not matched values. Repeated secrets reuse placeholders in the same vault. Sanitization and integration export stop if verification or vault persistence fails. Restoration requires an explicit authorization flag and a destination within an allowed local directory; restored content is never printed to stdout. See the [CLI guide](docs/cli.md) for configuration and custom patterns.

```sh
hushkey codex --input examples/synthetic-prompt.txt --mode prompt
hushkey chatgpt --input examples/synthetic-prompt.txt --output for-chatgpt.txt
```

The Codex wrapper sanitizes the supplied prompt before invoking an already installed, authenticated Codex CLI through stdin in an empty temporary directory. Child output is withheld. It protects only the supplied prompt handoff: it does not intercept Codex network requests, filesystem reads, global instructions, authentication/configuration, or tool/MCP context. Full/proxy modes fail before launch. The integration was tested with a synthetic child executable, not a live authenticated provider session. Read the [exact Codex boundary](docs/codex.md) before use.

The ChatGPT command creates a local sanitized export for you to inspect and manually paste. It does not call an API or intercept the ChatGPT composer. Raw text entered directly into ChatGPT may reach OpenAI before any later app/tool processing. See the [companion workflow](docs/chatgpt.md) and [official-interface research](docs/integration-research.md).

The `.hushkey/vault.json` file contains original secret values in **plaintext** with restrictive filesystem permissions. Keep the vault and original inputs out of source control, shared folders, uploads, and assistant-accessible context. Use disk encryption and protect local account access. Hushkey does not provide encryption or process isolation.

Detection is best effort. Common API key formats, credential assignments, JWTs, private keys, database connection strings, and custom regex patterns are covered by deterministic rules. Unknown formats, encodings, fragments, and context-dependent credentials can remain. Verification uses the same rules; passing checks cannot prove complete absence of leakage. Inspect sanitized output locally. Read the [threat model](docs/threat-model.md), [security evidence](docs/security-report.md), [limitations](docs/limitations.md), and [release checklist](docs/release-checklist.md).

Development checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`lint` enables TypeScript's unused-symbol and switch-fallthrough checks; it is not a separate style linter. Tests use only synthetic credentials and local capture processes. MIT licensed; see [LICENSE](LICENSE).
