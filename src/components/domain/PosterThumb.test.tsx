import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PosterThumb } from './PosterThumb'

describe('포스터가 없는 PosterThumb', () => {
  it('제목은 로고 영역과 무관하게 카드 전체 높이의 중앙에 둔다', () => {
    const html = renderToStaticMarkup(
      <PosterThumb width={120} height={180} alt="테스트 영화" />,
    )
    const fallback = html.match(/<div style="[^\"]*background:var\(--color-neutral-800\)[^\"]*">/)?.[0] ?? ''

    expect(fallback).toContain('align-items:center')
    expect(fallback).toContain('justify-content:center')
    expect(fallback).toContain('padding:4px')
    expect(fallback).not.toContain('padding-bottom:')
  })

  it('워드마크는 4배수 간격으로 카드 하단에 고정한다', () => {
    const html = renderToStaticMarkup(
      <PosterThumb width={120} height={180} alt="테스트 영화" />,
    )
    const logo = html.match(/<img[^>]*src="\/logo\.svg"[^>]*>/)?.[0] ?? ''

    expect(logo).toContain('position:absolute')
    expect(logo).toContain('bottom:8px')
  })
})
