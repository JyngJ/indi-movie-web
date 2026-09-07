import Link from 'next/link'
import { groupByDistrict, describeTheater, type TheaterProfile } from '@/lib/seo/theaterDirectory'

/**
 * 지역 극장 목록 — 자치구별로 묶어 보이게 렌더한다.
 *
 * "서울 독립영화관" SERP 1페이지는 9개 중 6개가 블로그·나무위키·매거진의 추천 리스트다.
 * 구글이 이 쿼리를 목록 의도로 읽고 있다는 뜻이라, 회차만 있는 페이지로는 안 걸린다.
 *
 * 회차 본문(AreaSeoContent)과 달리 이건 **보이게** 둔다. 목록은 사람에게도 쓸모가 있고,
 * 목록 의도 쿼리에 답하는 게 이 페이지의 본론이라 접거나 숨길 이유가 없다.
 * 구 단위 소제목은 "종로 독립영화관" 같은 하위 쿼리도 함께 받는다.
 */
export function AreaTheaterDirectory({
  region,
  theaters,
}: {
  region: string
  theaters: TheaterProfile[]
}) {
  if (theaters.length === 0) return null

  const groups = groupByDistrict(theaters)

  return (
    <section
      style={{
        marginTop: 'var(--spacing-24)',
        backgroundColor: 'color-mix(in srgb, var(--color-surface-bg) 42%, transparent)',
        borderRadius: 'var(--radius-popover)',
        border: '1px solid color-mix(in srgb, var(--color-border) 55%, transparent)',
        padding: 'var(--spacing-6) var(--gutter-sheet)',
      }}
    >
      <h2
        style={{
          margin: '0 0 var(--spacing-2)',
          fontSize: 'var(--text-subtitle)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
      >
        {region} 독립·예술영화관 {theaters.length}곳
      </h2>
      <p
        style={{
          margin: '0 0 var(--spacing-6)',
          fontSize: 'var(--text-meta)',
          lineHeight: 1.6,
          color: 'var(--color-text-sub)',
        }}
      >
        {region}에서 독립·예술영화를 상영하는 극장을 지역별로 모았어요. 상영 정보는 매일 갱신돼요
      </p>

      {groups.map((group) => (
        <div key={group.district} style={{ marginBottom: 'var(--spacing-6)' }}>
          <h3
            style={{
              margin: '0 0 var(--spacing-2)',
              fontSize: 'var(--text-body)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            {group.district} 독립영화관 {group.theaters.length}곳
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--spacing-3)' }}>
            {group.theaters.map((theater) => (
              <li key={theater.id}>
                <Link
                  href={`/films/theater/${theater.id}`}
                  style={{ color: 'var(--color-text-body)', textDecoration: 'none' }}
                >
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 'var(--text-body)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {theater.name}
                  </strong>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 'var(--text-meta)',
                      lineHeight: 1.5,
                      color: 'var(--color-text-caption)',
                    }}
                  >
                    {describeTheater(theater)}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 'var(--text-meta)',
                      lineHeight: 1.5,
                      color: 'var(--color-text-caption)',
                    }}
                  >
                    {theater.address}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
