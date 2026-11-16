import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initializeBudget,reserveFromSql,semanticDailyLimit,reserveSemanticBudget} from '../src/semantic-budget.mjs';
import {searchEvidence,validateSearch,CORPUS,EMBEDDING} from '../src/retrieval.mjs';
const storage=()=>{const db=new DatabaseSync(':memory:');return {db,sql:{exec(query,...values){const rows=db.prepare(query).all(...values);return {toArray:()=>rows};}}};};

test('daily reservation uses atomic SQL and never grants more than the configured cap',async()=>{
 const {db,sql}=storage();initializeBudget(sql);
 const results=await Promise.all(Array.from({length:30},()=>Promise.resolve(reserveFromSql(sql,'5'))));
 assert.equal(results.filter(r=>r.allowed).length,5);assert.equal(db.prepare('SELECT used FROM semantic_budget').get().used,5);
 assert.equal(results[4].remaining,0);assert.equal(reserveFromSql(sql,'5').allowed,false);db.close();
});
test('invalid, negative or excessive budgets fail closed and explicit zero disables semantic reservations',()=>{
 assert.equal(semanticDailyLimit(undefined),250);
 for(const value of ['-1','1.5','NaN','1001','Infinity','unlimited'])assert.equal(semanticDailyLimit(value),0);
 const {db,sql}=storage();initializeBudget(sql);assert.equal(reserveFromSql(sql,'0').allowed,false);assert.equal(db.prepare('SELECT count(*) n FROM semantic_budget').get().n,0);db.close();
});
test('all callers for one UTC day route to the same coordination object and the next day uses a new object',async()=>{
 const names=[];const env={REQUIRE_SEMANTIC_BUDGET:'true',SEMANTIC_BUDGET:{getByName(name){names.push(name);return {reserve:async()=>({allowed:true,limit:250,remaining:249})};}}};
 await reserveSemanticBudget(env,new Date('2026-11-15T01:00:00Z'));await reserveSemanticBudget(env,new Date('2026-11-15T23:59:59Z'));await reserveSemanticBudget(env,new Date('2026-11-16T00:00:00Z'));
 assert.deepEqual(names,['semantic-budget:2026-11-15','semantic-budget:2026-11-15','semantic-budget:2026-11-16']);
 assert.equal((await reserveSemanticBudget({REQUIRE_SEMANTIC_BUDGET:'true'})).status,'budget_unavailable');
});
test('exhausted or missing budget skips embeddings, reports lexical fallback and keeps required hybrid explicit',async()=>{
 let embeddings=0;const env={ENABLE_SEMANTIC_SEARCH:'true',RETRIEVAL_CORPUS_VERSION:CORPUS.version,REQUIRE_SEMANTIC_BUDGET:'true',AI:{run:async()=>{embeddings++;return {data:[Array.from({length:EMBEDDING.dimensions},()=>1)]};}},NASA_VECTORS:{query:async()=>({matches:[]})},SEMANTIC_BUDGET:{getByName:()=>({reserve:async()=>({allowed:false,remaining:0,limit:250})})}};
 const input=validateSearch({query:'SIBAL airflow',accession:'PSI-98',mode:'auto'});
 const response=await searchEvidence(input,env);assert.equal(response.mode_used,'lexical');assert.equal(response.semantic_status,'daily_budget_exhausted');assert.ok(response.matches.length);assert.equal(embeddings,0);
 await assert.rejects(searchEvidence({...input,mode:'hybrid'},env),/daily_budget_exhausted/);
 const missing=await searchEvidence(input,{...env,SEMANTIC_BUDGET:undefined});assert.equal(missing.semantic_status,'budget_unavailable');assert.equal(embeddings,0);
});
test('keyword and unknown-investigation requests do not consume the semantic budget',async()=>{
 const env={ENABLE_SEMANTIC_SEARCH:'true',RETRIEVAL_CORPUS_VERSION:CORPUS.version,REQUIRE_SEMANTIC_BUDGET:'true',AI:{run:()=>{throw Error('No AI');}},NASA_VECTORS:{query:()=>{throw Error('No query');}},SEMANTIC_BUDGET:{getByName:()=>{throw Error('No reservation');}}};
 assert.equal((await searchEvidence(validateSearch({query:'oxygen',mode:'lexical'}),env)).mode_used,'lexical');
 assert.equal((await searchEvidence(validateSearch({query:'oxygen',accession:'PSI-9999'}),env)).status,'unknown_investigation');
});
