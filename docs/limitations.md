# Protection limitations

Hushkey's guarantees apply to explicit locally sanitized content and verified integration paths. They do not establish that arbitrary applications, repository reads, tools, model conversations, or network requests have been intercepted.

Deterministic secret detection can miss unknown formats, unlabelled values, obfuscated or encoded representations, and fragments assembled later. It can also replace ordinary text accidentally. Exact tested coverage will be recorded in the security report.

Secret mappings remain sensitive local data. Filesystem permissions cannot defend against an attacker with equivalent account access, administrator access, malware, memory inspection, backups, or copies created by other applications.

Restoration creates plaintext at an explicitly authorized local destination. Users must protect that destination and avoid sharing it with an AI assistant. Shell arguments, source inputs, and external programs can have independent logging or history behavior beyond Hushkey's control.

A ChatGPT app or connector does not establish a local pre-transmission interceptor for arbitrary messages. The local companion requires sanitizing input locally before pasting its output into ChatGPT. Text entered directly in ChatGPT may reach OpenAI before a tool or connector runs.

Codex protection boundaries and rejected modes will be documented after official interface research and implementation validation. A subprocess capture test proves only that subprocess input was sanitized; it does not establish universal provider traffic interception.

The independent suite demonstrates specific misses for unlabelled base64, fully percent-encoded credentials, and values fragmented into multiple strings. There is no general decoding or program-evaluation layer. Custom patterns can detect explicitly configured representations, but user-provided regex rules can also cause excessive CPU use.

Vault writes use an exclusive private lock, append-only merging, atomic replacement, and file/parent-directory fsync. Concurrent lock contention blocks immediately; conflicting mappings also block. A crashed writer may leave a stale lock and require manual recovery after confirming no active writer. Power-loss behavior and hostile filesystem races are not established.

The Codex wrapper protects the supplied prompt sent over stdin. Subsequent Codex context, tools, filesystem reads, inherited HOME/CODEX_HOME contents, authentication, and provider traffic are outside verified sanitization. Full/global/repository/proxy modes are refused. Timeout handling kills the direct child only; a malicious or modified executable could create surviving descendants.
