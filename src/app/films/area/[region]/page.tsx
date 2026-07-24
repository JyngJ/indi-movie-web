import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRegionFromCity, REGIONS } from '@/lib/regions'
import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { toScreeningListSchema } from '@/lib/seo/toScreeningListSchema'

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
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 64px' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      <nav style={{ marginBottom: 16, fontSize: 14 }}>
        <Link href="/films" style={{ color: 'var(--color-primary-base)' }}>
          ← 전체 독립영화 상영시간표
        </Link>
      </nav>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        {region} 독립영화관 상영시간표
      </h1>
      <p style={{ color: 'var(--color-text-secondary, #666)', lineHeight: 1.6, marginBottom: 28 }}>
        {region} 지역 독립·예술영화관에서 오늘 상영 중인 독립영화와 극장 정보입니다.
        멀티플렉스엔 걸리지 않는 독립·예술영화를 {region}에서 어디서 볼 수 있는지 확인하세요.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          {region} 독립·예술영화관 ({data.theaters.length}곳)
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          {data.theaters.map((t) => (
            <li key={t.id}>
              <Link href={`/films/theater/${t.id}`} style={{ color: 'inherit' }}>
                <strong>{t.name}</strong>
                {t.address ? (
                  <span style={{ color: 'var(--color-text-secondary, #888)' }}> — {t.address}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {data.movies.length > 0 && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            오늘 상영 중인 독립영화 ({data.movies.length}편)
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
            {data.movies.map((m) => (
              <li key={m.id}>
                <Link href={`/movie/${m.id}`} style={{ color: 'inherit' }}>
                  {m.title}
                  {m.year ? ` (${m.year})` : ''}
                  {m.director.length > 0 ? (
                    <span style={{ color: 'var(--color-text-secondary, #888)' }}>
                      {' '}— {m.director.join(', ')} 감독
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
