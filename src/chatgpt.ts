import { sanitize, scan, validateVault, verifySanitized, type ScanOptions, type VaultData } from './core.js';
import { saveVault } from './vault.js';

/** Local pre-paste workflow. This function neither contacts nor intercepts ChatGPT. */
export async function runLocalCompanion(
  text: string,
  vault: VaultData,
  vaultPath: string,
  options: ScanOptions = {},
): Promise<{ text: string; replacements: number }> {
  try {
    validateVault(vault);
    // Keep the caller's mapping unchanged when verification or persistence fails.
    const pending: VaultData = { version: 1, entries: { ...vault.entries } };
    const result = sanitize(text, pending, options);
    if (scan(result.text, options).length || Object.values(pending.entries).some(value => result.text.includes(value))) {
      throw new Error('Sanitization verification failed');
    }
    await saveVault(vaultPath, pending);
    verifySanitized(result.text, pending, options);
    vault.entries = pending.entries;
    // Findings, mappings, original input and vault paths are never exported.
    return { text: result.text, replacements: result.replacements };
  } catch {
    throw new Error('Local companion blocked: sanitization or private vault persistence failed');
  }
}
