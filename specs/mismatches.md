# Owner mismatch screenshots (word cards that disagree with the sources)

| file | diagnosis | fix id | status |
|---|---|---|---|
| прийменник розпізнано як займенник.png | On the card /w/себе the spelling «с» (1110–1118, PVL/TOROT) was attached to the pronoun себе. 38 PVL tokens «с» are tagged TOROT Pk (lemma себе), but «с» there is the preposition с = з (337 further «с» are tagged R- съ). The POS gate cannot help when the source tag itself is the pronoun, so the linker (pipelines/build-link.ts linkOptions) now routes any one-letter preposition token (с, в, к, у, о, з) only to its preposition lemma (с → з) and never to a pronoun, noun, adjective or numeral. «сѧ / ся» stay under себе (TOROT lemmatises the reflexive enclitic so; the pronoun grid already marks them as enclitic forms, core/cells.ts isEnclitic). | MM-1 | fixed in the commit that adds this row; takes effect in data with the next build:data |
