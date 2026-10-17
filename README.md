# BULP · ukr-lexicon

Provenance lexicon of Ukrainian word forms: which forms are attested how early, where, and in which epoch.
Everything shown is evidence-based (source, verbatim quote, locator) or marked unknown; see `specs/00-principles.md`.

Live site: https://dmytrozahor.github.io/BULP/ (deployed by `.github/workflows/pages.yml` on every push to `mvp`).

## Run locally
```sh
npm ci
npm run data:pull   # detail shards public/data/lex from the orphan branch ukr-lexicon-data (SPEC 20 B-5e)
npm run dev
npm test
```

## Rebuild the data
The corpus inputs (`data/raw`, `data/work`) are not committed; `npm run mine` ingests `data/raw` into `data/work` (SPEC 10). Then:
```sh
UV_BIN=<path to uv> npm run build:data   # nlp/ runs via uv; add -- --no-py to reuse existing NLP outputs
npm run data:publish                     # replace ukr-lexicon-data with one squashed commit of the new shards
```

Layout: `research/` (sources) → `specs/` (requirements) → `core/` (pure rules, evidence) → `pipelines/` (mining, build) → `src/` (Vue 3 app) → `tests/`.
Data licences: VESUM, Brown-UK CC BY-NC-SA 4.0; TOROT CC BY-NC-SA 3.0; LanguageTool LGPL — derived data under the same terms.

## Build your own platform on BULP

