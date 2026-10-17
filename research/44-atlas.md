# 44 — Атлас української мови (АУМ): use notes (SPEC 63 AT)

- Source: owner's own scan of **АУМ т. 2** (Волинь, Наддністрянщина, Закарпаття і суміжні землі), К., 1988; OCR of 517 PDF pages made 2026-10-16 (not in the repo). **АУМ т. 1 is not scanned/OCR'd yet.**
- Layout of the PDF: pp. 3–4 table of contents (OCR scrambled), 7–8 introduction, 9–103 «Коментарі» (maps 1–387 and 55-а), 104–517 map images (OCR = place-name noise only), then the word list and the settlement list (column layout, OCR not row-aligned).
- Use (atlas ©): extracted features, settlement-number sets per printed form and one short question quote (≤ 2 lines) per map are stored in `data/atlas/aum2-maps.json`; no map image and no wholesale commentary text is republished.
- Quality: the transcription of forms in the commentary is OCR-damaged (stress marks become letters, ' becomes ї/і/!). Every record carries `quality: 'ocr-heuristic'`. Map titles are not taken from the TOC (scrambled); `quote` is commentary item 1 (the questionnaire question).
- Not resolvable from the OCR: settlement number → name/oblast (table split into columns). Hence areal extent is stored as point-number sets; mapping to dialect groups needs the settlement table (re-OCR of the table pages or reading it from the page images).
