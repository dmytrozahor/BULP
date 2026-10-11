"""Stage N3: is a form a dictionary word of Russian (OpenCorpora) / Ukrainian (pymorphy3-dicts-uk)?

Usage:
  python russian_check.py [--data DIR]   # data/work/ru-request.json (list of forms) -> data/work/ru.json
  python russian_check.py selftest
Only dictionary words count (MorphAnalyzer.word_is_known / parse().is_known), never predictor guesses.
Purpose: separate Russian-origin from other non-normative LanguageTool keys (research/05 open item).
Each form: {known, normal_form, tag, uk: {known, normal_form, tag}}.
"""
from __future__ import annotations

import argparse
import json
import sys
import unicodedata
import warnings
from importlib.metadata import version
from pathlib import Path

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
PROJ = HERE.parent
BUILTIN = "город слово хорошо шо дуже їжа нічого собака".split()
_an: dict = {}


def analyzer(lang: str):
    if lang not in _an:
        import pymorphy3

        _an[lang] = pymorphy3.MorphAnalyzer(lang=lang)
    return _an[lang]


def check(form: str, lang: str) -> dict:
    m = analyzer(lang)
    if not m.word_is_known(form):
        return {"known": False, "normal_form": None, "tag": None}
    for p in m.parse(form):
        if p.is_known:  # dictionary parse, not a prefix/suffix predictor
            return {"known": True, "normal_form": p.normal_form, "tag": str(p.tag)}
    return {"known": True, "normal_form": None, "tag": None}


def build(forms: list[str]) -> dict:
    out = {
        "source": f"pymorphy3-dicts-ru {version('pymorphy3-dicts-ru')} (OpenCorpora)",
        "sourceUk": f"pymorphy3-dicts-uk {version('pymorphy3-dicts-uk')}",
        "pymorphy3": version("pymorphy3"),
        "forms": {},
    }
    for f in dict.fromkeys(forms):
        n = unicodedata.normalize("NFC", f).lower()
        r = check(n, "ru")
        r["uk"] = check(n, "uk")
        out["forms"][f] = r
    return out


def selftest() -> None:
    d = build(BUILTIN)["forms"]
    assert d["город"]["known"] and d["слово"]["known"] and d["слово"]["uk"]["known"] is not None
    assert d["їжа"]["uk"]["known"] and d["дуже"]["uk"]["known"]
    assert not check("ъыъыъ", "ru")["known"]
    print("selftest ok")
    for f, r in d.items():
        print(f, "ru:", r["known"], r["normal_form"], "| uk:", r["uk"]["known"], r["uk"]["normal_form"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", nargs="?", default="run", choices=["run", "selftest"])
    ap.add_argument("--data", default=str(PROJ / "data" / "work"))
    sys.stdout.reconfigure(encoding="utf-8")
    a = ap.parse_args()
    if a.cmd == "selftest":
        return selftest()
    req = Path(a.data) / "ru-request.json"
    if req.exists():
        forms = json.loads(req.read_text(encoding="utf-8"))
    else:
        print("ru-request.json absent; using built-in test list", file=sys.stderr)
        forms = BUILTIN
    out = build(forms)
    Path(a.data).mkdir(parents=True, exist_ok=True)
    dest = Path(a.data) / "ru.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out['forms'])} forms -> {dest}")


if __name__ == "__main__":
    main()
