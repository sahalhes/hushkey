import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep, isAbsolute } from 'node:path';
import { sanitize, verifySanitized, type ScanOptions, type VaultData } from './core.js';
import { saveVault } from './vault.js';

export interface CodexOptions extends ScanOptions {
  mode?: string;
  executable?: string;
  timeoutMs?: number;
}
export interface CodexResult { exitCode: number; replacements: number }

/** Protects only the supplied prompt. Codex's subsequent context is outside this boundary. */
export async function runCodex(text: string, vault: VaultData, vaultPath: string, options: CodexOptions = {}): Promise<CodexResult> {
  if (options.mode !== undefined && options.mode !== 'prompt') throw new Error('Unsupported Codex protection mode; only supplied prompts are protected');
  const timeoutMs = options.timeoutMs ?? 120_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3_600_000) throw new Error('Invalid Codex timeout');
  const executable = options.executable ?? 'codex';
  if (typeof executable !== 'string' || !executable || executable.includes('\0')) throw new Error('Invalid Codex executable');
  const result = sanitize(text, vault, options);
  await saveVault(vaultPath, vault);
  verifySanitized(result.text, vault, options);
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), 'hushkey-codex-'));
    const rel = relative(resolve(vaultPath, '..'), resolve(directory));
    if (!rel || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel))) throw new Error();
    const env: NodeJS.ProcessEnv = {};
    // Explicit runtime/login allowlist; no API keys, Node loaders, proxies or arbitrary variables.
    for (const key of ['PATH', 'HOME', 'CODEX_HOME', 'LANG', 'SystemRoot']) {
      if (process.env[key] !== undefined) env[key] = process.env[key];
    }
    const exitCode = await new Promise<number>((resolveExit, reject) => {
      const child = spawn(executable, ['--ask-for-approval', 'never', 'exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral', '--ignore-user-config', '-'], {
        cwd: directory, env, shell: false, stdio: ['pipe', 'ignore', 'ignore'],
      });
      let failed = false;
      const timer = setTimeout(() => { failed = true; child.kill('SIGKILL'); }, timeoutMs);
      child.once('error', () => { clearTimeout(timer); reject(new Error('Codex execution failed')); });
      child.stdin.on('error', () => { failed = true; child.kill('SIGKILL'); });
      child.once('close', (code) => {
        clearTimeout(timer);
        if (failed || code !== 0) reject(new Error('Codex execution failed'));
        else resolveExit(code);
      });
      child.stdin.end(result.text, 'utf8');
    });
    return {exitCode, replacements: result.replacements};
  } catch { throw new Error('Codex execution failed'); }
  finally { if (directory) await rm(directory, {recursive: true, force: true}); }
}
