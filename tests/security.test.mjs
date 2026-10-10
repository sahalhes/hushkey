import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink, stat, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {main} from '../dist/cli.js';
import {createVault, sanitize, scan, restoreToFile} from '../dist/core.js';
import {loadVault, saveVault} from '../dist/vault.js';
import {runCodex} from '../dist/codex.js';
const secret = 'sk-proj-IndependentSyntheticCredential0123456789';
const cli = resolve('dist/cli.js');
async function directory(t) { const root=await mkdtemp(join(tmpdir(),'hushkey-security-')); t.after(()=>rm(root,{recursive:true,force:true})); return root; }
async function invoke(args,input='') { const root=await mkdtemp(join(tmpdir(),'hushkey-security-input-')); let stdout='',stderr=''; const out=process.stdout.write,err=process.stderr.write; let status=0; try {const path=join(root,'input');await writeFile(path,input); if(!args.includes('--input')&&!['init','restore'].includes(args[0])) args=[...args,'--input',path]; if(args[0]==='restore') args=[...args,'--input',path]; process.stdout.write=(chunk)=>{stdout+=chunk;return true;};process.stderr.write=(chunk)=>{stderr+=chunk;return true;};try{await main(args);}catch(error){status=1;stderr=error.message;} }finally{process.stdout.write=out;process.stderr.write=err;await rm(root,{recursive:true,force:true});}return {status,stdout,stderr}; }

function noLeak(value, originals=[secret]) { for(const original of originals) assert.equal(JSON.stringify(value).includes(original),false); }

test('independent known-secret propagation and overlap protect repeated unlabeled values',()=>{
 const vault=createVault();
 const first=sanitize(`password="local-synthetic password"`,vault);
 const mapped=Object.keys(vault.entries)[0];
 const next=sanitize(`unlabelled local-synthetic password twice local-synthetic password`,vault);
 assert.equal(next.replacements,2); assert.equal(next.text.split(mapped).length,3);
 const overlapping=sanitize(`token=${secret}\n${secret}`,vault,{customPatterns:[{name:'overlap',pattern:'IndependentSyntheticCredential[0-9]+'}]});
 noLeak(overlapping); assert.equal(overlapping.replacements,2);
 noLeak({text:first.text,findings:first.findings},['local-synthetic password']);
 assert.deepEqual(scan(overlapping.text),[]);
});

test('invalid rule, ambiguous placeholder input and corrupt vault fail without mutating mappings',()=>{
 const vault=createVault(); sanitize(secret,vault); const before=JSON.stringify(vault);
 for(const text of ['[[HUSHKEY_'+ 'a'.repeat(32)+']]','prefix [[HUSHKEY_broken']) assert.throws(()=>sanitize(text,vault));
 assert.throws(()=>sanitize('password=synthetic-second',vault,{customPatterns:[{name:'bad',pattern:'['}]}));
 assert.equal(JSON.stringify(vault),before);
 for(const entries of [{['[[HUSHKEY_'+'0'.repeat(32)+']]']:''},{['[[HUSHKEY_'+'0'.repeat(32)+']]']:'[[HUSHKEY_invalid]]'}]) assert.throws(()=>sanitize(secret,{version:1,entries}));
});

test('encoded and fragmented unlabelled values are documented false negatives; explicit custom rule can protect representation',()=>{
 const base64=Buffer.from(secret).toString('base64');
 const percent=[...secret].map(c=>'%'+c.charCodeAt(0).toString(16)).join('');
 const fragmented=JSON.stringify([secret.slice(0,6),secret.slice(6,20),secret.slice(20)]);
 for(const representation of [base64,percent,fragmented]) {
  assert.equal(scan(representation).length,0);
  assert.equal(sanitize(representation,createVault()).text,representation);
 }
 const protectedValue=sanitize(base64,createVault(),{customPatterns:[{name:'explicit-encoded-format',pattern:base64}]});
 assert.equal(protectedValue.text.includes(base64),false);
 const escaped='password="line-one\\nline-two\\\"synthetic"';
 const result=sanitize(escaped,createVault()); assert.equal(result.text.includes('line-one'),false); assert.equal(result.replacements,1);
});

