"""SPEC 63 MD-2: count lower-case Cyrillic tokens that VESUM does not know, per source and per month, from bulk dumps.
Usage: uv run --with pyarrow python -I pipelines/modern_count.py <vesum> <hplt.parquet> <ubertext.bz2> <out.json> [max_docs]
HPLT: docs carry `ts` (crawl timestamp = terminus ante quem of the text, NOT the publication date) and `u` (URL). Only token counts + first/last ts leave this script;
no running text is stored (vocabulary-only). UberText social: no per-item date in the text_only dump -> year unknown (corpus snapshot 2023)."""
import sys, re, json, bz2, collections, unicodedata
import pyarrow.parquet as pq

vesum_p, hplt_p, uber_p, out_p = sys.argv[1:5]
max_docs = int(sys.argv[5]) if len(sys.argv) > 5 else 10**9
STRESS = re.compile('[́­]')
def key(s): return STRESS.sub('', unicodedata.normalize('NFC', s)).replace('’', "'").replace('ʼ', "'").replace('`', "'").replace('´', "'").replace('‘', "'").replace('ʻ', "'").lower()

known = set()
with open(vesum_p, encoding='utf8') as f:
    for line in f:
        t = line.split(None, 1)
        if t: known.add(key(t[0]))
print('vesum forms', len(known), flush=True)

TOK = re.compile(r"[А-яЄІЇєіїҐґ'’ʼ´‘ʻ`-]+")
OK = re.compile(r"^[а-яєіїґ'’ʼ-]{4,24}$")
BAD = re.compile('[ыэъё]')   # ы э ъ ё: Russian, not Ukrainian

def scan(text, add):
    # sentence-initial and capitalised tokens are skipped: names and sentence starts would swamp the list
    prev_end = True
    for m in TOK.finditer(text):
        w = m.group(0)
        s = m.start()
        initial = s == 0 or text[max(0, s - 2):s].strip() in ('', '.', '!', '?', '…', ':', '«', '"', '-', '—')
        prev = text[s - 1] if s else " "
        nxt = text[m.end()] if m.end() < len(text) else " "
        if w[0].islower() and w[0] not in "яєюїь" and not prev.isalnum() and prev not in "'’ʼ´‘ʻ`" and not nxt.isalnum() and not initial and text[m.end():m.end()+1] != "." and "-" not in w and not BAD.search(w):
            k = key(w)
            if OK.match(k) and k not in known: add(k)

res = {}
def bump(src, k, ym):
    d = res.setdefault(k, {})
    e = d.setdefault(src, [0, None, None])
    e[0] += 1
    if ym:
        if e[1] is None or ym < e[1]: e[1] = ym
        if e[2] is None or ym > e[2]: e[2] = ym

UBER_MAX = 4000000
docs = 0
pf = pq.ParquetFile(hplt_p)
yrs = collections.Counter()
for batch in pf.iter_batches(batch_size=256, columns=['text', 'ts']):
    for text, ts in zip(batch.column('text').to_pylist(), batch.column('ts').to_pylist()):
        ym = str(ts)[:7] if ts else None
        yrs[ym[:4] if ym else 'n/a'] += 1
        scan(text, lambda k: bump('HPLT', k, ym))
        docs += 1
        if docs >= max_docs: break
    if docs >= max_docs: break
    if docs % 20000 < 256: print('hplt docs', docs, flush=True)
print('hplt docs', docs, dict(yrs), flush=True)

lines = 0
with bz2.open(uber_p, 'rt', encoding='utf8') as f:
    for line in f:
        scan(line, lambda k: bump('UBER', k, None))
        lines += 1
        if lines >= UBER_MAX: break
        if lines % 500000 == 0: print('uber lines', lines, flush=True)
print('uber lines', lines, flush=True)

keep = {k: v for k, v in res.items() if sum(e[0] for e in v.values()) >= 3 and len(v) >= 2}
import bisect
forms = sorted(known)
def forms_with_prefix(p, cap=3):
    i = bisect.bisect_left(forms, p); n = 0
    while i < len(forms) and forms[i].startswith(p) and n < cap:
        if forms[i] != p: n += 1
        i += 1
    return n
def glued(k):
    return any(k[:i] in known and k[i:] in known for i in range(3, len(k) - 0))
n0 = len(keep)
keep = {k: v for k, v in keep.items() if forms_with_prefix(k) < 3 and not glued(k)}
print('dropped as truncated or glued', n0 - len(keep))
import pymorphy3
ru = pymorphy3.MorphAnalyzer(lang='ru')
nru = len(keep)
keep = {k: v for k, v in keep.items() if not ru.word_is_known(k)}
print('dropped as Russian-known', nru - len(keep))
json.dump({'hpltDocs': docs, 'hpltDocsPerYear': dict(yrs), 'uberLines': lines, 'tokens': keep}, open(out_p, 'w', encoding='utf8'), ensure_ascii=False)
print('kept', len(keep), 'of', len(res))
