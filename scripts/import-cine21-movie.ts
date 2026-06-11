/**
 * 씨네21에서 영화 정보 검색 + DB 임포트
 * Usage: npx tsx --env-file=.env.local scripts/import-cine21-movie.ts "영화 제목"
 *        npx tsx --env-file=.env.local scripts/import-cine21-movie.ts --id 62951
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function cleanText(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function fetchCine21Page(url: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'ko-KR,ko;q=0.9' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`cine21 fetch 실패: ${res.status}`)
  return res.text()
}

async function searchCine21(query: string): Promise<Array<{ id: string; title: string }>> {
  const html = await fetchCine21Page(`https://cine21.com/search/result/?q=${encodeURIComponent(query)}`)
  const matches = [...html.matchAll(/movie_id=(\d+)[^"]+">([^<]+)</g)]
  return [...new Set(matches.map(m => m[1]))].slice(0, 5).map(id => {
    const m = matches.find(x => x[1] === id)!
    return { id, title: cleanText(m[2]) }
  })
}

async function importCine21Movie(movieId: string) {
  const html = await fetchCine21Page(`https://cine21.com/movie/info/?movie_id=${movieId}`)

  const title = html.match(/영화 \[(.+?)\]/)?.[1]?.trim()
  if (!title) throw new Error('제목 파싱 실패')

  const directors = [...html.matchAll(/감독<\/p>[\s\S]{0,400}?<a[^>]+>([^<]+)<\/a>/g)]
    .map(m => m[1].trim()).filter(Boolean).slice(0, 3)
    .filter((v, i, a) => a.indexOf(v) === i)

  // 장르: "장르</p>\n  액션, 스릴러" 패턴
  const genreBlock = html.match(/장르<\/p>\s*([\s\S]{0,200}?)<\/li>/)?.[1] ?? ''
  const genres = cleanText(genreBlock).split(/[,，]/).map(s => s.trim()).filter(Boolean)

  // 국가
  const nationBlock = html.match(/국가<\/p>\s*([\s\S]{0,100}?)<\/li>/)?.[1] ?? ''
  const nations = cleanText(nationBlock).split(/[,，]/).map(s => s.trim()).filter(Boolean)

  // cine21 페이지 개편으로 "제작연도" 표기 사라짐 — "개봉" 날짜에서 연도 추출
  const yearMatch = html.match(/개봉<\/p>\s*(\d{4})-\d{2}-\d{2}/)
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

  // 포스터 URL 재구성
  const posterPathMatch = html.match(/cine21\/poster\/\d{4}\/\d{4}\/([A-Za-z0-9_.-]+\.(?:jpg|png|gif|webp))/)
  const posterYearMonth = html.match(/cine21\/poster\/(\d{4}\/\d{4})\//)
  const posterUrl = posterPathMatch && posterYearMonth
    ? `https://image.cine21.com/cine21/poster/${posterYearMonth[1]}/${posterPathMatch[1]}`
    : undefined

  // 시놉시스
  const synMatch = html.match(/시놉시스[\s\S]{0,200}?<p[^>]*>([\s\S]{50,1000}?)<\/p>/)
  const synopsis = synMatch ? cleanText(synMatch[1]).slice(0, 600) : undefined

  console.log('파싱 결과:')
  console.log('  제목:', title)
  console.log('  감독:', directors)
  console.log('  장르:', genres)
  console.log('  국가:', nations)
  console.log('  연도:', year)
  console.log('  포스터:', posterUrl?.slice(0, 80) ?? '없음')
  console.log('  시놉시스:', synopsis?.slice(0, 80) ?? '없음')

  // 기존 영화 확인
  const { data: existing } = await sb.from('movies').select('id,title').eq('title', title).maybeSingle()
  if (existing) {
    // 업데이트
    await sb.from('movies').update({
      director: directors.length ? directors : undefined,
      genre: genres.length ? genres : undefined,
      nation: nations[0] ?? undefined,
      year,
      poster_url: posterUrl ?? undefined,
    }).eq('id', existing.id)
    if (synopsis) await sb.from('movie_details').upsert({ movie_id: existing.id, synopsis }, { onConflict: 'movie_id' })
    console.log(`✅ 업데이트: ${title} (${existing.id.slice(0, 8)})`)
    return existing.id
  }

  // 신규 삽입
  const { data, error } = await sb.from('movies').insert({
    title,
    director: directors,
    genre: genres,
    nation: nations[0] ?? null,
    year,
    poster_url: posterUrl ?? null,
  }).select('id').single()
  if (error) throw new Error(error.message)
  if (synopsis) await sb.from('movie_details').insert({ movie_id: data.id, synopsis })
  console.log(`✅ 신규 등록: ${title} (${data.id.slice(0, 8)})`)
  return data.id
}

async function main() {
  const args = process.argv.slice(2)
  let movieId: string | null = null

  if (args[0] === '--id') {
    movieId = args[1]
  } else if (args[0]) {
    console.log(`"${args[0]}" 검색 중...`)
    const results = await searchCine21(args[0])
    if (!results.length) { console.log('결과 없음'); return }
    for (const r of results) console.log(`  ${r.id}: ${r.title}`)
    // 첫 번째 결과 자동 선택
    movieId = results[0].id
    console.log(`\n선택: ${results[0].title} (id=${movieId})`)
  } else {
    console.log('Usage: npx tsx --env-file=.env.local scripts/import-cine21-movie.ts "영화제목"')
    console.log('       npx tsx --env-file=.env.local scripts/import-cine21-movie.ts --id 62951')
    return
  }

  if (movieId) await importCine21Movie(movieId)
}

main().catch(e => { console.error(e); process.exit(1) })
