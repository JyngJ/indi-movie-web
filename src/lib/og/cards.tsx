import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/* 링크 미리보기(카카오톡·디스코드·트위터) OG 카드 공용 렌더러.
 *
 * 라우트가 이중화돼 있어(레거시 /movie·/theater, 진입점 /films/*) 같은 카드를 두 벌
 * 유지하다 films 쪽이 통째로 누락됐다. 렌더러를 여기 한 곳에 두고 각 opengraph-image.tsx는
 * 얇게 위임만 한다.
 *
 * 색: satori는 CSS 변수를 못 읽어 토큰을 리터럴로 박아야 한다. 아래 OG_COLOR는
 * 피그마 `2.0/logo/og` 덤프 실측(bg/text) + 2.0 램프(tokens.css) 값만 쓴다.
 * 램프 밖의 새 색을 만들지 말 것 — 다크 면 위 대비는 4.5:1 이상으로 고른 값들이다.
 */
const OG_COLOR = {
  bg: '#191714',        // 피그마 2.0/logo/og 배경 (덤프 실측)
  title: '#F7F4F0',     // 피그마 2.0/logo/og 워드마크 (덤프 실측)
  meta: '#A7A19A',      // neutral/400 — 감독·연도·주소 (대비 6.3:1)
  caption: '#8D8781',   // neutral/500 — 원제·도메인 (대비 4.6:1)
  divider: '#2B2622',   // neutral/800
  chipBg: '#1F2747',    // primary/900
  chipText: '#C4CCE9',  // primary/200 (칩 배경 위 대비 8:1)
} as const

/* size·contentType·revalidate는 각 opengraph-image.tsx에 리터럴로 둔다 — Next의 세그먼트
 * 설정 정적 분석이 재수출된 값을 못 읽어 "Invalid segment configuration export"로 빌드가 깨진다. */
const OG_SIZE = { width: 1200, height: 630 }

async function loadKimmBold() {
  return readFile(path.join(process.cwd(), 'public/fonts/KIMM_bold.ttf'))
}

function ogResponse(node: React.ReactElement, fontBold: Buffer) {
  return new ImageResponse(node, {
    ...OG_SIZE,
    fonts: [{ name: 'KIMM', data: fontBold, weight: 700, style: 'normal' }],
  })
}

/** 카드 상단 브랜드 줄 — [영화볼지도 · 독립·예술영화관 상영 정보] */
function BrandLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 22, color: OG_COLOR.title, letterSpacing: '0.05em', fontFamily: 'KIMM', fontWeight: 700 }}>
        영화볼지도
      </div>
      <div style={{ color: OG_COLOR.divider, fontSize: 22 }}>·</div>
      <div style={{ fontSize: 20, color: OG_COLOR.meta }}>독립·예술영화관 상영 정보</div>
    </div>
  )
}

function FooterLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', borderTop: `1px solid ${OG_COLOR.divider}`, paddingTop: 20, fontSize: 16, color: OG_COLOR.caption }}>
      영화볼지도.com
    </div>
  )
}

export async function renderMovieOg(id: string) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('movies')
    .select('title, original_title, director, genre, year, poster_url')
    .eq('id', id)
    .single()

  const fontBold = await loadKimmBold()

  const title = data?.title ?? '영화볼지도'
  const originalTitle = data?.original_title ?? ''
  const directors = (data?.director as string[] | null) ?? []
  const genres = (data?.genre as string[] | null) ?? []
  const year = data?.year ?? ''
  const posterUrl = data?.poster_url ?? null

  return ogResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: OG_COLOR.bg, padding: '60px 80px' }}>
        {/* 왼쪽: 포스터 */}
        {posterUrl && (
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              width: 280,
              height: 420,
              marginRight: 60,
              alignSelf: 'center',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterUrl} alt="" width={280} height={420} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          </div>
        )}

        {/* 오른쪽: 텍스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0, paddingTop: 20, paddingBottom: 20 }}>
          <BrandLine />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {genres.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {genres.slice(0, 3).map((g) => (
                  <div
                    key={g}
                    style={{ display: 'flex', fontSize: 16, fontWeight: 600, color: OG_COLOR.chipText, background: OG_COLOR.chipBg, borderRadius: 6, padding: '3px 12px' }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontFamily: 'KIMM', fontSize: title.length > 10 ? 56 : 72, fontWeight: 700, color: OG_COLOR.title, lineHeight: 1.1 }}>
              {title}
            </div>
            {originalTitle && <div style={{ fontSize: 20, color: OG_COLOR.caption }}>{originalTitle}</div>}
            {(directors.length > 0 || year) && (
              <div style={{ display: 'flex', fontSize: 22, color: OG_COLOR.meta, gap: 12 }}>
                {directors.length > 0 && <span>{directors.join(', ')} 감독</span>}
                {directors.length > 0 && year && <span>·</span>}
                {year && <span>{year}</span>}
              </div>
            )}
          </div>

          <FooterLine />
        </div>
      </div>
    ),
    fontBold,
  )
}

export async function renderTheaterOg(id: string) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('theaters')
    .select('name, city, address')
    .eq('id', id)
    .single()

  const fontBold = await loadKimmBold()

  const name = data?.name ?? '영화볼지도'
  const city = data?.city ?? ''
  const address = data?.address ?? ''

  return ogResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: OG_COLOR.bg,
          padding: '60px 80px',
          justifyContent: 'space-between',
        }}
      >
        <BrandLine />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {city ? (
            <div style={{ display: 'flex', fontSize: 18, fontWeight: 600, color: OG_COLOR.chipText, background: OG_COLOR.chipBg, borderRadius: 6, padding: '4px 14px', alignSelf: 'flex-start' }}>
              {city}
            </div>
          ) : null}
          <div style={{ fontFamily: 'KIMM', fontSize: name.length > 8 ? 64 : 80, fontWeight: 700, color: OG_COLOR.title, lineHeight: 1.1 }}>
            {name}
          </div>
          {address ? <div style={{ fontSize: 22, color: OG_COLOR.meta, marginTop: 4 }}>{address}</div> : null}
        </div>

        <FooterLine />
      </div>
    ),
    fontBold,
  )
}

export async function renderDirectorOg(directorName: string) {
  const supabase = createSupabaseServerClient()
  /* 감독 상세는 이름이 곧 키 — 대표작 몇 편만 뽑아 카드 하단에 얹는다 */
  const { data } = await supabase
    .from('movies')
    .select('title, year')
    .contains('director', [directorName])
    .order('year', { ascending: false })
    .limit(3)

  const fontBold = await loadKimmBold()
  const films = (data ?? []) as { title: string; year: number | null }[]

  return ogResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: OG_COLOR.bg,
          padding: '60px 80px',
          justifyContent: 'space-between',
        }}
      >
        <BrandLine />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', fontSize: 18, fontWeight: 600, color: OG_COLOR.chipText, background: OG_COLOR.chipBg, borderRadius: 6, padding: '4px 14px', alignSelf: 'flex-start' }}>
            감독
          </div>
          <div style={{ fontFamily: 'KIMM', fontSize: directorName.length > 8 ? 64 : 80, fontWeight: 700, color: OG_COLOR.title, lineHeight: 1.1 }}>
            {directorName}
          </div>
          {films.length > 0 && (
            <div style={{ display: 'flex', fontSize: 22, color: OG_COLOR.meta, gap: 12 }}>
              {films.map((f) => f.year ? `${f.title} (${f.year})` : f.title).join(' · ')}
            </div>
          )}
        </div>

        <FooterLine />
      </div>
    ),
    fontBold,
  )
}
