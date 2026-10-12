/** `npm run data:texts` — regenerate public/data/texts/ from data/work (admitted witnesses only) without the full build. */
import { resolve } from 'node:path'
import { loadWitnesses } from './build.ts'
import { admit } from './build-annotate.ts'
import { authorById } from './authors.ts'
import { writeTexts } from './build-texts.ts'

const adm = loadWitnesses().filter(l => admit(l.w, authorById[l.w.author]).ok).map(l => l.w)
const b = writeTexts(adm, resolve('public/data'))
console.log(`texts: ${adm.length} witnesses, ${(b / 1048576).toFixed(1)} MB → public/data/texts`)
