/**
 * BUILD stage, analysis/REPORT.md (SPEC 20 B-6; SPEC 10 M-6 "Phase-1 annotated statistical analysis").
 *
 * > B-6: "Sections, every number with its denominator and each method with its citation: 1 Corpus … 8 Caveats."
 * > P-1.6: "Statistics display their denominators (N tokens of the sub-corpus)."
 * Pure: renderReport(data) → markdown string.
 */
import { EPOCHS, epochById } from '../core/epochs.ts'
import { RULES } from '../core/phonology.ts'
import { STAT_CITES } from '../core/stats.ts'
import { ipm } from '../core/stats.ts'
import { isKnown } from '../core/evidence.ts'
import type { Author, LemmaCard, WitnessMeta } from '../core/types.ts'
import { REPORT_RULES } from './build-annotate.ts'
import { posLabel } from './build-link.ts'
import type { Sizes } from './build-stats.ts'

export interface ReportData {
  generated: string; flags: { py: boolean; stress: boolean; ru: boolean }; authors: Author[]; witnesses: WitnessMeta[]
  routes: Record<string, Record<string, number>>; excluded: { id: string; author: string; why: string; n: number }[]
  sizes: Sizes; N: number; linked: number; unresolved: number; topUnresolved: { form: string; f: number }[]
  soundType: Record<string, number>; soundToken: Record<string, number>; detectHits: Record<string, number>; hints: Record<string, number>
  lemmas: { lemma: string; tags: string; f: number; perEpoch: Map<string, number> }[]
  cards: LemmaCard[]; keptCount: number; allCount: number; spellings: number
  ltCorpus: { form: string; f: number; file: string }[]
  budget: { bytes: number; tiers: number[]; dropped: number; pool: number; lexindexBytes: number; lexindexAttested: number }
  stressForms: number; stressSource: string; ruForms: number; fMax: number
}

