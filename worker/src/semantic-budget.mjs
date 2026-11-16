// One durable coordination object per UTC-day budget; no user query is persisted.
export const DEFAULT_SEMANTIC_DAILY_LIMIT = 250;
export function semanticDailyLimit(value) {
 if(value==null)return DEFAULT_SEMANTIC_DAILY_LIMIT;
 if(!/^\d+$/.test(String(value)))return 0;
 const limit=Number(value);
 return Number.isSafeInteger(limit)&&limit>=0&&limit<=1000?limit:0;
}
export function initializeBudget(sql) {
 sql.exec('CREATE TABLE IF NOT EXISTS semantic_budget (id INTEGER PRIMARY KEY CHECK(id=1), used INTEGER NOT NULL CHECK(used>=0))');
}
export function reserveFromSql(sql, configuredLimit) {
 const limit=semanticDailyLimit(configuredLimit);
 if(!limit)return {allowed:false,limit,remaining:0};
 const rows=sql.exec('INSERT INTO semantic_budget (id,used) VALUES (1,1) ON CONFLICT(id) DO UPDATE SET used=semantic_budget.used+1 WHERE semantic_budget.used < ? RETURNING used',limit).toArray();
 return rows.length?{allowed:true,limit,used:rows[0].used,remaining:limit-rows[0].used}:{allowed:false,limit,remaining:0};
}
export async function reserveSemanticBudget(env, now=new Date()) {
 if(env.REQUIRE_SEMANTIC_BUDGET!=='true')return {allowed:true,status:'not_required'};
 if(!env.SEMANTIC_BUDGET?.getByName)return {allowed:false,status:'budget_unavailable'};
 const day=now.toISOString().slice(0,10);
 const result=await env.SEMANTIC_BUDGET.getByName('semantic-budget:'+day).reserve();
 if(typeof result?.allowed!=='boolean')return {allowed:false,status:'budget_unavailable'};
 return {...result,day,status:result.allowed?'reserved':'daily_budget_exhausted'};
}
