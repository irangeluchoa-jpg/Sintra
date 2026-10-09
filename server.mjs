import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const files={'/':'index.html','/index.html':'index.html','/free.js':'free.js','/ai.js':'ai.js','/manifest.webmanifest':'manifest.webmanifest','/sw.js':'sw.js','/icon-192.png':'icon-192.png','/icon-512.png':'icon-512.png'};
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',webmanifest:'application/manifest+json',png:'image/png'};
const jobs=new Map();let busy=false;
async function provider(path,options={}){const response=await fetch('https://api.assemblyai.com/v2/'+path,{...options,headers:{authorization:process.env.ASSEMBLYAI_API_KEY,...options.headers},signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('O serviço de IA recusou a solicitação. Verifique a chave e os créditos.');return response.json()}
const server=http.createServer(async(req,res)=>{
 const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/status'&&req.method==='GET')return json(200,{ai:!!process.env.ASSEMBLYAI_API_KEY});
 if(path==='/api/conversation'&&req.method==='POST'){
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return json(403,{error:'Origem não permitida.'});
  if(!process.env.ASSEMBLYAI_API_KEY)return json(503,{error:'A IA ainda não foi configurada no servidor.'});
  if(busy)return json(429,{error:'Já existe uma conversa sendo enviada. Aguarde.'});
  if(!/^audio\//.test(req.headers['content-type']||''))return json(415,{error:'Envie uma gravação de áudio.'});
  busy=true;
  try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024)return json(413,{error:'Áudio muito grande. Grave até 60 segundos.'});chunks.push(chunk)}if(size<100)return json(400,{error:'Gravação vazia.'});
   const upload=await provider('upload',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:Buffer.concat(chunks)});
   const job=await provider('transcript',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio_url:upload.upload_url,language_code:'pt',speaker_labels:true,speech_models:['universal-2']})});
   jobs.set(job.id,Date.now());return json(202,{id:job.id});
  }finally{busy=false}
 }
 if(path.startsWith('/api/conversation/')&&req.method==='GET'){
  const id=path.slice('/api/conversation/'.length);const created=jobs.get(id);
  if(!created||Date.now()-created>30*60*1000){jobs.delete(id);return json(404,{error:'Conversa expirada. Grave novamente.'})}
  const job=await provider('transcript/'+encodeURIComponent(id));
  return json(200,{status:job.status,error:job.status==='error'?'A IA não conseguiu transcrever este áudio.':undefined,utterances:job.status==='completed'?(job.utterances||[]).map(u=>({speaker:u.speaker,text:u.text,start:u.start,end:u.end})):undefined});
 }
 if(!files[path]||!['GET','HEAD'].includes(req.method))return json(404,{error:'Não encontrado.'});
 const body=await readFile(new URL(files[path],root));res.writeHead(200,{'Content-Type':types[files[path].split('.').pop()],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
 }catch{json(502,{error:'Não foi possível acessar o serviço de IA. Verifique a conexão e tente novamente.'})}
});
server.requestTimeout=90000;
server.listen(Number(process.env.PORT||8000),'127.0.0.1',()=>console.log('Sintra iniciado. IA: '+(process.env.ASSEMBLYAI_API_KEY?'configurada':'aguardando chave')));
