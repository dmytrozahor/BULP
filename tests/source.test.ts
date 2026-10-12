import { describe, expect, it } from 'vitest'
import { sourceLink, viraLink, wikisourceLink } from '../src/lib/source.ts'

describe('W2-2 precise source anchors per kind', () => {
  it('Wikisource: subpage title from the locator + page-number anchor id', () => {
    const w = { url: 'https://uk.wikisource.org/wiki/Хуторна_поэзія' }
    const l = sourceLink(w, 'Хуторна поэзія/Божий Суд, с. 107')!
    expect(l.url).toBe('https://uk.wikisource.org/wiki/' + encodeURIComponent('Хуторна_поэзія') + '/' + encodeURIComponent('Божий_Суд') + '#107')
    expect(l.exact).toBe(true); expect(l.label).toContain('с. 107')
    expect(wikisourceLink(w.url, 'с. 11')).toEqual({ url: w.url, page: '11' })
    expect(sourceLink(w, 'Хуторна поэзія')!.exact).toBe(false)
  })
  it('Wikisource: anchor can be combined with a text fragment', () => {
    const l = sourceLink({ url: 'https://uk.wikisource.org/wiki/Мойсей_(1905)' }, 'с. 12', { node: 'слово' })!
    expect(l.url).toBe('https://uk.wikisource.org/wiki/Мойсей_(1905)#12:~:text=' + encodeURIComponent('слово'))
  })
  it('віра.укр: chapter page + verse anchor', () => {
    const url = 'https://xn--80ad6b1e.xn--j1amh/b/arch-gospel'
    expect(viraLink(url, 'Ін 1:5')).toBe(url + '/john-cs-ar-1#john-cs-ar-1:5')
    expect(sourceLink({ url }, 'Мт 1:12')!.url).toBe(url + '/matt-cs-ar-1#matt-cs-ar-1:12')
    expect(viraLink(url, 'абз. 3')).toBeUndefined()
  })
  it('izbornyk: text fragment with the exact raw spelling; TOROT: GitHub blob + citation in the label', () => {
    expect(sourceLink({ url: 'http://izbornyk.org.ua/ipatlet/ipat01.htm' }, 'стб. 546', { node: 'лѣт̑' })!.url).toContain('#:~:text=' + encodeURIComponent('лѣт̑'))
    const t = sourceLink({ url: 'https://raw.githubusercontent.com/torottreebank/treebank-releases/master/lav.xml' }, '27.18')!
    expect(t.url).toBe('https://github.com/torottreebank/treebank-releases/blob/master/lav.xml'); expect(t.label).toBe('TOROT, 27.18')
  })
})
