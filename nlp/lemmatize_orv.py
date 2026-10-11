"""Stage N1: lemma / UPOS / feats for non-TOROT Old East Slavic witnesses (Stanza 'orv').

Usage:
  python lemmatize_orv.py [--data DIR] [--only id,id] [--force]   # process data/work/*.json
  python lemmatize_orv.py selftest
Evidence (SPEC 00): every output file names the model (stanza version + lang/package) and creation time.
Output: data/work/<id>.nlp.json  {model, created, outOfDomain?, tokens:[{lemma,upos,feats}|null]} (1:1 with tokens)
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import time
import unicodedata
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

HERE = Path(__file__).resolve().parent
PROJ = HERE.parent
RES_DIR = HERE / "stanza_resources"
LANGS = {"orv", "chu-rus", "ruthenian"}
PACKAGE = "default"  # = torot_nocharlm (lemma, tokenize) + torot_nopretrain (pos); "torot" is only a tokenize override
CHUNK = 120  # max tokens per Stanza "sentence" (guards against s=0 for a whole text)

_nlp = None


def get_pipeline():
    global _nlp
    if _nlp is None:
        import stanza

        RES_DIR.mkdir(exist_ok=True)
        if not (RES_DIR / "orv").exists():
            stanza.download("orv", model_dir=str(RES_DIR), package=PACKAGE, processors="tokenize,pos,lemma", logging_level="WARN")
        _nlp = stanza.Pipeline(
            "orv", dir=str(RES_DIR), package=PACKAGE, processors="tokenize,pos,lemma",
            tokenize_pretokenized=True, download_method=None, logging_level="WARN", use_gpu=False,
        )
    return _nlp


def model_label() -> str:
    import stanza

    return f"stanza {stanza.__version__} orv/torot (lemma torot_nocharlm, pos torot_nopretrain; TOROT treebank)"


def clean(raw: str) -> str:
    t = "".join(unicodedata.normalize("NFC", raw).split())
    return t or "_"


def sentences(tokens: list[dict]) -> list[list[int]]:
    """Index groups: consecutive tokens with equal `s`, chunked to CHUNK."""
    groups: list[list[int]] = []
    cur: list[int] = []
    last = object()
    for i, t in enumerate(tokens):
        if t.get("s") != last or len(cur) >= CHUNK:
            if cur:
                groups.append(cur)
            cur, last = [], t.get("s")
        cur.append(i)
    if cur:
        groups.append(cur)
    return groups


def annotate(tokens: list[dict]) -> list[dict | None]:
    nlp = get_pipeline()
    groups = sentences(tokens)
    doc = nlp([[clean(tokens[i]["raw"]) for i in g] for g in groups])
    out: list[dict | None] = [None] * len(tokens)
    assert len(doc.sentences) == len(groups)
    for g, sent in zip(groups, doc.sentences):
        assert len(sent.words) == len(g), "alignment lost"
        for i, w in zip(g, sent.words):
            out[i] = {"lemma": w.lemma, "upos": w.upos, "feats": w.feats}
    return out


def process(path: Path, force: bool) -> dict | None:
    w = json.loads(path.read_text(encoding="utf-8"))
    if w.get("lang") not in LANGS:
        return None
    toks = w["tokens"]
    if any(t.get("lemma") for t in toks):
        return None  # TOROT: scholarly lemmas already present
    dest = path.with_suffix(".nlp.json")
    if dest.exists() and not force and dest.stat().st_mtime > path.stat().st_mtime:
        print(f"{w['id']}: up to date", file=sys.stderr)
        return None
    t0 = time.time()
    ann = annotate(toks)
    dt_s = time.time() - t0
    res = {"model": model_label(), "created": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "tokens": ann}
    if w["lang"] == "ruthenian":
        res["outOfDomain"] = True  # 16th-17th c. Ruthenian is outside the TOROT training data
    dest.write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
    print(f"{w['id']}: {len(toks)} tokens in {dt_s:.1f}s ({len(toks) / max(dt_s, 1e-9):.0f} tok/s) -> {dest.name}")
    return {"id": w["id"], "tokens": toks, "ann": ann, "seconds": dt_s}


def selftest() -> None:
    toks = [{"raw": r, "loc": "x", "s": s} for r, s in [("В", 0), ("лѣто", 0), ("҂ѕ҃ѿ", 0), ("князь", 1), ("", 1), ("Ярославъ", 1)]]
    assert sentences(toks) == [[0, 1, 2], [3, 4, 5]]
    assert sentences([{"raw": "a", "s": 0}] * (CHUNK + 5))[0] == list(range(CHUNK))
    ann = annotate(toks)
    assert len(ann) == len(toks) and all(a and a["lemma"] and a["upos"] for a in ann), ann
    print("selftest ok", model_label(), [a["lemma"] for a in ann])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", nargs="?", default="run", choices=["run", "selftest"])
    ap.add_argument("--data", default=str(PROJ / "data" / "work"))
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--sample", type=int, default=30)
    sys.stdout.reconfigure(encoding="utf-8")
    a = ap.parse_args()
    if a.cmd == "selftest":
        return selftest()
    only = {x for x in a.only.split(",") if x}
    done = []
    files = sorted(p for p in Path(a.data).glob("*.json") if not p.name.endswith((".nlp.json", "-request.json")) and p.stem not in {"stress", "ru"})
    if not files:
        print("no data/work/*.json found (ingesters pending)")
    for p in files:
        if only and p.stem not in only:
            continue
        try:
            r = process(p, a.force)
        except (KeyError, TypeError, json.JSONDecodeError) as e:
            print(f"{p.name}: skipped ({e!r})", file=sys.stderr)
            continue
        if r:
            done.append(r)
    for r in done:
        if r["id"] in ("ilarion", "kievchr") or len(done) == 1:
            mid = len(r["tokens"]) // 2
            print(f"--- sample {r['id']} (tokens {mid}..{mid + a.sample})")
            for t, x in list(zip(r["tokens"], r["ann"]))[mid : mid + a.sample]:
                print(f"{t['raw']}\t{x['lemma']}\t{x['upos']}\t{x['feats']}")


if __name__ == "__main__":
    main()
