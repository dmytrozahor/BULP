import { describe, expect, it } from 'vitest'
import { contentCore, mine, type Phraseme, type PhraseDoc } from '../core/phrasemes.ts'

const names: Record<number, string> = { 1: 'і', 2: 'син', 3: 'вся', 4: 'земля', 5: 'на', 6: 'дочка', 7: 'бог' }
const doc = (wid: string, keys: number[]): PhraseDoc => ({ wid, date: [1100, 1200], old: true, keys, seg: keys.map(() => 0) })

describe('BL-12c content-word phrases', () => {
  it('contentCore trims leading and trailing function words and counts content words', () => {
    expect(contentCore(['і', 'син', 'і'])).toMatchObject({ lemmas: ['син'], trimmed: true, nContent: 1 })
    expect(contentCore(['син', 'і', 'дочка'])).toMatchObject({ trimmed: false, nContent: 2 })
    expect(contentCore(['по', '~всеи', '~земли'])).toMatchObject({ lemmas: ['~всеи', '~земли'], trimmed: true })
  })
  const docs = [doc('a', [7, 1, 2, 1, 7]), doc('b_1', [3, 4, 7]), doc('c', [7, 1, 2, 1, 7]), doc('d', [5, 3, 4]), doc('e', [7, 1, 2, 1, 7]), doc('f', [3, 4]), doc('g', [3, 4, 6, 1, 2, 5, 3, 4, 7, 7, 7]), doc('h', [2, 1, 6, 5, 7]), doc('i', [2, 1, 6, 2, 1, 6])]
  const frames: Phraseme[] = [], out = mine(docs, k => names[k]!, (wi, ti) => names[docs[wi]!.keys[ti]!]!, { frames, minF: 3 })
  const top = out.map(p => p.lemmas.join(' '))
  it('«і син і» is not in the top list (it is kept only in the frames debug list); «вся земля» content core is kept', () => {
    expect(top).not.toContain('і син і'); expect(top).toContain('вся земля')
    expect(top.every(l => contentCore(l.split(' ')).nContent >= 2 && !contentCore(l.split(' ')).trimmed)).toBe(true)
    expect(frames.map(p => p.lemmas.join(' '))).toContain('і син і')
  })
})