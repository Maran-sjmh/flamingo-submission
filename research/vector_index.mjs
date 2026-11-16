// Offline plan by default. Remote operations require an explicit command and environment.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import corpus from '../worker/src/generated/retrieval-corpus.json' with {type:'json'};
import {CORPUS,EMBEDDING,embedTexts,validateEmbeddingOutput} from '../worker/src/retrieval.mjs';
import {boundedJson} from '../worker/src/core.mjs';
const command=process.argv[2]||'plan';
if(command==='plan'){
 console.log(JSON.stringify({mode:'offline_plan',model:EMBEDDING.model,pooling:EMBEDDING.pooling,dimensions:EMBEDDING.dimensions,metric:EMBEDDING.metric,fragments:CORPUS.chunks,stored_dimensions:CORPUS.chunks*EMBEDDING.dimensions,namespace:CORPUS.namespace,batch_size:16,maximum_embedding_batches:Math.ceil(CORPUS.chunks/16),metadata_filters:['accession','kind','row_type'],network_calls:0,remote_writes:0},null,2));
}else{
 if(!['status','ingest'].includes(command))throw Error('Use plan | status | ingest --confirm-remote-write');
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,index=process.env.CLOUDFLARE_VECTOR_INDEX||'flamingo-research-bge-small-v1';
 if(!/^[a-f0-9]{32}$/i.test(account||'')||!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(index))throw Error('Set a valid independent account ID and index name.');
 const token=process.env.CLOUDFLARE_API_TOKEN;
 if(!token)throw Error('Set CLOUDFLARE_API_TOKEN in the local environment, never in source or command arguments.');
 if(command==='ingest'&&!process.argv.includes('--confirm-remote-write'))throw Error('Review target, permissions and quota/cost, then pass --confirm-remote-write. No plan or payment changes are made.');
 async function api(path,{method='GET',json,form}={}){
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`,{method,headers:{Authorization:'Bearer '+token,...(json?{'Content-Type':'application/json'}:{})},...(json?{body:JSON.stringify(json)}:form?{body:form}:{}),redirect:'manual',signal:AbortSignal.timeout(45000)});
  const data=await boundedJson(r,4_000_000);
  if(!r.ok||data.success!==true)throw Error(`Cloudflare operation failed: HTTP ${r.status}; codes ${(data.errors||[]).map(e=>e.code).join(',')}`);
  return data.result;
 }
 const path='/vectorize/v2/indexes/'+index;
 if(command==='status')console.log(JSON.stringify({account,index,info:await api(path+'/info'),scope:'Status only, not billing or query-quality validation'},null,2));
 else{
  const config=await api(path);
  if(config.config?.dimensions!==EMBEDDING.dimensions||config.config?.metric!==EMBEDDING.metric)throw Error('Index geometry does not match the canonical model.');
  const metadata=await api(path+'/metadata_index/list');
  const names=new Set((metadata.metadataIndexes||metadata).map(m=>m.propertyName));
  for(const field of ['accession','kind','row_type'])if(!names.has(field))throw Error('Create metadata index before ingestion: '+field);
  const dir=new URL(`./cache/${account}/${index}/`,import.meta.url);await mkdir(dir,{recursive:true});
  const file=new URL(CORPUS.version+'.json',dir);
  let state;
  try{state=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={corpus_version:CORPUS.version,namespace:CORPUS.namespace,vectors:[],upserted:[],mutations:[]};}
  if(state.corpus_version!==CORPUS.version||state.namespace!==CORPUS.namespace)throw Error('Checkpoint version differs.');
  const vectors=new Map();for(const vector of state.vectors){validateEmbeddingOutput({data:[vector.values]},1);vectors.set(vector.id,vector);}
  const done=new Set(state.upserted),pending=corpus.chunks.filter(c=>!done.has(c.id));
  const save=async()=>{state.vectors=[...vectors.values()];state.upserted=[...done];await writeFile(file,JSON.stringify(state)+'\n');};
  const ai={run:(model,input)=>api('/ai/run/'+model,{method:'POST',json:input})};
  for(let start=0;start<pending.length;start+=16){
   const batch=pending.slice(start,start+16),missing=batch.filter(c=>!vectors.has(c.id));
   if(missing.length){
    const embedded=await embedTexts(ai,missing.map(c=>c.text));
    missing.forEach((c,i)=>vectors.set(c.id,{id:c.id,values:embedded[i],namespace:CORPUS.namespace,metadata:{accession:c.accession,kind:c.kind,...(c.row_type?{row_type:c.row_type}:{})}}));
    await save();
   }
   const form=new FormData();form.append('vectors',new File([batch.map(c=>JSON.stringify(vectors.get(c.id))).join('\n')],'vectors.ndjson',{type:'application/x-ndjson'}));
   const mutation=await api(path+'/upsert?unparsable-behavior=error',{method:'POST',form});
   if(!mutation.mutationId)throw Error('Missing mutation receipt');
   batch.forEach(c=>done.add(c.id));state.mutations.push(mutation.mutationId);await save();
   console.log(JSON.stringify({accepted:done.size,total:CORPUS.chunks}));
  }
  console.log(JSON.stringify({status:'upserts_accepted_visibility_pending',index,namespace:CORPUS.namespace,vectors:done.size,generation_calls:0,notice:'Check processing and actual source retrieval before enabling semantic mode. Embedding/index usage may consume quota or incur provider charges.'}));
 }
}
