/**
 * BL-16 navigation closure: ONE table of element kinds -> internal route. Every clickable element type on the site resolves through here, so
 * «no dead end» is testable (tests/nav.test.ts walks the router over ELEMENT_ROUTES). Pure; no external URLs (those are secondary «оригінал ↗»).
 */
import { SOURCES } from '../../core/sources.ts'

export type ElementKind = 'word' | 'form' | 'kwic' | 'token' | 'witness' | 'author' | 'source' | 'epoch' | 'dialect' | 'place' | 'rule' | 'evidence'
const e = encodeURIComponent
export const wordTo = (lemma: string) => `/w/${e(lemma)}`
export const formTo = (form: string, lemma?: string) => (lemma ? `/f/${e(form)}?lemma=${e(lemma)}` : `/f/${e(form)}`)
export const witnessTo = (id: string) => `/witness/${e(id)}`
export const authorTo = (id: string) => `/author/${e(id)}`
export const sourceTo = (id: string) => `/source/${e(id)}`
/** the witness's running text at a locator (scrolled to + highlighted by TextsView) */
export const textTo = (id: string, loc?: string) => (loc ? `/texts?w=${e(id)}&loc=${e(loc)}` : `/texts?w=${e(id)}`)
export const epochTo = (id: string) => `/method#epoch-${e(id)}`
export const dialectTo = (id: string) => `/method#dialect-${e(id)}`
export const ruleTo = (id: string) => `/method#rule-${e(id)}`
export const placeTo = (lemma: string) => wordTo(lemma)

/** evidence «джерело»: a registry source -> its card; a witness id -> the witness's text at the locator. Never an external URL. */
export const evidenceTo = (source: string, locator?: string, isWitness = false) =>
  SOURCES[source] ? sourceTo(source) : isWitness ? textTo(source, locator) : sourceTo(source)

/** One sample link per element type; the router-walk test resolves each and asserts it is not the catch-all redirect. */
export const ELEMENT_ROUTES: Record<ElementKind, string> = {
  word: wordTo('вода'), form: formTo('води', 'вода'), kwic: formTo('води', 'вода'), token: wordTo('вода'),
  witness: witnessTo('sophia-1'), author: authorTo('nestor'), source: sourceTo('SHEV'),
  epoch: epochTo('shev.old'), dialect: dialectTo('WPL'), place: placeTo('Київ'), rule: ruleTo('R10'), evidence: evidenceTo('SHEV', 'с. 1'),
}

/** BL-17c: does this form need the old-letter face (Monomakh)? Old letters / titlo / superscript letters, or the attestation ended before 1800. */
const OLD_RE = /[ѣѢѧѦѫѪъЪыЫѡѠꙋꙊѿѾꙗꙖѥѤѩѨѭѬѯѰѱѲѳѴѵѶѷѹѸ҃-҉ⷠ-ⷿꙮ-ꚟ]/
export const isOldForm = (form: string, yearTo?: number) => OLD_RE.test(form) || (yearTo !== undefined && yearTo < 1800)
