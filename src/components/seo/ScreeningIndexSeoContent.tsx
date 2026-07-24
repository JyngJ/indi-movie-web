import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { ScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { REGIONS } from '@/lib/regions'

/**
 * 검색엔진/스크린리더용 SSR 본문 블록.
 *
 * 지도·리치 UI는 클라이언트에서 렌더되어 서버 HTML을 비워두므로, 크롤러가 읽을
 * 실제 텍스트와 내부 링크(상영작 -> /movie/[id], 극장 -> /films/theater/[id])를
 * 서버에서 직접 렌더한다. 시각적으로는 sr-only로 감추되 `display:none`이 아니라
 * clip 방식이라 크롤러는 정상 인덱싱한다 — 페이지 의도와 일치하는 진짜 콘텐츠이므로
 * cloaking이 아니다.
 */

const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export interface ScreeningIndexSeoContentProps {
  heading: string
  intro: string
  data: ScreeningIndex
  /** true면 극장 링크를 지역 상세가 아닌 극장 상세로 (기본 true) */
  theaterLinks?: boolean
}

export function ScreeningIndexSeoContent({
  heading,
  intro,
  data,
  theaterLinks = true,
}: ScreeningIndexSeoContentProps) {
  // 상영 데이터에 실제로 극장이 있는 지역만 링크 (REGIONS 순서 유지)
  const presentRegions = new Set(data.theaters.map((t) => t.region))
  const regions = REGIONS.map((r) => r.id).filter((id) => presentRegions.has(id))

  return (
    <section style={srOnly} data-seo-content>
      <h1>{heading}</h1>
      <p>{intro}</p>

      {data.movies.length > 0 && (
        <>
          <h2>오늘 상영 중인 독립·예술영화 ({data.movies.length}편)</h2>
          <ul>
            {data.movies.map((m) => (
              <li key={m.id}>
                <Link href={`/movie/${m.id}`}>
                  {m.title}
                  {m.year ? ` (${m.year})` : ''}
                  {m.director.length > 0 ? ` — ${m.director.join(', ')} 감독` : ''}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {data.theaters.length > 0 && (
        <>
          <h2>독립·예술영화관 ({data.theaters.length}곳)</h2>
          <ul>
            {data.theaters.map((t) => (
              <li key={t.id}>
                {theaterLinks ? (
                  <Link href={`/films/theater/${t.id}`}>
                    {t.name}
                    {t.address ? ` — ${t.address}` : ''}
                  </Link>
                ) : (
                  <span>
                    {t.name}
                    {t.address ? ` — ${t.address}` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {regions.length > 0 && (
        <nav aria-label="지역별 독립영화관">
          <h2>지역별 독립영화관 상영시간표</h2>
          <ul>
            {regions.map((region) => (
              <li key={region}>
                <Link href={`/films/area/${encodeURIComponent(region)}`}>
                  {region} 독립영화관 상영시간표
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  )
}