test('symlink ancestors, unknown restoration tokens and overwrite attempts cannot produce restored files',async t=>{
 const root=await directory(t); const actual=join(root,'actual'); await mkdir(actual,{mode:0o700});
 const linked=join(root,'linked'); await symlink(actual,linked);
 const vault=createVault(); const result=sanitize(secret,vault);
 await assert.rejects(saveVault(join(linked,'vault.json'),vault));
 await assert.rejects(restoreToFile(result.text,vault,{authorized:true,destination:join(linked,'plaintext'),allowedDirectory:root}));
 await assert.rejects(access(join(actual,'plaintext')));
 const output=join(actual,'plaintext');
 await assert.rejects(restoreToFile('[[HUSHKEY_'+ 'f'.repeat(32)+']]',vault,{authorized:true,destination:output,allowedDirectory:actual}));
 await assert.rejects(access(output));
 await writeFile(output,'existing',{mode:0o600});
 await assert.rejects(restoreToFile(result.text,vault,{authorized:true,destination:output,allowedDirectory:actual}));
 assert.equal(await readFile(output,'utf8'),'existing');
});

test('CLI main metadata/errors contain no source values on scan, malformed config/vault, UTF8 failure, and denied restore',async t=>{
 const root=await directory(t),state=join(root,'state');
 assert.equal((await invoke(['init','--state-dir',state])).status,0);
 const scanned=await invoke(['scan','--state-dir',state],secret); assert.equal(scanned.status,0); assert.equal(JSON.parse(scanned.stdout).count,1); noLeak(scanned.stdout); noLeak(scanned.stderr);
 const sanitized=await invoke(['sanitize','--state-dir',state],secret); assert.equal(sanitized.status,0); assert.match(sanitized.stdout,/\[\[HUSHKEY_[a-f0-9]{32}\]\]/); noLeak(sanitized.stdout); noLeak(sanitized.stderr);
 const restored=await invoke(['restore','--state-dir',state,'--output',join(root,'restore'),'--allowed-directory',root],sanitized.stdout);
 assert.equal(restored.status,1); noLeak(restored.stdout); noLeak(restored.stderr); await assert.rejects(access(join(root,'restore')));
 await writeFile(join(state,'config.json'),JSON.stringify({customPatterns:[{name:secret,pattern:'['}]}),{mode:0o600});
 const invalidRule=await invoke(['sanitize','--state-dir',state],secret); assert.equal(invalidRule.status,1); assert.equal(invalidRule.stdout,''); noLeak(invalidRule.stderr);
 await writeFile(join(state,'config.json'),'{}');
 const invalidFile=join(root,'invalid-utf8'); await writeFile(invalidFile,Buffer.from([0xff]));
 const invalidUtf8=await invoke(['sanitize','--state-dir',state,'--input',invalidFile]); assert.equal(invalidUtf8.status,1); assert.equal(invalidUtf8.stdout,'');
 await writeFile(join(state,'vault.json'),'{'+secret,{mode:0o600});
 await assert.rejects(loadVault(join(state,'vault.json')),error=>!error.message.includes(secret));
 const corrupt=await invoke(['sanitize','--state-dir',state],secret); assert.equal(corrupt.status,1); assert.equal(corrupt.stdout,''); noLeak(corrupt.stderr);
});

test('independent launch sentinel proves unsupported modes and blocked persistence fail before child execution',async t=>{
 const root=await directory(t); const marker=join(root,'launched'); const executable=join(root,'fake-codex');
 await writeFile(executable,`#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)},'launched');\n`,{mode:0o700});
 const loose=join(root,'public'); await mkdir(loose,{mode:0o755});
 for(const mode of ['full','proxy','global','repository']) await assert.rejects(runCodex(secret,createVault(),join(root,'vault.json'),{mode,executable}));
 await assert.rejects(runCodex(secret,createVault(),join(loose,'vault.json'),{executable}));
 await assert.rejects(runCodex(secret,createVault(),join(root,'vault.json'),{executable,customPatterns:[{name:'broken',pattern:'['}]}));
 await assert.rejects(access(marker));
 assert.equal((await stat(loose)).mode & 0o777,0o755);
});

