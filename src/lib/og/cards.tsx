import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatDateLabel } from '@/lib/date'
import { isAlmostSoldOut } from '@/lib/catalog/seatAvailability'

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
  // 회차 셀
  cardSurface: '#FFFFFF',   // surface/card — 종이 위 새 종이 한 장
  border: '#EAE5E1',        // neutral/200
  timeText: '#2B2622',      // neutral/800 — 시각
  caption: '#8D8781',       // neutral/500 — 종료 시각
  seatNormal: '#404E81',    // primary/700 — 잔여석
  seatLow: '#B9800E',       // warning — 잔여 10% 이하
  seatSoldout: '#A7A19A',   // neutral/400 (text/placeholder) — 매진
} as const

const OG_SIZE = { width: 1200, height: 630 }

/**
 * generateMetadata가 og:image로 가리킬 경로. 루트 layout의 metadataBase가 절대 URL로 만들어 준다.
 * 회차(showtime)가 있으면 카드에 그 회차가 실린다.
 */
export function ogImageUrl(
  target: { type: 'movie' | 'theater'; id: string; showtime?: string } | { type: 'director'; name: string },
): { url: string; width: number; height: number } {
  const q = new URLSearchParams({ type: target.type })
  if (target.type === 'director') q.set('name', target.name)
  else {
    q.set('id', target.id)
    if (target.showtime) q.set('showtime', target.showtime)
  }
  return { url: `/api/og?${q.toString()}`, ...OG_SIZE }
}
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
    /* 미리보기 봇은 같은 링크를 여러 번 긁어간다 — CDN에 세워 Supabase 재조회를 막는다.
     * 파일 규약(opengraph-image.tsx)의 revalidate=3600을 대신하는 자리다. */
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

/** 공유 링크에 회차가 실려 있을 때 카드에 얹는 맥락 — [8월 12일(화)] 제목 / 19:30 · 상대편 이름 */
type ShowtimeContext = {
  dateLabel: string
  time: string
  counterpart: string
  endTime: string | null
  seatAvailable: number
  seatTotal: number
}

/** showtimes.show_time 은 TIME 이라 "19:30:00" 꼴로 온다 — 초를 잘라낸다 */
const hhmm = (t: string) => t.slice(0, 5)

/**
 * 워드마크 — 카드 종류와 무관하게 항상 아래 가운데. 카드 패딩과 같은 60을 띄운다.
 * 흐름에서 빼는(absolute) 이유: 영화 카드 포스터가 340×510(2:3 고정)이라,
 * 흐름에 넣으면 포스터를 깎아 비율이 틀어진다.
 */
function WordmarkBottom({ src }: { src: string }) {
  return (
    <div style={{ position: 'absolute', bottom: 60, left: 0, width: OG_SIZE.width, display: 'flex', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="영화볼지도" width={WORDMARK.width} height={WORDMARK.height} />
    </div>
  )
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
function StackCard({ children, wordmark, cell }: { children: React.ReactNode; wordmark: string; cell?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: OG_COLOR.bg,
        padding: '60px 80px',
        position: 'relative',
        gap: 12,
      }}
    >
      {/* 회차 셀은 info 밖 형제 — 영화 카드와 같은 골격 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      {cell}
      <WordmarkBottom src={wordmark} />
    </div>
  )
}

/**
 * 회차 맥락 조회. 영화 카드에서는 상대편이 극장, 극장 카드에서는 상대편이 영화다.
 * 회차가 사라졌거나(비활성·크롤 갱신) 아이디가 엉터리면 null — 카드는 회차 없이 그려진다.
 */
async function fetchShowtimeContext(
  showtimeId: string,
  counterpart: 'theater' | 'movie',
): Promise<ShowtimeContext | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('showtimes')
    .select('show_date, show_time, end_time, seat_available, seat_total, theater_id, movie_id')
    .eq('id', showtimeId)
    .single()
  if (!data) return null

  const { data: named } = counterpart === 'theater'
    ? await supabase.from('theaters').select('name').eq('id', data.theater_id).single()
    : await supabase.from('movies').select('title').eq('id', data.movie_id).single()

  const name = counterpart === 'theater'
    ? (named as { name: string } | null)?.name
    : (named as { title: string } | null)?.title
  if (!name) return null

  return {
    dateLabel: formatDateLabel(data.show_date),
    time: hhmm(data.show_time),
    counterpart: name,
    endTime: data.end_time ? hhmm(data.end_time) : null,
    seatAvailable: Number(data.seat_available ?? 0),
    seatTotal: Number(data.seat_total ?? 0),
  }
}

/**
 * 회차 셀 — 피그마 공유 카드(2026-08-12 수정본)의 `2.0/ShowtimeCell` 인스턴스 실측 그대로.
 * 446×216 · r16 · 흰 면 · 보더 neutral/200 · padding 32 · gap 4,
 * 시각 KIMM 48(자간 5%) / 종료 24 / 좌석 Bold 32.
 *
 * 화면의 ShowtimeCell(104×95)을 카드 크기로 키운 배리언트라 수치를 공유하지 않는다.
 * 좌석 색만 화면과 같은 규칙을 쓴다 — 매진은 회색, 잔여 10% 이하는 오커, 그 외 primary.
 */
function ShowtimeCellBlock({ showtime }: { showtime: ShowtimeContext }) {
  const soldout = showtime.seatAvailable <= 0
  const seatColor = soldout
    ? OG_COLOR.seatSoldout
    : isAlmostSoldOut(showtime.seatAvailable, showtime.seatTotal)
      ? OG_COLOR.seatLow
      : OG_COLOR.seatNormal

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: '100%',
        padding: 32,
        borderRadius: 16,
        backgroundColor: OG_COLOR.cardSurface,
        border: `1px solid ${OG_COLOR.border}`,
      }}
    >
      {/* 자간 — satori는 em을 못 읽어 px 정수로 준다 */}
      <div style={{ fontFamily: 'KIMM', fontSize: 48, fontWeight: 700, letterSpacing: 4, lineHeight: 1.25, color: OG_COLOR.timeText }}>
        {showtime.time}
      </div>
      {/* 문자열은 항상 하나로 합쳐 넘긴다 — satori는 자식이 둘 이상인 div에 display:flex를 요구한다 */}
      {showtime.endTime && (
        <div style={{ fontSize: 24, lineHeight: 1.5, color: OG_COLOR.caption }}>{`-${showtime.endTime}`}</div>
      )}
      {showtime.seatTotal > 0 && (
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, lineHeight: 1.5 }}>
          <span style={{ color: seatColor, textDecoration: soldout ? 'line-through' : 'none' }}>{showtime.seatAvailable}</span>
          <span style={{ color: OG_COLOR.meta, textDecoration: soldout ? 'line-through' : 'none' }}>{`/${showtime.seatTotal}석`}</span>
        </div>
      )}
    </div>
  )
}

