import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, stat, symlink, rm, chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createVault, sanitize, scan, restoreToFile, verifySanitized} from '../dist/core.js';
import {saveVault, loadVault} from '../dist/vault.js';
const key = 'sk-proj-SYNTHETIC0123456789abcdefgh';
test('stable opaque mapping, repeated values and distinct values', () => {
  const vault = createVault();
  const result = sanitize(`password="synthetic-one" repeated synthetic-one ${key} ${key}`,vault);
  assert.equal(result.replacements,4);
  assert.equal(Object.keys(vault.entries).length,2);
  assert(!result.text.includes(key)); assert(!result.text.includes('synthetic-one'));
  assert.equal(sanitize(key,vault).text, sanitize(key,vault).text);
  assert.deepEqual(scan(result.text),[]);
});
test('detects multiline, JWT, URI, assignments and escaped quote content', () => {
  const examples = [
    '-----BEGIN PRIVATE KEY-----\nSYNTHETIC\n-----END PRIVATE KEY-----',
    'eyJhbGciOiJIUzI1NiJ9.eyJzeW50aGV0aWMiOnRydWV9.c3ludGhldGlj',
    'postgres://synthetic:synthetic@localhost/db',
    'TOKEN=synthetic-value', "password='synthetic value'", '"password":"synthetic\\\"value"'
  ];
  for (const value of examples) { assert(scan(value).length); assert(sanitize(value,createVault()).replacements); }
});
test('overlap merges; custom pattern invalidity blocks', () => {
  const v = createVault(); assert.equal(sanitize(`password=${key}`,v).replacements,1);
  assert.equal(sanitize('CUSTOM_SYNTHETIC',v,{customPatterns:[{name:'local',pattern:'CUSTOM_[A-Z]+'}]}).replacements,1);
  assert.throws(() => sanitize('safe',v,{customPatterns:[{name:'bad',pattern:'['}]}),/Invalid custom/);
  assert.throws(() => sanitize('safe',v,{customPatterns:[{name:'empty',pattern:'.*'}]}));
});
test('reserved syntax and invalid vault fail without echoing values', () => {
  assert.throws(() => sanitize('[[HUSHKEY_123]]',createVault()),/Reserved/);
  assert.throws(() => sanitize(key,{version:1,entries:{bad:key}}),/Invalid local vault/);
});
test('vault persistence private, restore authorized and restricted, no overwrite or symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(),'hushkey-core-'));
  try {
    const vault = createVault(); const result = sanitize(key,vault); const path = join(root,'vault.json');
    await saveVault(path,vault); const loaded = await loadVault(path);
    assert.equal(sanitize(key,loaded).text,result.text); assert.equal((await stat(path)).mode & 0o777,0o600);
    const destination=join(root,'restored.txt');
    await assert.rejects(restoreToFile(result.text,loaded,{authorized:false,destination,allowedDirectory:root}));
    await assert.rejects(restoreToFile(result.text,loaded,{authorized:true,destination:join(root,'..','escape.txt'),allowedDirectory:root}));
    await restoreToFile(result.text,loaded,{authorized:true,destination,allowedDirectory:root});
    assert.equal(await readFile(destination,'utf8'),key); assert.equal((await stat(destination)).mode & 0o777,0o600);
    await assert.rejects(restoreToFile(result.text,loaded,{authorized:true,destination,allowedDirectory:root}));
    await symlink(path,join(root,'link.json')); await assert.rejects(loadVault(join(root,'link.json')));
    await chmod(path,0o644); await assert.rejects(loadVault(path));
    const loose=join(root,'loose'); await mkdir(loose,{mode:0o755}); await assert.rejects(saveVault(join(loose,'vault.json'),vault));
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('restoration rejects unknown placeholder', async () => {
  const root = await mkdtemp(join(tmpdir(),'hushkey-core-'));
  try { await assert.rejects(restoreToFile('[[HUSHKEY_'+'0'.repeat(32)+']]',createVault(),{authorized:true,destination:join(root,'out'),allowedDirectory:root})); }
  finally { await rm(root,{recursive:true,force:true}); }
});
test('stale snapshots merge distinct values, reject ambiguous same-value placeholders and key conflicts', async () => {
  const root = await mkdtemp(join(tmpdir(),'hushkey-core-'));
  try {
    const path=join(root,'vault.json');
    const first=createVault(), second=createVault(); sanitize('password=synthetic-first',first); sanitize('password=synthetic-second',second);
    await saveVault(path,first); await saveVault(path,second);
    assert.equal(Object.keys((await loadVault(path)).entries).length,2);
    assert.equal(Object.keys(second.entries).length,2);
    const ambiguous=createVault(); sanitize('password=synthetic-first',ambiguous);
    const before = await readFile(path,'utf8');
    await assert.rejects(saveVault(path,ambiguous),/Unable to save/);
    assert.equal(await readFile(path,'utf8'),before);
    const conflict = {version:1,entries:{[Object.keys(first.entries)[0]]:'synthetic-conflict'}};
    await assert.rejects(saveVault(path,conflict),/Unable to save/);
    assert.equal(await readFile(path,'utf8'),before);
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('concurrent writers reject contention without losing accepted mappings; retries merge', async () => {
  const root = await mkdtemp(join(tmpdir(),'hushkey-core-'));
  try {
    const path=join(root,'vault.json'), first=createVault(), second=createVault();
    sanitize('password=synthetic-concurrent-first',first); sanitize('password=synthetic-concurrent-second',second);
    const results=await Promise.allSettled([saveVault(path,first),saveVault(path,second)]);
    assert(results.some(r => r.status==='fulfilled'));
    for (let i=0;i<results.length;i++) if (results[i].status==='rejected') await saveVault(path,[first,second][i]);
    assert.equal(Object.keys((await loadVault(path)).entries).length,2);
    const third=createVault(), fourth=createVault();
    sanitize('password=synthetic-concurrent-same',third); sanitize('password=synthetic-concurrent-same',fourth);
    const same = await Promise.allSettled([saveVault(path,third),saveVault(path,fourth)]);
    assert.equal(same.filter(r => r.status==='fulfilled').length,1);
    assert.equal(Object.keys((await loadVault(path)).entries).length,3);
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('held or abandoned lock blocks writes, is never removed by rejected writer', async () => {
  const root = await mkdtemp(join(tmpdir(),'hushkey-core-'));
  try {
    const path=join(root,'vault.json'), vault=createVault(); sanitize(key,vault); await saveVault(path,vault);
    const before=await readFile(path,'utf8');
    const {writeFile}=await import('node:fs/promises'); await writeFile(`${path}.lock`,'',{mode:0o600});
    const pending=createVault(); sanitize('password=synthetic-lock-test',pending); const pendingBefore=JSON.stringify(pending);
    await assert.rejects(saveVault(path,pending),/Unable to save/);
    assert.equal(await readFile(path,'utf8'),before); assert.equal(JSON.stringify(pending),pendingBefore);
    assert.equal((await stat(`${path}.lock`)).mode & 0o777,0o600);
    await rm(`${path}.lock`); await saveVault(path,pending);
    assert.equal(Object.keys((await loadVault(path)).entries).length,2);
    await assert.rejects(stat(`${path}.lock`),{code:'ENOENT'});
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('custom lookahead zero-length matches on nonempty input fail closed', () => {
  const vault=createVault(), before=JSON.stringify(vault);
  assert.throws(() => sanitize('INTERNAL_SYNTHETIC',vault,{customPatterns:[{name:'empty-lookahead',pattern:'(?=INTERNAL)'}]}),/Invalid custom/);
  assert.equal(JSON.stringify(vault),before);
});
test('serialized vault UTF8 size bound prevents unreadable writes and leaves mapping untouched', async () => {
  const root = await mkdtemp(join(tmpdir(),'hushkey-core-'));
  try {
    const path=join(root,'vault.json'), vault=createVault(); sanitize(key,vault); await saveVault(path,vault);
    const before=await readFile(path,'utf8');
    const pending={version:1,entries:{['[[HUSHKEY_'+'f'.repeat(32)+']]']:'€'.repeat(6 * 1024 * 1024)}};
    await assert.rejects(saveVault(path,pending),/Unable to save/);
    assert.equal(Object.keys(pending.entries).length,1);
    assert.equal(await readFile(path,'utf8'),before);
    await assert.rejects(stat(`${path}.lock`),{code:'ENOENT'});
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('post-persistence verification blocks newly known values from concurrent merged vault', async () => {
  const root = await mkdtemp(join(tmpdir(),'hushkey-core-'));
  try {
    const path=join(root,'vault.json'), writer=createVault(), stale=createVault();
    const prepared=sanitize('bare synthetic-concurrent-known',stale);
    assert.equal(prepared.replacements,0);
    sanitize('password=synthetic-concurrent-known',writer); await saveVault(path,writer);
    await saveVault(path,stale);
    assert.throws(() => verifySanitized(prepared.text,stale),/Sanitization verification failed/);
    const safe=sanitize('synthetic-concurrent-known',stale); assert.doesNotThrow(() => verifySanitized(safe.text,stale));
  } finally { await rm(root,{recursive:true,force:true}); }
});
