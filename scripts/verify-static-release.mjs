import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=(process.argv[2]||'https://flamingo.houston-groq-proxy.workers.dev').replace(/\/$/,'');
const target=new URL(base);
assert.ok(target.origin===base&&(target.origin==='https://flamingo.houston-groq-proxy.workers.dev'||target.hostname==='localhost'),'Use the existing public frontend or a local preview');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[];
async function exact(path){
 const local=await readFile('dist/'+path);
 const response=await fetch(base+'/'+(path==='index.html'?'':path),{signal:AbortSignal.timeout(35000)});
 assert.equal(response.status,200,path);
 const remote=Buffer.from(await response.arrayBuffer());assert.equal(hash(remote),hash(local),path+' differs from the build');
 checks.push({path,status:response.status,sha256:hash(remote)});
 return remote;
}
const html=(await exact('index.html')).toString();
assert.match(html,/flamingo-mark\.svg/);
assert.doesNotMatch(html,/rel="modulepreload"[^>]*three/,'3D must not be preloaded on Home');
const assets=await readdir('dist/assets');
for(let offset=0;offset<assets.length;offset+=4)await Promise.all(assets.slice(offset,offset+4).map(path=>exact('assets/'+path)));
await exact('flamingo-mark.svg');await exact('favicon.svg');
await exact('ai-assistance.json');
const catalog=JSON.parse(await readFile('src/investigation-catalog.json','utf8'));
let rowCount=0;
for(const study of catalog.investigations){const bytes=await exact(study.rows_url.slice(1));assert.equal(hash(bytes),study.rows_sha256);rowCount+=JSON.parse(bytes).records.length;}
assert.equal(rowCount,2009);
for(const path of ['documents/acme.pdf','documents/combustion-science-guide.pdf',...(await readdir('dist/media')).map(name=>'media/'+name)])await exact(path);
let health=null;
if(target.hostname!=='localhost'){
 const response=await fetch('https://houston-groq-proxy.houston-groq-proxy.workers.dev/health',{headers:{Origin:base},signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),base);
 health=await response.json();assert.equal(health.status,'ok');assert.equal(health.retrieval.chunks,3152);assert.equal(health.retrieval.studies,25);assert.equal(health.retrieval.semantic_enabled,true);assert.equal(health.generation_enabled,false);
}
const receipt={verified_at:new Date().toISOString(),url:base+'/',checks,source_rows:rowCount,health,ai_generation_calls:0,embedding_queries:0,browser_visual_qa:'not_verified'};
await writeFile('public-deployment-verification.json',JSON.stringify(receipt,null,2)+'\n');
console.log(`PASS: ${checks.length} exact static files; 25 source snapshots and 2,009 rows; original PDFs/media; on-demand 3D. ${health?'Existing API health and CORS verified; ':''}No AI calls. Browser visual QA is separate.`);
