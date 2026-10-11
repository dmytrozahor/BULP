"""Stage N2: modern Ukrainian stress candidates from ukrainian-word-stress (dictionary mode, no context).

Usage:
  python stress.py [--data DIR]        # data/work/stress-request.json (list of forms) -> data/work/stress.json
  python stress.py selftest
Semantics: a dictionary record with several accent positions = several admissible stresses (split into
separate variants, ambiguous=false). Several records with different accents (heteronyms: за́мок/замо́к)
= separate variants, ambiguous=true. Unknown words get an empty list.
positions = 0-based indices of the stressed vowels in the unstressed NFC form.
LICENCE CAVEAT: dictionary data is derived from ULIF «Словники України»; rights unclear (research/08 §A).
"""
from __future__ import annotations

import argparse
import json
import sys
import unicodedata
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
PROJ = HERE.parent
ACUTE = "́"
SOURCE_BASE = "ukrainian-word-stress {v} (data derived from ULIF «Словники України»; licence unclear)"
BUILTIN = "помилка завжди випадок князь кінь видіти свіча місто замок".split()

_s = None


def stressifier():
    global _s
    if _s is None:
        from ukrainian_word_stress import Stressifier

        _s = Stressifier(stress_symbol=ACUTE, on_ambiguity="all", disambiguation="dictionary")
    return _s


def source() -> str:
    from importlib.metadata import version

    return SOURCE_BASE.format(v=version("ukrainian-word-stress"))


def render(form: str, positions: list[int]) -> str:
    out = []
    for i, ch in enumerate(form):
        out.append(ch)
        if i in positions:
            out.append(ACUTE)
    return "".join(out)


def lookup(form: str) -> list[dict]:
    from ukrainian_word_stress.stressify_ import _parse_dictionary_value, _trie_value

    form = unicodedata.normalize("NFC", form)
    vals = _trie_value(stressifier().dict, form)
    if vals is None:
        return []
    records = _parse_dictionary_value(vals[0])
    distinct: list[tuple[int, ...]] = []
    for _, acc in records:
        t = tuple(acc)
        if t and t not in distinct:
            distinct.append(t)
    heteronym = len(distinct) > 1
    out, keys = [], set()
    for acc in distinct:
        for p in acc:  # dictionary value = insertion index of the acute, i.e. vowel index + 1
            pos = [p - 1]
            if p - 1 in keys:
                continue
            keys.add(p - 1)
            out.append({"stressed": render(form, pos), "positions": pos, "ambiguous": heteronym})
    return out


def build(forms: list[str]) -> dict:
    return {"source": source(), "forms": {f: lookup(f) for f in dict.fromkeys(forms)}}


def selftest() -> None:
    from ukrainian_word_stress import Stressifier

    d = build(BUILTIN)["forms"]
    assert len(d["помилка"]) == 2 and not d["помилка"][0]["ambiguous"], d["помилка"]
    assert {tuple(v["positions"]) for v in d["замок"]} == {(1,), (3,)} and all(v["ambiguous"] for v in d["замок"])
    ref = Stressifier(stress_symbol=ACUTE, on_ambiguity="all", disambiguation="dictionary")
    for f, vs in d.items():
        if vs:
            allpos = sorted({p for v in vs for p in v["positions"]})
            assert ref(f) == render(f, allpos), (f, ref(f), allpos)
    print("selftest ok")
    for f, vs in d.items():
        print(f, [v["stressed"] + ("*" if v["ambiguous"] else "") for v in vs])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", nargs="?", default="run", choices=["run", "selftest"])
    ap.add_argument("--data", default=str(PROJ / "data" / "work"))
    sys.stdout.reconfigure(encoding="utf-8")
    a = ap.parse_args()
    if a.cmd == "selftest":
        return selftest()
    req = Path(a.data) / "stress-request.json"
    if req.exists():
        forms = json.loads(req.read_text(encoding="utf-8"))
    else:
        print("stress-request.json absent; using built-in test list", file=sys.stderr)
        forms = BUILTIN
    out = build(forms)
    Path(a.data).mkdir(parents=True, exist_ok=True)
    dest = Path(a.data) / "stress.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out['forms'])} forms -> {dest}")


if __name__ == "__main__":
    main()
