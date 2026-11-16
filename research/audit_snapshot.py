"""Offline integrity audit of the public snapshot; no network or model calls."""
from collections import defaultdict
from hashlib import sha256
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True)

def load_snapshot():
    catalog = json.loads((ROOT / 'src/investigation-catalog.json').read_text(encoding='utf-8'))
    corpus = json.loads((ROOT / 'worker/src/generated/retrieval-corpus.json').read_text(encoding='utf-8'))
    manifest = json.loads((ROOT / 'SUBMISSION_MANIFEST.json').read_text(encoding='utf-8'))
    for name, expected in manifest['protected_source_hashes'].items():
        assert sha256((ROOT / name).read_bytes()).hexdigest() == expected, f'Protected source differs: {name}'
    expected_version = sha256(compact({'embedding': corpus['embedding'], 'chunks': corpus['chunks']}).encode()).hexdigest()
    assert expected_version == corpus['version'] == catalog['corpus_version'] == manifest['corpus_version']
    assert len(corpus['chunks']) == 3152
    assert len({chunk['id'] for chunk in corpus['chunks']}) == 3152
    evidence = {}
    fragments = defaultdict(dict)
    for chunk in corpus['chunks']:
        identity = {'parts': chunk['parts'], 'source_id': chunk['source_id'], 'accession': chunk['accession']}
        assert sha256(compact(identity).encode()).hexdigest() == chunk['id']
        assert len(chunk['text'].encode('utf-8')) <= corpus['embedding']['max_input_bytes']
        for part in chunk['parts']:
            assert part['end'] - part['start'] == len(part['text'])
            previous = fragments[part['evidence_id']].get(part['start'])
            assert previous is None or previous == part, 'Conflicting repeated evidence slice'
            fragments[part['evidence_id']][part['start']] = part
            metadata = {key: chunk[key] for key in ['accession', 'source_id', 'kind', 'coverage']}
            metadata.update(evidence_id=part['evidence_id'], locator=part['locator'])
            if part['evidence_id'] in evidence:
                assert evidence[part['evidence_id']] == metadata
            evidence[part['evidence_id']] = metadata
    assert len(evidence) == 6177
    for identity, parts in fragments.items():
        end = 0
        text = []
        for start in sorted(parts):
            assert start == end, f'Gap or overlap in {identity}'
            part = parts[start]
            text.append(part['text'])
            end = part['end']
        evidence[identity]['text'] = ''.join(text)
    rows = []
    for study in catalog['investigations']:
        raw = (ROOT / ('public' + study['rows_url'])).read_bytes()
        assert sha256(raw).hexdigest() == study['rows_sha256']
        snapshot = json.loads(raw)
        assert snapshot['accession'] == study['accession']
        assert len(snapshot['records']) == study['available_rows']
        rows.extend(snapshot['records'])
    assert len(rows) == len({row['test_uid'] for row in rows}) == 2009
    assert len({row['source_filename'] for row in rows}) == 22
    assert {row['test_uid'] for row in rows} == {chunk['test_uid'] for chunk in corpus['chunks'] if chunk['test_uid']}
    return catalog, corpus, list(evidence.values()), rows

def main():
    catalog, corpus, evidence, rows = load_snapshot()
    report = {'scope': 'Offline public artifact integrity, not scientific validation',
              'corpus_version': corpus['version'], 'investigations': len(catalog['investigations']),
              'source_rows': len(rows), 'reconstructed_evidence_items': len(evidence),
              'retrieval_fragments': len(corpus['chunks']), 'embedding_dimensions': corpus['embedding']['dimensions'],
              'protected_source_hashes_match': True, 'continuous_original_text': True,
              'network_requests': 0, 'model_calls': 0}
    out = ROOT / 'research/output'
    out.mkdir(exist_ok=True)
    (out / 'snapshot-audit.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
