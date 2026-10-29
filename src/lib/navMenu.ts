/**
 * SPEC 63 OV-9: the top navigation grouped by function (owner 2026-10-22: «згрупуй схожої функції кнопки на навігації»). Pure data + the keyboard rule of the menus,
 * so tests/ov-nav.test.ts can walk it without a DOM. Every former top-level route stays reachable under the SAME hash URL; the vocabulary follows the card tabs
 * (Слова / Поширення / Джерела, src/lib/cardTabs.ts).
 */
export interface NavItem { to: string; label: string; hint: string; external?: boolean }
export interface NavGroup { id: string; label: string; items: NavItem[] }
export const BOOK_FORM = 'https://github.com/dmytrozahor/BULP/issues/new?template=book.yml'
export const NAV_GROUPS: NavGroup[] = [
  { id: 'words', label: 'Слова', items: [
    { to: '/', label: 'Пошук', hint: 'знайти слово чи форму' },
    { to: '/analyze', label: 'Аналіз слова', hint: 'розбір довільного написання' },
    { to: '/derive', label: 'Деривація', hint: 'покрокове виведення старої форми в сучасну' },
    { to: '/phrases', label: 'Сполучення', hint: 'фразеологія й сталі сполучення' },
  ] },
  { id: 'texts', label: 'Тексти', items: [
    { to: '/texts', label: 'Тексти корпусу', hint: 'читати пам’ятки з розміткою' },
    { to: '/songs', label: 'Пісні', hint: 'пісенний підкорпус' },
    { to: '/annotate', label: 'Анотатор', hint: 'розмітити власний текст' },
  ] },
  { id: 'sources', label: 'Джерела та спільноти', items: [
    { to: '/plast', label: 'Пласт', hint: 'пластова лексика' },
    { to: '/sophia', label: 'Софія', hint: 'написи Софії Київської' },
    { to: '/persons', label: 'Постаті', hint: 'автори, лінгвісти й діячі різних епох у корпусі' },
    { to: '/atlas', label: 'Атлас', hint: 'діалектні риси з «Атласу української мови»' },
    { to: '/map', label: 'Мапа', hint: 'історичні землі й пам’ятки на мапі' },
  ] },
  { id: 'about', label: 'Про проєкт', items: [
    { to: '/corpus', label: 'Корпус', hint: 'статистика, пам’ятки й ліцензії' },
    { to: '/report', label: 'Звіт', hint: 'звіт останньої збірки' },
    { to: '/method', label: 'Метод', hint: 'як це працює: правила, епохи, діалекти' },
    { to: BOOK_FORM, label: 'Запропонувати книжку', hint: 'форма пропозиції книжки (GitHub)', external: true },
  ] },
]
export const navRoutes = () => NAV_GROUPS.flatMap(g => g.items.filter(i => !i.external).map(i => i.to))
/** which group a route belongs to (the active group is marked) */
export const groupOf = (path: string) => NAV_GROUPS.find(g => g.items.some(i => !i.external && (i.to === '/' ? path === '/' || path.startsWith('/w/') || path.startsWith('/f/') : path === i.to || path.startsWith(i.to + '/') || (i.to === '/persons' && path.startsWith('/person/')))))?.id
/** arrow-key rule inside an open menu: index of the link to focus next (wraps), undefined = key not handled */
export function nextIndex(key: string, i: number, n: number): number | undefined {
  if (!n) return undefined
  if (key === 'ArrowDown') return (i + 1) % n
  if (key === 'ArrowUp') return (i - 1 + n) % n
  if (key === 'Home') return 0
  if (key === 'End') return n - 1
  return undefined
}