test('independent ChatGPT companion exports only sanitized text and count, with atomic caller state on failure',async t=>{
 const {runLocalCompanion}=await import('../dist/chatgpt.js'); const root=await directory(t); const vault=createVault();
 const result=await runLocalCompanion(`token=${secret} repeated ${secret}`,vault,join(root,'vault.json'));
 assert.deepEqual(Object.keys(result).sort(),['replacements','text']); assert.equal(result.replacements,2); noLeak(result);
 assert.equal(Object.keys(vault.entries).length,1); assert.equal((await stat(join(root,'vault.json'))).mode & 0o777,0o600);
 const before=JSON.stringify(vault); const loose=join(root,'public'); await mkdir(loose,{mode:0o755});
 await assert.rejects(runLocalCompanion('password=another-synthetic-value',vault,join(loose,'vault.json')),error=>!error.message.includes('another-synthetic-value'));
 assert.equal(JSON.stringify(vault),before);
});

test('independent lock bypass review: held/symlink locks block integrations and preserve mappings',async t=>{
 const {runLocalCompanion}=await import('../dist/chatgpt.js'); const root=await directory(t), path=join(root,'vault.json');
 const vault=createVault(); sanitize(secret,vault); await saveVault(path,vault); const before=await readFile(path,'utf8');
 const lock=path+'.lock'; await writeFile(lock,'held-by-another-writer',{mode:0o600});
 const beforeCaller=JSON.stringify(vault);
 await assert.rejects(runLocalCompanion('password=synthetic-pending',vault,path));
 assert.equal(JSON.stringify(vault),beforeCaller); assert.equal(await readFile(path,'utf8'),before);
 assert.equal(await readFile(lock,'utf8'),'held-by-another-writer');
 await assert.rejects(runCodex(secret,vault,path,{executable:join(root,'should-not-exist')}),/Unable to save private local vault/);
 assert.equal(await readFile(lock,'utf8'),'held-by-another-writer');
 await rm(lock); const sentinel=join(root,'sentinel'); await writeFile(sentinel,'leave-this-alone',{mode:0o600}); await symlink(sentinel,lock);
 await assert.rejects(saveVault(path,vault)); assert.equal(await readFile(sentinel,'utf8'),'leave-this-alone'); assert.equal(await readFile(path,'utf8'),before);
 await rm(lock); await saveVault(path,vault); await assert.rejects(access(lock));
});

test('independent conditional empty regex detection fails closed before emitting or adding a mapping',()=>{
 const vault=createVault(); const before=JSON.stringify(vault);
 for(const pattern of ['(?=synthetic)','(?<=synthetic)']) assert.throws(()=>sanitize('synthetic',vault,{customPatterns:[{name:'conditional-empty',pattern}]}),/Invalid custom/);
 assert.equal(JSON.stringify(vault),before);
});

test('independent post-merge companion verification blocks a disk-known bare secret missing from caller snapshot',async t=>{
 const {runLocalCompanion}=await import('../dist/chatgpt.js'); const root=await directory(t), path=join(root,'vault.json');
 const disk=createVault(); const bare='previously-known-local-sensitive-value'; sanitize('password='+bare,disk); await saveVault(path,disk);
 const stale=createVault(); const callerBefore=JSON.stringify(stale);
 await assert.rejects(runLocalCompanion(`Explain this bare value ${bare}`,stale,path),{message:'Local companion blocked: sanitization or private vault persistence failed'});
 assert.equal(JSON.stringify(stale),callerBefore);
 assert.deepEqual((await loadVault(path)).entries,disk.entries);
});
