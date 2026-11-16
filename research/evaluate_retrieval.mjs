// Small, human-selected retrieval relevance set. This is not an answer-quality
// evaluation or scientific validation, and it makes no paid generation calls.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { searchEvidence, validateSearch, CORPUS, lexicalSearch, fuseRanks } from '../worker/src/retrieval.mjs';


const cases = [
  { id: 'R1', query: 'Why should I avoid the zero-flow point near 3.8 volts?', accession: 'PSI-25',
    expected: ['PSI-25'], kind: 'workbook_cached_cell', text: '3.8' },
  { id: 'R2', query: 'How does electric forcing change a flame?', expected: ['PSI-22'] },
  { id: 'R3', query: 'Studies of smoke particle size and detector alarms in microgravity', expected: ['PSI-101', 'PSI-102'] },
  { id: 'R4', query: 'Normal and inverse diffusion flames using ethylene or methane', expected: ['PSI-10', 'PSI-159'] },
  { id: 'R5', query: 'Saffire SIBAL forced airflow', expected: ['PSI-98', 'PSI-100'] },
  { id: 'R6', query: 'Droplet extinction with inert gas dilution', expected: ['PSI-68', 'PSI-69', 'PSI-39'] },
  { id: 'R7', query: 'Percent O2 S1 S2', accession: 'PSI-98', kind: 'source_table_row', expected: ['PSI-98'], text: '~ 21.5' },
];
if(process.argv.includes('--live'))throw new Error('This evaluator is an offline replay, not a new live provider evaluation.');
const live = false;
const replay = true;
const probes = replay ? JSON.parse(await readFile(new URL('./fixtures/semantic-probes.json', import.meta.url), 'utf8')) : null;
if (probes && probes.corpus_version !== CORPUS.version) throw new Error('Captured query corpus version mismatch');
const env = {};
const modes = live || replay ? ['lexical', 'hybrid'] : ['lexical'];
const results = [];
for (const mode of modes) {
  const rows = [];
  for (const item of cases) {
    const input = validateSearch({ query: item.query, ...(item.accession ? { accession: item.accession } : {}),
      ...(item.kind ? { kind: item.kind } : {}), mode, limit: 3 });
    const probe = probes?.queries.find(p => p.id === item.id && p.query === item.query);
    if (replay && mode === 'hybrid' && !probe) throw new Error('Missing real MCP query capture');
    const result = replay && mode === 'hybrid'
      ? { matches: fuseRanks(lexicalSearch(input), probe.matches, input), semantic_status: 'real_query_captured_via_official_mcp' }
      : await searchEvidence(input, env);
    const rank = result.matches.findIndex(m => item.expected.includes(m.accession) && (!item.text || m.citations.some(c => c.original_text.includes(item.text))));
    rows.push({ ...item, hit_at_3: rank >= 0, reciprocal_rank: rank >= 0 ? 1 / (rank + 1) : 0,
      semantic_status: result.semantic_status, matches: result.matches });
  }
  const unknown = await searchEvidence(validateSearch({ query: 'fire', accession: 'PSI-9999', mode }), env);
  results.push({ mode, hit_at_3: rows.filter(r => r.hit_at_3).length / rows.length,
    mean_reciprocal_rank_at_3: rows.reduce((n, r) => n + r.reciprocal_rank, 0) / rows.length,
    unknown_study_is_empty: unknown.status === 'unknown_investigation' && unknown.matches.length === 0, cases: rows });
}
const report = { checked_utc: new Date().toISOString(), corpus_version: CORPUS.version,
  scope: 'Seven hand-selected retrieval relevance probes plus unknown-study handling. No generative answers; no scientific safety certification. This small development set does not establish general retrieval quality.',
  recorded_provider_results_replayed: true, network_calls: 0, new_embedding_calls: 0, real_semantic_provider_used: false, semantic_transport: replay ? 'official_mcp_captured_real_queries' : live ? 'direct_api' : 'none', paid_generation_calls: 0, results };
const path = new URL(`./output/evaluation-${live || replay ? 'live' : 'lexical'}.json`, import.meta.url);
await mkdir(new URL('./output/',import.meta.url),{recursive:true});
await writeFile(path, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: path.pathname, results: results.map(({ cases, ...r }) => ({ ...r, missed_cases: cases.filter(c => !c.hit_at_3).map(c => c.id) })) }, null, 2));
