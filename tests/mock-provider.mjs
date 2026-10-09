// Local test double. No traffic or credentials are sent to the provider.
import assert from 'node:assert/strict';
globalThis.fetch=async(url,options={})=>{
 const path=new URL(url).pathname;
 assert.equal(options.headers.authorization,'test-only-not-a-secret');
 if(path==='/v2/upload'){assert.equal(options.method,'POST');assert.ok(options.body.length>=100);return Response.json({upload_url:'https://example.invalid/test-audio'})}
 if(path==='/v2/transcript'){const body=JSON.parse(options.body);assert.equal(body.speaker_labels,true);assert.equal(body.language_code,'pt');return Response.json({id:'local-test-job'})}
 if(path==='/v2/transcript/local-test-job')return Response.json({status:'completed',utterances:[{speaker:'A',text:'Olá!',start:0,end:500},{speaker:'B',text:'Tudo bem?',start:600,end:1200}]});
 throw Error('Unexpected provider endpoint');
};
