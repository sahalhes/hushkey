import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createVault, sanitize } from '../dist/core.js';
import { runCodex } from '../dist/codex.js';
import { loadVault, saveVault } from '../dist/vault.js';

const secret = 'sk-syntheticCodexCredential123456789';
async function fixture(t, suffix = '') {
  const directory = await mkdtemp(join(tmpdir(), 'hushkey-codex-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const executable = join(directory, 'fake-codex');
  const capture = join(directory, 'capture.json');
  const vaultPath = join(directory, 'vault.json');
  await writeFile(executable, `#!${process.execPath}\nimport fs from 'node:fs';\nconst input=fs.readFileSync(0,'utf8');fs.writeFileSync(${JSON.stringify(capture)}, JSON.stringify({input,args:process.argv.slice(2),cwd:process.cwd(),env:process.env,vaultExists:fs.existsSync(${JSON.stringify(vaultPath)})}));process.stdout.write(${JSON.stringify(secret)});process.stderr.write(${JSON.stringify(secret)});${suffix}`, {mode: 0o700});
  return {directory, executable, capture, vaultPath};
}

test('supplied prompt is sanitized and persisted before fixed stdin subprocess launch', async t => {
  const f = await fixture(t);
  const prior = process.env.HUSHKEY_TEST_UNRELATED_SECRET;
  process.env.HUSHKEY_TEST_UNRELATED_SECRET = secret;
  t.after(() => { if (prior === undefined) delete process.env.HUSHKEY_TEST_UNRELATED_SECRET; else process.env.HUSHKEY_TEST_UNRELATED_SECRET = prior; });
  const vault = createVault();
  assert.deepEqual(await runCodex(`Explain ${secret} repeated ${secret}`, vault, f.vaultPath, {executable: f.executable}), {exitCode:0, replacements:2});
  const capture = JSON.parse(await readFile(f.capture, 'utf8'));
  assert.equal(capture.vaultExists, true);
  assert.equal(capture.input.includes(secret), false);
  const placeholders = capture.input.match(/\[\[HUSHKEY_[a-f0-9]{32}\]\]/g);
  assert.equal(placeholders.length, 2);
  assert.equal(placeholders[0], placeholders[1]);
  assert.deepEqual(capture.args, ['--ask-for-approval', 'never', 'exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral', '--ignore-user-config', '-']);
  assert.equal(JSON.stringify(capture.args).includes(secret), false);
  assert.equal(capture.env.HUSHKEY_TEST_UNRELATED_SECRET, undefined);
  assert.equal(capture.env.OPENAI_API_KEY, undefined);
  assert.equal(capture.env.NODE_OPTIONS, undefined);
  assert.notEqual(capture.cwd, f.directory);
  await assert.rejects(access(capture.cwd));
  assert.equal(JSON.parse(await readFile(f.vaultPath, 'utf8')).entries[placeholders[0]], secret);
});

test('unsupported broad/proxy modes fail before launch and persistence', async t => {
  const f = await fixture(t);
  for (const mode of ['proxy', 'full', 'global']) {
    await assert.rejects(runCodex(secret, createVault(), f.vaultPath, {executable:f.executable, mode}), /Unsupported Codex protection mode/);
  }
  await assert.rejects(access(f.capture));
  await assert.rejects(access(f.vaultPath));
});

test('invalid sanitization and failed vault persistence never spawn', async t => {
  const f = await fixture(t);
  await assert.rejects(runCodex('[[HUSHKEY_bad]]', createVault(), f.vaultPath, {executable:f.executable}));
  await assert.rejects(runCodex(secret, createVault(), join(f.directory, 'missing', '..', '..', 'untrusted-vault.json'), {executable:f.executable}));
  await assert.rejects(access(f.capture));
});

test('child failure and missing executable expose generic errors only', async t => {
  const f = await fixture(t, 'process.exitCode=1;');
  await assert.rejects(runCodex(secret, createVault(), f.vaultPath, {executable:f.executable}), {message:'Codex execution failed'});
  const capture = JSON.parse(await readFile(f.capture, 'utf8'));
  await assert.rejects(access(capture.cwd));
  await assert.rejects(runCodex(secret, await loadVault(f.vaultPath), f.vaultPath, {executable:join(f.directory, 'absent')}), {message:'Codex execution failed'});
});

test('timeout terminates direct child and cleans isolated cwd', async t => {
  const f = await fixture(t, 'setInterval(() => {}, 1000);');
  await assert.rejects(runCodex(secret, createVault(), f.vaultPath, {executable:f.executable, timeoutMs:500}), {message:'Codex execution failed'});
  const capture = JSON.parse(await readFile(f.capture, 'utf8'));
  await assert.rejects(access(capture.cwd));
});

test('post-persistence verification blocks a stale vault with newly merged known secret', async t => {
  const f = await fixture(t);
  const existing = createVault();
  const unknownToRules = 'locally-known-value';
  sanitize(`password=${unknownToRules}`, existing);
  await saveVault(f.vaultPath, existing);
  await assert.rejects(runCodex(`Explain ${unknownToRules}`, createVault(), f.vaultPath, {executable:f.executable}), /verification failed/);
  await assert.rejects(access(f.capture));
});
