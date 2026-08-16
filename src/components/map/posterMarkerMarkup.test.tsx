import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PosterGrid } from './PosterGrid'
import type { PosterSlot } from '@/lib/map/posterLogic'

/**
 * 지도 포스터는 renderToStaticMarkup으로 HTML 문자열이 되어 Leaflet divIcon에 들어간다.
 * 정적 마크업엔 onLoad/ref가 붙지 않으므로, PosterThumb의 로드 페이드를 켜면
 * `opacity: 0`이 그대로 굳어 포스터가 통째로 빈칸이 된다(2026-08-16 회귀).
 */
function markup(posterUrl?: string) {
  const slots = [{
    movie: {
      id: 'm1', title: '테스트', posterUrl,
      genre: [], director: ['감독'], nation: '한국',
    },
  }] as unknown as PosterSlot[]
  return renderToStaticMarkup(<PosterGrid slots={slots} posterW={44} posterH={66} />)
}

describe('지도 포스터 divIcon 마크업', () => {
  it('투명하게 굳지 않는다 — 페이드 없이 바로 보인다', () => {
    const img = markup('https://file.koreafilm.or.kr/a.jpg').match(/<img[^>]*>/)?.[0] ?? ''
    expect(img).toBeTruthy()
    expect(img).not.toMatch(/opacity:\s*0[;"]/)
    expect(img).toMatch(/opacity:\s*1/)
  })

  it('http 포스터는 https로 나간다 — https 페이지에서 mixed content 차단 방지', () => {
    const img = markup('http://file.koreafilm.or.kr/a.jpg').match(/<img[^>]*>/)?.[0] ?? ''
    expect(img).toContain('src="https://file.koreafilm.or.kr/a.jpg"')
  })
})
