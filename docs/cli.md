# CLI

Requires Node.js 22 or later. Install a locally built npm tarball, then run `hushkey --help`.

Initialize local state with `hushkey init`. The default directory is `.hushkey` in the current working directory; every command supports `--state-dir DIR`. The directory must be private (0700), and its vault must be 0600. The vault contains original secrets in plaintext: protect it with local filesystem permissions and disk encryption, exclude it from source control, and never upload it.

Supply content with `--input FILE` or stdin. Do not put secrets in command arguments, where shell history and process listings may expose them. Input must be UTF-8 and at most 10 MiB.

```sh
hushkey scan --input synthetic.txt
hushkey sanitize --input synthetic.txt --output sanitized.txt
hushkey sanitize --input synthetic.txt | another-local-command
hushkey status
hushkey doctor
```

`scan` emits only detection kinds and character offsets, never matched values. `sanitize` persists the local mapping before releasing sanitized content. `--output` creates a new 0600 file and refuses to overwrite existing files. Without `--output`, sanitized text goes to stdout. Review output locally before sending it to an AI provider: deterministic detection can miss secrets.

Restoration requires explicit authorization and a restricted local destination. It never prints restored content to stdout and refuses existing output files or destinations outside the allowed directory.

```sh
mkdir -m 700 restored
hushkey restore --input sanitized.txt --authorize \
  --allowed-directory restored --output restored/example.txt
```

Configuration is `.hushkey/config.json`, initialized with an empty list of custom rules:

```json
{"customPatterns":[{"name":"internal-token","pattern":"INTERNAL-[A-Z0-9]{20}","flags":"i"}]}
```

Custom regex patterns are trusted local configuration. Poorly chosen regexes can consume excessive processing time. Errors use generic diagnostics to avoid echoing credentials or credential-bearing file paths. Failed sanitization or vault persistence blocks sanitized output. `doctor` checks a synthetic detector example; it does not prove complete secret detection or interception of other applications.

`hushkey codex --input synthetic.txt --mode prompt` sanitizes the supplied prompt, persists its vault, then invokes the fixed Codex prompt-only workflow. The child runs in an isolated temporary working directory, and its output is withheld. This only protects the supplied prompt: it does not establish sanitization of every Codex request, tool result, configuration, or provider-managed content. Broader modes, including proxy protection, fail closed; arbitrary Codex flags cannot be forwarded.

`hushkey chatgpt --input synthetic.txt --output sanitized.txt` runs a local companion workflow: it creates sanitized text after persisting the local mapping. Inspect that file, then manually paste sanitized content into ChatGPT. This command does not call an API, install an app, or intercept ChatGPT messages. Raw text entered directly into ChatGPT reaches its provider before any later app/tool processing.
