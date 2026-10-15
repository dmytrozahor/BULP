/**
 * SPEC 63 HV-2: the sources the harvesters do NOT touch, with the reason (robots/ToS/technical) — written to data/raw/harvest/DECISIONS-NEEDED.md (idempotent).
 * Run by launch.ps1 before the harvesters start. Facts checked 2026-10-15.
 */
import { decisionNeeded } from './lib.ts'

export const SKIPPED: string[] = [
  '- SKIPPED pisni.org.ua (Українські пісні; the lyrics of Тарас Компаніченко / Хорея Козацька are there, e.g. /songs/4595436.html, /songs/9540484.html): robots.txt `User-Agent: *  Disallow: /` (checked 2026-10-15). The owner allowed reuse of Kompanichenko\'s song texts ("і всі пісні Компаніченка тексти можеш брати, він дозволяє перевикористання"), but that is not a decision to override this robots.txt. NEEDS DECISION: scrape pisni.org.ua despite robots (3 s pacing, only the Kompanichenko/Сковорода pages)? Meanwhile the PD originals (Сковорода «Сад божественних пісень», думи, козацькі пісні) arrive via the uk.wikisource harvester.',
  '- SKIPPED modern authored song lyrics (Занедбай мене (я о тя не дбаю), Хейт-спіч, Структура щастя …): no lyrics site with permissive robots AND ToS was found (genius.com, tekstowo, pisni.org.ua forbid or reserve rights). Policy stays vocabulary-only (counts, no running text). NEEDS DECISION: name a lyrics site to scrape vocabulary from, or supply the lists.',
  '- SKIPPED Reddit (r/ukraine, r/Ukraine_UA): owner allowed it, but robots.txt is `Disallow: /` and unauthenticated www/old.reddit.com .json answers with an HTML block page (checked 2026-10-15); only the official OAuth API works. NEEDS: OAuth app credentials from the owner (script app, read-only), then a 2 s harvester is a small change.',
  '- NOT YET (technical): YouTube subtitles (owner allowed) — needs yt-dlp installed on this machine (not present); DOU.ua forum/comments (owner allowed; robots allows articles) and Мислово (owner allowed; robots Crawl-delay 90 s; the site is a JS shell, API endpoint not located) belong to SPEC 63 MD (modern vocabulary), not to the HV-2 list; add scripts when the owner wants them in the background set.',
  '- NOT IN HV-2 SCOPE here: 100krokiv (one page, already ingested as the Plast vocabulary), parafia.org.ua, Залеський via Wayback (single-document fetches, done by agents with the owner\'s permission).',
  '- NOTE South/East dialect dictionaries "where open": no dictionary site with an open licence beyond the ones already in the manifest was identified; archive.org PD items (archive-kuban, archive-novhorod-siversk, archive-rusyn presets) and r2u (Грінченко, Желехівський …) cover them for now.',
  '- NOTE gramoty.ru birchbark letters: no robots.txt, no prohibition found; transcriptions are © НИУ ВШЭ / ИСл РАН, so they are stored for VOCABULARY ONLY and tagged comparative East Slavic (not Ukrainian, not counted in N).',
  '- NOTE ukrlib.com.ua (poets harvester): robots.txt lists only sitemaps; no ToS link on the site; the poems are copyrighted, so only form counts + ≤ 2-line quotes are stored. Owner may veto.',
]
for (const l of SKIPPED) decisionNeeded(l)
console.log(`DECISIONS-NEEDED.md: ${SKIPPED.length} entries ensured`)
