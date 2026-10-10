# Integration research

Official documentation was searched and opened on 2026-10-09. Platform behavior can change; installed version compatibility remains a separate test requirement. No live credentials or provider calls were used in research.

## Codex CLI and app-server

The official CLI documents `codex exec -` for supplying the full prompt through stdin, and distinguishes it from a prompt argument plus piped context. This is a supported, narrowly testable boundary for local preprocessing. Codex defaults to read-only execution, which does not prevent reading sensitive files. The wrapper protects supplied prompt bytes; it does not assert coverage of repository context or later tool results. [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)

App-server exposes `turn/start`, `turn/steer`, and `thread/inject_items`. A custom client could sanitize the inputs it supplies through those methods. This does not imply interception of all subsequent server-generated context or provider traffic. The MVP uses the simpler stdin boundary instead of claiming app-server-wide protection. [App-server](https://learn.chatgpt.com/docs/app-server)

## Hooks

Current official hooks documentation includes `UserPromptSubmit`, whose input contains the user prompt about to be sent. Its documented outputs can add developer context or block submission; a replacement-prompt field is not documented. `PreToolUse` supports rewriting certain tool inputs; hosted tools and specialized paths are exceptions. The docs call these hooks guardrails rather than a complete enforcement boundary. Thus hooks are potential future detection/blocking defense, not an implemented universal sanitizer. Hook failures require careful analysis because some malformed outputs are reported while execution continues. [Hooks](https://learn.chatgpt.com/docs/hooks)

## Provider proxy feasibility

Codex supports provider `base_url`, headers, credentials, and retry settings. Routing a selected provider through a local validating gateway is technically plausible. This configuration alone does not prove interception of every model-bound request or other network traffic. A production gateway needs pinned provider protocols, recursive JSON-string processing, strict content-type/schema validation, request size limits, rejection of unknown binary/encoded formats, streaming/WebSocket handling, redirect policy, authentication preservation, retry behavior, and deny-by-default unverified routes. [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)

The advanced configuration reference documents WebSocket requests, SSE events, and transport fallback. A JSON HTTP-only proxy must not be represented as complete coverage across these transports. No proxy is shipped or claimed protected in the MVP; requested proxy/global modes must fail closed. [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced)

## ChatGPT Apps SDK, plugins, and MCP

Current official docs organize Apps SDK/MCP capabilities under plugins. ChatGPT can connect to MCP tools over supported network transports; the service invokes tools with arguments and receives results. A sanitization tool called after a raw secret was entered in chat cannot undo the preceding transmission. MCP connectivity, including a private server, does not change this timing. [Custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server)

Plugin UI APIs can call tools, author follow-up messages, and upload selected files. Those functions do not document a host-wide pre-send rewrite or veto callback. Hidden tool metadata is UI visibility control, not a promise that the secret never reached host infrastructure. [Plugin reference](https://developers.openai.com/plugins/reference)

New extensions mention sidebar, composer, file viewers, and model/app context. Composer mentions let users select plugin content in the desktop composer; that feature is not documented as a filter for all message text. No genuine local global interception mechanism was established from the reviewed official interfaces. This is a research conclusion about documented capabilities, not proof that future platforms cannot provide one. [Plugin extensions](https://developers.openai.com/plugins/build/extensions)

## Supported MVP and evidence boundaries

| Path | MVP behavior | Claim boundary |
| --- | --- | --- |
| Explicit Codex wrapper prompt | Sanitize, verify, persist locally; launch fixed stdin command | Supplied prompt only; synthetic subprocess capture validates bytes handed to child |
| Codex files, instructions, tools, history, MCP, images | Outside wrapper | Unprotected; do not infer protection from sandboxing |
| Codex proxy/global mode | Reject | No verified enforcement implementation |
| ChatGPT local companion | Sanitize to local output for manual paste | Only generated text; user must paste that text |
| ChatGPT raw chat, upload, plugin tool args | Outside companion | May reach OpenAI before any sanitization tool runs |

Subprocess capture demonstrates local boundary correctness, not live end-to-end transport security. A live pinned-version provider capture test would be additional evidence and must retain this distinction.
