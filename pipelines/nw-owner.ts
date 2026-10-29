/**
 * SPEC 63 SRC-28 — Калліст «Євангеліє учительноє» (Вільно, друкарня братства, 1616), ч. 1: the owner's 360 page JPGs, OCR'd with Tesseract 5 (ukr+rus+Cyrillic, tessdata_best) on the worker.
 * Dated 1616 by research/44 r22 («Євє — друк Віленського братства; Смотрицький 1616 р. — переклад»); the translation «на руський язик» is Middle Ukrainian (ПМ); not 'ru'. Region: outside modern Ukraine
 * (Вільно/Євє, the brotherhood press); school = research/44 «Віленська» (певно). ч. 2 is still wanted (research/45). The OCR directory arrives by sync into data/raw/owner-ocr/kallist1616/ (ingest-owner-text.ts).
 */
import { Q } from '../core/evidence.ts'
import { SOURCES } from '../core/sources.ts'
import type { Unit } from './manifest.ts'
import type { Author } from './authors.ts'

if (!SOURCES['R44']) SOURCES['R44'] = { title: 'research/44-bratstva-bibliography.md (BULP): бібліографія братських шкіл і друкарень, рядок r22', url: 'https://github.com/dmytrozahor/BULP/blob/mvp/research/44-bratstva-bibliography.md' }
const R22 = Q('R44', 'research/44-bratstva-bibliography.md#r22', 'Євє — друк Віленського братства; Смотрицький 1616 р. — переклад (W-МС)', 'рядок r22: 1616; Євє, 1616; Віленське братство')

export const UNITS_OWNER: Unit[] = [
  {
    id: 'kallist1616', title: 'Калліст. Євангеліє учительноє, ч. 1 (Вільно/Євє, друкарня братства, 1616; OCR скану власника)', author: 'vilno_brotherhood_press', kind: 'owner-text', urls: ['https://claude.ai/owner-scan/kallist1616'],
    date: [1616, 1616], dateCite: R22, lang: 'ruthenian', region: 'поза Україною (Вільно)', witnessType: 'ocr',
    school: { id: 'vilno', source: 'research/44 r22', confidence: 'певно' },
    edition: 'Євангеліє учительноє, албо Казання на каждую неделю … Калліста, переклад на руський язик М. Смотрицького. Вільно (Євє): друкарня братства монастиря Віленського, 1616, ч. 1; 360 сторінок-JPG скану власника; OCR Tesseract 5 (ukr+rus+Cyrillic), не вичитано; ч. 2 потрібна',
    license: 'суспільне надбання (друк 1616 р.)',
  },
]

export const AUTHORS_OWNER: Author[] = [
  {
    id: 'vilno_brotherhood_press', name: 'Друкарня Віленського братства (Вільно/Євє), переклад М. Смотрицького', life: 'друк 1616', label: 'institutional', status: 'vetted', confidence: 'implicit', region: 'поза Україною (Вільно)',
    evidence: [R22],
    note: 'інституційний автор: друкарня Віленського Свято-Духівського братства (Євє біля Вільна); Калліст — візантійський автор проповідей, Смотрицький — перекладач «на руський язик» (research/44 r22); не російське джерело',
  },
]
