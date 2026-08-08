import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRegionFromCity, REGIONS } from '@/lib/regions'
import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { toScreeningListSchema } from '@/lib/seo/toScreeningListSchema'
import { AreaCtas } from './AreaCtas'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

const REGION_IDS = new Set(REGIONS.map((r) => r.id))

function isValidRegion(id: string): boolean {
  return REGION_IDS.has(id)
}

/** 실제로 극장이 존재하는 지역만 프리렌더 — 극장 0개 지역의 thin page 방지 */
export async function generateStaticParams() {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('theaters').select('city')
  const regions = new Set(
    (data ?? []).map((t) => getRegionFromCity(String(t.city ?? ''))),
  )
  return REGIONS.filter((r) => regions.has(r.id)).map((r) => ({ region: r.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>
}): Promise<Metadata> {
  const { region: raw } = await params
  const region = decodeURIComponent(raw)
  if (!isValidRegion(region)) return {}

  const title = `${region} 독립영화관 상영시간표 | 영화볼지도`
  const description = `${region} 지역 독립·예술영화관에서 오늘 상영하는 독립영화 시간표와 극장 정보. ${region}에서 독립영화 볼 곳을 한눈에.`

  return {
    title,
    description,
    alternates: { canonical: `/films/area/${encodeURIComponent(region)}` },
    openGraph: { title, description, type: 'website' },
  }
}

export default async function FilmsAreaPage({
  params,
}: {
  params: Promise<{ region: string }>
}) {
  const { region: raw } = await params
  const region = decodeURIComponent(raw)
  if (!isValidRegion(region)) notFound()

  const data = await getScreeningIndex(region)
  // 극장 자체가 없는 지역은 존재하지 않는 것으로 취급 (Search Console 404 누적 방지 —
  // 죽은 극장 sitemap 이슈와 같은 재발 패턴)
  if (data.theaters.length === 0) notFound()

  const listSchema = toScreeningListSchema(
    data,
    BASE_URL,
    `${region} 독립·예술영화관 오늘 상영작`,
  )

  return (
    <main style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', backgroundColor: 'var(--color-surface-bg)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      {/* 지도 느낌 백드롭 — 토큰 색 블러 블롭 (물·공원·땅) + 스크림. 실제 지도 대신 정적 연출 */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-8%', width: '55%', height: '50%', borderRadius: '50%', backgroundColor: 'var(--color-primary-100)', filter: 'blur(80px)', opacity: 0.7 }} />
        <div style={{ position: 'absolute', bottom: '-12%', right: '-10%', width: '60%', height: '55%', borderRadius: '50%', backgroundColor: 'var(--color-success-tint)', filter: 'blur(90px)', opacity: 0.8 }} />
        <div style={{ position: 'absolute', top: '30%', right: '10%', width: '35%', height: '35%', borderRadius: '50%', backgroundColor: 'var(--color-warning-tint)', filter: 'blur(70px)', opacity: 0.55 }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '8%', width: '40%', height: '40%', borderRadius: '50%', backgroundColor: 'var(--color-surface-raised)', filter: 'blur(60px)', opacity: 0.8 }} />
      </div>

      {/* 온보딩 모달 문법의 센터 카드 */}
      <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', padding: 'var(--spacing-8) var(--gutter) var(--spacing-16)' }}>
        <div style={{
          backgroundColor: 'var(--color-surface-card)',
          borderRadius: 'var(--radius-popover)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 60px rgba(20, 15, 10, 0.14)',
          padding: 'var(--gutter-sheet)',
        }}>
          <h1 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            {region} 독립영화관<br />상영시간표
          </h1>
          <p style={{ margin: 'var(--spacing-3) 0 0', fontSize: 'var(--text-body)', lineHeight: 1.6, color: 'var(--color-text-sub)' }}>
            {region} 지역 독립·예술영화관에서 오늘 상영 중인 독립영화와 극장 정보입니다.
            멀티플렉스엔 걸리지 않는 독립·예술영화를 {region}에서 어디서 볼 수 있는지 확인하세요.
          </p>
          <p style={{ margin: 'var(--spacing-3) 0 var(--spacing-4)', fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--color-text-caption)' }}>
            영화관 {data.theaters.length}곳 · 오늘 상영작 {data.movies.length}편
          </p>

          <AreaCtas region={region} />

          {/* 목록은 검색엔진 콘텐츠 — 카드 안에 컴팩트로 유지 */}
          <section style={{ marginTop: 'var(--spacing-6)' }}>
            <h2 style={{ margin: '0 0 var(--spacing-2)', fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {region} 독립·예술영화관
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--spacing-2)' }}>
              {data.theaters.map((t) => (
                <li key={t.id} style={{ fontSize: 'var(--text-meta)', lineHeight: 1.5 }}>
                  <Link href={`/films/theater/${t.id}`} style={{ color: 'var(--color-text-body)', textDecoration: 'none' }}>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{t.name}</strong>
                    {t.address ? <span style={{ color: 'var(--color-text-caption)' }}> — {t.address}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {data.movies.length > 0 && (
            <section style={{ marginTop: 'var(--spacing-6)' }}>
              <h2 style={{ margin: '0 0 var(--spacing-2)', fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                오늘 상영 중인 독립영화
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--text-meta)', lineHeight: 1.7, color: 'var(--color-text-sub)' }}>
                {data.movies.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && ' · '}
                    <Link href={`/films/movie/${m.id}`} style={{ color: 'var(--color-text-body)', textDecoration: 'none' }}>
                      {m.title}{m.year ? ` (${m.year})` : ''}
                    </Link>
                  </span>
                ))}
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
