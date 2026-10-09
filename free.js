'use strict';
(()=>{
let person='1',previous='',turn=0;
window.sintraPerson=person;
const entries=[];
const history=document.getElementById('conversation');
for(const button of document.querySelectorAll('[data-person]'))button.onclick=()=>{
 const mic=document.getElementById('mic');
 if(mic.getAttribute('aria-pressed')==='true'){document.getElementById('status').textContent='Pare a gravação antes de trocar de pessoa.';return}
 person=button.dataset.person;window.sintraPerson=person;document.getElementById('capture-language').textContent=person==='1'?'pt-BR':({en:'en-US',es:'es-ES',fr:'fr-FR',de:'de-DE'})[document.getElementById('language').value];turn++;previous='';
 document.getElementById('clear').click();
 for(const item of document.querySelectorAll('[data-person]')){item.setAttribute('aria-pressed',String(item===button));item.style.background=item===button?'#38bdf8':'#1e293b';item.style.color=item===button?'#082f49':'#cbd5e1'}
 document.getElementById('status').textContent='Pessoa '+person+': toque no microfone ou digite.';
};
window.addEventListener('sintra-translation',event=>{
 const {text,translation,language,person:author}=event.detail;
 const key=[turn,text,translation,language].join('\u0000');if(key===previous)return;previous=key;
 const card=document.createElement('article');card.className='card';
 const title=document.createElement('strong');title.textContent='Pessoa '+author;title.style.color='#7dd3fc';
 const original=document.createElement('p');original.textContent=text;original.style.cssText='font-size:13px;color:#94a3b8;overflow-wrap:anywhere';
 const translated=document.createElement('p');translated.textContent=translation;translated.style.overflowWrap='anywhere';
 entries.unshift({person:author,text,translation});if(entries.length>30)entries.pop();document.getElementById('export-history').disabled=false;card.append(title,original,translated);history.prepend(card);while(history.children.length>30)history.lastElementChild.remove();
 document.getElementById('empty-conversation').hidden=true;
});
document.getElementById('clear-history').onclick=()=>{history.replaceChildren();entries.length=0;document.getElementById('export-history').disabled=true;previous='';document.getElementById('empty-conversation').hidden=false};
document.getElementById('export-history').onclick=()=>{const text=[...entries].reverse().map(item=>'Pessoa '+item.person+'\n'+item.text+'\n'+item.translation).join('\n\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='conversa-sintra.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
})();
