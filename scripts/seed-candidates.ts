/**
 * draft 후보 autoMatch → needs_review 후보 전체 승인
 * 실행: npx tsx --env-file=.env.local scripts/seed-candidates.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const KMDB_KEY = process.env.KMDB_SERVICE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── 타입 ──────────────────────────────────────────────────────────
interface Candidate {
  id: string
  theater_name: string
  movie_title: string
  screen_name: string
  show_date: string
  show_time: string
  end_time: string | null
  format_type: string
  language: string
  seat_available: number
  seat_total: number
  price: number
  booking_url: string | null
  status: string
  fingerprint: string
  matched_theater_id: string | null
  matched_movie_id: string | null
}

interface Theater { id: string; name: string }
interface Movie { id: string; title: string; kmdb_id?: string; kmdb_movie_seq?: string }

// ── 텍스트 정규화 ─────────────────────────────────────────────────
function normalize(v: string) {
  return v.trim().toLowerCase().normalize('NFKC')
    .replace(/[\s"'''""()[\]{}:;,.!?·ㆍ・_-]+/g, '')
}

// ── 영화 제목 후보 생성 (시네토크/날짜 등 제거) ────────────────────
function titleCandidates(raw: string): string[] {
  const base = raw.trim()
  return Array.from(new Set([
    base,
    base.replace(/\s*\+\s*시네토크.*$/i, '').trim(),
    base.replace(/\s*\(35mm\)/i, '').trim(),
    base.replace(/\s+\d{1,2}[./-]\d{1,2}(?:\s.*)?$/, '').trim(),
    base.replace(/\s+\d{1,2}월\s*\d{1,2}일(?:\s.*)?$/, '').trim(),
  ].filter(Boolean)))
}

// ── 극장 매칭 ────────────────────────────────────────────────────
function matchTheater(name: string, theaters: Theater[]) {
  const exact = theaters.find(t => t.name.trim() === name.trim())
  if (exact) return exact
  const n = normalize(name)
  return theaters.find(t => normalize(t.name) === n)
}

// ── 영화 로컬 매칭 ───────────────────────────────────────────────
function matchMovie(title: string, movies: Movie[]) {
  const exact = movies.find(m => m.title.trim() === title.trim())
  if (exact) return exact
  const n = normalize(title)
  return movies.find(m => normalize(m.title) === n)
}

// ── KMDB 검색 ────────────────────────────────────────────────────
async function searchKmdb(query: string): Promise<{ movieId: string; movieSeq: string; title: string } | null> {
  const url = new URL('https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp')
  url.searchParams.set('collection', 'kmdb_new2')
  url.searchParams.set('ServiceKey', KMDB_KEY)
  url.searchParams.set('query', query)
  url.searchParams.set('detail', 'Y')
  url.searchParams.set('listCount', '5')
  url.searchParams.set('startCount', '0')

  try {
    const res = await fetch(url)
    const json = await res.json() as { Data?: Array<{ Result?: Array<{ movieId?: string; movieSeq?: string; title?: string; directorNm?: string; nation?: string; prodYear?: string; plot?: string; runtime?: string; rating?: string; genre?: string; posterUrl?: string; posters?: string }> }> }
    const items = json.Data?.[0]?.Result ?? []
    const nq = normalize(query)
    const hit = items.find(i => {
      const t = (i.title ?? '').replace(/\s*!HS\s*|\s*!HE\s*/g, '').trim()
      return normalize(t) === nq
    })
    if (!hit?.movieId || !hit?.movieSeq) return null
    const cleanTitle = (hit.title ?? '').replace(/\s*!HS\s*|\s*!HE\s*/g, '').trim()
    return {
      movieId: hit.movieId,
      movieSeq: hit.movieSeq,
      title: cleanTitle,
    }
  } catch {
    return null
  }
}

