import {DurableObject} from 'cloudflare:workers';
import {initializeBudget,reserveFromSql} from './semantic-budget.mjs';

export class EmbeddingBudget extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  initializeBudget(ctx.storage.sql);
 }
 async reserve(){
  // A single atomic SQL statement reserves before the model request.
  return reserveFromSql(this.ctx.storage.sql,this.env.SEMANTIC_DAILY_LIMIT);
 }
}
