"""Reconstruct a local SQLite store from included, audited public evidence."""
from collections import defaultdict
import json
import sqlite3
from audit_snapshot import ROOT, compact, load_snapshot

def main():
    catalog, corpus, evidence, rows = load_snapshot()
    out = ROOT / 'research/output'
    out.mkdir(exist_ok=True)
    path = out / 'snapshot.sqlite'
    if path.exists():
        raise SystemExit('Output already exists. Keep it for review or choose a new research checkout.')
    sources, studies, links, classifications = {}, {}, {}, {}
    for chunk in corpus['chunks']:
        source = {'source_id': chunk['source_id'], 'filename': chunk['source_filename'], 'sha256': chunk['source_sha256']}
        assert chunk['source_id'] not in sources or sources[chunk['source_id']] == source
        sources[chunk['source_id']] = source
        first_line = chunk['text'].split('\n', 1)[0]
        marker = chunk['accession'] + ' '
        assert first_line.startswith(marker) and first_line.endswith(' | ' + chunk['kind'])
        acronym = first_line[len(marker):-(len(chunk['kind']) + 3)]
        assert chunk['accession'] not in studies or studies[chunk['accession']] == acronym
        studies[chunk['accession']] = acronym
        link = {'psi_url': chunk.get('psi_url'), 'doi': chunk.get('doi')}
        assert chunk['accession'] not in links or links[chunk['accession']] == link
        links[chunk['accession']] = link
        if chunk['test_uid']:
            annotation = {'uid': chunk['test_uid'], 'type': chunk['row_type'], 'fuel': chunk['fuel'], 'flags': chunk['review_flags']}
            assert chunk['test_uid'] not in classifications or classifications[chunk['test_uid']] == annotation
            classifications[chunk['test_uid']] = annotation
    with sqlite3.connect(path) as db:
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript('''
CREATE TABLE investigations(accession TEXT PRIMARY KEY,title TEXT,acronym TEXT,metadata_json TEXT NOT NULL);
CREATE TABLE investigation_links(accession TEXT PRIMARY KEY REFERENCES investigations,psi_url TEXT,doi TEXT);
CREATE TABLE local_sources(source_id TEXT PRIMARY KEY,filename TEXT NOT NULL,sha256 TEXT);
CREATE TABLE evidence(evidence_id TEXT PRIMARY KEY,accession TEXT REFERENCES investigations,source_id TEXT REFERENCES local_sources,kind TEXT,coverage TEXT,locator TEXT,text TEXT NOT NULL);
CREATE TABLE source_rows(test_uid TEXT PRIMARY KEY,accession TEXT REFERENCES investigations,source_filename TEXT,data_row_1based INTEGER,row_json TEXT NOT NULL);
CREATE TABLE classifications(uid TEXT PRIMARY KEY REFERENCES source_rows,type TEXT,fuel TEXT,flags_json TEXT NOT NULL);
CREATE TABLE chunks(id TEXT PRIMARY KEY,accession TEXT REFERENCES investigations,chunk_json TEXT NOT NULL);
CREATE TABLE chunk_parts(chunk_id TEXT REFERENCES chunks,evidence_id TEXT REFERENCES evidence,start INTEGER,end INTEGER,text TEXT,PRIMARY KEY(chunk_id,evidence_id,start));
CREATE VIRTUAL TABLE evidence_fts USING fts5(evidence_id UNINDEXED,text);
''')
        for study in catalog['investigations']:
            db.execute('INSERT INTO investigations VALUES(?,?,?,?)', (study['accession'], study['title'], studies[study['accession']], compact(study)))
            link = links[study['accession']]
            db.execute('INSERT INTO investigation_links VALUES(?,?,?)', (study['accession'], link['psi_url'], link['doi']))
        db.executemany('INSERT INTO local_sources VALUES(:source_id,:filename,:sha256)', sources.values())
        db.executemany('INSERT INTO evidence VALUES(:evidence_id,:accession,:source_id,:kind,:coverage,:locator,:text)', evidence)
        db.executemany('INSERT INTO evidence_fts VALUES(:evidence_id,:text)', evidence)
        for row in rows:
            db.execute('INSERT INTO source_rows VALUES(?,?,?,?,?)', (row['test_uid'], row['accession'], row['source_filename'], row['data_row_1based'], compact(row)))
        for row in classifications.values():
            db.execute('INSERT INTO classifications VALUES(?,?,?,?)', (row['uid'], row['type'], row['fuel'], compact(row['flags'])))
        for chunk in corpus['chunks']:
            db.execute('INSERT INTO chunks VALUES(?,?,?)', (chunk['id'], chunk['accession'], compact(chunk)))
            for part in chunk['parts']:
                db.execute('INSERT INTO chunk_parts VALUES(?,?,?,?,?)', (chunk['id'], part['evidence_id'], part['start'], part['end'], part['text']))
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert not list(db.execute('PRAGMA foreign_key_check'))
        assert db.execute('SELECT count(*) FROM evidence').fetchone()[0] == 6177
        assert db.execute('SELECT count(*) FROM source_rows').fetchone()[0] == 2009
        assert db.execute("SELECT count(*) FROM evidence_fts WHERE evidence_fts MATCH 'oxygen'").fetchone()[0] > 0
    print(json.dumps({'database': 'research/output/snapshot.sqlite', 'bytes': path.stat().st_size,
                      'evidence_items': len(evidence), 'source_rows': len(rows), 'chunks': len(corpus['chunks']),
                      'scope': 'Reconstructed included snapshot; not a new original-source acquisition', 'model_calls': 0}, indent=2))

if __name__ == '__main__':
    main()
