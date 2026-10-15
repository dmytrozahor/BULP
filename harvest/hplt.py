"""SPEC 63 HV-2: HPLT 2.0 cleaned (ukr_Cyrl, CC0-1.0) shard by shard, VOCABULARY ONLY.
Usage: uv run --with pyarrow python -I harvest/hplt.py [first_shard=1] [last_shard=299]
For each shard: download the parquet (CDN, one shard at a time, 5 s pause), count lower-case Cyrillic tokens that VESUM does not know (same scan as pipelines/modern_count.py),
write data/raw/harvest/hplt/items/shard-NNNNN.counts.json.gz {docs, perYear, tokens: {token: [f, firstYYYY-MM, lastYYYY-MM]}} and ONE index line, then DELETE the parquet.
Resumable (index.jsonl), stops on HTTP 403/429/5xx. No running text and no URLs are kept. Dates = crawl month (terminus ante quem, NOT publication)."""
import sys, os, re, json, gzip, time, unicodedata, urllib.request, urllib.error, datetime
import pyarrow.parquet as pq

SRC = 'hplt'
D = f'data/raw/harvest/{SRC}'
os.makedirs(f'{D}/items', exist_ok=True)
first = int(sys.argv[1]) if len(sys.argv) > 1 else 1
last = int(sys.argv[2]) if len(sys.argv) > 2 else 299
UA = 'BULP research (non-commercial; ukr-lexicon; dmytrozah.dev@gmail.com)'
MAX_DOCS = int(os.environ.get('HPLT_MAX_DOCS', '10000000'))
CAP = 2_000_000_000

def log(m): print(f'{datetime.datetime.utcnow().isoformat()}Z [{SRC}] {m}', flush=True)

STRESS = re.compile('[́­]')
def key(s): return STRESS.sub('', unicodedata.normalize('NFC', s)).replace('’', "'").replace('ʼ', "'").replace('`', "'").replace('´', "'").replace('‘', "'").replace('ʻ', "'").lower()
TOK = re.compile(r"[А-яЄІЇєіїҐґ'’ʼ´‘ʻ`-]+")
OK = re.compile(r"^[а-яєіїґ'’ʼ-]{4,24}$")
BAD = re.compile('[ыэъё]')

def scan(text, add, known):
    for m in TOK.finditer(text):
        w = m.group(0); s = m.start()
        initial = s == 0 or text[max(0, s - 2):s].strip() in ('', '.', '!', '?', '…', ':', '«', '"', '-', '—')
        prev = text[s - 1] if s else ' '
        nxt = text[m.end()] if m.end() < len(text) else ' '
        if w[0].islower() and w[0] not in 'яєюїь' and not prev.isalnum() and prev not in "'’ʼ´‘ʻ`" and not nxt.isalnum() and not initial and text[m.end():m.end() + 1] != '.' and '-' not in w and not BAD.search(w):
            k = key(w)
            if OK.match(k) and k not in known: add(k)

def load_known():
    known = set()
    with open('data/raw/vesum/dict_corp_vis.txt', encoding='utf8') as f:
        for line in f:
            t = line.split(None, 1)
            if t: known.add(key(t[0]))
    return known

def count_shard(path, known):
    res = {}; docs = 0; yrs = {}
    def mk(ym):
        def add(k):
            e = res.setdefault(k, [0, None, None]); e[0] += 1
            if ym:
                if e[1] is None or ym < e[1]: e[1] = ym
                if e[2] is None or ym > e[2]: e[2] = ym
        return add
    pf = pq.ParquetFile(path)
    for batch in pf.iter_batches(batch_size=256, columns=['text', 'ts']):
        for text, ts in zip(batch.column('text').to_pylist(), batch.column('ts').to_pylist()):
            ym = str(ts)[:7] if ts else None
            y = ym[:4] if ym else 'n/a'; yrs[y] = yrs.get(y, 0) + 1
            scan(text, mk(ym), known); docs += 1
            if docs >= MAX_DOCS: break
        if docs >= MAX_DOCS: break
    return docs, yrs, {k: v for k, v in res.items() if v[0] >= 2}   # f >= 2 inside a shard keeps the file small

def main():
    idx = f'{D}/index.jsonl'
    done = set()
    if os.path.exists(idx):
        for l in open(idx, encoding='utf8'):
            try: done.add(json.loads(l)['id'])
            except Exception: pass
    known = load_known(); log(f'vesum forms {len(known)}, {len(done)} shards done')
    disk = sum(os.path.getsize(f'{D}/items/{f}') for f in os.listdir(f'{D}/items'))
    for n in range(first, last + 1):
        sid = f'hplt:{n:05d}'
        if sid in done: continue
        if disk >= CAP: log('STOP disk cap'); return
        url = f'https://huggingface.co/datasets/HPLT/HPLT2.0_cleaned/resolve/main/ukr_Cyrl_1/train-{n:05d}-of-00300.parquet'
        tmp = f'{D}/shard.tmp.parquet'
        try:
            req = urllib.request.Request(url, headers={'user-agent': UA})
            with urllib.request.urlopen(req, timeout=300) as r, open(tmp, 'wb') as out:
                while True:
                    b = r.read(1 << 20)
                    if not b: break
                    out.write(b)
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) or e.code >= 500:
                log(f'STOP HTTP {e.code} {url}'); json.dump({'at': time.time(), 'reason': f'HTTP {e.code}'}, open(f'{D}/STOPPED.json', 'w')); return
            if e.code == 404: log(f'shard {n} not found: end'); json.dump({'reason': 'DONE'}, open(f'{D}/STOPPED.json', 'w')); return
            raise
        size = os.path.getsize(tmp)
        docs, yrs, toks = count_shard(tmp, known)
        os.remove(tmp)
        fn = f'shard-{n:05d}.counts.json.gz'
        with gzip.open(f'{D}/items/{fn}', 'wt', encoding='utf8') as g:
            json.dump({'docs': docs, 'perYear': yrs, 'tokens': toks}, g, ensure_ascii=False)
        disk += os.path.getsize(f'{D}/items/{fn}')
        item = {'id': sid, 'url': url, 'date': None, 'licence': 'CC0-1.0 (HPLT 2.0 cleaned dataset card)', 'bytes': size, 'status': 200, 'title': f'HPLT 2.0 cleaned ukr_Cyrl_1 shard {n}', 'file': fn, 'vocabOnly': True, 'dateKind': 'crawl', 'docs': docs, 'types': len(toks)}
        with open(idx, 'a', encoding='utf8') as f: f.write(json.dumps(item, ensure_ascii=False) + '\n')
        log(f'shard {n}: {docs} docs, {len(toks)} unknown types, parquet {size >> 20} MB')
        time.sleep(5)
    json.dump({'reason': 'DONE'}, open(f'{D}/STOPPED.json', 'w'))

if __name__ == '__main__': main()
