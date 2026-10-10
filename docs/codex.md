# Codex supplied-prompt workflow

Initialize Hushkey, then run `hushkey codex --input prompt.txt --mode prompt`. Keep raw prompts in private local files; putting secrets into command arguments or shell literals can expose them in history. An already installed, authenticated Codex CLI is required. Hushkey does not read authentication files or make login requests.

The wrapper validates and sanitizes the explicitly supplied text, verifies the result through the core engine, and persists its private local vault, then re-verifies against the merged mappings before starting the child. It invokes Codex directly without a shell, sends the sanitized prompt only on stdin, and uses an empty temporary working directory outside the vault directory. No raw prompt or vault path is supplied in child arguments. The child receives only `PATH`, `HOME`, `CODEX_HOME`, `LANG`, and `SystemRoot` when present; arbitrary application environment variables, API key variables, proxies, and Node loader options are omitted. `HOME` and `CODEX_HOME` support existing Codex login and may contain user configuration paths; they are not sanitized. Environment-based API key authentication is not supported by this MVP wrapper.

The fixed invocation is:

```text
codex --ask-for-approval never exec --sandbox read-only --skip-git-repo-check --ephemeral --ignore-user-config -
```

These flags and stdin mode are documented in the [official CLI reference](https://learn.chatgpt.com/docs/cli/reference). `--ignore-user-config` omits the base user configuration, and `--ephemeral` omits persisted session rollout files. Installed versions lacking required flags fail rather than receiving an automatic less restrictive retry. Compatibility has been tested with a synthetic executable, not a live authenticated Codex provider session.

Child stdout and stderr are discarded to prevent unverified child output becoming Hushkey application logs. The CLI reports completion. This first wrapper does not expose the assistant response; a future useful response channel must sanitize and verify child output before displaying it. Failed execution, missing executables, stdin errors, and a two-minute timeout produce a generic error. The direct child is killed on timeout and the temporary directory is removed; this is not process-tree or network containment.

## Exact protection boundary

Protection covers detectable and already known secret values in the supplied prompt bytes handed to the child. It does not establish interception of Codex's provider traffic. Codex may independently read filesystem content, global instructions, authentication/configuration, use tools, load MCP data, or assemble other context. Read-only sandboxing restricts writes; it does not prevent reading a vault or secrets outside the temporary directory. There is no complete mediation of these paths. Use this workflow only when this narrow boundary matches the task.

Proxy, full, global, arbitrary arguments, attached files, and resume modes are not implemented. Requests for unimplemented protection modes fail before the child is started. Provider base URL configuration can route some requests, but HTTP JSON routing alone does not verify WebSocket, streaming, fallback, tool, and other transport paths. See [integration research](integration-research.md).

## Reproducible evidence

Run `npm run build && node --test tests/codex.test.mjs`. A local synthetic executable captures stdin, arguments, environment, and cwd without any provider request. Tests establish placeholder consistency; absence of raw synthetic values in child stdin and arguments; vault persistence before launch; environment filtering; rejection before spawn for unsupported modes, verification errors, persistence errors, and newly merged known secrets; generic process failure errors; timeout; and temporary-directory cleanup. They do not prove an actual Codex version transmits only those bytes over the network or discover every possible secret.