English · [Українська](#як-створити-власну-платформу-на-базі-bulp)

BULP is a template for any provenance lexicon: every word form, rule and label carries a source, a verbatim quote and a locator, or is marked unknown. You can fork it and point it at another language, another corpus, or a narrower slice of Ukrainian.

1. **Fork and run.** Fork `dmytrozahor/BULP`, branch `mvp`. `npm ci`, `npm run data:pull` (detail shards from the orphan branch `ukr-lexicon-data`), `npm run dev`, `npm test`.
2. **What is language-specific and what is generic.**
   - Generic (keep): the evidence model (`core/evidence.ts`: claims with source, quote, locator), the epoch machinery (`core/epochs.ts`), derivation and detector engines, the build (`pipelines/build.ts`, `pipelines/build-parts.ts`), sharding (`core/shard.ts`, `core/parts.ts`), the Vue app in `src/`, the harvest plumbing (`harvest/lib.ts`), and the test and coverage discipline.
   - Language-specific (replace): the rule tables with citations (`core/rules.ts`, `core/palatalization.ts`, `core/yat.ts`, `core/morph-history.ts` and friends), the bibliographic registry `core/sources.ts`, the epoch list in `core/epochs.ts` (two schemes: `shev.*` after Shevelov, `wl.*` literary-language periods), dictionaries and the VESUM-like morphology loaded by `pipelines/vesum.ts` (swap in a morphological dictionary of your language), the source manifest `pipelines/manifest.ts`, and the specs in `specs/`.
3. **No cite, no rule.** A rule without a published source has weight 0 and is shown only as a review hint (`specs/00-principles.md`, P-1.3); every label carries the rule's citation and the attestation that triggered it (P-1.4); rules are data tables and the engines stay small and generic (P-4.2). Add a rule only with a citation; add a source to `core/sources.ts` first.
4. **Add your own sources.** Two routes.
   - Harvest route: write a script in `harvest/` on top of `harvest/lib.ts`. One source is one directory `data/raw/harvest/<source>/` with `items/<file>.gz` and `index.jsonl`, one line per item: `{id, url, date, licence, bytes, status, title, author?, region?, file?}`. The date is the one the source states (`"1893"`, `"1380-1400"`, or `null`); undated works are never ingested as witnesses, because an invented date would corrupt first attestations. Scripts are resumable, polite, and stop on 403/429/5xx. Register the job in `harvest/launch.ps1` / `harvest/launch.sh`; `npm run harvest:launch` starts them (Windows), `bash harvest/launch.sh` on Linux; `npm run harvest:status` (Windows) or `bash harvest/status.sh` shows progress. Then `npm run harvest:ingest [-- --only <source>]` (see `pipelines/ingest-harvest.ts`).
   - Manifest route: add a unit to `pipelines/manifest.ts` with an ingester kind from `pipelines/ingest.ts`; `npm run mine` writes `data/work/`.
5. **Licence rule.** Public-domain text (by date) may become a full-text witness. Share-alike (CC BY-SA, CC BY-NC-SA) or copyrighted text is **vocabulary only**: word forms, counts and at most a short quote, written to `harvest-vocab/<source>.json`, never running text. Licences are shown in the UI (SPEC 00 P-4.4).
6. **Build.** `UV_BIN=<path to uv> npm run build:data` (add `-- --no-py` to reuse existing stress and Russian-contrast outputs). At 10 M+ corpus words the build is heavy: our full build peaked around 28 GB RAM and took about 45 minutes on a 32 vCPU Linux machine (owner-reported figures, not asserted by the repo). `npm run budget` measures transfer budgets of `dist/`.
7. **Publish.** `npm run data:publish` adds a fast-forward commit with the shards to the orphan branch `ukr-lexicon-data` (never force-pushed); `npm run data:pull` restores them. `.github/workflows/pages.yml` pulls the data, runs `npx vitest run`, builds, and deploys to GitHub Pages on every push to `mvp`; enable Pages (source: GitHub Actions) in your fork.
8. **Tests and budgets.** `npm test` runs everything; `tests/coverage.test.ts` requires every spec id to have a row in `specs/COVERAGE.md`; `tests/budget.test.ts` asserts the transfer budgets.

### Propose a book through an issue

Anyone can open an issue with the form **Book proposal** (`.github/ISSUE_TEMPLATE/book.yml`): title, author, year (as stated by the source, never guessed), epoch, language or variety, region, school, genre, tags, a link to the text or scan, licence and why it matters. The form adds the labels `book` and `proposal`. To propose several books at once use the form **Book list** (`.github/ISSUE_TEMPLATE/book-list.yml`, label `list` too): optional shared defaults (epoch, language, region, school, licence), then one book per line, cells separated by `|`, header `title | author | year or range | url | epoch | language | region | school | genre | licence | tags`. Empty cells inherit the defaults; title, year and url are required in every row; a pasted CSV with the same columns also works. For anything that is not a book (a feature, a word-card correction with a link to the card, a source or dictionary, a rule or linguistic claim with a citation, a spec addition) use the form **Proposal** (`.github/ISSUE_TEMPLATE/proposal.yml`); drag screenshots into the description. Built (SPEC 63 BQ-2 to BQ-4; labels come from `.github/labels.json` via `.github/workflows/labels.yml`, logic in `core/bq.ts`, glue in `pipelines/bq.ts`, workflows `bq-triage.yml` and `bq-decide.yml`, GITHUB_TOKEN only; in a fork enable read and write workflow permissions): every 3 days the new issues are triaged (fields, link, licence, duplicates) and labelled `needs-approval`; only after the owner adds `approved` are they harvested and ingested, with the issue's metadata stored as sourced fields citing the issue URL; approved items are appended to the tracked queue `harvest/queue.jsonl`; `rejected` needs an owner comment with the reason, then the issue is closed with it. Create these labels in your fork: `book`, `proposal`, `needs-approval`, `approved`, `rejected`.

## Specs and working with Claude

English · [Українська](#специфікації-та-робота-з-claude)

All specs (`specs/*.md`) are open to additions by anyone: propose a new item in an issue or a pull request. An item id is a prefix plus a number, for example **MM-3** or **BQ-1**, written in bold in the spec. Every id needs a row in `specs/COVERAGE.md`: either a test reference (`tests/x.test.ts › test name`) or `manual — <reason>`, and `manual — pending` is fine for planned work. `tests/coverage.test.ts` enforces this.

Restoring the project state in Claude Code (or any coding agent) is easy because the state lives in the repository, not in a chat:
- `specs/` says what to build; `specs/COVERAGE.md` says what is done or pending per item;
- `specs/mismatches.md` is the ledger of owner-reported problems with diagnosis and commit sha;
- `research/` holds the cited sources and decisions; `analysis/` holds analyses;
- `git log`: commit messages carry the SPEC ids.

Recipe: clone, read `specs/`, `specs/COVERAGE.md` and the last ~20 commits (`git log --oneline -20`), then ask the agent to continue a given item. Example prompt:
```
Прочитай specs/ і specs/COVERAGE.md та останні 20 комітів. Продовж SPEC 63 BQ-2:
напиши скрипт триажу issue з міткою book. Дотримуйся принципу «немає джерела — немає твердження».
```

---

## Як створити власну платформу на базі BULP

[English](#build-your-own-platform-on-bulp) · Українська

BULP — шаблон для будь-якого лексикона з походженням даних: кожна словоформа, правило й мітка має джерело, дослівну цитату й локатор, або позначена як невідома. Ви можете зробити форк і спрямувати його на іншу мову, інший корпус чи вужчий зріз української.

1. **Форк і запуск.** Форкніть `dmytrozahor/BULP`, гілка `mvp`. `npm ci`, `npm run data:pull` (шарди з орфанної гілки `ukr-lexicon-data`), `npm run dev`, `npm test`.
2. **Що мовно-специфічне, а що універсальне.**
   - Універсальне (лишайте): модель доказів (`core/evidence.ts`: твердження з джерелом, цитатою, локатором), механізм епох (`core/epochs.ts`), рушії виведення й детекторів, збірка (`pipelines/build.ts`, `pipelines/build-parts.ts`), шардування (`core/shard.ts`, `core/parts.ts`), застосунок Vue в `src/`, каркас збирачів (`harvest/lib.ts`), дисципліна тестів і покриття.
   - Мовно-специфічне (замінюйте): таблиці правил із цитатами (`core/rules.ts`, `core/palatalization.ts`, `core/yat.ts`, `core/morph-history.ts` тощо), бібліографічний реєстр `core/sources.ts`, список епох у `core/epochs.ts` (дві схеми: `shev.*` за Шевельовим, `wl.*` періоди літературної мови), словники й морфологія типу ВЕСУМ, яку завантажує `pipelines/vesum.ts` (підставте морфологічний словник своєї мови), маніфест джерел `pipelines/manifest.ts` та специфікації в `specs/`.
3. **Немає джерела — немає правила.** Правило без опублікованого джерела має вагу 0 і показується лише як підказка для перевірки (`specs/00-principles.md`, P-1.3); кожна мітка несе цитату правила та засвідчення, що її спричинило (P-1.4); правила — це таблиці даних, а рушії лишаються малими й універсальними (P-4.2). Додавайте правило лише з цитатою; спершу додайте джерело в `core/sources.ts`.
4. **Власні джерела.** Два шляхи.
   - Через збирач: напишіть скрипт у `harvest/` на основі `harvest/lib.ts`. Одне джерело — один каталог `data/raw/harvest/<source>/` з `items/<file>.gz` та `index.jsonl`, по рядку на елемент: `{id, url, date, licence, bytes, status, title, author?, region?, file?}`. Дата — та, яку називає джерело (`"1893"`, `"1380-1400"` або `null`); твори без дати не потрапляють у свідки, бо вигадана дата зіпсує перші засвідчення. Скрипти відновлювані, ввічливі й зупиняються на 403/429/5xx. Додайте завдання в `harvest/launch.ps1` / `harvest/launch.sh`; `npm run harvest:launch` запускає їх (Windows), `bash harvest/launch.sh` на Linux; `npm run harvest:status` (Windows) або `bash harvest/status.sh` показує перебіг. Потім `npm run harvest:ingest [-- --only <source>]` (див. `pipelines/ingest-harvest.ts`).
   - Через маніфест: додайте одиницю в `pipelines/manifest.ts` із видом імпортера з `pipelines/ingest.ts`; `npm run mine` пише `data/work/`.
5. **Правило ліцензій.** Текст у суспільному надбанні (за датою) може стати повним свідком. Share-alike (CC BY-SA, CC BY-NC-SA) або текст під авторським правом — **лише словник**: словоформи, лічильники й щонайбільше коротка цитата у `harvest-vocab/<source>.json`, ніколи суцільний текст. Ліцензії показуються в інтерфейсі (SPEC 00 P-4.4).
6. **Збірка.** `UV_BIN=<шлях до uv> npm run build:data` (додайте `-- --no-py`, щоб використати наявні результати наголосів і російського контрасту). На корпусі від 10 млн слів збірка важка: наша повна збірка сягала близько 28 ГБ ОЗП і тривала близько 45 хвилин на Linux із 32 vCPU (цифри від власника, репозиторій їх не підтверджує). `npm run budget` міряє бюджети передавання для `dist/`.
7. **Публікація.** `npm run data:publish` додає fast-forward коміт із шардами в орфанну гілку `ukr-lexicon-data` (без force-push); `npm run data:pull` відновлює їх. `.github/workflows/pages.yml` тягне дані, запускає `npx vitest run`, збирає й розгортає на GitHub Pages при кожному пуші в `mvp`; увімкніть Pages (джерело: GitHub Actions) у своєму форку.
8. **Тести й бюджети.** `npm test` запускає все; `tests/coverage.test.ts` вимагає, щоб кожен id специфікації мав рядок у `specs/COVERAGE.md`; `tests/budget.test.ts` перевіряє бюджети передавання.

### Запропонувати книжку через issue

Будь-хто може створити issue за формою **Book proposal** (`.github/ISSUE_TEMPLATE/book.yml`): назва, автор, рік (як у джерелі, не вгадувати), епоха, мова чи різновид, регіон, школа, жанр, мітки, посилання на текст чи скан, ліцензія й чому це важливо. Форма додає мітки `book` і `proposal`. Щоб запропонувати кілька книжок одразу, використайте форму **Book list** (`.github/ISSUE_TEMPLATE/book-list.yml`, додається ще мітка `list`): необов'язкові спільні значення (епоха, мова, регіон, школа, ліцензія), далі одна книжка в рядку, клітинки розділені `|`, заголовок `title | author | year or range | url | epoch | language | region | school | genre | licence | tags`. Порожні клітинки беруть спільні значення; title, рік і url обов'язкові в кожному рядку; вставлений CSV з тими самими колонками теж працює. Для всього, що не є книжкою (функція, виправлення картки слова з посиланням на картку, джерело чи словник, правило або лінгвістичне твердження з цитатою, доповнення специфікації), використайте форму **Proposal** (`.github/ISSUE_TEMPLATE/proposal.yml`); скриншоти перетягуйте в опис. Заплановано (SPEC 63 BQ-2…BQ-4, ще не зроблено): раз на ~3 дні нові issue перевіряються (поля, посилання, ліцензія, дублі) й отримують `needs-approval`; лише після того, як власник додасть `approved`, їх збирають і вносять, а метадані з issue зберігаються як поля з джерелом — посиланням на issue; непридатні отримують `rejected` з причиною. Створіть у своєму форку мітки: `book`, `proposal`, `needs-approval`, `approved`, `rejected`.

## Специфікації та робота з Claude

[English](#specs-and-working-with-claude) · Українська

Усі специфікації (`specs/*.md`) відкриті для доповнень: пропонуйте нові пункти через issue або pull request. Id пункту — префікс і число, наприклад **MM-3** або **BQ-1**, жирним у специфікації. Кожен id потребує рядка в `specs/COVERAGE.md`: або посилання на тест (`tests/x.test.ts › назва тесту`), або `manual — <причина>`; для запланованого годиться `manual — pending`. Це перевіряє `tests/coverage.test.ts`.

Відновити стан проєкту в Claude Code (або в будь-якому кодувальному агенті) легко, бо стан живе в репозиторії, а не в чаті:
- `specs/` — що будувати; `specs/COVERAGE.md` — що зроблено чи відкладено по кожному пункту;
- `specs/mismatches.md` — журнал проблем, про які повідомив власник, з діагнозом і sha коміту;
- `research/` — джерела з цитатами й рішення; `analysis/` — аналізи;
- `git log`: повідомлення комітів несуть id специфікацій.

Рецепт: клонувати, прочитати `specs/`, `specs/COVERAGE.md` і останні ~20 комітів (`git log --oneline -20`), потім попросити агента продовжити певний пункт. Приклад запиту:
```
Прочитай specs/ і specs/COVERAGE.md та останні 20 комітів. Продовж SPEC 63 BQ-2:
напиши скрипт триажу issue з міткою book. Дотримуйся принципу «немає джерела — немає твердження».
```

<img width="1265" height="689" alt="image" src="https://github.com/user-attachments/assets/46981b00-060f-4557-aace-0a7f208f4a73" />
<img width="376" height="695" alt="image" src="https://github.com/user-attachments/assets/0a6f7942-1c15-4590-b6c7-c1a24d61fa6b" />

