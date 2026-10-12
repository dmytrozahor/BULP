/**
 * SPEC 60 NW-6 + Amendment 2026-10-12 — Saint Sophia graffiti as running-text witnesses (research/16 R2.1).
 * Author `sophia_graffiti` is institutional and provisional: identity comes from the cathedral's Kyivan provenance, not from a self-name.
 * The two Q quotes below are verbatim from the API response (cached under data/raw/sophia/; tests/ingest-sophia.test.ts checks them there).
 */
import { P, Q } from '../core/evidence.ts'
import type { Author } from './authors.ts'

export const SOPHIA_API = 'https://saintsophia.dh.gu.se/api/inscriptions/inscription/'
export const LICENCE_NOTE = 'Transcription licence not stated by the portal; included for non-commercial research with attribution by the project owner\'s decision (2026-10-12)'
export const ATTRIBUTION = 'Saint Sophia, University of Gothenburg'

export const AUTHORS_SOPHIA: Author[] = [
  {
    id: 'sophia_graffiti', name: 'Автори графіті Софії Київської (колективний, анонімний)', life: 'XI–XVIII ст.', label: 'institutional', status: 'provisional', confidence: 'implicit', region: 'Київ',
    evidence: [
      Q('SOPHIA', SOPHIA_API + '?depth=2 (bibliography id 11)', 'Корпус Графіті Софії Київської - Частина IХ: північні внутрішня та зовнішня галереї'),
      Q('SOPHIA', SOPHIA_API + '?depth=2 (panel.documentation)', 'National Conservation Area &ldquo;St. Sophia of Kyiv&rdquo;, Ukraine'),
      P('GU', 'https://www.gu.se/en/news/researchers-document-thousand-year-old-graffiti-in-kyiv', 'thousand-year-old graffiti in Kyiv', 'research/16 §1: портал Гетеборзького університету, понад 7000 написів у Софійському соборі в Києві'),
    ],
    note: 'інституційний автор: написи залишили невідомі відвідувачі та писарі собору в Києві; ідентичність — через київське походження пам’ятки (собор), а не через самоназву. Іменний автор для підписаного напису був би можливий лише за власним текстом напису — таких записів тут немає (research/16; SPEC 60 NW-6)',
  },
]