// ── KMDB에서 영화 상세 가져와 upsert ────────────────────────────
async function importFromKmdb(movieId: string, movieSeq: string): Promise<Movie | null> {
  const url = new URL('https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp')
  url.searchParams.set('collection', 'kmdb_new2')
  url.searchParams.set('ServiceKey', KMDB_KEY)
  url.searchParams.set('movieId', movieId)
  url.searchParams.set('movieSeq', movieSeq)
  url.searchParams.set('detail', 'Y')
  url.searchParams.set('listCount', '3')

  const res = await fetch(url)
  const json = await res.json() as { Data?: Array<{ Result?: Array<Record<string, string>> }> }
  const item = json.Data?.[0]?.Result?.[0]
  if (!item) return null

  const clean = (v?: string) => (v ?? '').replace(/<!HS>|<!HE>|!HS|!HE/g, '').replace(/\s+/g, ' ').trim()
  const title = clean(item.title)
  const year = parseInt(item.prodYear ?? '') || new Date().getFullYear()
  const genre = clean(item.genre).split(/[,|]/).map(s => s.trim()).filter(Boolean)
  const director = clean(item.directorNm).split(/[,|]/).map(s => s.trim()).filter(Boolean)
  const posterUrl = (clean(item.posterUrl) || clean(item.posters)).split('|').find(Boolean) ?? null
  const nation = clean(item.nation) || null
  const synopsis = clean(item.plot) || null
  const runtimeMinutes = parseInt(item.runtime ?? '') || null
  const certification = clean(item.rating) || null

  const row = {
    title, year, genre, director,
    kmdb_id: movieId, kmdb_movie_seq: movieSeq,
    poster_url: posterUrl, nation, synopsis, runtime_minutes: runtimeMinutes, certification,
    original_title: (clean(item.titleOrg) || clean(item.titleEng)) || null,
  }

  // 이미 있으면 update, 없으면 insert
  const { data: existing } = await supabase.from('movies')
    .select('id').eq('kmdb_id', movieId).eq('kmdb_movie_seq', movieSeq).maybeSingle()

  if (existing) {
    const { data, error } = await supabase.from('movies').update(row).eq('id', (existing as { id: string }).id).select('id, title').single()
    if (error) { console.error(`  영화 update 실패: ${error.message}`); return null }
    return data as Movie
  }

  const { data, error } = await supabase.from('movies').insert(row).select('id, title').single()
  if (error) {
    // kmdb_id unique 충돌 → 기존 레코드 반환
    if (error.code === '23505') {
      const { data: found } = await supabase.from('movies').select('id, title').eq('kmdb_id', movieId).maybeSingle()
      if (found) return found as Movie
    }
    console.error(`  영화 insert 실패: ${error.message}`)
    return null
  }
  return data as Movie
}

// ── 메인 ─────────────────────────────────────────────────────────
async function main() {
  // 1. 기존 극장/영화 목록 로드
  const { data: theaters } = await supabase.from('theaters').select('id, name')
  const { data: movies } = await supabase.from('movies').select('id, title, kmdb_id, kmdb_movie_seq')
  const theaterList = (theaters ?? []) as Theater[]
  const movieList = (movies ?? []) as Movie[]

  // 2. 전체 미처리 후보 로드
  const { data: candidateRows } = await supabase
    .from('showtime_candidates')
    .select('*')
    .in('status', ['draft', 'needs_review'])
  const candidates = (candidateRows ?? []) as Candidate[]
  console.log(`\n후보 ${candidates.length}개 처리 시작\n`)

  const approved: string[] = []
  const failed: Array<{ title: string; reason: string }> = []

  for (const c of candidates) {
    // 극장 매칭
    const theater = matchTheater(c.theater_name, theaterList)
    if (!theater) {
      failed.push({ title: c.movie_title, reason: `극장 매칭 실패: ${c.theater_name}` })
      continue
    }

    // 영화 매칭 (로컬 → KMDB 순)
    let movie: Movie | null = null
    const matchedId = c.matched_movie_id
    if (matchedId) movie = movieList.find(m => m.id === matchedId) ?? null

    if (!movie) {
      for (const title of titleCandidates(c.movie_title)) {
        movie = matchMovie(title, movieList) ?? null
        if (movie) break

        // KMDB 검색
        process.stdout.write(`  KMDB 검색: ${title} ... `)
        const hit = await searchKmdb(title)
        if (hit) {
          const imported = await importFromKmdb(hit.movieId, hit.movieSeq)
          if (imported) {
            movieList.push(imported)
            movie = imported
            console.log(`OK (${imported.title})`)
            break
          }
        } else {
          console.log('없음')
        }
      }
    }

    if (!movie) {
      failed.push({ title: c.movie_title, reason: 'KMDB 매칭 실패' })
      await supabase.from('showtime_candidates')
        .update({ matched_theater_id: theater.id, status: 'needs_review' })
        .eq('id', c.id)
      continue
    }

    // showtimes upsert
    const { error: upsertErr } = await supabase.from('showtimes').upsert({
      theater_id: theater.id,
      movie_id: movie.id,
      screen_name: c.screen_name,
      show_date: c.show_date,
      show_time: c.show_time,
      end_time: c.end_time,
      format_type: c.format_type,
      language: c.language,
      seat_available: c.seat_available,
      seat_total: c.seat_total,
      price: c.price,
      booking_url: c.booking_url,
      is_active: true,
    }, { onConflict: 'theater_id,movie_id,show_date,show_time,screen_name' })

    if (upsertErr) {
      failed.push({ title: c.movie_title, reason: upsertErr.message })
      continue
    }

    await supabase.from('showtime_candidates').update({
      status: 'approved',
      matched_theater_id: theater.id,
      matched_movie_id: movie.id,
      approved_at: new Date().toISOString(),
      approved_by: 'seed-script',
    }).eq('id', c.id)

    approved.push(c.movie_title)
    console.log(`  ✓ ${c.movie_title} @ ${c.theater_name} (${c.show_date} ${c.show_time})`)
  }

  console.log(`\n────────────────────────────`)
  console.log(`승인 완료: ${approved.length}개`)
  console.log(`실패: ${failed.length}개`)
  if (failed.length > 0) {
    console.log('\n실패 목록:')
    const uniq = new Map<string, string>()
    for (const f of failed) uniq.set(f.title, f.reason)
    for (const [title, reason] of uniq) console.log(`  - ${title}: ${reason}`)
  }
}

main().catch(console.error)
