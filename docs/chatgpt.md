# ChatGPT local companion

Hushkey provides a local pre-paste workflow. It does not send requests to ChatGPT or intercept messages in the ChatGPT application. Sanitize an explicit local text file, inspect the generated output, and paste only that output into ChatGPT. Secret mappings stay in the private local vault; export contains only sanitized text.

```sh
hushkey init
hushkey chatgpt --input prompt.txt --output prompt.sanitized.txt
```

For a synthetic demonstration, put `Please review sk-proj-SYNTHETIC_chatgpt_companion_0123456789` in `prompt.txt`. The generated file replaces the synthetic credential with an opaque `[[HUSHKEY_...]]` placeholder. Repeated values reuse a placeholder within the same vault. Keep original files and the vault out of chat, attachments, shared folders, and repositories. Avoid putting secrets in command arguments or shell history.

The library workflow is `runLocalCompanion(text, vault, vaultPath, options?)`. It sanitizes and verifies the result, persists mappings successfully, and only then returns `{ text, replacements }`. Verification or private-vault persistence failure rejects the operation with a generic error and returns no export. The CLI owns writing that returned text to the selected local output. There is no clipboard automation, background watcher, network service, or connector to deploy.

Without `--output`, the CLI emits sanitized text to stdout. `--input -` reads local stdin. A file output is useful for inspecting and copying only the exported text.

## Official integration boundary

The reviewed official [MCP server guide](https://developers.openai.com/api/docs/guides/custom-mcp-server), [plugin reference](https://developers.openai.com/plugins/reference), and [plugin extensions guide](https://developers.openai.com/plugins/build/extensions) expose tools and plugin content. Composer extensions let users select plugin content; these documented features do not establish a local filter or veto for all text sent from the ChatGPT composer. Hushkey therefore implements the companion workflow rather than claiming an interception hook.

If a user types a raw secret into ChatGPT, uploads an original file, or supplies a raw secret as a plugin/tool argument, that content may already have reached OpenAI before a remote sanitization tool runs. Tool execution cannot retract the preceding transmission. UI-hidden tool metadata is not a local secrecy boundary. No ordinary app or connector is claimed to rewrite all user messages.

Only the generated text is covered by this workflow. Additional pasted text, conversation history, attachments, model or tool output, and secrets missed by deterministic rules remain outside its protection. Detection and verification share the same rules, so successful verification does not prove the absence of unknown secret formats. Base64, fragmented values, and context-dependent credentials can be missed. Use configured custom patterns where appropriate and inspect output before sending it. See [integration research](integration-research.md) and [threat model](threat-model.md).
