/**
 * SPEC 63 MM-60c (owner: «ну і всі інші перетворення для питань»): the question words by dialect group, the way analysis/dialect-numerals.md does it for the numerals.
 * A cell holds forms ONLY when a source or the owner gives them; an empty cell is «немає даних», never a form built by analogy. Grades: словник (a dictionary / ЕУМ page names the form and its dialect),
 * носій (the owner's words), гіпотеза (found in the corpus by a shipped DV rule; the region is the region of the witnesses, not a dialect). The data is hand-collected from: ЕУМ um160/um162/um171/um173/um175
 * (fetched by curl), data/dv/hypotheses.json (DV-JE-JA-INIT, DV-SHCH), kaikki uk (де «dialectal»), VESUM (arch/bad tags), the owner's messages of 2026-11-04.
 */
export const QW_WORDS = ['який', 'як', 'хто', 'що', 'де / куди', 'котрий', 'коли', 'чому', 'чого', 'навіщо', 'скільки', 'чий', 'поки'] as const
export const QW_GROUPS = ['Закарпаття', 'Галичина', 'Степ / південно-східне наріччя', 'Поділля', 'Буковина і Покуття', 'Бойківщина', 'Гуцульщина', 'Лемківщина', 'Полісся', 'діалектне, групу не названо'] as const
export type QwGrade = 'словник' | 'носій' | 'гіпотеза'
export interface QwCell { forms: string[]; grade: QwGrade; source: string; quote: string }
export const QW_CELLS: Record<string, Partial<Record<(typeof QW_GROUPS)[number], QwCell[]>>> = {
  'який': { 'Галичина': [
    { forms: ['єкий', 'єка', 'єке', 'єкі', 'єкого', 'єкому', 'єким', 'єкою', 'єкої', 'єку', 'єких', 'єкими', 'єкій', 'йкий', 'їкий'], grade: 'носій', source: 'власник, 2026-11-04', quote: 'єкий для галицкого діалекту на який; який теж за галицкою рисою має бути йкий їкий єкий' },
    { forms: ['єкий', 'єкі', 'єких', 'єкого', 'єкому', 'єкою', 'єкої', 'єке', 'єкій'], grade: 'гіпотеза', source: 'data/dv/hypotheses.json, DV-JE-JA-INIT', quote: 'єкий 32 вжив. (19 у пам’ятках Галичини), єкі 57, єкого 33, єке 39 …' }],
    'Буковина і Покуття': [{ forms: [], grade: 'словник', source: 'ЕУМ um175', quote: 'Лише після й перехід [а] в [е], [і] обмежений (йійц, йек, пйес...) східнонадпрутською групою говірок — форма який не названа' }] },
  'хто': { 'Закарпаття': [{ forms: ['тко', 'ко'], grade: 'словник', source: 'ЕУМ um162 «Закарпатський говір»', quote: 'Функціонують питальні займенники тко, ко «хто», што' }] },
  'що': { 'Закарпаття': [{ forms: ['што'], grade: 'словник', source: 'ЕУМ um162 «Закарпатський говір»', quote: 'Функціонують питальні займенники тко, ко «хто», што' }],
    'Галичина': [{ forms: ['шчо'], grade: 'гіпотеза', source: 'data/dv/hypotheses.json, DV-SHCH', quote: 'шчо 10 516 вжив. (6 596 у пам’ятках Галичини)' }] },
  'де / куди': { 'Степ / південно-східне наріччя': [
    { forms: ['де (замість куди)'], grade: 'словник', source: 'ЕУМ um171 «Степовий говір»', quote: 'широке використання прислівника де у ролі обставини місця дії замість куди (де йдеш?)' },
    { forms: ['де (замість куди, який, що)'], grade: 'словник', source: 'ЕУМ um160 «Південно-східне наріччя»', quote: 'багатозначність спол. де, що вживається зам. куди, який, що' }],
    'діалектне, групу не названо': [{ forms: ['де (= куди)'], grade: 'словник', source: 'en.wiktionary / kaikki uk, стаття «де»', quote: 'де: dialectal, interrogative: where, whither (to what place?)' }] },
  'скільки': { 'Галичина': [{ forms: ['кілько'], grade: 'носій', source: 'власник, 2026-11-04', quote: '1. tak, 2. ну галицкого жеж 3. так, і є ще заки (кілько = скільки, Галичина)' }],
    'діалектне, групу не названо': [{ forms: ['скілько'], grade: 'словник', source: 'Желехівський (1886), r2u', quote: 'Скі́льки, скі́лько, adv. wie viel? so viel; о скі́лько in wiefern, insofern.' }] },
  'як': { 'Галичина': [{ forms: ['єк', 'йк', 'їк'], grade: 'носій', source: 'власник, 2026-11-04', quote: '1. tak, 2. ну галицкого жеж 3. так, і є ще заки (єк, йк, їк = як)' }],
    'діалектне, групу не названо': [{ forms: ['єк'], grade: 'словник', source: 'ВЕСУМ (мітка arch, не діалектна)', quote: 'єк adv:pron:int:rel:arch; єк conj:subord:arch' }] },
  'поки': { 'Галичина': [{ forms: ['заки'], grade: 'носій', source: 'власник, 2026-11-04', quote: '1. tak, 2. ну галицкого жеж 3. так, і є ще заки' }],
    'діалектне, групу не названо': [{ forms: ['заки', 'закиль', 'заким', 'закинь'], grade: 'словник', source: 'Желехівський (1886), r2u; en.wiktionary «заки» (dialectal)', quote: 'За́ки, за́киль, за́ким, за́кинь, conj. während (kurzer Zeit), bis; bevor, ehe. · so long as, while; until, before' }] },
  'котрий': { 'діалектне, групу не названо': [{ forms: ['котрой'], grade: 'словник', source: 'Желехівський (1886), r2u', quote: 'Котри́й, котро́й, Д. гр. 53. pron. welcher; / 2) irgendwer, s. Деко́трий' }] },
}
/** forms the task named that NO source gives: the owner is asked to confirm them (not added anywhere) */
export const QW_TO_CONFIRM = ['ПІДТВЕРДЖЕНО власником 2026-11-04 (kind P, Галичина): єк, йк, їк (як), кілько (скільки), заки (поки); іншого не вгадано', 'власник каже, що галицькі форми є для котрий, коли, чому, чого, навіщо, чий, але форм не назвав: у джерелах репозиторію знайдено лише котрой, скілько, за́киль, за́ким, за́кинь (Желехівський, 1886, частина словника, що є локально)', 'Онишкевич, Сабадош, «Буковина», «Гуцульські», Верхратський (лемківські слова), Закревський — на воркері, не прочитані: потрібен прохід воркера по цих шести словах', 'форми скількох / кількох / кільком / кількома як "форми кілько": лише за словами власника «also its forms», у джерелах немає'] as const
export const qwCoverage = (): Record<string, number> => { const o: Record<string, number> = {}; for (const g of QW_GROUPS) o[g] = QW_WORDS.filter(w => (QW_CELLS[w]?.[g] ?? []).some(c => c.forms.length)).length; return o }
