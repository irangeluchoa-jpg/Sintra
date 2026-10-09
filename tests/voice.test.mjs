import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function app(){
 const elements=new Map();
 const el=id=>{
  if(!elements.has(id))elements.set(id,{value:id==='language'?'en':'',checked:id==='auto',textContent:'',disabled:false,attributes:{},classList:{toggle(){},add(){},remove(){}},setAttribute(name,value){this.attributes[name]=value},addEventListener(){}});
  return elements.get(id);
 };
 const engines=[],requests=[],spoken=[],events=[];
 let cancellations=0;
 class Recognition {
  constructor(){engines.push(this)}
  start(){this.onstart?.()}
  stop(){this.stopCalls=(this.stopCalls||0)+1}
  abort(){this.onend?.()}
  results(values){const results=values.map(([transcript,isFinal=true])=>Object.assign([{transcript}],{isFinal}));this.onresult({results,resultIndex:0})}
  end(){this.onend?.()}
 }
 const window={SpeechRecognition:Recognition,isSecureContext:true,addEventListener(){},dispatchEvent(event){events.push(event)},speechSynthesis:{cancel(){cancellations++},getVoices:()=>[],speak(utterance){spoken.push(utterance.text)}}};
 const context=vm.createContext({window,document:{getElementById:el},navigator:{onLine:true},TextEncoder,URL,AbortController,setTimeout,clearTimeout,
  SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
  CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},
  DOMParser:class{parseFromString(text){return{documentElement:{textContent:text}}}},
  fetch:async url=>{requests.push(url);return{ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'Hello'}})}}
 });
 vm.runInContext(script,context);
 return {el,engines,requests,spoken,events,cancellations:()=>cancellations};
}

test('repeated final snapshots do not append the same recognized word twice',async()=>{
 const a=app();a.el('mic').onclick();const mic=a.engines[0];assert.equal(mic.continuous,false);
 mic.results([['Olá']]);mic.results([['Olá']]);mic.results([['Olá']]);
 assert.equal(a.el('captured').value,'Olá');
 mic.end();mic.end();await flush();
 assert.equal(a.requests.length,1);assert.equal(a.requests[0].searchParams.get('q'),'Olá');assert.deepEqual(a.spoken,['Hello']);
});

test('interim revisions replace earlier hypotheses and preserve intentional repetitions',async()=>{
 const a=app();a.el('mic').onclick();const mic=a.engines[0];
 mic.results([['não',false]]);mic.results([['não não',false]]);mic.results([['não não',true],['obrigado',false]]);mic.results([['não não',true],['obrigado',true]]);
 assert.equal(a.el('captured').value,'não não obrigado');mic.end();await flush();
 assert.equal(a.requests[0].searchParams.get('q'),'não não obrigado');
});

test('events from an aborted recording cannot change or finish the next session',async()=>{
 const a=app();a.el('mic').onclick();const old=a.engines[0];old.results([['antigo']]);a.el('clear').onclick();a.el('mic').onclick();const current=a.engines[1];
 current.results([['novo']]);old.results([['antigo repetido']]);old.end();
 assert.equal(a.el('captured').value,'novo');assert.equal(a.requests.length,0);
 assert.equal(a.el('mic').attributes['aria-pressed'],'true');
 current.end();await flush();assert.equal(a.requests.length,1);assert.equal(a.requests[0].searchParams.get('q'),'novo');
});

test('speech and translation wait for recording to finish; repeated stop clicks are ignored',async()=>{
 const a=app();a.el('captured').value='início';a.el('translate').onclick();await flush();assert.equal(a.spoken.length,1);
 const cancelled=a.cancellations();a.el('mic').onclick();assert.ok(a.cancellations()>cancelled);
 assert.equal(a.el('speak').disabled,true);assert.equal(a.el('translate').disabled,true);
 a.engines[0].results([['próxima frase']]);a.el('translate').onclick();a.el('speak').onclick();await flush();
 assert.equal(a.spoken.length,1);assert.equal(a.requests.length,1);
 a.el('mic').onclick();a.el('mic').onclick();assert.equal(a.engines[0].stopCalls,1);
 a.engines[0].end();await flush();assert.equal(a.requests.length,2);assert.equal(a.spoken.length,2);
});

test('recognition error never triggers translation or playback',async()=>{
 const a=app();a.el('mic').onclick();const mic=a.engines[0];mic.results([['parcial',false]]);mic.onerror({error:'network'});mic.end();await flush();
 assert.equal(a.requests.length,0);assert.equal(a.spoken.length,0);assert.equal(a.el('mic').attributes['aria-pressed'],'false');
});
