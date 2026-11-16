"""Build a bounded, reproducible retrieval index from the read-only NASA store.

No downloads, model calls, source writes, numerical interpretation or translations.
The UTF-8 input ceiling also conservatively bounds byte-level tokenization below
the embedding model's 512-token context. Long cells are split without losing text.
"""
from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / 'research/output/snapshot.sqlite'
OUT = ROOT / 'research/output'
EMBEDDING = {
    'model': '@cf/baai/bge-small-en-v1.5', 'dimensions': 384,
    'metric': 'cosine', 'pooling': 'cls', 'max_input_bytes': 480,
    'query_prefix': 'Represent this sentence for searching relevant passages: ',
}


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True)


def split_bytes(text, limit):
    """Preserve every character; prefer whitespace boundaries when possible."""
    while text:
        cut = len(text.encode('utf-8')[:limit].decode('utf-8', errors='ignore'))
        if cut == 0:
            raise ValueError('Input budget too small')
        if cut < len(text):
            boundary = max(text.rfind(' ', 0, cut), text.rfind('\n', 0, cut))
            if boundary > cut // 2:
                cut = boundary + 1
        yield text[:cut]
        text = text[cut:]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        evidence = [dict(r) for r in db.execute('SELECT * FROM evidence ORDER BY accession,source_id,locator,evidence_id')]
        studies = {r['accession']: dict(r) for r in db.execute('SELECT accession,title,acronym FROM investigations')}
        sources = {r['source_id']: dict(r) for r in db.execute('SELECT source_id,filename,sha256 FROM local_sources')}
    with sqlite3.connect(DB.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        classifications = {r['uid']: {'type': r['type'], 'fuel': r['fuel'], 'flags': json.loads(r['flags_json'])} for r in db.execute('SELECT * FROM classifications')}
        public_links = {r['accession']: {'psi_url': r['psi_url'], 'doi': r['doi']} for r in db.execute('SELECT * FROM investigation_links')}
    groups = defaultdict(list)
    for item in evidence:
        if item['kind'] == 'workbook_cached_cell':
            # Keep cells from a worksheet row together; every cell retains its ID.
            match = re.fullmatch(r'(.+)!([A-Z]+)([1-9][0-9]*)', item['locator'])
            if not match:
                raise ValueError('Unsupported workbook cell locator')
            key = (item['source_id'], match[1], int(match[3]))
        else:
            key = (item['evidence_id'],)
        groups[key].append(item)
    chunks = []
    for items in groups.values():
        first = items[0]
        source = sources[first['source_id']]
        accession = first['accession']
        acronym = (studies[accession]['acronym'] or '')[:48]
        prefix = f'{accession} {acronym} | {first["kind"]}\n'
        if first['kind'] == 'workbook_cached_cell':
            prefix += source['filename'] + '\n'
        elif first['kind'] == 'investigation_metadata':
            prefix += first['locator'].split('#', 1)[-1] + '\n'
        budget = EMBEDDING['max_input_bytes'] - len(prefix.encode('utf-8'))
        if budget < 200:
            raise ValueError('Source prefix exceeds budget')
        uid = None
        if first['kind'] == 'source_table_row':
            row = int(first['locator'].rsplit('data_row=', 1)[1])
            uid = f'{accession}|{source["filename"]}|{row}'
            if uid not in classifications:
                raise ValueError(f'Unmapped source row: {uid}')
        row_info = classifications.get(uid, {})
        parts = []
        used = 0

        def emit():
            nonlocal parts, used
            if not parts:
                return
            identity = {'parts': parts, 'source_id': first['source_id'], 'accession': accession}
            chunk = {
                'id': sha256(compact(identity).encode('utf-8')).hexdigest(),
                'accession': accession, 'kind': first['kind'],
                'text': prefix + '\n'.join(p['text'] for p in parts),
                'parts': parts, 'source_id': first['source_id'],
                'source_sha256': source['sha256'], 'source_filename': source['filename'],
                'coverage': first['coverage'], 'test_uid': uid,
                'row_type': row_info.get('type'), 'fuel': row_info.get('fuel'),
                'review_flags': row_info.get('flags', []),
                **public_links.get(accession, {}),
            }
            assert len(chunk['text'].encode('utf-8')) <= EMBEDDING['max_input_bytes']
            chunks.append(chunk)
            parts, used = [], 0

        for item in items:
            # Use the full original text and slice offsets, including whitespace.
            # Workbook cell locations supply context without inventing column labels.
            original = item['text']
            offset = 0
            for piece in split_bytes(original, budget):
                size = len(piece.encode('utf-8'))
                if used and used + 1 + size > budget:
                    emit()
                parts.append({'evidence_id': item['evidence_id'], 'locator': item['locator'],
                              'start': offset, 'end': offset + len(piece), 'text': piece})
                used += size + (1 if used else 0)
                offset += len(piece)
            assert offset == len(original)
        emit()
    chunks.sort(key=lambda x: (x['accession'], x['source_filename'], x['id']))
    identity = sha256(compact({'embedding': EMBEDDING, 'chunks': chunks}).encode('utf-8')).hexdigest()
    corpus = {'schema': 1, 'version': identity, 'embedding': EMBEDDING,
              'coverage': 'Available metadata, extracted document paragraphs, cached workbook cells and nonblank source rows only. Remote assets and unextracted full papers are not indexed.',
              'chunks': chunks}
    encoded = compact(corpus) + '\n'
    (OUT / 'rebuilt-corpus.json').write_text(encoded, encoding='utf-8')
    shipped = json.loads((ROOT / 'worker/src/generated/retrieval-corpus.json').read_text(encoding='utf-8'))
    assert corpus == shipped, 'Rebuilt fragments must exactly match the published snapshot'
    expected = {e['evidence_id']: e for e in evidence}
    restored = defaultdict(dict)
    for chunk in chunks:
        for part in chunk['parts']:
            assert part['text'] == expected[part['evidence_id']]['text'][part['start']:part['end']]
            restored[part['evidence_id']][part['start']] = part['text']
    assert set(restored) == set(expected)
    for eid, pieces in restored.items():
        assert ''.join(pieces[k] for k in sorted(pieces)) == expected[eid]['text']
    assert len({c['id'] for c in chunks}) == len(chunks)
    report = {'corpus_version': identity, 'source_evidence_items': len(evidence),
              'source_studies': len(studies), 'retrieval_chunks': len(chunks),
              'chunk_counts': dict(Counter(c['kind'] for c in chunks)),
              'source_rows_linked': len({c['test_uid'] for c in chunks if c['test_uid']}),
              'text_loss_or_identity_errors': 0, 'embedding': EMBEDDING,
              'stored_vector_dimensions': len(chunks) * EMBEDDING['dimensions'],
              'serialized_bytes': len(encoded.encode('utf-8')),
              'embeddings_generated': False, 'remote_index_created': False}
    (OUT / 'rebuilt-corpus-manifest.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
