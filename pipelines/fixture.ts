/**
 * FIXTURE generator — realistic-but-invented data so the UI can be built before the real pipelines run.
 * Everything is marked "generated": "FIXTURE"; KWIC left contexts start with "[фікстура]"; evidence of invented facts uses source FIXTURE.
 * What is REAL: all derivations (core/phonology derive), epochs (assignEpoch), detector claims (detect + rule tables), statistics (core/stats).
 *   npx tsx pipelines/fixture.ts   → public/data/{corpus,lexicon,lexindex}.json
 * The real pipeline overwrites these files (SPEC 10 M-6).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { claim, unknown, D, isKnown, type Claim } from '../core/evidence.ts'
import { assignEpoch, EPOCHS, epochById } from '../core/epochs.ts'
import { compare, dispersion, dots, freqClass, ipm, logDice, smooth } from '../core/stats.ts'
import { key, normalizeOld } from '../core/text.ts'
import { SURZHYK_BASIS, SURZHYK_DEF } from '../core/rules.ts'
import type { CorpusMeta, FormCard, LemmaCard, LexIndex, StressVariant, VesumHit, WitnessMeta } from '../core/types.ts'
import { MANIFEST } from './manifest.ts'
import { AUTHORS } from './authors.ts'
import { deriveWithSteps } from '../src/lib/derive.ts'
import { runDetectors, type LexData } from '../src/lib/analyze.ts'

const FX = (loc: string, q: string) => D('FIXTURE', `pipelines/fixture.ts, ${loc}`, `[фікстура] ${q}`)

// ── witnesses (real manifest entries; token counts are invented) ─────────────────────────────────
const NTOK: Record<string, number> = {
  ilarion: 9500, arch: 21000, pvl_lav: 118000, monomakh: 4200, hypatian: 240000, vyshensky: 38000, samovydets: 52000,
  eneida1798: 31000, shevchenko: 96000, kulish1882: 15000, lesya1892: 11000, franko1905: 14500,
}
const units = MANIFEST.filter(u => u.id in NTOK)
const witnesses: WitnessMeta[] = units.map(u => {
  const n = NTOK[u.id]!, a = AUTHORS.find(x => x.id === u.author)
  return {
    id: u.id, unit: u.id, title: u.title, author: u.author, url: u.urls[0]!, date: u.date, dateCite: u.dateCite, msDate: u.msDate, lang: u.lang,
    region: u.region, witnessType: u.witnessType, edition: u.edition, orth: u.orth, oldI: u.oldI, license: u.license,
    authorEvidence: a?.evidence.length ? undefined : [FX('authorEvidence', 'самоназва автора, знайдена в самому тексті')],
    n, linked: Math.round(n * (u.date[0] < 1500 ? 0.58 : 0.71)), dropped: { unmapped: Math.round(n * 0.004), apparatus: Math.round(n * 0.02) },
    epochShev: assignEpoch(u.date, 'shev'), epochWl: assignEpoch(u.date, 'wl'),
  }
})
const W = Object.fromEntries(witnesses.map(w => [w.id, w]))
const epochIds = (w: WitnessMeta, scheme: 'shev' | 'wl') => { const c = scheme === 'shev' ? w.epochShev : w.epochWl; return isKnown(c) ? c.value.epochs : [] }
const century = (w: WitnessMeta) => Math.ceil((w.date[0] + w.date[1]) / 2 / 100)

const epochSizes: Record<string, number> = {}, centurySizes: Record<string, number> = {}
for (const w of witnesses) {
  for (const s of ['shev', 'wl'] as const) { const es = epochIds(w, s); for (const e of es) epochSizes[e] = (epochSizes[e] ?? 0) + w.n / es.length }
  const c = String(century(w)); centurySizes[c] = (centurySizes[c] ?? 0) + w.n
}
const N = witnesses.reduce((s, w) => s + w.n, 0), linked = witnesses.reduce((s, w) => s + w.linked, 0)
const corpus: CorpusMeta = {
  generated: 'FIXTURE', authors: AUTHORS.filter(a => units.some(u => u.author === a.id)), witnesses, epochSizes, centurySizes, N, linked, unresolved: N - linked,
  topUnresolved: [['бѣсовьскыимъ', 7], ['идольскыимъ', 6], ['пакыбытіа', 5], ['тарадайку', 4], ['розкудкудаткалась', 3]].map(([form, f]) => ({ form: form as string, f: f as number })),
}

// ── mini VESUM for the fixture lemmas ───────────────────────────────────────────────────────────
type P = [string, string]
// VESUM noun tags: singular "noun:anim:m:v_naz" (gender, then case); plural "noun:anim:p:v_naz". "a/b" = two variant forms.
const nm = (sg: string[], pl: string[], an: 'anim' | 'inanim', g = 'm'): P[] => {
  const cs = ['v_naz', 'v_rod', 'v_dav', 'v_zna', 'v_oru', 'v_mis', 'v_kly']
  return [...sg.map((f, i) => [f, `noun:${an}:${g}:${cs[i]}`] as P), ...pl.map((f, i) => [f, `noun:${an}:p:${cs[i]}`] as P)]
    .flatMap(([f, t]) => f.split('/').map(x => [x, t] as P))
}
const verb = (inf: string, pres: string[], past: string[], impr: string[]): P[] => [
  [inf, 'verb:imperf:inf'],
  ...pres.map((f, i) => [f, `verb:imperf:pres:${i < 3 ? 's' : 'p'}:${(i % 3) + 1}`] as P),
  ...past.map((f, i) => [f, `verb:imperf:past:${['m', 'f', 'n', 'p'][i]}`] as P),
  ...impr.map((f, i) => [f, `verb:imperf:impr:${['s:2', 'p:1', 'p:2'][i]}`] as P),
]

interface Occ { w: string; loc: string; raw: string; left: string; right: string; f: number }
interface Spec {
  lemma: string; pos: string; paradigm: P[]; stress: { form: string; pos: number[]; status: StressVariant['status']; method: StressVariant['method']; period?: string }[]
  forms: Occ[]; colloc: [string, number, number][]   // partner, f_xy, f_y
}
const o = (w: string, loc: string, raw: string, left: string, right: string, f: number): Occ => ({ w, loc, raw, left, right, f })

const SPECS: Spec[] = [
  { lemma: 'князь', pos: 'іменник, ч.р.', stress: [],
    paradigm: nm(['князь', 'князя', 'князеві/князю', 'князя', 'князем', 'князі/князю', 'князю'], ['князі', 'князів', 'князям', 'князів', 'князями', 'князях', 'князі'], 'anim'),
    forms: [o('ilarion', 'Слово, фр. 7', 'кънѧзь', 'похвала кагану нашему Влодимеру, великому', 'нашему', 6), o('pvl_lav', 'л. 14 зв.', 'кънѧзь', 'и въсѣде Олегъ', 'въ Києвѣ', 31),
      o('kulish1882', 'с. 40', 'князь', 'старий', 'сидів у горниці', 4), o('shevchenko', 'Причинна', 'князь', 'и', 'ходить по землі', 5)],
    colloc: [['великий', 28, 900], ['київський', 14, 400], ['Олег', 12, 220]] },
  { lemma: 'видіти', pos: 'дієслово, недок.', stress: [{ form: 'видіти', pos: [1], status: 'normative', method: 'dictionary' }],
    paradigm: verb('видіти', ['вижу', 'видиш', 'видить', 'видимо', 'видите', 'видять'],['видів', 'виділа', 'виділо', 'виділи'], ['видь', 'видьмо', 'видьте']),
    forms: [o('arch', 'Ін 1:18', 'видѣти', 'бога никтоже не вьзможеть', 'ни единъ же', 8), o('vyshensky', 'Книжка', 'видѣти', 'хощу', 'и слышати', 11), o('shevchenko', 'Катерина', 'видіти', 'годі', 'тебе', 9), o('lesya1892', 'Contra spem spero', 'видіти', 'хотіла б', 'світ', 3)],
    colloc: [['бачити', 5, 800], ['слышати', 9, 300]] },
  { lemma: 'кінь', pos: 'іменник, ч.р.', stress: [{ form: 'кінь', pos: [1], status: 'normative', method: 'dictionary' }],
    paradigm: nm(['кінь', 'коня', 'коневі/коню', 'коня', 'конем', 'коні/коневі', 'коню'], ['коні', 'коней', 'коням', 'коней', 'кіньми/кіньми', 'конях', 'коні'], 'anim'),
    forms: [o('pvl_lav', 'л. 12', 'конь', 'и сѣде на', 'свои', 22), o('samovydets', 'ч. I', 'конь', 'козак на', 'вороный', 15), o('eneida1798', 'ч. I, 18', 'конь', 'Еней на', 'выскочивъ', 4), o('shevchenko', 'Тарасова ніч', 'кінь', 'ржав', 'на степу', 12)],
    colloc: [['сісти', 10, 500], ['вороний', 6, 120]] },
  { lemma: 'город', pos: 'іменник, ч.р.', stress: [{ form: 'город', pos: [1], status: 'normative', method: 'dictionary' }],
    paradigm: nm(['город', 'города', 'городові/городу', 'город', 'городом', 'городі', 'городе'], ['городи', 'городів', 'городам', 'городи', 'городами', 'городах', 'городи'], 'inanim'),
    forms: [o('pvl_lav', 'л. 8', 'городъ', 'и срубиша', 'Ладогу', 40), o('hypatian', 'стб. 523', 'городъ', 'и възѧша', 'Галичь', 55), o('eneida1798', 'ч. I, 2', 'город', 'Еней в', 'пішов', 3), o('shevchenko', 'Причинна', 'город', 'за', 'огород', 3)],
    colloc: [['великий', 20, 900], ['брати', 9, 700]] },
  { lemma: 'град', pos: 'іменник, ч.р. (застар.)', stress: [],
    paradigm: nm(['град', 'града', 'градові/граду', 'град', 'градом', 'градові/граді', 'граде'], ['гради', 'градів', 'градам', 'гради', 'градами', 'градах', 'гради'], 'inanim'),
    forms: [o('ilarion', 'Слово, фр. 31', 'градъ', 'въ', 'Києвѣ', 9), o('arch', 'Мт 5:14', 'градъ', 'не можеть', 'укрытисѧ', 7), o('vyshensky', 'Книжка', 'градъ', 'и', 'чистый', 5)],
    colloc: [['Київ', 6, 310], ['святий', 4, 600]] },
  { lemma: 'свіча', pos: 'іменник, ж.р.', stress: [{ form: 'свіча', pos: [4], status: 'normative', method: 'dictionary' }, { form: 'свіча', pos: [2], status: 'dialectal', method: 'corpus' }],
    paradigm: nm(['свіча', 'свічі', 'свічі', 'свічу', 'свічею', 'свічі', 'свіче'], ['свічі', 'свіч', 'свічам', 'свічі', 'свічами', 'свічах', 'свічі'], 'inanim', 'f'),
    forms: [o('monomakh', 'Поученьє', 'свѣча', 'и', 'въ церкви', 3), o('arch', 'Мт 5:15', 'свѣща', 'ни въжигають', 'и вьставлѧють', 6), o('kulish1882', 'с. 77', 'свіча', 'горить', 'на столі', 4)],
    colloc: [['горіти', 4, 250], ['запалити', 3, 120]] },
  { lemma: 'Київ', pos: 'іменник, ч.р., власна назва', stress: [{ form: 'Київ', pos: [1], status: 'normative', method: 'dictionary' }],
    paradigm: nm(['Київ', 'Києва', 'Києву/Київові', 'Київ', 'Києвом', 'Києві', 'Києве'], [], 'inanim'),
    forms: [o('pvl_lav', 'л. 6', 'кыѥвъ', 'и приде Олегъ къ', 'горамъ', 120), o('hypatian', 'стб. 301', 'кыѥвъ', 'и сѣде Изѧславъ в', 'и ради', 210), o('shevchenko', 'Причинна', 'Київ', 'поїхав у', 'на Дніпро', 18), o('lesya1892', 'Contra spem spero', 'Київ', 'в', 'мій', 5)],
    colloc: [['князь', 14, 1500], ['Дніпро', 9, 260]] },
  { lemma: 'що', pos: 'займенник', stress: [],
    paradigm: [['що', 'pron:int:v_naz'], ['що', 'pron:int:v_zna'], ['чого', 'pron:int:v_rod'], ['шо', 'pron:int:v_naz:subst']],
    forms: [o('monomakh', 'Поученьє', 'чьто', 'и', 'ти сътворити', 26), o('kulish1882', 'с. 90', 'шо', '[розм.] а', 'ти кажеш', 3), o('shevchenko', 'Думка', 'що', 'нащо мені', 'на світі', 400)],
    colloc: [['бути', 40, 3000], ['казати', 12, 900]] },
]

// ── lexicon cards ────────────────────────────────────────────────────────────────────────────────
const lex: LexData = { paradigmMap: new Map() }
for (const s of SPECS) for (const [f, t] of s.paradigm) { const k = key(f); lex.paradigmMap.set(k, [...(lex.paradigmMap.get(k) ?? []), { lemma: s.lemma, tags: t }]) }

const F_MAX = 4000
const shevOrder = EPOCHS.filter(e => e.scheme === 'shev' && !e.overlay).map(e => e.id)

function card(s: Spec): LemmaCard {
  // group occurrences by historical spelling
  const groups = new Map<string, Occ[]>()
  for (const x of s.forms) groups.set(x.raw, [...(groups.get(x.raw) ?? []), x])
  const target = s.lemma

  const forms: FormCard[] = [...groups.entries()].map(([raw, occs]) => {
    const w0 = W[occs[0]!.w]!
    const d = deriveWithSteps(raw, { oldI: w0.oldI })
    const same = key(raw) === key(target), modern = target
    const cand = same ? undefined : d.candidates.find(c => key(c.form) === key(target))
    const year = Math.max(...occs.map(x => W[x.w]!.date[1]))
    const det = runDetectors(raw, lex, year)
    const vh: VesumHit = lex.paradigmMap.get(key(target))?.[0] ?? { lemma: target, tags: 'unknown' }
    const torot = units.find(u => u.id === w0.id)?.kind === 'torot'
    const link = claim({ lemma: target, form: modern, route: torot || (!cand && !same) ? 'torot-lemma' as const : cand && cand.trace.length ? 'token' as const : 'direct' as const,
      alternatives: d.candidates.filter(c => key(c.form) !== key(target)).map(c => c.form).slice(0, 3) },
      [D('VESUM', 'dict_corp_vis.txt v6.8.6', `${modern} ${vh.tags} (лема: ${vh.lemma})`)], { method: cand ? cand.trace.join('+') || 'identity' : 'fixture' })
    const epochs = [...new Set(occs.flatMap(x => epochIds(W[x.w]!, 'shev')))]
    return {
      raw, norm: d.norm, date: occs.map(x => W[x.w]!.date).sort((a, b) => a[1] - b[1] || a[0] - b[0])[0]!, modern, f: occs.reduce((a, x) => a + x.f, 0), link, derivation: cand ? cand.steps : [], claims: det.claims,
      hints: det.hints.map(h => h.rule), epochs,
      kwic: occs.map(x => ({ w: x.w, loc: x.loc, left: `[фікстура] ${x.left}`, node: x.raw, right: x.right, date: W[x.w]!.date })),
    }
  })

  // first attestation = earliest date.to (SPEC 00 P-2.3)
  const flat = forms.flatMap(f => f.kwic.map(k => ({ ...k, form: f.raw })))
  const first = flat.sort((a, b) => a.date[1] - b.date[1] || a.date[0] - b.date[0])[0]!
  const fw = W[first.w]!
  const quote = `${first.left} ${first.node} ${first.right}`
  const ev = D(first.w, first.loc, quote, 'вживання в контексті (фікстура)')
  const epoch = (c: Claim<{ epochs: string[] }>) => (isKnown(c) ? c.value.epochs[0]! : 'unknown')
  const firstC = claim({ author: fw.author, witness: first.w, loc: first.loc, date: first.date, witnessType: fw.witnessType, form: first.form, coFirst: [] }, ev)
  const oldest = claim({ form: first.form, date: first.date, epoch: epoch(fw.epochShev) }, ev)

  // statistics (real functions, invented counts)
  const perW = witnesses.map(w => ({ w, y: forms.flatMap(f => f.kwic.filter(k => k.w === w.id)).length ? s.forms.filter(x => x.w === w.id).reduce((a, x) => a + x.f, 0) : 0 }))
  const f = perW.reduce((a, p) => a + p.y, 0)
  const hk = freqClass(f, F_MAX), dp = dispersion(perW.map(p => ({ y: p.y, n: p.w.n })))
  const eCount: Record<string, number> = {}
  for (const { w, y } of perW) for (const sc of ['shev', 'wl'] as const) { const es = epochIds(w, sc); for (const e of es) eCount[e] = (eCount[e] ?? 0) + y / es.length }
  const byEpoch = Object.fromEntries(Object.entries(eCount).map(([e, fe]) => [e, { f: Math.round(fe), ipm: ipm(fe, epochSizes[e]!) }]))
  const cs = Object.keys(centurySizes).map(Number).sort((a, b) => a - b)
  const cf = cs.map(c => perW.filter(p => century(p.w) === c).reduce((a, p) => a + p.y, 0))
  const cipm = cs.map((c, i) => ipm(cf[i]!, centurySizes[String(c)]!))
  const sm = smooth(cipm, 1)
  const present = shevOrder.filter(e => (eCount[e] ?? 0) > 0 || epochSizes[e])
  const shifts = present.slice(1).map((b, i) => {
    const a = present[i]!, r = compare(eCount[a] ?? 0, eCount[b] ?? 0, epochSizes[a]!, epochSizes[b]!)
    return { a, b, g2: r.g2, logRatio: r.logRatio, p: r.p }
  }).filter(x => epochSizes[x.a] && epochSizes[x.b])

  const claimsAll = Object.assign({}, ...forms.map(x => x.claims)) as Record<string, Claim<true>>
  const colloq = claimsAll.colloquial
  const surzLabels = Object.keys(claimsAll).filter(l => SURZHYK_BASIS.includes(l))
  const old = forms.filter(x => key(x.raw) !== key(target))
  const csAll = old.length > 0 && old.every(x => x.claims.church_slavonic)
  return {
    lemma: target, pos: s.pos, paradigm: s.paradigm.map(([form, tags]) => ({ form, tags })),
    stress: s.stress.map(v => ({ form: v.form, positions: v.pos, status: v.status, method: v.method, period: v.period,
      evidence: [FX('stress', `наголос ${v.form} (${v.status}) — не з реального словника`)] })),
    forms, first: firstC,
    stats: {
      f, ipm: ipm(f, N), hk, dots: dots(hk), dp: dp.dp, range: dp.range, byEpoch,
      byCentury: cs.map((c, i) => ({ c, f: cf[i]!, ipm: cipm[i]!, smooth: sm[i] ?? null })),
      shifts,
      colloc: s.colloc.map(([lemma, fxy, fy]) => ({ lemma, fxy, logDice: logDice(fxy, f, fy) })).sort((a, b) => b.logDice - a.logDice),
    },
    claims: {
      register: colloq ? claim('colloquial' as const, colloq.evidence, { score: colloq.score, method: colloq.method }) : unknown(),
      surzhyk: surzLabels.length ? claim(true as const, [SURZHYK_DEF, ...surzLabels.flatMap(l => claimsAll[l]!.evidence)]) : unknown(),
      origin: csAll ? claim('church_slavonic' as const, old.flatMap(x => x.claims.church_slavonic!.evidence)) : unknown(),
      oldest, dialect: Object.fromEntries(Object.entries(claimsAll).filter(([l]) => ['CHN', 'MPL', 'WPL', 'SW', 'SE', 'POD', 'NDN', 'BOY', 'LEM', 'MDN', 'NORTH'].includes(l))),
    },
  }
}

const cards = SPECS.map(card)
void epochById; void normalizeOld

const lexindex: LexIndex = {
  generated: 'FIXTURE',
  lt: { слідуючий: ['replace', 'наступний'], кушать: ['replace', 'їсти'], подякувати: ['soft', 'віддячити'] },
  vesum: {
    співпадати: [{ lemma: 'співпадати', tags: 'verb:imperf:inf:bad' }], кльовий: [{ lemma: 'кльовий', tags: 'adj:m:v_naz:slang' }],
    нє: [{ lemma: 'ні', tags: 'part:subst' }], бігчи: [{ lemma: 'бігти', tags: 'verb:imperf:inf:short' }],
  },
}

mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/corpus.json', JSON.stringify(corpus))
writeFileSync('public/data/lexicon.json', JSON.stringify(cards))
writeFileSync('public/data/lexindex.json', JSON.stringify(lexindex))
console.log(`FIXTURE: ${cards.length} lemmas, ${witnesses.length} witnesses, N=${N}`)
for (const c of cards) console.log(c.lemma, c.forms.map(f => `${f.raw}→${f.modern}[${f.derivation.map(d => d.rule).join(',')}] ${Object.keys(f.claims).join('|')}`).join('  '), 'origin=', c.claims.origin.value, 'reg=', c.claims.register.value)
