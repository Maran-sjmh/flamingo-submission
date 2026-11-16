// Chart complete numeric cells only. Ranges, qualifiers and mixed units remain text.
export function sourceNumber(value) {
 const text = String(value ?? '').trim();
 if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
 const number = Number(text);
 return Number.isFinite(number) ? number : null;
}
const measurement = /oxygen|\bo2\b|pressure|flow|velocity|temperature|diameter|thickness|width|length|gravity|g-level/i;
export function buildSourceCharts(records, limit = 3) {
 const groups = new Map();
 for (const record of records) for (const [field, original] of Object.entries(record.cells)) {
  if (!measurement.test(field) || /#|date|gmt|sample number|test number/i.test(field)) continue;
  const value = sourceNumber(original);
  if (value === null) continue;
  const identity = JSON.stringify([record.source_filename, record.row_type, field]);
  if (!groups.has(identity)) groups.set(identity, {key: identity, field, source: record.source_filename, rowType: record.row_type, points: []});
  groups.get(identity).points.push({value, original, uid: record.test_uid, row: record.data_row_1based, locator: record.locator});
 }
 return [...groups.values()].filter(group => group.points.length >= 3 && new Set(group.points.map(p => p.value)).size > 1).slice(0, limit);
}
