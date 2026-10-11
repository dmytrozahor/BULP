/**
 * Bibliographic registry. Every `Evidence.source` resolves here (or to a witness id in the corpus manifest).
 * > "Licences are respected and displayed" — SPEC 00, P-4.4
 */
export interface Source { title: string; url?: string; license?: string; year?: string }

export const SOURCES: Record<string, Source> = {
  SHEV:   { title: 'Шевельов Ю. Історична фонологія української мови. Харків: Акта, 2002 (пер. A Historical Phonology of the Ukrainian Language, 1979)', url: 'http://izbornyk.org.ua/shevelov/shev.htm', year: '1979/2002' },
  ENC:    { title: 'Українська мова. Енциклопедія. Київ, 2000', url: 'http://litopys.org.ua/ukrmova/um.htm', year: '2000' },
  PRAV:   { title: 'Український правопис (2019), постанова КМУ № 437', url: 'https://slovnyk.ua/pravopys.php', year: '2019' },
  VESUM:  { title: 'ВЕСУМ / dict_uk v6.8.6 (brown-uk)', url: 'https://github.com/brown-uk/dict_uk', license: 'CC BY-NC-SA 4.0', year: '2026' },
  LT:     { title: 'LanguageTool, Ukrainian rules (replace.txt, grammar-barbarism.xml)', url: 'https://github.com/languagetool-org/languagetool', license: 'LGPL-2.1+' },
  TOROT:  { title: 'TOROT treebank (Eckhoff, Berdičevskis et al.), release 20200116', url: 'https://github.com/torottreebank/treebank-releases', license: 'CC BY-NC-SA 3.0' },
  IZB:    { title: 'Ізборник — Історія України IX–XVIII ст. Першоджерела та інтерпретації', url: 'http://izbornyk.org.ua/' },
  VIRA:   { title: 'Віра.Укр — Архангельське Євангеліє 1092 (онлайн-видання)', url: 'https://віра.укр/b/arch-gospel' },
  WS:     { title: 'Українські Вікіджерела', url: 'https://uk.wikisource.org', license: 'PD / CC BY-SA 4.0' },
  WIKT:   { title: 'Вікісловник (uk.wiktionary)', url: 'https://uk.wiktionary.org', license: 'CC BY-SA 4.0' },
  SUM20:  { title: 'Словник української мови у 20 т. Т. 1. Київ, 2010', url: 'https://archive.org/details/SUM-20', year: '2010' },
  WUK:    { title: 'Українська Вікіпедія (статті про говори; тексти збігаються з енц. «Українська мова», 2000)', url: 'https://uk.wikipedia.org', license: 'CC BY-SA 4.0' },
  DWDS:   { title: 'DWDS — Digitales Wörterbuch der deutschen Sprache (Hilfe: Wortprofil, Verlaufskurve, Worthäufigkeit)', url: 'https://www.dwds.de' },
  RYCHLY: { title: 'Rychlý P. A Lexicographer-Friendly Association Score. RASLAN 2008', url: 'https://www.fi.muni.cz/usr/sojka/download/raslan2008/13.pdf', year: '2008' },
  UCREL:  { title: 'UCREL Log-likelihood and effect size calculator (Rayson)', url: 'https://ucrel.lancs.ac.uk/llwizard.html' },
  GRIES:  { title: 'Gries S. Th. Dispersions and adjusted frequencies in corpora. IJCL 13(4), 2008', url: 'https://stgries.info/research/2008_STG_Dispersion_IJCL.pdf', year: '2008' },
  WLIST:  { title: 'Wikipedia: Word list — frequency class (Leipzig convention)', url: 'https://en.wikipedia.org/wiki/Word_list' },
  UPRS:   { title: 'УПРС — стандарт русинського письма Общества про русинськый розвуй (ОРР), Львів, липень 2025 (правозахисна/адвокаційна організація, не офіційна кодифікація)', url: 'https://rusynsociety.com/rue/sre-standard/', year: '2025' },
  RUEWIKI: { title: 'Русиньска Вікіпедія (rue.wikipedia.org)', url: 'https://rue.wikipedia.org', license: 'CC BY-SA 4.0' },
  LONKIN: { title: 'Лонкін С. А. Литературный письменный язык «Подкарпатской Руси» в XXI веке. Ломоносов-2025', url: 'https://lomonosov.msu.ru/archive/Lomonosov_2025/data/36581/uid1045715_bbe4cbfb94b89ee751434150fd7e625005f844e5.docx', year: '2025' },
  ISO:    { title: 'SIL ISO 639-3: rue (Rusyn), rsk (Ruthenian/Pannonian)', url: 'https://iso639-3.sil.org/code/rue' },
  BILANIUK: { title: 'Bilaniuk L. Contested Tongues. Cornell UP, 2005 (quoted via en.wikipedia «Surzhyk»)', year: '2005' },
  MASENKO:  { title: 'Масенко Л. Суржик: між мовою і язиком. К., 2011 (quoted via Дивослово 2016 review)', year: '2011' },
}