export async function renderMovieOg(id: string, showtimeId?: string) {
  const supabase = createSupabaseServerClient()
  const [{ data }, showtime] = await Promise.all([
    supabase.from('movies').select('title, director, genre, year, poster_url').eq('id', id).single(),
    showtimeId ? fetchShowtimeContext(showtimeId, 'theater') : Promise.resolve(null),
  ])

  const [fontBold, wordmark] = await Promise.all([loadKimmBold(), loadWordmarkDataUri()])

  const title = data?.title ?? '영화볼지도'
  const directors = (data?.director as string[] | null) ?? []
  const genres = (data?.genre as string[] | null) ?? []
  const year = data?.year ?? ''
  const posterUrl = data?.poster_url ?? null

  return ogResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: OG_COLOR.bg, padding: '60px 80px', position: 'relative' }}>
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

        {/* 회차 셀은 info 밖 형제로 두고 열 폭을 꽉 채운다 (피그마 2026-08-12 수정본) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
          {/* 회차가 실린 링크면 장르·감독 대신 그 회차를 앞세운다 — 공유한 사람이 보여주려던 게 그것이다 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {showtime ? (
              <Chip label={showtime.dateLabel} size={18} padV={4} padH={14} />
            ) : genres.length > 0 ? (
              <div style={{ display: 'flex', gap: 8 }}>
                {genres.slice(0, 3).map((g) => <Chip key={g} label={g} />)}
              </div>
            ) : null}
            <div style={{ fontFamily: 'KIMM', fontSize: title.length > 10 ? 56 : 72, fontWeight: 700, color: OG_COLOR.title, lineHeight: 1.1 }}>
              {title}
            </div>
            {showtime ? (
              <div style={{ display: 'flex', fontSize: 22, color: OG_COLOR.meta, gap: 12 }}>
                <span>{showtime.time}</span>
                <span>·</span>
                <span>{showtime.counterpart}</span>
              </div>
            ) : (directors.length > 0 || year) ? (
              <div style={{ display: 'flex', fontSize: 22, color: OG_COLOR.meta, gap: 12 }}>
                {directors.length > 0 && <span>{directors.join(', ')} 감독</span>}
                {directors.length > 0 && year && <span>·</span>}
                {year && <span>{year}</span>}
              </div>
            ) : null}
          </div>

          {showtime && <ShowtimeCellBlock showtime={showtime} />}
        </div>

        <WordmarkBottom src={wordmark} />
      </div>
    ),
    fontBold,
  )
}

export async function renderTheaterOg(id: string, showtimeId?: string) {
  const supabase = createSupabaseServerClient()
  const [{ data }, showtime] = await Promise.all([
    supabase.from('theaters').select('name, city, address').eq('id', id).single(),
    showtimeId ? fetchShowtimeContext(showtimeId, 'movie') : Promise.resolve(null),
  ])

  const [fontBold, wordmark] = await Promise.all([loadKimmBold(), loadWordmarkDataUri()])

  const name = data?.name ?? '영화볼지도'
  const city = data?.city ?? ''
  const address = data?.address ?? ''

  return ogResponse(
    (
      <StackCard wordmark={wordmark} cell={showtime ? <ShowtimeCellBlock showtime={showtime} /> : undefined}>
        {/* 회차가 실린 링크면 도시·주소 대신 그 회차를 앞세운다 */}
        {showtime ? <Chip label={showtime.dateLabel} size={18} padV={4} padH={14} />
          : city ? <Chip label={city} size={18} padV={4} padH={14} /> : null}
        <div style={{ fontFamily: 'KIMM', fontSize: name.length > 8 ? 64 : 80, fontWeight: 700, color: OG_COLOR.title, lineHeight: 1.1 }}>
          {name}
        </div>
        {showtime ? (
          <div style={{ display: 'flex', fontSize: 22, color: OG_COLOR.meta, gap: 12 }}>
            <span>{showtime.time}</span>
            <span>·</span>
            <span>{showtime.counterpart}</span>
          </div>
        ) : address ? <div style={{ fontSize: 22, color: OG_COLOR.meta }}>{address}</div> : null}
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
