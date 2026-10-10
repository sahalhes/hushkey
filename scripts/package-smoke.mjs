import assert from 'node:assert/strict';
import { mkdtempSync, openSync, closeSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const executable = resolve(process.argv[2] ?? '');
assert.ok(process.argv[2], 'Supply the installed hushkey executable path');
const directory = mkdtempSync(join(tmpdir(), 'hushkey-package-smoke-'));
let sequence = 0;
function run(args, input = '') {
  const prefix = join(directory, `capture-${sequence++}`);
  writeFileSync(`${prefix}.in`, input, { mode: 0o600 });
  const handles = [openSync(`${prefix}.in`, 'r'), openSync(`${prefix}.out`, 'wx', 0o600), openSync(`${prefix}.err`, 'wx', 0o600)];
  let result;
  try { result = spawnSync(executable, args, { cwd: directory, stdio: handles }); }
  finally { handles.forEach(closeSync); }
  assert.equal(result.error, undefined, 'Executable launch must succeed');
  return { status: result.status, stdout: readFileSync(`${prefix}.out`, 'utf8'), stderr: readFileSync(`${prefix}.err`, 'utf8') };
}
try {
  assert.match(run(['--help']).stdout, /Usage: hushkey/);
  assert.equal(run(['init']).status, 0);
  const secret = 'sk-proj-SYNTHETIC_package_smoke_0123456789012345';
  const other = 'ghp_SYNTHETIC_package_second_0123456789012345';
  const raw = `${secret} ${secret} ${other}`;
  const sanitized = run(['sanitize', '--input', '-'], raw);
  assert.equal(sanitized.status, 0);
  assert.ok(!sanitized.stdout.includes(secret) && !sanitized.stdout.includes(other));
  const tokens = sanitized.stdout.match(/\[\[HUSHKEY_[a-f0-9]{32}\]\]/g);
  assert.equal(tokens.length, 3);
  assert.equal(tokens[0], tokens[1]);
  assert.notEqual(tokens[0], tokens[2]);
  mkdirSync(join(directory, 'restored'), { mode: 0o700 });
  const restore = ['restore', '--output', 'restored/result.txt', '--allowed-directory', 'restored'];
  assert.equal(run(restore, sanitized.stdout).status, 1);
  assert.ok(!existsSync(join(directory, 'restored/result.txt')));
  const restored = run([...restore, '--authorize'], sanitized.stdout);
  assert.equal(restored.status, 0);
  assert.ok(!restored.stdout.includes(secret) && !restored.stderr.includes(secret));
  assert.equal(readFileSync(join(directory, 'restored/result.txt'), 'utf8'), raw);
  assert.equal(run(['doctor']).status, 0);
  assert.equal(run(['status']).status, 0);
  assert.equal(run(['chatgpt', '--output', 'chatgpt.txt'], raw).status, 0);
  assert.equal(readFileSync(join(directory, 'chatgpt.txt'), 'utf8'), sanitized.stdout);
  assert.equal(run(['codex', '--mode', 'full'], raw).status, 1);
  console.log('Installed package smoke passed: executable, stdin, stable mapping, restoration, companion, rejected mode.');
} finally { rmSync(directory, { recursive: true, force: true }); }
