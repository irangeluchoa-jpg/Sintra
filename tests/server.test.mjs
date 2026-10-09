import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('servidor PWA e IA sem credenciais',async()=>{
 const process=spawn('node',['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...globalThis.process.env,PORT:'18991',ASSEMBLYAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(process.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),5000).unref())]);
  const base='http://127.0.0.1:18991';
  const html=await fetch(base);assert.equal(html.status,200);assert.match(await html.text(),/Conversa com IA/);
  const manifest=await(await fetch(base+'/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){const response=await fetch(base+'/'+icon.src);assert.equal(response.status,200);const data=Buffer.from(await response.arrayBuffer());assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),Number(icon.sizes.split('x')[0]))}
  for(const file of ['sw.js','ai.js'])assert.equal((await fetch(base+'/'+file)).status,200);
  assert.deepEqual(await(await fetch(base+'/api/status')).json(),{ai:false});
  const missing=await fetch(base+'/api/conversation',{method:'POST',headers:{'Content-Type':'audio/webm'},body:'audio'});assert.equal(missing.status,503);assert.match((await missing.json()).error,/configurada/);
  const foreign=await fetch(base+'/api/conversation',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'audio/webm'},body:'audio'});assert.equal(foreign.status,403);
  assert.equal((await fetch(base+'/server.mjs')).status,404);assert.equal((await fetch(base+'/.git/config')).status,404);
 }finally{process.kill();await once(process,'exit')}
});

test('envio e separação de falantes com provedor simulado',async()=>{
 const process=spawn('node',['--import','./tests/mock-provider.mjs','server.mjs'],{cwd:new URL('../',import.meta.url),env:{...globalThis.process.env,PORT:'18993',ASSEMBLYAI_API_KEY:'test-only-not-a-secret'},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(process.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),5000).unref())]);
  const base='http://127.0.0.1:18993';
  const response=await fetch(base+'/api/conversation',{method:'POST',headers:{'Content-Type':'audio/webm'},body:Buffer.alloc(200)});assert.equal(response.status,202);const {id}=await response.json();
  const result=await(await fetch(base+'/api/conversation/'+id)).json();assert.equal(result.status,'completed');assert.deepEqual(result.utterances.map(u=>u.speaker),['A','B']);assert.equal(result.utterances[1].text,'Tudo bem?');
  assert.equal((await fetch(base+'/api/conversation/unknown')).status,404);
  assert.equal((await fetch(base+'/api/conversation',{method:'POST',headers:{'Content-Type':'text/plain'},body:'not audio'})).status,415);
 }finally{process.kill();await once(process,'exit')}
});
