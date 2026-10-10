import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, writeFile, chmod, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openSync, closeSync, writeFileSync, readFileSync } from 'node:fs';
const cli = resolve('dist/cli.js');
const secret = 'sk-proj-syntheticCli012345678901234567890';
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'hushkey-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const state = join(dir, 'state');
  let invocation = 0;
  // Regular descriptors avoid sandbox pipe limitations and still exercise child process.stdin.
  const run = (args, input = '', entrypoint = cli) => {
    const prefix = join(dir, `invocation-${invocation++}`);
    writeFileSync(prefix + '.stdin', input, { mode: 0o600 });
    const descriptors = [openSync(prefix + '.stdin', 'r'), openSync(prefix + '.stdout', 'wx', 0o600), openSync(prefix + '.stderr', 'wx', 0o600)];
    let result;
    try { result = spawnSync(process.execPath, [entrypoint, ...args, '--state-dir', state], { stdio: descriptors, cwd: dir }); }
    finally { descriptors.forEach(closeSync); }
    assert.equal(result.error, undefined, 'Subprocess must execute successfully');
    return { ...result, stdout: readFileSync(prefix + '.stdout', 'utf8'), stderr: readFileSync(prefix + '.stderr', 'utf8') };
  };
  return { dir, state, run };
}
test('CLI initializes, scans metadata, sanitizes with persistent stable placeholders', async t => {
  const { state, run } = await fixture(t);
  assert.equal(run(['init']).status, 0);
  const findings = run(['scan'], `api_key=${secret}`);
  assert.equal(findings.status, 0);
  assert.ok(JSON.parse(findings.stdout).count > 0);
  assert.ok(!findings.stdout.includes(secret));
  const first = run(['sanitize'], `${secret} ${secret}`);
  assert.equal(first.status, 0, first.stderr);
  const tokens = first.stdout.match(/\[\[HUSHKEY_[a-f0-9]{32}\]\]/g);
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0], tokens[1]);
  assert.ok(!first.stdout.includes(secret));
  assert.ok(!first.stderr.includes(secret));
  assert.equal(run(['sanitize'], secret).stdout, tokens[0]);
  assert.equal(run(['sanitize', '--input', '-'], secret).stdout, tokens[0]);
  assert.ok((await readFile(join(state, 'vault.json'), 'utf8')).includes(secret));
  assert.equal(run(['status']).status, 0);
  assert.equal(run(['doctor']).status, 0);
});
test('restoration needs authorization and a restricted new file, never returns secret stdout', async t => {
  const { dir, run } = await fixture(t);
  assert.equal(run(['init']).status, 0);
  const sanitized = run(['sanitize'], secret).stdout;
  const allowed = join(dir, 'restored');
  await mkdir(allowed, { mode: 0o700 });
  const destination = join(allowed, 'result.txt');
  assert.equal(run(['restore', '--output', destination, '--allowed-directory', allowed], sanitized).status, 1);
  const restored = run(['restore', '--authorize', '--output', destination, '--allowed-directory', allowed], sanitized);
  assert.equal(restored.status, 0, restored.stderr);
  assert.equal(await readFile(destination, 'utf8'), secret);
  assert.ok(!restored.stdout.includes(secret));
  assert.equal(run(['restore', '--authorize', '--output', destination, '--allowed-directory', allowed], sanitized).status, 1);
  assert.equal(run(['restore', '--authorize', '--output', join(dir, 'outside'), '--allowed-directory', allowed], sanitized).status, 1);
});
test('missing or unsafe vault, malformed config, and secret arguments fail without echo', async t => {
  const { state, run } = await fixture(t);
  const missing = run(['sanitize'], secret);
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '');
  assert.ok(!missing.stderr.includes(secret));
  assert.equal(run(['init']).status, 0);
  const invalidArgument = run(['sanitize', secret]);
  assert.equal(invalidArgument.status, 1);
  assert.ok(!invalidArgument.stderr.includes(secret));
  await writeFile(join(state, 'config.json'), '{ invalid');
  assert.equal(run(['sanitize'], secret).stdout, '');
  await writeFile(join(state, 'config.json'), '{}');
  await chmod(join(state, 'vault.json'), 0o644);
  const unsafe = run(['sanitize'], secret);
  assert.equal(unsafe.status, 1);
  assert.equal(unsafe.stdout, '');
});
test('file inputs and custom patterns work; invalid UTF-8 and overwrite fail closed', async t => {
  const { dir, state, run } = await fixture(t);
  assert.equal(run(['init']).status, 0);
  await writeFile(join(state, 'config.json'), JSON.stringify({customPatterns:[{name:'internal',pattern:'INTERNAL-[0-9]{8}'}]}));
  const source = join(dir, 'source');
  const target = join(dir, 'sanitized');
  await writeFile(source, 'INTERNAL-12345678');
  const result = run(['sanitize', '--input', source, '--output', target]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.ok(!(await readFile(target, 'utf8')).includes('INTERNAL-12345678'));
  assert.equal(run(['sanitize', '--input', source, '--output', target]).status, 1);
  await writeFile(source, Buffer.from([0xff]));
  const invalid = run(['sanitize', '--input', source]);
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
});

test('npm-style executable symlink runs help and writes command artifacts', async t => {
  const { dir, state, run } = await fixture(t);
  const bin = join(dir, 'hushkey-bin');
  await symlink(cli, bin);
  const help = run(['--help'], '', bin);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: hushkey/);
  assert.equal(run(['init'], '', bin).status, 0);
  assert.equal(JSON.parse(await readFile(join(state, 'vault.json'), 'utf8')).version, 1);
  const result = run(['sanitize'], secret, bin);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\[\[HUSHKEY_[a-f0-9]{32}\]\]/);
  assert.ok(!result.stdout.includes(secret));
  const imported = await import('../dist/cli.js');
  assert.equal(typeof imported.main, 'function');
});
