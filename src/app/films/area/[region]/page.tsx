import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRegionFromCity, REGIONS } from '@/lib/regions'
import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { toScreeningListSchema } from '@/lib/seo/toScreeningListSchema'
import { AreaCtas } from './AreaCtas'
import { IlloCollected } from '@/components/domain/onboarding/illustrations'
import ob from '@/components/domain/onboarding/onboarding.module.css'

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

  const backdropPosters = data.movies.map((m) => m.posterUrl).filter((u): u is string => !!u).slice(0, 5)
  const mapBackdrop = fs.existsSync(path.join(process.cwd(), 'public', 'area-backdrops', `${region}.jpg`))
    ? `/area-backdrops/${encodeURIComponent(region)}.jpg`
    : null

  return (
    <main style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', backgroundColor: 'var(--color-surface-bg)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      {/* 백드롭 — 이 지역 지도 캡처 블러 (scripts 캡처 산출물), 없으면 상영작 포스터 폴백 */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex' }}>
        {mapBackdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mapBackdrop} alt="" style={{ flex: 1, minWidth: 0, objectFit: 'cover', filter: 'blur(24px) saturate(0.92)', transform: 'scale(1.12)' }} />
        ) : (
          backdropPosters.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" style={{ flex: 1, minWidth: 0, objectFit: 'cover', filter: 'blur(28px) saturate(0.9)', transform: 'scale(1.15)', opacity: 0.45 }} />
          ))
        )}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'color-mix(in srgb, var(--color-surface-bg) 55%, transparent)' }} />
      </div>

      {/* 온보딩 데스크톱 모달 문법 — 좌 일러스트 / 우 콘텐츠 */}
      <div style={{ position: 'relative', minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 880, margin: '0 auto', padding: 'var(--spacing-24) var(--gutter)' }}>
        <div style={{
          backgroundColor: 'var(--color-surface-card)',
          borderRadius: 'var(--radius-sheet)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 60px rgba(20, 15, 10, 0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexWrap: 'wrap',
          minHeight: 520,   /* 온보딩 데스크톱 모달(880×520)과 동일 규격 */
        }}>
          {/* 좌: 온보딩 1페이지 지도 일러스트 — 온보딩 mIllo와 동일 420 고정폭 (좁으면 스택) */}
          <div className={ob.illoVars} style={{ flex: '1 1 420px', maxWidth: 420, minHeight: 320 }}>
            <IlloCollected />
          </div>

          {/* 우: 콘텐츠 — 온보딩 mText와 동일 패딩(56/48/40) */}
          <div style={{ flex: '1 1 320px', minWidth: 0, padding: '56px 48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              {region} 독립영화관<br />상영시간표
            </h1>
            <p style={{ margin: 'var(--spacing-3) 0 0', fontSize: 'var(--text-body)', lineHeight: 1.6, color: 'var(--color-text-sub)' }}>
              {region} 지역 독립·예술영화관에서 오늘 상영 중인 독립영화와 극장 정보입니다.
              멀티플렉스엔 걸리지 않는 독립·예술영화를 {region}에서 어디서 볼 수 있는지 확인하세요.
            </p>
            <p style={{ margin: 'var(--spacing-6) 0 var(--spacing-6)', fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--color-text-caption)' }}>
              영화관 {data.theaters.length}곳 · 오늘 상영작 {data.movies.length}편
            </p>
            <AreaCtas region={region} />
          </div>
        </div>

        {/* 목록 — 검색엔진 콘텐츠. 시각적으론 접어두고(details) DOM엔 항상 존재 */}
        <details style={{
          marginTop: 'var(--spacing-24)',
          backgroundColor: 'color-mix(in srgb, var(--color-surface-bg) 42%, transparent)',
          borderRadius: 'var(--radius-popover)',
          border: '1px solid color-mix(in srgb, var(--color-border) 55%, transparent)',
          padding: 'var(--spacing-4) var(--gutter-sheet)',
        }}>
          <summary style={{ cursor: 'pointer', fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-sub)' }}>
            {region} 독립·예술영화관 {data.theaters.length}곳
          </summary>
          <section style={{ marginTop: 'var(--spacing-4)' }}>
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
        </details>
      </div>
    </main>
  )
}
