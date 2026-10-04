import Link from 'next/link'
import type { FestivalDetail, FestivalScreening } from '@/types/festival'
import { festivalViewPath, listFestivalViews, type FestivalView } from '@/lib/festival/festivalView'
import { dateWithDow } from '@/lib/seo/festivalSeo'
import { formatScreeningTime, venueDisplayName } from '@/lib/festival/timetable'
import { srOnly } from './srOnly'

function screeningLine(s: FestivalScreening): string {
  const parts = [formatScreeningTime(s.startTime, s.runtimeMin), s.movieTitleSnapshot, venueDisplayName(s)]
  if (s.section) parts.push(s.section)
  if (s.hasGv) parts.push('GV')
  return parts.join(' · ')
}

/** 날짜별로 묶기 — 입력은 이미 날짜·시각순(selectViewScreenings) */
function groupByDate(screenings: FestivalScreening[]): [string, FestivalScreening[]][] {
  const out = new Map<string, FestivalScreening[]>()
  for (const s of screenings) out.set(s.screeningDate, [...(out.get(s.screeningDate) ?? []), s])
  return [...out.entries()]
}

/**
 * 영화제 하위 페이지(날짜별 · GV 일정)의 SSR 본문 — 화면 시간표는 클라이언트 렌더라
 * JS를 안 돌리는 크롤러에겐 비어 있다. 그 페이지에 실린 회차를 한 줄씩 서버 HTML로 둔다.
 * h1은 클라이언트 뷰가 렌더하므로 h2부터 쓴다.
 */
export function FestivalViewSeoContent({ festival, view, screenings }: {
  festival: FestivalDetail
  view: FestivalView
  screenings: FestivalScreening[]
}) {
  const otherViews = listFestivalViews(festival.screenings)
    .filter((v) => festivalViewPath(festival.slug, v) !== festivalViewPath(festival.slug, view))

  return (
    <section style={srOnly} data-seo-content>
      {view.kind === 'gv' ? (
        <>
          <h2>{festival.name} GV 일정 — 관객과의 대화 {screenings.length}회차</h2>
          {groupByDate(screenings).map(([date, rows]) => (
            <div key={date}>
              <h3>{dateWithDow(date)} GV {rows.length}회차</h3>
              <ul>{rows.map((s) => <li key={s.id}>{screeningLine(s)}</li>)}</ul>
            </div>
          ))}
        </>
      ) : (
        <>
          <h2>{festival.name} {dateWithDow(view.date)} 상영 시간표 — {screenings.length}회차</h2>
          <ul>{screenings.map((s) => <li key={s.id}>{screeningLine(s)}</li>)}</ul>
        </>
      )}

      <h2>{festival.name} 다른 시간표</h2>
      <ul>
        <li><Link href={`/festival/${festival.slug}`}>{festival.name} 전체 상영 시간표</Link></li>
        {otherViews.map((v) => (
          <li key={festivalViewPath(festival.slug, v)}>
            <Link href={festivalViewPath(festival.slug, v)}>
              {v.kind === 'gv' ? `${festival.name} GV 일정` : `${dateWithDow(v.date)} 상영 시간표`}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
