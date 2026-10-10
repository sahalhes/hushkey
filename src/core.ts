import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, realpath, open } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, sep, parse } from 'node:path';

export interface CustomPattern { name: string; pattern: string; flags?: string }
export interface ScanOptions { customPatterns?: CustomPattern[] }
export interface Finding { kind: string; start: number; end: number }
export interface VaultData { version: 1; entries: Record<string, string> }
const placeholder = /^\[\[HUSHKEY_[a-f0-9]{32}\]\]$/;
const placeholders = /\[\[HUSHKEY_[a-f0-9]{32}\]\]/g;
export function createVault(): VaultData { return { version: 1, entries: Object.create(null) as Record<string, string> }; }
export function validateVault(value: unknown): asserts value is VaultData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid local vault');
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'entries,version' || v.version !== 1 || !v.entries || typeof v.entries !== 'object' || Array.isArray(v.entries)) throw new Error('Invalid local vault');
  for (const [key, secret] of Object.entries(v.entries)) {
    if (!placeholder.test(key) || typeof secret !== 'string' || !secret.length || secret.includes('[[HUSHKEY_')) throw new Error('Invalid local vault');
  }
}
function merge(findings: Finding[]): Finding[] {
  const output: Finding[] = [];
  for (const f of findings.sort((a,b) => a.start-b.start || b.end-a.end)) {
    const previous = output.at(-1);
    if (previous && f.start < previous.end) { previous.end = Math.max(previous.end, f.end); previous.kind = previous.kind === f.kind ? f.kind : 'overlapping'; }
    else output.push({...f});
  }
  return output;
}
export function scan(text: string, options: ScanOptions = {}): Finding[] {
  if (typeof text !== 'string') throw new Error('Invalid protected input');
  const masked = text.replace(placeholders, m => '\0'.repeat(m.length));
  const findings: Finding[] = [];
  function collect(kind: string, regex: RegExp, capture = 0, rejectEmpty = false): void {
    for (const m of masked.matchAll(regex)) {
      if (rejectEmpty && m[0].length === 0) throw new Error('Invalid custom detection rule');
      const value = m[capture];
      if (!value || /^\0+$/.test(value)) continue;
      const start = m.index! + (capture ? m[0].lastIndexOf(value) : 0);
      findings.push({kind, start, end: start + value.length});
    }
  }
  collect('private-key', /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9]+ )*PRIVATE KEY-----/g);
  collect('api-key', /\b(?:sk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{16,}|(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{16,}|(?:xox[baprs]-)[A-Za-z0-9-]{12,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/g);
  collect('jwt', /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g);
  collect('connection-string', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\/[^\s"'<>]+/gi);
  collect('authorization', /\b(?:Bearer|Basic)\s+([A-Za-z0-9+/_=.:-]{8,})/gi, 1);
  const label = '(?:[A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|credential)[A-Za-z0-9_.-]*)';
  collect('assignment', new RegExp('(?:["\']?' + label + '["\']?\\s*[:=]\\s*)"((?:\\\\.|[^"\\\\])+)"', 'gi'), 1);
  collect('assignment', new RegExp("(?:[\"']?" + label + "[\"']?\\s*[:=]\\s*)'((?:\\\\.|[^'\\\\])+)'", 'gi'), 1);
  collect('assignment', new RegExp('\\b' + label + '\\s*[:=]\\s*([^\\s"\'`,;{}]+)', 'gi'), 1);
  for (const rule of options.customPatterns ?? []) {
    try {
      if (!rule || typeof rule.name !== 'string' || !rule.name || typeof rule.pattern !== 'string' || !rule.pattern || /[^gimsu]/.test(rule.flags ?? '')) throw new Error();
      const regex = new RegExp(rule.pattern, [...new Set((rule.flags ?? '') + 'g')].join(''));
      if (regex.test('')) throw new Error();
      regex.lastIndex = 0;
      collect('custom', regex, 0, true);
    } catch { throw new Error('Invalid custom detection rule'); }
  }
  return merge(findings);
}
export function sanitize(text: string, vault: VaultData, options: ScanOptions = {}): {text: string; findings: Finding[]; replacements: number} {
  validateVault(vault);
  if (typeof text !== 'string' || text.includes('[[HUSHKEY_')) throw new Error('Reserved placeholder syntax in protected input');
  const findings = scan(text, options);
  for (const secret of new Set([...Object.values(vault.entries), ...findings.map(f => text.slice(f.start,f.end))])) {
    let start = text.indexOf(secret);
    while (start !== -1) { findings.push({kind: 'known-secret', start, end: start + secret.length}); start = text.indexOf(secret, start + secret.length); }
  }
  const merged = merge(findings);
  const pending = {...vault.entries};
  const byValue = new Map(Object.entries(pending).map(([key,value]) => [value,key]));
  let output = '', offset = 0;
  for (const f of merged) {
    const secret = text.slice(f.start, f.end);
    let key = byValue.get(secret);
    if (!key) { do { key = `[[HUSHKEY_${randomBytes(16).toString('hex')}]]`; } while (Object.hasOwn(pending,key)); pending[key] = secret; byValue.set(secret,key); }
    output += text.slice(offset,f.start) + key;
    offset = f.end;
  }
  output += text.slice(offset);
  verifySanitized(output,{version:1,entries:pending},options);
  vault.entries = pending;
  return {text:output, findings:merged, replacements:merged.length};
}
/** Verify prepared output again after persistence merges concurrent vault updates. */
export function verifySanitized(text: string, vault: VaultData, options: ScanOptions = {}): void {
  validateVault(vault);
  if (typeof text !== 'string' || Object.values(vault.entries).some(secret => text.includes(secret)) || scan(text,options).length) throw new Error('Sanitization verification failed');
}
/** Reject every existing symlink component. The local filesystem owner remains trusted. */
export async function assertNoSymlinks(path: string): Promise<void> {
  const absolute = resolve(path); let current = parse(absolute).root;
  for (const component of absolute.slice(current.length).split(sep).filter(Boolean)) {
    current = resolve(current,component);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error('Unsafe local path'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
  }
}
export async function restoreToFile(text: string, vault: VaultData, options: {authorized: boolean; destination: string; allowedDirectory: string}): Promise<void> {
  validateVault(vault);
  if (options.authorized !== true) throw new Error('Explicit restoration authorization required');
  const root = resolve(options.allowedDirectory), destination = resolve(options.destination);
  const rel = relative(root,destination);
  if (!rel || rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel)) throw new Error('Restoration destination outside approved directory');
  await assertNoSymlinks(root); await assertNoSymlinks(destination);
  const canonicalRoot = await realpath(root), canonicalParent = await realpath(dirname(destination));
  const parentRel = relative(canonicalRoot,canonicalParent);
  if (parentRel === '..' || parentRel.startsWith('..' + sep) || isAbsolute(parentRel)) throw new Error('Unsafe restoration destination');
  const restored = text.replace(placeholders,key => { if (!Object.hasOwn(vault.entries,key)) throw new Error('Unknown restoration placeholder'); return vault.entries[key]; });
  if (restored.includes('[[HUSHKEY_')) throw new Error('Invalid restoration placeholder');
  const handle = await open(destination,constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,0o600);
  try { await handle.writeFile(restored,'utf8'); await handle.sync(); } finally { await handle.close(); }
}
