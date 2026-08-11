import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/* 링크 미리보기(카카오톡·디스코드·트위터) OG 카드 공용 렌더러.
 *
 * 라우트가 이중화돼 있어(레거시 /movie, 진입점 /films/*) 같은 카드를 두 벌 유지하다
 * films 쪽이 통째로 누락됐다. 렌더러를 여기 한 곳에 두고 각 opengraph-image.tsx는 위임만 한다.
 *
 * 레이아웃·색 근거: 피그마 "Design System - work" › 공유 카드 섹션 (2026-08-12 사용자 수정본).
 * 상단 브랜드 줄과 하단 도메인 줄을 없애고 워드마크 하나로 대체했다 — OG 카드는 축소 노출돼
 * 작은 글씨가 어차피 안 읽힌다. 서비스가 라이트 단일 테마(2.0에서 다크모드 폐지)라 카드도 라이트다.
 *
 * satori는 CSS 변수를 못 읽어 토큰을 리터럴로 박아야 한다. 아래 값은 전부 2.0 램프(tokens.css)에서
 * 가져온 것 — 램프 밖의 새 색을 만들지 말 것.
 */
const OG_COLOR = {
  bg: '#FAF9F8',        // surface/bg (neutral/100) — 페이지 미색 종이
  title: '#0C0A08',     // neutral/900 — 제목
  meta: '#726B65',      // neutral/600 — 감독·연도·주소
  posterBg: '#EAE5E1',  // neutral/200 — 포스터 없을 때 자리
  chipBg: '#ECEFF9',    // primary/100 — 틴트 배경
  chipText: '#1F2747',  // primary/900 — 틴트 위 텍스트
  wordmark: '#404E81',  // primary/700 — 워드마크
} as const

const OG_SIZE = { width: 1200, height: 630 }
/* 피그마 공유 카드 실측 — 포스터 340×510(콘텐츠 높이 꽉), 워드마크 141×48 */
const POSTER = { width: 340, height: 510 }
const WORDMARK = { width: 141, height: 48 }

async function loadKimmBold() {
  return readFile(path.join(process.cwd(), 'public/fonts/KIMM_bold.ttf'))
}

/** public/logo.svg(워드마크)를 primary/700로 물들여 data URI로. satori는 img의 SVG data URI를 렌더한다. */
async function loadWordmarkDataUri() {
  const raw = await readFile(path.join(process.cwd(), 'public/logo.svg'), 'utf8')
  const tinted = raw.replace(/#C9C4B5/gi, OG_COLOR.wordmark)
  return `data:image/svg+xml;base64,${Buffer.from(tinted).toString('base64')}`
}

function ogResponse(node: React.ReactElement, fontBold: Buffer) {
  return new ImageResponse(node, {
    ...OG_SIZE,
    fonts: [{ name: 'KIMM', data: fontBold, weight: 700, style: 'normal' }],
  })
}

function Wordmark({ src }: { src: string }) {
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt="영화볼지도" width={WORDMARK.width} height={WORDMARK.height} />
}

/** 틴트 칩 — 장르·도시·역할. alignSelf로 붙인다(satori가 width:fit-content를 무시한다) */
function Chip({ label, size = 16, padV = 3, padH = 12 }: { label: string; size?: number; padV?: number; padH?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: size,
        fontWeight: 600,
        color: OG_COLOR.chipText,
        background: OG_COLOR.chipBg,
        borderRadius: 6,
        padding: `${padV}px ${padH}px`,
        alignSelf: 'flex-start',
      }}
    >
      {label}
    </div>
  )
}

/** 세로 카드 껍데기(극장·감독) — 정보 위, 워드마크 아래 */
function StackCard({ children, wordmark }: { children: React.ReactNode; wordmark: string }) {
  return (
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      <Wordmark src={wordmark} />
    </div>
  )
}

export async function renderMovieOg(id: string) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('movies')
    .select('title, director, genre, year, poster_url')
    .eq('id', id)
    .single()

  const [fontBold, wordmark] = await Promise.all([loadKimmBold(), loadWordmarkDataUri()])

  const title = data?.title ?? '영화볼지도'
  const directors = (data?.director as string[] | null) ?? []
  const genres = (data?.genre as string[] | null) ?? []
  const year = data?.year ?? ''
  const posterUrl = data?.poster_url ?? null

  return ogResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: OG_COLOR.bg, padding: '60px 80px' }}>
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            width: POSTER.width,
            height: POSTER.height,
            marginRight: 60,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: OG_COLOR.posterBg,
          }}
        >
          {posterUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={posterUrl} alt="" width={POSTER.width} height={POSTER.height} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {genres.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {genres.slice(0, 3).map((g) => <Chip key={g} label={g} />)}
              </div>
            )}
            <div style={{ fontFamily: 'KIMM', fontSize: title.length > 10 ? 56 : 72, fontWeight: 700, color: OG_COLOR.title, lineHeight: 1.1 }}>
              {title}
            </div>
            {(directors.length > 0 || year) && (
              <div style={{ display: 'flex', fontSize: 22, color: OG_COLOR.meta, gap: 12 }}>
                {directors.length > 0 && <span>{directors.join(', ')} 감독</span>}
                {directors.length > 0 && year && <span>·</span>}
                {year && <span>{year}</span>}
              </div>
            )}
          </div>

          <Wordmark src={wordmark} />
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

  const [fontBold, wordmark] = await Promise.all([loadKimmBold(), loadWordmarkDataUri()])

  const name = data?.name ?? '영화볼지도'
  const city = data?.city ?? ''
  const address = data?.address ?? ''

  return ogResponse(
    (
      <StackCard wordmark={wordmark}>
        {city ? <Chip label={city} size={18} padV={4} padH={14} /> : null}
        <div style={{ fontFamily: 'KIMM', fontSize: name.length > 8 ? 64 : 80, fontWeight: 700, color: OG_COLOR.title, lineHeight: 1.1 }}>
          {name}
        </div>
        {address ? <div style={{ fontSize: 22, color: OG_COLOR.meta }}>{address}</div> : null}
      </StackCard>
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

  const [fontBold, wordmark] = await Promise.all([loadKimmBold(), loadWordmarkDataUri()])
  const films = (data ?? []) as { title: string; year: number | null }[]

  return ogResponse(
    (
      <StackCard wordmark={wordmark}>
        <Chip label="감독" size={18} padV={4} padH={14} />
        <div style={{ fontFamily: 'KIMM', fontSize: directorName.length > 8 ? 64 : 80, fontWeight: 700, color: OG_COLOR.title, lineHeight: 1.1 }}>
          {directorName}
        </div>
        {films.length > 0 && (
          <div style={{ display: 'flex', fontSize: 22, color: OG_COLOR.meta, gap: 12 }}>
            {films.map((f) => (f.year ? `${f.title} (${f.year})` : f.title)).join(' · ')}
          </div>
        )}
      </StackCard>
    ),
    fontBold,
  )
}
