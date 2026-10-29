/**
 * SPEC 63 OV-10: the card's blocks regrouped into five general categories (owner 2026-10-22: «організуй вкладинки на сторінці картки слова в більш загальні категорії,
 * наприклад об'єднай словозміну і словозміну за епохами в одну категорію»). Pure data: every block of the CP-1 matrix (src/lib/cardParity.ts) belongs to exactly one tab,
 * every card kind shows its blocks under these tabs (tests/ov-tabs.test.ts walks the sources), nothing is dropped.
 */
export const TABS = [
  { id: 'overview', label: 'Огляд', hint: 'регіони й діалект, приклад, значення, словозміна: стисло' },
  { id: 'forms', label: 'Форми', hint: 'написання, словозміна й епохи, наголос, вимова, похідні' },
  { id: 'history', label: 'Історія', hint: 'походження, перша фіксація, виведення, етимологія, запозичення' },
  { id: 'meanings', label: 'Значення', hint: 'мітки, значення й їх зміна за епохами, фразеологія, сполучення' },
  { id: 'spread', label: 'Поширення', hint: 'діалект, карта, регіони, статистика' },
  { id: 'sources', label: 'Джерела', hint: 'приклади (KWIC), пам’ятки, словники' },
] as const
export type TabId = typeof TABS[number]['id']
export const TAB_LABEL = Object.fromEntries(TABS.map(t => [t.id, t.label])) as Record<TabId, string>
/** CP-1 block -> tab (keys are BlockId of cardParity.ts; a test keeps both in step) */
export const BLOCK_TAB: Record<string, TabId> = {
  chips: 'meanings', kwic: 'sources', witnesses: 'sources', epochs: 'forms', derivation: 'history', dialect: 'spread', map: 'spread', stats: 'spread',
  stress: 'forms', etymology: 'history', senses: 'meanings', phrasemes: 'meanings', loan: 'history', derivatives: 'forms', ipa: 'forms', senseTimeline: 'meanings', labels: 'meanings',
  // CP-8
  overview: 'overview', pronunciation: 'overview', origin: 'overview', switches: 'overview', paradigm: 'forms', featureChips: 'forms', variantFamily: 'forms', contactForm: 'forms', regions: 'spread', ruFlag: 'sources',
  // GG-12 / GG-13: both sections are in the Огляд tab
  synonyms: 'overview', wiktPhraseology: 'overview',
}
/** panel DOM id (without the h-/t-/f- prefix where the panel exists on several kinds) -> tab: used to open the right tab for an #anchor */
/** panels of the always-visible statistics sidebar (SPEC 63 OV-12): in no tab */
export const SIDEBAR_PANELS = ['h-st', 'h-stx', 'h-tc', 'h-eb', 'h-sr', 'h-sc', 'f-st', 'f-sr', 't-st', 't-sr']
export const PANEL_TAB: Record<string, TabId> = {
  'cp-rules': 'forms', 'h-prov': 'history', 'h-chain': 'history', 'h-ety': 'history', 'h-cog': 'history', 'h-place': 'history', 'f-der': 'history', 't-der': 'history',
  'h-lab': 'meanings', 't-lab': 'meanings', 'h-sn': 'meanings', 't-sn': 'meanings', 'h-col': 'meanings', 'h-phr': 'meanings', 'f-cl': 'meanings',
  'h-par': 'forms', 'h-ep': 'forms', 'f-ep': 'forms', 'f-circ': 'forms', 'h-ipa': 'forms', 't-ipa': 'forms', 'h-der': 'forms',
  'h-dia': 'spread', 'f-dia': 'spread', 't-dia': 'spread', 'h-map': 'spread', 'f-reg': 'spread', 't-reg': 'spread',
  'h-kw': 'sources', 'f-kw': 'sources', 't-kw': 'sources', 'h-wit': 'sources', 'f-wit': 'sources', 'cp-wit': 'sources',
}
/** the tab that holds the element with this DOM id (undefined = not in a tab) */
export const tabOfId = (id: string): TabId | undefined => PANEL_TAB[id]

import { ref } from 'vue'
/** a block asks the tabs to open the panel with this DOM id (e.g. «приклади» in the epoch grid -> the KWIC panel in «Джерела») */
export const tabRequest = ref<{ id: string; n: number } | null>(null)
export const openPanel = (id: string) => { tabRequest.value = { id, n: Date.now() } }
