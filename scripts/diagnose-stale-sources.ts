/**
 * 0건 수집처 진단 — 라즈베리파이(국내 IP)에서 실행. 읽기 전용: DB를 읽지도 쓰지도 않는다.
 *
 *   npx tsx scripts/diagnose-stale-sources.ts            # 2026-11-26 리포트 두 곳
 *   npx tsx scripts/diagnose-stale-sources.ts --dtryx "<listing_url>" --name 가람영화관 --name 삼척영화관
 *   npx tsx scripts/diagnose-stale-sources.ts --html "<listing_url>"
 *
 * 왜 RPi인가: 클라우드 세션에서는 dtryx(연결 끊김)·donggumc.kr(403 Forbidden)가 해외 IP에 응답하지 않는다.
 * 운영 크롤은 RPi에서 "완료 · 0건"으로 끝나므로(오류 없음) 국내 IP에서는 200 응답을 받는다는 뜻이다.
 *
 * 요청은 한 번에 하나씩, 사이사이 1초 쉰다(dtryx 도메인당 동시성 1 규칙 — AGENTS.md).
 * 원본 응답은 .audit-out/diagnose/에 저장한다(git 미추적). 판정은 src/lib/crawl/sourceDiagnosis.ts.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { crawlerHeaders } from '../src/lib/admin/crawler/utils'
import { diagnoseDtryxCinema, summarizeHtmlListing, type DtryxMainList } from '../src/lib/crawl/sourceDiagnosis'

const OUT = join(process.cwd(), '.audit-out', 'diagnose')
const DTRYX_CGID = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'

type Target =
  | { kind: 'dtryx'; label: string; url: string; names: string[] }
  | { kind: 'html'; label: string; url: string }

// 2026-11-26 05:40 리포트 — DB crawl_sources.listing_url 그대로
const DEFAULT_TARGETS: Target[] = [
  {
    kind: 'dtryx',
    label: '가람영화관',
    url: `https://samcheok.scinema.kr/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000026`,
    names: ['가람영화관', '삼척영화관', '삼척'],
  },
  { kind: 'html', label: '동구영상미디어센터', url: 'http://www.donggumc.kr/' },
  { kind: 'html', label: '동구영상미디어센터', url: 'http://www.donggumc.kr/bbs/board.php?bo_table=6_1&me_code=60' },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function parseArgs(argv: string[]): Target[] {
  const targets: Target[] = []
  let names: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const [flag, value] = [argv[i], argv[i + 1]]
    if (flag === '--name' && value) { names.push(value); i++ }
    else if (flag === '--dtryx' && value) { targets.push({ kind: 'dtryx', label: 'dtryx', url: value, names }); names = []; i++ }
    else if (flag === '--html' && value) { targets.push({ kind: 'html', label: 'html', url: value }); i++ }
  }
  // --name이 --dtryx 뒤에 오면 마지막 dtryx 대상에 붙인다
  const lastDtryx = [...targets].reverse().find((t) => t.kind === 'dtryx')
  if (names.length && lastDtryx && lastDtryx.kind === 'dtryx') lastDtryx.names.push(...names)
  return targets.length ? targets : DEFAULT_TARGETS
}

function save(name: string, body: string) {
  mkdirSync(OUT, { recursive: true })
  const file = join(OUT, name.replace(/[^a-z0-9가-힣._-]/gi, '_'))
  writeFileSync(file, body)
  return file
}

async function get(url: string, headers: Record<string, string>) {
  const started = Date.now()
  try {
    const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(30000) })
    const body = await res.text()
    return { ok: true as const, status: res.status, finalUrl: res.url, contentType: res.headers.get('content-type'), body, ms: Date.now() - started }
  } catch (error) {
    const cause = error instanceof Error ? `${error.message}${error.cause ? ` (${String((error.cause as Error).message ?? error.cause)})` : ''}` : String(error)
    return { ok: false as const, error: cause, ms: Date.now() - started }
  }
}

function dtryxMainUrl(origin: string, brandCd: string) {
  const params = new URLSearchParams({
    cgid: DTRYX_CGID, BrandCd: brandCd, CinemaCd: 'all', MovieCd: 'all', PlaySDT: 'all', Sort: 'boxoffice',
    ScreenCd: '', ShowSeq: '', TabBrandCd: brandCd, TabRegionCd: 'all', TabMovieType: 'all',
  })
  return `${origin}/reserve/main_list.do?${params}`
}

async function diagnoseDtryx(t: Extract<Target, { kind: 'dtryx' }>) {
  const url = new URL(t.url)
  const brandCd = url.searchParams.get('BrandCd') ?? 'dtryx'
  const cinemaCd = url.searchParams.get('CinemaCd')
  const headers = crawlerHeaders({
    accept: 'application/json, text/javascript, */*; q=0.01',
    'x-requested-with': 'XMLHttpRequest',
    referer: `${url.origin}/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=${brandCd}`,
  })

  // 수집처 주소(origin)와 본사(www.dtryx.com) 양쪽에서 같은 극장 코드를 본다 — 어느 쪽이 바뀌었는지 가린다
  const origins = Array.from(new Set([url.origin, 'https://www.dtryx.com']))
  for (const origin of origins) {
    const res = await get(dtryxMainUrl(origin, brandCd), headers)
    console.log(`\n[${t.label}] ${origin} main_list (${res.ms}ms)`)
    if (!res.ok) { console.log(`  요청 실패: ${res.error}`); await sleep(1000); continue }
    const file = save(`${t.label}-${new URL(origin).hostname}-main_list.json`, res.body)
    console.log(`  HTTP ${res.status} · ${res.contentType} · ${res.body.length}B → ${file}`)
    let main: DtryxMainList
    try { main = JSON.parse(res.body) } catch { console.log('  JSON이 아니에요 — 저장한 원본을 열어 보세요'); await sleep(1000); continue }
    const d = diagnoseDtryxCinema(main, cinemaCd, t.names)
    console.log(`  판정: ${d.verdict} · 극장 ${d.cinemaCount}곳 · 공개 영화 ${d.visibleMovieCount}편 · 공개 날짜 ${d.visiblePlayDates.slice(0, 7).join(', ') || '없음'}`)
    console.log(`  CinemaCd=${cinemaCd}: ${d.entry ? JSON.stringify(d.entry) : '목록에 없음'}`)
    if (d.nameHints.length) console.log(`  이름 후보: ${d.nameHints.map((c) => JSON.stringify(c)).join(' ')}`)

    // 공개 상태면 첫 날짜 × 영화 몇 편만 회차를 찔러 본다
    const code = d.entry?.CinemaCd
    if (code && d.verdict !== 'hidden' && d.visiblePlayDates[0]) {
      const movies = (main.MovieList ?? []).filter((m) => m.HiddenYn !== 'Y').slice(0, 3)
      for (const m of movies) {
        await sleep(1000)
        const p = new URLSearchParams({
          cgid: DTRYX_CGID, BrandCd: brandCd, CinemaCd: code, MovieCd: m.MovieCd, PlaySDT: d.visiblePlayDates[0], Sort: 'boxoffice',
          ScreenCd: '', ShowSeq: '', TabBrandCd: brandCd, TabRegionCd: 'all', TabMovieType: 'all',
        })
        const s = await get(`${origin}/reserve/showseq_list.do?${p}`, headers)
        if (!s.ok) { console.log(`  showseq ${m.MovieNm}: 요청 실패 ${s.error}`); continue }
        let groups = 0
        try { groups = (JSON.parse(s.body).Showseqlist ?? []).length } catch { /* 원본 확인 */ }
        console.log(`  showseq ${m.MovieNm} ${d.visiblePlayDates[0]}: HTTP ${s.status} · 그룹 ${groups}`)
      }
    }
    await sleep(1000)
  }

  // 극장 홈 — 리다이렉트·이전 안내를 본다
  const home = await get(t.url, crawlerHeaders())
  console.log(`\n[${t.label}] 극장 페이지 ${t.url}`)
  if (!home.ok) console.log(`  요청 실패: ${home.error}`)
  else {
    const s = summarizeHtmlListing(home.body)
    console.log(`  HTTP ${home.status} → ${home.finalUrl} · 제목 ${s.title ?? '-'} · 안내 문구 ${s.notices.join(', ') || '없음'}`)
    save(`${t.label}-home.html`, home.body)
  }
}

