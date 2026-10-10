#!/usr/bin/env node
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { readSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
import { createVault, scan, sanitize, restoreToFile, verifySanitized } from './core.js';
import { loadVault, saveVault } from './vault.js';

const HELP = `Hushkey — local secret sanitization (Node 22+)
Usage: hushkey <command> [options]
Commands: init, scan, sanitize, restore, doctor, status, codex, chatgpt
Input: --input FILE or stdin. Never supply secrets as command arguments.
Options: --state-dir DIR (default .hushkey), --output FILE
Restore: --authorize --allowed-directory DIR --output FILE
Sanitized output files and restored files must not already exist.
Detection is best effort; undetected secrets can remain in output.
`;
const VALUE_FLAGS = new Set(['--state-dir', '--input', '--output', '--allowed-directory', '--mode']);
const BOOLEAN_FLAGS = new Set(['--authorize', '--help']);
const MAX_BYTES = 10 * 1024 * 1024;
type Args = { command: string; values: Record<string, string>; switches: Set<string> };
function parse(argv: string[]): Args {
  const command = argv.shift() ?? 'help';
  const values: Record<string, string> = {};
  const switches = new Set<string>();
  while (argv.length) {
    const flag = argv.shift()!;
    if (VALUE_FLAGS.has(flag)) {
      const value = argv.shift();
      if (!value || value.startsWith('--') || flag in values) throw new Error('arguments');
      values[flag] = value;
    } else if (BOOLEAN_FLAGS.has(flag) && !switches.has(flag)) switches.add(flag);
    else throw new Error('arguments');
  }
  return { command, values, switches };
}
async function input(path?: string): Promise<string> {
  if (path && path !== '-') {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('input');
    const content = await readFile(path);
    if (content.length > MAX_BYTES) throw new Error('input');
    return decode(content);
  }
  const chunks: Buffer[] = [];
  let bytes = 0;
  const buffer = Buffer.alloc(64 * 1024);
  for (;;) {
    const count = readSync(0, buffer, 0, buffer.length, null);
    if (count === 0) break;
    bytes += count;
    if (bytes > MAX_BYTES) throw new Error('input');
    chunks.push(Buffer.from(buffer.subarray(0, count)));
  }
  return decode(Buffer.concat(chunks));
}
function decode(content: Buffer): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(content);
}
async function output(text: string, path?: string): Promise<void> {
  if (path) await writeFile(resolve(path), text, { flag: 'wx', mode: 0o600 });
  else process.stdout.write(text);
}
async function ensurePrivateDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw new Error('state');
}
async function config(path: string): Promise<{ customPatterns?: Array<{ name: string; pattern: string; flags?: string }> }> {
  let content: string;
  try { content = await readFile(path, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
  if (content.length > 65536) throw new Error('config');
  const value: unknown = JSON.parse(content);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('config');
  const object = value as Record<string, unknown>;
  if (Object.keys(object).some(key => key !== 'customPatterns')) throw new Error('config');
  if (object.customPatterns === undefined) return {};
  if (!Array.isArray(object.customPatterns) || object.customPatterns.length > 32) throw new Error('config');
  for (const pattern of object.customPatterns) {
    if (!pattern || typeof pattern !== 'object' || typeof pattern.name !== 'string' || typeof pattern.pattern !== 'string' || (pattern.flags !== undefined && typeof pattern.flags !== 'string')) throw new Error('config');
  }
  return object as { customPatterns: Array<{ name: string; pattern: string; flags?: string }> };
}
export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parse([...argv]);
  if (args.command === 'help' || args.command === '--help' || args.switches.has('--help')) { process.stdout.write(HELP); return; }
  const permitted: Record<string, string[]> = {
    init: ['--state-dir'], scan: ['--state-dir', '--input'], sanitize: ['--state-dir', '--input', '--output'],
    restore: ['--state-dir', '--input', '--output', '--allowed-directory'], codex: ['--state-dir', '--input', '--mode'], chatgpt: ['--state-dir', '--input', '--output'], doctor: ['--state-dir'], status: ['--state-dir'],
  };
  if (!permitted[args.command] || Object.keys(args.values).some(flag => !permitted[args.command]!.includes(flag)) || (args.switches.has('--authorize') && args.command !== 'restore')) throw new Error('arguments');
  const state = resolve(args.values['--state-dir'] ?? '.hushkey');
  const vaultPath = join(state, 'vault.json');
  const configPath = join(state, 'config.json');
  if (args.command === 'init') {
    await ensurePrivateDirectory(state);
    try { await lstat(vaultPath); throw new Error('exists'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await saveVault(vaultPath, createVault());
    await writeFile(configPath, JSON.stringify({ customPatterns: [] }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write('Hushkey initialized. Local mappings contain sensitive values.\n');
    return;
  }
  if (args.command === 'doctor') {
    const options = await config(configPath);
    const synthetic = 'api_key=sk-proj-hushkeySynthetic012345678901234567890';
    const result = sanitize(synthetic, createVault(), options);
    if (result.text.includes('sk-proj-hushkeySynthetic')) throw new Error('selftest');
    process.stdout.write('Local sanitizer self-test passed. Integration coverage is limited to documented workflows.\n');
    return;
  }
  if (args.command === 'status') {
    await loadVault(vaultPath);
    await config(configPath);
    process.stdout.write('Local vault and configuration are readable. Detection is best effort.\n');
    return;
  }
  if (args.command === 'restore') {
    if (!args.switches.has('--authorize') || !args.values['--output'] || !args.values['--allowed-directory']) throw new Error('authorization');
    const vault = await loadVault(vaultPath);
    await restoreToFile(await input(args.values['--input']), vault, { authorized: true, destination: resolve(args.values['--output']), allowedDirectory: resolve(args.values['--allowed-directory']) });
    process.stdout.write('Restored to authorized local destination.\n');
    return;
  }
  const options = await config(configPath);
  const text = await input(args.values['--input']);
  if (args.command === 'chatgpt') {
    const { runLocalCompanion } = await import('./chatgpt.js');
    const vault = await loadVault(vaultPath);
    const result = await runLocalCompanion(text, vault, vaultPath, options);
    await output(result.text, args.values['--output']);
    return;
  }
  if (args.command === 'codex') {
    const { runCodex } = await import('./codex.js');
    const vault = await loadVault(vaultPath);
    const result = await runCodex(text, vault, vaultPath, { ...options, mode: args.values['--mode'] ?? 'prompt' });
    process.stdout.write('Codex prompt-only workflow completed. Child output is withheld.\n');
    process.exitCode = result.exitCode;
    return;
  }
  if (args.command === 'scan') {
    const findings = scan(text, options);
    process.stdout.write(JSON.stringify({ findings: findings.map(({ kind, start, end }) => ({ kind, start, end })), count: findings.length }) + '\n');
    return;
  }
  const vault = await loadVault(vaultPath);
  const result = sanitize(text, vault, options);
  await saveVault(vaultPath, vault);
  verifySanitized(result.text, vault, options);
  await output(result.text, args.values['--output']);
}

function isEntrypoint(): boolean {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]!) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}
if (isEntrypoint()) {
  main().catch(() => {
    process.stderr.write('Hushkey blocked the operation. Check command options, UTF-8 input, private local state, and destination permissions.\n');
    process.exitCode = 1;
  });
}
