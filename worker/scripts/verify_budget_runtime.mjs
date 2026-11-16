import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../package.json',import.meta.url));
const {build}=require('esbuild');const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const compiled=await build({stdin:{contents:"import {EmbeddingBudget} from './embedding-budget.mjs'; export {EmbeddingBudget}; export default {async fetch(request,env){return Response.json(await env.SEMANTIC_BUDGET.getByName('runtime-check').reserve());}}",resolveDir:fileURLToPath(new URL('../src/',import.meta.url))},bundle:true,write:false,format:'esm',platform:'neutral',external:['cloudflare:workers']});
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'budget-runtime',modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-11-14',durableObjects:{SEMANTIC_BUDGET:{className:'EmbeddingBudget',useSQLite:true}},bindings:{SEMANTIC_DAILY_LIMIT:'3'}}]}));
try{
 const results=[];for(let i=0;i<5;i++)results.push(await (await mf.dispatchFetch('http://test.local/')).json());
 assert.deepEqual(results.map(r=>r.allowed),[true,true,true,false,false]);
 const report={scope:'Actual local Workers runtime with SQLite Durable Object and RPC',results,passed:true,model_calls:0};
 mkdirSync(new URL('../results/',import.meta.url),{recursive:true});
 writeFileSync(new URL('../results/budget-runtime.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await mf.dispose();}
