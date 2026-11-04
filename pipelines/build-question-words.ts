/** MM-60c: writes analysis/dialect-question-words.md from core/question-words.ts. usage: node pipelines/build-question-words.ts [out.md] */
import { resolve } from 'node:path'
import { writeJsonAtomic } from './robust.ts'
import { QW_CELLS, QW_GROUPS, QW_TO_CONFIRM, QW_WORDS, qwCoverage } from '../core/question-words.ts'

export function questionWordsMd(): string {
  const cov = qwCoverage(), cells = QW_WORDS.flatMap(w => QW_GROUPS.flatMap(g => QW_CELLS[w]?.[g] ?? []))
  const by = (gr: string) => cells.filter(c => c.grade === gr).length
  let md = '# Питальні слова за говорами (SPEC 63 MM-60c)\n\nКлітинка = питальне слово × група говорів. Порожня клітинка — **«немає даних»**, а не стандартна форма й не форма, добудована за аналогією. Ступінь: словник (ЕУМ / словник називає форму і говір), носій (за свідченням власника), гіпотеза (форму впізнано правилом DV і засвідчено в корпусі; регіон — це регіон пам’яток, не говір).\n\n'
  md += `Покриття: ${QW_WORDS.length} слів × ${QW_GROUPS.length} груп; клітинок із формами: ${Object.values(cov).reduce((a, b) => a + b, 0)}; за ступенем: словник ${by('словник')}, носій ${by('носій')}, гіпотеза ${by('гіпотеза')}.\n\n`
  md += `За групами: ${QW_GROUPS.map(g => `${g} ${cov[g]}`).join('; ')}.\n\n| слово | ${QW_GROUPS.join(' | ')} |\n|---|${QW_GROUPS.map(() => '---').join('|')}|\n`
  for (const w of QW_WORDS) md += `| ${w} | ${QW_GROUPS.map(g => { const cs = QW_CELLS[w]?.[g]; return cs?.length ? cs.map(c => `${c.forms.length ? c.forms.join(', ') : '—'} (${c.grade}: ${c.source})`).join('; ') : 'немає даних' }).join(' | ')} |\n`
  md += '\n## Цитати\n\n'
  for (const w of QW_WORDS) for (const g of QW_GROUPS) for (const c of QW_CELLS[w]?.[g] ?? []) md += `- **${w}**, ${g} — ${c.grade}, ${c.source}: «${c.quote}»\n`
  md += '\n## Для підтвердження власником\n\n' + QW_TO_CONFIRM.map(x => `- ${x}`).join('\n') + '\n'
  return md
}
if (process.argv[1] && /build-question-words/.test(process.argv[1])) writeJsonAtomic(resolve(process.argv[2] ?? 'analysis/dialect-question-words.md'), questionWordsMd())
