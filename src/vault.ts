import { constants } from 'node:fs';
import { mkdir, open, lstat, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { assertNoSymlinks, validateVault, type VaultData } from './core.js';
async function secureDirectory(path: string): Promise<void> {
  await assertNoSymlinks(path);
  await mkdir(path,{recursive:true,mode:0o700});
  const stat = await lstat(path);
  if (!stat.isDirectory() || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.()) throw new Error('Vault directory must be private');
}
export async function loadVault(path: string): Promise<VaultData> {
  try {
    await assertNoSymlinks(path);
    await secureDirectory(dirname(resolve(path)));
    const handle = await open(path,constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.() || stat.size > 16 * 1024 * 1024) throw new Error();
      const value: unknown = JSON.parse(await handle.readFile('utf8')); validateVault(value); return value;
    } finally { await handle.close(); }
  } catch { throw new Error('Unable to load private local vault'); }
}
/** Append-only updates under an exclusive lock. An abandoned lock requires manual recovery. */
export async function saveVault(path: string, vault: VaultData): Promise<void> {
  validateVault(vault);
  const destination = resolve(path), directory = dirname(destination), lockPath = `${destination}.lock`;
  let temporary: string | undefined, acquiredLock = false;
  try {
    await secureDirectory(directory); await assertNoSymlinks(destination); await assertNoSymlinks(lockPath);
    const lock = await open(lockPath,constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,0o600);
    acquiredLock = true;
    await lock.close();
    const pending: VaultData = {version:1,entries:{...vault.entries}};
    let existing: VaultData | undefined;
    try {
      const stat = await lstat(destination);
      if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.()) throw new Error();
      existing = await loadVault(destination);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const byValue = new Map<string,string>();
    for (const entries of [existing?.entries ?? {}, pending.entries]) {
      for (const [key,value] of Object.entries(entries)) {
        const previousKey = byValue.get(value);
        if (previousKey && previousKey !== key) throw new Error();
        if (Object.hasOwn(pending.entries,key) && pending.entries[key] !== value) throw new Error();
        byValue.set(value,key);
        pending.entries[key] = value;
      }
    }
    const serialized = JSON.stringify(pending);
    if (Buffer.byteLength(serialized,'utf8') > 16 * 1024 * 1024) throw new Error();
    temporary = `${destination}.${randomBytes(16).toString('hex')}.tmp`;
    const handle = await open(temporary,constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,0o600);
    try { await handle.writeFile(serialized,'utf8'); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary,destination); temporary = undefined;
    const parent = await open(directory,constants.O_RDONLY | constants.O_DIRECTORY);
    try { await parent.sync(); } finally { await parent.close(); }
    vault.entries = pending.entries;
  } catch { throw new Error('Unable to save private local vault'); }
  finally {
    if (temporary) await unlink(temporary).catch(() => undefined);
    // Never remove a lock acquired by another writer. A failed cleanup leaves a fail-closed stale lock.
    if (acquiredLock) await unlink(lockPath).catch(() => undefined);
  }
}