const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) : '0.0') + '%'
const num = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const md = (rows: (string | number)[][], head: string[]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(c => String(c).replace(/\|/g, '\\|')).join(' | ')} |`)].join('\n')
const cite = (k: keyof typeof STAT_CITES) => { const e = STAT_CITES[k]!; return `${e.source} <${e.locator}>: «${e.quote}»` }
const range = (d: [number, number]) => d[0] === d[1] ? String(d[0]) : `${d[0]}–${d[1]}`
const epName = (id: string) => epochById[id]?.uk ?? id

export function renderReport(d: ReportData): string {
  const out: string[] = []
  const P = (...s: string[]) => out.push(...s, '')
  const shev = EPOCHS.filter(e => e.scheme === 'shev'), wl = EPOCHS.filter(e => e.scheme === 'wl')
  P('# ukr-lexicon — Phase 1: annotated statistical analysis', `Generated ${d.generated} by \`pipelines/build.ts\` (SPEC 20). Every number below carries its denominator; every method carries its citation (SPEC 00 P-1.6). **Denominator convention:** N = all word tokens of the admitted witnesses (linked + unresolved) = **${num(d.N)}**.`)

  // 1
  P('## 1. Corpus')
  P(md(d.witnesses.map(w => [w.id, w.author, w.lang, range(w.date), w.epochShev.value === 'unknown' ? '?' : (w.epochShev.value.epochs.join('+') + ` (${w.epochShev.value.confidence})`), w.epochWl.value === 'unknown' ? '?' : w.epochWl.value.epochs.join('+'), num(w.n), w.dropped.unmapped, w.dropped.apparatus]),
    ['witness', 'author', 'lang', 'composition date', 'shev epoch', 'wl epoch', 'N tokens', 'dropped (unmapped Latin)', 'dropped (apparatus)']))
  P(`Admitted witnesses: ${d.witnesses.length}; N = ${num(d.N)}. Witnesses with a Shevchenko poem each are separate rows (each dated from the «Датується …» line of the 2003 edition).`)
  P('**Tokens per epoch** (a witness is counted once, in the epoch containing the midpoint of its composition range; research/09 §4 keeps both schemes apart):')
  P(md([...shev, ...wl].map(e => [e.id, e.uk, e.scheme, num(d.sizes.epoch[e.id] ?? 0), pct(d.sizes.epoch[e.id] ?? 0, d.N)]), ['epoch', 'name', 'scheme', 'N', `share of N=${num(d.N)}`]))
  P('**Tokens per century slice** (midpoint of the witness date range): ' + Object.entries(d.sizes.century).sort((a, b) => +a[0] - +b[0]).map(([c, n]) => `${c} ст.: ${num(n)}`).join(' · '))
  P('### Exclusions (B-1.1)')
  const noWit = d.authors.filter(a => !d.witnesses.some(w => w.author === a.id))
  P(d.excluded.length ? md(d.excluded.map(e => [e.id, e.author, e.n, e.why]), ['witness', 'author', 'N', 'why excluded']) : 'No witness was excluded by the admission rule.',
    `Authors with a vetting record but **no admitted witness** (${noWit.length}): ${noWit.map(a => `${a.id} (${a.status}${a.note ? '; ' + a.note.slice(0, 80) : ''})`).join('; ') || '—'}. Only vetted/provisional authors can produce provenance (P-2.2); \`kyiv_chron_12\` has no author evidence of its own and is admitted only through the self-reference found in the witness (authorEvidence, B-1.1).`)

  // 2
  P('## 2. Linking coverage (B-2)')
  P('Routes in order, first success wins: **torot-lemma** (TOROT lemma → derive → VESUM *lemma*), **stanza-lemma** (Stanza `orv` model lemma — a model prediction, not a dictionary fact, P-1.7), **token** (derive(raw) → VESUM *form*), **direct** (lang=uk: key(raw) + orthography folds). Denominator per row = N tokens of that witness.')
  const rt = (w: WitnessMeta, r: string) => d.routes[w.id]?.[r] ?? 0
  P(md([...d.witnesses.map(w => [w.id, num(w.n), rt(w, 'torot-lemma'), rt(w, 'stanza-lemma'), rt(w, 'token'), rt(w, 'direct'), w.n - w.linked, pct(w.linked, w.n)]),
    ['**total**', num(d.N), ...['torot-lemma', 'stanza-lemma', 'token', 'direct'].map(r => d.witnesses.reduce((s, w) => s + rt(w, r), 0)), d.unresolved, pct(d.linked, d.N)]],
    ['witness', 'N', 'torot-lemma', 'stanza-lemma', 'token', 'direct', 'unresolved', 'coverage']))
  P(`Linked ${num(d.linked)} of ${num(d.N)} tokens (${pct(d.linked, d.N)}); unresolved ${num(d.unresolved)} — never guessed (M-3.3). **Coverage is not accuracy:** a link means a derived candidate coincides with a VESUM entry (homophones such as short function words can link to a wrong lemma; ambiguity is resolved by B-2.1 and the alternatives are kept in \`link.value.alternatives\`).`)
  P('**Top 40 unresolved forms** (what the rules miss; share of all unresolved tokens):')
  P(md(d.topUnresolved.slice(0, 40).map(u => [u.form, u.f, pct(u.f, d.unresolved)]), ['form', 'f', `% of unresolved (${num(d.unresolved)})`]))
  P(`The top-200 list is stored in corpus.json (\`topUnresolved\`). Typical misses: proper names and foreign words (not in VESUM), Old Rus' lexemes with no modern descendant, scribal variants and spellings that no rule maps to a VESUM form.`)

  // 3
  P('## 3. Rule firing statistics')
  P(`**Sound rules** (core/phonology.ts, after Шевельов ІФУМ) in the successful derivations. *Type* = distinct (lemma, spelling) pairs (denominator ${num(d.spellings)}), *token* = occurrences (denominator linked tokens ${num(d.linked)}). Dialect-scope \`D\` rules are never applied.`)
  P(md(RULES.map(r => [r.id, r.name, r.scope, d.soundType[r.id] ?? 0, pct(d.soundType[r.id] ?? 0, d.spellings), d.soundToken[r.id] ?? 0, pct(d.soundToken[r.id] ?? 0, d.linked)]), ['rule', 'change', 'scope', 'types', '% types', 'tokens', '% tokens']))
  const orth = Object.keys(d.soundType).filter(k => k.startsWith('ORTH-'))
  if (orth.length) P('Orthography folds (core/orthography.ts) in successful direct links: ' + orth.map(k => `${k}: ${d.soundType[k]} types / ${d.soundToken[k]} tokens`).join(' · '))
  P(`**Detector rules** (CS, contact, dialect, Rusyn tables; core/rules.ts) — hits = labels that fired on the ${num(d.cards.reduce((s, c) => s + c.forms.length, 0))} stored spellings (FormCards). Weight-0 rules only produce review hints (P-3.1).`)
  P(md(REPORT_RULES.map(r => [r.id, r.axis, r.label, r.weight, d.detectHits[r.id] ?? 0, d.hints[r.id] ?? 0]), ['rule', 'axis', 'label', 'weight', 'label hits', 'hint hits']))

  // 4
  P('## 4. Lexical statistics (M-5)')
  P(`Methods — ipm: ${cite('ipm')}. Frequency class HK: ${cite('hk')} (f_max = ${d.fMax}, the most frequent lemma). Gries DP: ${cite('dp')}. G²/Log Ratio: ${cite('g2')}. Smoothing: ${cite('smooth')}. logDice: ${cite('logDice')} — corpus is small, so f_xy ≥ 3 here (documented deviation, M-5.5).`)
  P('### 4.1 Top 30 lemmas per Shevelov epoch (ipm = f / N_epoch · 10⁶)')
  P('Function words dominate the top of any frequency list; this is the expected shape, not a result.')
  for (const e of shev) {
    const N = d.sizes.epoch[e.id] ?? 0; if (!N) continue
    const top = d.lemmas.filter(l => l.perEpoch.has(e.id)).sort((a, b) => b.perEpoch.get(e.id)! - a.perEpoch.get(e.id)! || a.lemma.localeCompare(b.lemma, 'uk')).slice(0, 30)
    P(`**${e.id}** — ${e.uk}, N = ${num(N)}`, md(top.map((l, i) => [i + 1, l.lemma, posLabel(l.tags), l.perEpoch.get(e.id)!, ipm(l.perEpoch.get(e.id)!, N).toFixed(0)]), ['#', 'lemma', 'POS', 'f', 'ipm']))
  }
  P('### 4.2 Strongest shifts between adjacent epochs (G², Log Ratio)')
  type Sh = { lemma: string; a: string; b: string; fa: number; fb: number; g2: number; lr: number; p: number }
  const shifts: Sh[] = d.cards.flatMap(c => c.stats.shifts.filter(s => s.p <= 0.05).map(s => ({ lemma: c.lemma, a: s.a, b: s.b, fa: c.stats.byEpoch[s.a]?.f ?? 0, fb: c.stats.byEpoch[s.b]?.f ?? 0, g2: s.g2, lr: s.logRatio, p: s.p })))
    .filter(s => s.fa + s.fb >= 10)
  const row = (s: Sh) => [s.lemma, `${s.a} → ${s.b}`, `${s.fa} (${ipm(s.fa, d.sizes.epoch[s.a] ?? 0).toFixed(0)})`, `${s.fb} (${ipm(s.fb, d.sizes.epoch[s.b] ?? 0).toFixed(0)})`, s.g2.toFixed(1), (-s.lr).toFixed(2), s.p]
  const head = ['lemma', 'epochs', 'f_A (ipm)', 'f_B (ipm)', 'G²', 'Log Ratio (B vs A)', 'p']
  P(`Filter: p ≤ 0.05 and f_A + f_B ≥ 10 (${shifts.length} shifts). Log Ratio > 0 = more frequent in the later epoch B.`,
    '**Rising** (top 15 by G²):', md(shifts.filter(s => s.lr < 0).sort((x, y) => y.g2 - x.g2).slice(0, 15).map(row), head),
    '**Falling** (top 15 by G²):', md(shifts.filter(s => s.lr > 0).sort((x, y) => y.g2 - x.g2).slice(0, 15).map(row), head))
  P('Caveat: adjacent-epoch comparisons are confounded by genre and witness (the Shevchenko corpus is poetry, the old epochs are chronicles and sermons) — a shift is a statement about *this corpus*, not about the language (research/06 §3.5).')

  // 5
  P('## 5. Church Slavonic vs vernacular doublets')
  P('Detector rules CS-C1/C3/C4 (core/rules.ts; Шевельов 14.4–14.5) fire only when VESUM attests the East-Slavic counterpart, so each hit is a *pair*. Pairs, with the date of the earliest attestation of each member where the counterpart lemma is in the lexicon:')
  const byLemma = new Map(d.cards.map(c => [c.lemma.toLowerCase(), c]))
  const pairs = d.cards.flatMap(c => c.forms.filter(f => f.claims['church_slavonic']).map(f => {
    const trig = f.claims['church_slavonic']!.evidence.find(e => e.quote.includes('↔'))?.quote ?? ''
    const m = /↔ (\S+) \((.+?):/.exec(trig), other = m ? byLemma.get(m[2]!.toLowerCase()) : undefined
    return { c, f, trig, other }
  }))
  P(`${pairs.length} spellings with a church_slavonic label (denominator: ${num(d.cards.reduce((s, c) => s + c.forms.length, 0))} stored spellings); ${d.cards.filter(c => isKnown(c.claims.origin) && c.claims.origin.value === 'church_slavonic').length} lemmas with origin = church_slavonic.`)
  P(md(pairs.sort((a, b) => b.f.f - a.f.f).slice(0, 40).map(p => [p.f.raw, p.c.lemma, range(p.f.date), p.f.claims['church_slavonic']!.method ?? '', p.trig.replace(/^.*↔ /, '↔ ').slice(0, 70), p.other ? (isKnown(p.other.first) ? range(p.other.first.value.date) : '?') : 'not in lexicon']),
    ['CS spelling', 'lemma', 'date', 'rules', 'East-Slavic counterpart (VESUM)', 'counterpart first attested']))

  // 6
  P('## 6. Earliest attestations')
  P('Rule P-2.3 / B-3.5: earliest `date.to` among admitted witnesses; ties by vetted > provisional, narrower range, autograph > ms_copy > first_ed > scholarly_ed, person > institution, else co-first. The 30 oldest lemmas of the lexicon (ties on date.to broken by frequency); because the corpus starts with a few 11th-century witnesses, **thousands of lemmas tie for “oldest”** — the date reflects the corpus, not the lexeme’s age (research/06 §3.5).')
  const firsts = d.cards.filter(c => isKnown(c.first)).sort((a, b) => (a.first.value as { date: [number, number] }).date[1] - (b.first.value as { date: [number, number] }).date[1] || b.stats.f - a.stats.f)
  P(md(firsts.slice(0, 30).map(c => { const v = c.first.value as Exclude<typeof c.first.value, 'unknown'>; return [c.lemma, range(v.date), v.author, v.witness, v.loc, v.form, v.coFirst.length] }), ['lemma', 'date', 'author', 'witness', 'locator', 'form as written', 'co-first witnesses']))
  const nFirst = firsts.length
  P(`${nFirst} of ${d.cards.length} lexicon lemmas have a first-attestation claim; the rest are \`unknown\`.`)

  // 7
  P('## 7. Surzhyk / contact and dialect hits')
  const sur = d.cards.filter(c => isKnown(c.claims.surzhyk)), dia: Record<string, number> = {}
  for (const c of d.cards) for (const l of Object.keys(c.claims.dialect)) dia[l] = (dia[l] ?? 0) + 1
  const latest = Math.max(...d.witnesses.map(w => w.date[1]))
  P(`This is a literary corpus; the latest admitted witness is dated ${latest}. Contact-layer rules are gated to attestations ≥ 1919 (\`modern(ctx)\`), dialect rules to ≥ 1798 and to forms VESUM does not list as normative (core/detect.ts), so **very few hits are expected, and the ones below are not “surzhyk in the corpus”** — they are lemmas whose headword itself carries a contact label in VESUM/LanguageTool (derived claim, SURZHYK_DEF as evidence).`)
  P(`Surzhyk claims: ${sur.length} of ${d.cards.length} lexicon lemmas. ` + (sur.length ? 'Examples: ' + sur.slice(0, 25).map(c => `${c.lemma} (${c.claims.surzhyk.method})`).join('; ') : ''))
  P(`Dialect labels (lemmas): ` + (Object.keys(dia).length ? Object.entries(dia).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'none'))
  const rLem: Record<string, number> = {}, rForm: Record<string, number> = {}
  for (const c of d.cards) { const r = c.claims.rusyn; if (r && isKnown(r)) rLem[r.value] = (rLem[r.value] ?? 0) + 1; for (const f of c.forms) { const x = f.claims.rusyn; if (x && isKnown(x)) rForm[x.value] = (rForm[x.value] ?? 0) + 1 } }
  const rHits = Object.entries(d.detectHits).filter(([id]) => /^(RUE|PAN)-|>rusyn$/.test(id)).sort((a, b) => b[1] - a[1])
  P(`**Rusyn axis** (SPEC 40-rusyn, research/10 §5; a parallel reading next to dialect:ZAK/LEM, neutral on language-vs-dialect status — see \`rusynStatus\` in corpus.json). Gate: only non-normative forms, attestations ≥ 1850. Lemma labels: ${Object.keys(rLem).length ? Object.entries(rLem).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'none'}; stored spellings with a rusyn claim: ${Object.values(rForm).reduce((s, n) => s + n, 0)} of ${d.cards.reduce((s, c) => s + c.forms.length, 0)}. Rule hits (forms): ${rHits.length ? rHits.map(([id, n]) => `${id} ${n}`).join(', ') : 'none'}. **Expected ≈ 0 here:** the corpus is canonical literary Ukrainian plus Old Rus' / Ruthenian texts; Rusyn spelling (ы after к/г/х, -ськый, ӱ …) would appear only in witnesses by Rusyn-standard authors, and none is admitted. A near-zero count is a property of the corpus, not evidence about Rusyn.`)
  P(`LanguageTool \`replace\`/\`soft\` keys found among modern (lang=uk) corpus tokens: ${d.ltCorpus.length} types (${num(d.ltCorpus.reduce((s, x) => s + x.f, 0))} tokens). Top: ` + d.ltCorpus.slice(0, 20).map(x => `${x.form} (${x.f}, ${x.file})`).join(', ') + '. These are 19th-century spellings flagged against *today’s* norm — not evidence of contact.')
  P(`Python stages: ${d.flags.py ? 'run by this build' : 'skipped (--no-py)'}; stress.json ${d.flags.stress ? `${num(d.stressForms)} forms (${d.stressSource})` : 'absent'}; ru.json ${d.flags.ru ? num(d.ruForms) + ' forms (pymorphy3 ru: «known» = present in the OpenCorpora dictionary, not “standard Russian”)' : 'absent'}.`)

  // 8
  P('## 8. Caveats')
  const bullets = [
    `**Corpus bias.** ${d.witnesses.length} witnesses chosen for availability and vetted authorship (research/06 §3.5): chronicles, sermons, a Gospel, early-modern prose, 19th-century poetry. “First attested” means first in *this* corpus.`,
    `**Epochs.** Both schemes are kept apart (research/09 §4). A witness is assigned to the epoch containing its date midpoint for counting; its full assignment (with confidence) is in corpus.json. Epoch boundaries are conventions with fuzz, not events.`,
    `**Model output vs dictionary fact (P-1.7).** The \`stanza-lemma\` route is a neural lemmatiser trained on TOROT (CC BY-NC-SA 3.0), weak outside its domain (\`ruthenian\` texts are flagged outOfDomain); its links are labelled with that method and are not dictionary facts. Stress is from \`ukrainian-word-stress\` (ULIF-derived, licence unclear, context-free) with status \`unknown\` and method \`dictionary\`; ru.json is a dictionary-membership test.`,
    `**Frequencies count linked tokens only**; ipm and HK use N = all tokens as denominator, so lemma frequencies are lower bounds by the unresolved share (${pct(d.unresolved, d.N)}).`,
    `**lexicon.json (B-5)**: lemmas with f ≥ 2 or a pre-1400 attestation: ${num(d.keptCount)} of ${num(d.allCount)} lemmas; ${num(d.cards.length)} written, ${(d.budget.bytes / 1048576).toFixed(1)} MB (limit 15 MB), Evidence stored once in a shared pool (${num(d.budget.pool)} distinct objects; cards carry indices, lossless). Size tiers (kwic/forms per form/lemma: 6/12, 3/8, 2/6, 1/4, 0/2) used for ${d.budget.tiers.join(' / ')} lemmas${d.budget.dropped ? `; ${d.budget.dropped} lowest-frequency lemmas dropped to meet the limit` : ''}. lexindex.json ${(d.budget.lexindexBytes / 1048576).toFixed(2)} MB (${d.budget.lexindexAttested} corpus-attested flagged forms added).`,
    `**Origin claims** are heuristics with citations: \`church_slavonic\` needs a CS detector hit carrying ≥ half of the lemma’s tokens (no vernacular doublet of comparable weight); \`native\` needs an orv attestation by torot-lemma/token with only G/X rules in its derivation; otherwise \`unknown\`. Absence of a label is not evidence of the opposite.`,
    `**Register**: only “colloquial” (from VESUM tags slang/subst/short/vulg) or unknown; “literary” is never inferred (research/08 B3).`,
    `**Collocations** use a ±3 lemma window inside the source segment and a minimum f_xy of 3; linking errors propagate into them.`,
    `**Licences.** VESUM and Brown-UK: CC BY-NC-SA 4.0; TOROT: CC BY-NC-SA 3.0; LanguageTool: LGPL-2.1; pymorphy3-dicts-ru: CC BY-SA; the derived dataset is non-commercial, share-alike (P-4.4).`,
  ]
  P(bullets.map(b => '- ' + b).join('\n'))
  return out.join('\n') + '\n'
}
