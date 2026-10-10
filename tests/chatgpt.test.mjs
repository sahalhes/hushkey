import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createVault } from '../dist/core.js';
import { runLocalCompanion } from '../dist/chatgpt.js';
import { loadVault } from '../dist/vault.js';

const secret = 'sk-proj-SYNTHETIC_chatgpt_companion_0123456789';

async function workspace(t) {
  const directory = await mkdtemp(join(tmpdir(), 'hushkey-chatgpt-'));
  await chmod(directory, 0o700);
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, path: join(directory, 'vault.json') };
}

test('local companion exports only sanitized text and a count after persisting mappings', async t => {
  const { path } = await workspace(t);
  const vault = createVault();
  const output = await runLocalCompanion(`Review ${secret}; repeated ${secret}`, vault, path);
  assert.deepEqual(Object.keys(output).sort(), ['replacements', 'text']);
  assert.equal(output.replacements, 2);
  assert.equal(JSON.stringify(output).includes(secret), false);
  const tokens = output.text.match(/\[\[HUSHKEY_[a-f0-9]{32}\]\]/g);
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0], tokens[1]);
  const persisted = await loadVault(path);
  assert.equal(persisted.entries[tokens[0]], secret);
  assert.deepEqual(persisted.entries, vault.entries);
  const next = await runLocalCompanion(secret, persisted, path);
  assert.equal(next.text, tokens[0]);
});

test('local companion refuses export and does not mutate caller mappings when persistence fails', async t => {
  const { directory, path } = await workspace(t);
  await chmod(directory, 0o755);
  const vault = createVault();
  await assert.rejects(runLocalCompanion(secret, vault, path), error => {
    assert.equal(error.message.includes(secret), false);
    return /Local companion blocked/.test(error.message);
  });
  assert.equal(Object.keys(vault.entries).length, 0);
  await assert.rejects(readFile(path));
});

test('invalid custom rules and reserved placeholder input block local export before vault write', async t => {
  const { path } = await workspace(t);
  const vault = createVault();
  await assert.rejects(runLocalCompanion(secret, vault, path, {
    customPatterns: [{ name: 'invalid', pattern: '(' }],
  }), /Local companion blocked/);
  await assert.rejects(runLocalCompanion('[[HUSHKEY_invalid]]', vault, path), /Local companion blocked/);
  assert.equal(Object.keys(vault.entries).length, 0);
  await assert.rejects(readFile(path));
});

test('no-secret companion input remains local and produces no mapping', async t => {
  const { path } = await workspace(t);
  const result = await runLocalCompanion('Explain a pure function.', createVault(), path);
  assert.deepEqual(result, { text: 'Explain a pure function.', replacements: 0 });
  assert.equal(Object.keys((await loadVault(path)).entries).length, 0);
});