async function diagnoseHtml(t: Extract<Target, { kind: 'html' }>) {
  const res = await get(t.url, crawlerHeaders())
  console.log(`\n[${t.label}] ${t.url} (${res.ms}ms)`)
  if (!res.ok) { console.log(`  요청 실패: ${res.error}`); return }
  const file = save(`${t.label}-${new URL(t.url).pathname.replace(/\//g, '_') || 'root'}${new URL(t.url).search.length ? '-q' : ''}.html`, res.body)
  const s = summarizeHtmlListing(res.body)
  console.log(`  HTTP ${res.status} → ${res.finalUrl} · ${res.contentType} · ${s.bytes}B → ${file}`)
  console.log(`  제목 ${s.title ?? '-'} · 시각 ${s.timeTokens} · 날짜 ${s.dateTokens} · 이미지 ${s.images} · 안내 문구 ${s.notices.join(', ') || '없음'}`)
  for (const p of s.boardPosts) console.log(`  글: ${p.title}  ${p.href}`)
}

async function main() {
  const targets = parseArgs(process.argv.slice(2))
  for (const t of targets) {
    if (t.kind === 'dtryx') await diagnoseDtryx(t)
    else await diagnoseHtml(t)
    await sleep(1000)
  }
  console.log(`\n원본 응답: ${OUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
