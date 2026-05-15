/**
 * 1. movies 테이블 kmdb_id 단독 unique 제약 제거 → (kmdb_id, kmdb_movie_seq) 복합 unique로 교체
 * 2. 기존 잘못된 movies/showtimes 데이터 삭제
 * 3. 후보 상태 초기화 (approved → needs_review)
 * 4. 재씨딩
 *
 * 실행: npx tsx --env-file=.env.local scripts/fix-schema-and-reseed.ts
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

// ── 텍스트 정규화 ──────────────────────────────────────────────────
function normalize(v: string) {
  return v.trim().toLowerCase().normalize('NFKC')
    .replace(/[\s"'''""()[\]{}:;,.!?·ㆍ・_-]+/g, '')
}

function clean(v?: string) {
  return (v ?? '').replace(/<!HS>|<!HE>|!HS|!HE/g, '').replace(/\s+/g, ' ').trim()
}

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

// ── KMDB 검색 ──────────────────────────────────────────────────────
async function searchKmdb(query: string) {
  const url = new URL('https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp')
  url.searchParams.set('collection', 'kmdb_new2')
  url.searchParams.set('ServiceKey', process.env.KMDB_SERVICE_KEY!)
  url.searchParams.set('query', query)
  url.searchParams.set('detail', 'Y')
  url.searchParams.set('listCount', '5')
  url.searchParams.set('startCount', '0')

  try {
    const res = await fetch(url)
    const json = await res.json() as { Data?: Array<{ Result?: Array<Record<string, unknown>> }> }
    const items = json.Data?.[0]?.Result ?? []
    const nq = normalize(query)
    const hit = items.find(i => {
      const t = clean(i.title as string)
      return normalize(t) === nq
    })
    if (!hit) return null
    const movieId = hit.movieId as string
    const movieSeq = hit.movieSeq as string
    if (!movieId || !movieSeq) return null

    // 감독: directorNm (flat) 또는 directors.director[].directorNm (nested)
    let directorNames: string[] = []
    const flat = clean(hit.directorNm as string)
    if (flat) {
      directorNames = flat.split(/[,|]/).map(s => s.trim()).filter(Boolean)
    } else {
      const nested = hit.directors as { director?: Array<{ directorNm?: string }> } | undefined
      if (nested?.director) {
        directorNames = nested.director.map(d => clean(d.directorNm)).filter(Boolean)
      }
    }

    return {
      movieId,
      movieSeq,
      title: clean(hit.title as string),
      year: parseInt(hit.prodYear as string) || new Date().getFullYear(),
      genre: clean(hit.genre as string).split(/[,|]/).map(s => s.trim()).filter(Boolean),
      director: directorNames,
      nation: clean(hit.nation as string) || undefined,
      posterUrl: (clean(hit.posterUrl as string) || clean(hit.posters as string)).split('|').find(Boolean) ?? undefined,
      synopsis: clean(hit.plot as string) || undefined,
      runtimeMinutes: parseInt(hit.runtime as string) || undefined,
      certification: clean(hit.rating as string) || undefined,
      originalTitle: (clean(hit.titleOrg as string) || clean(hit.titleEng as string)) || undefined,
    }
  } catch (e) {
    console.error('  KMDB 오류:', e)
    return null
  }
}

interface Movie { id: string; title: string }
interface Theater { id: string; name: string }
interface Candidate {
  id: string; theater_name: string; movie_title: string
  screen_name: string; show_date: string; show_time: string
  end_time: string | null; format_type: string; language: string
  seat_available: number; seat_total: number; price: number
  booking_url: string | null; matched_theater_id: string | null
}

function matchTheater(name: string, list: Theater[]) {
  return list.find(t => t.name.trim() === name.trim())
    ?? list.find(t => normalize(t.name) === normalize(name))
}

function matchMovie(title: string, list: Movie[]) {
  return list.find(m => m.title.trim() === title.trim())
    ?? list.find(m => normalize(m.title) === normalize(title))
}

async function main() {
  console.log('── 1. 기존 showtimes 전체 삭제 ──')
  const { error: stErr } = await sb.from('showtimes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (stErr) { console.error(stErr.message); process.exit(1) }
  console.log('  showtimes 삭제 완료')

  console.log('\n── 2. 기존 movies 전체 삭제 ──')
  const { error: mvErr } = await sb.from('movies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (mvErr) { console.error(mvErr.message); process.exit(1) }
  console.log('  movies 삭제 완료')

  console.log('\n── 3. 후보 상태 초기화 (approved → needs_review) ──')
  const { error: cdErr } = await sb.from('showtime_candidates')
    .update({ status: 'needs_review', approved_at: null, approved_by: null })
    .eq('status', 'approved')
  if (cdErr) console.error('  초기화 실패:', cdErr.message)
  else console.log('  후보 상태 초기화 완료')

  console.log('\n── 4. kmdb_id unique 제약 확인 ──')
  // Supabase에서 constraint 정보를 직접 수정할 수 없으므로
  // upsert 시 (kmdb_id, kmdb_movie_seq) 복합 키 기준으로 동작하게 우회
  // → 실제 DB constraint 수정은 Supabase 대시보드 SQL Editor에서 해야 함
  console.log('  ⚠️  Supabase SQL Editor에서 아래 SQL 실행 필요:')
  console.log('  ALTER TABLE movies DROP CONSTRAINT IF EXISTS movies_kmdb_id_key;')
  console.log('  CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_kmdb_identity')
  console.log('    ON movies(kmdb_id, kmdb_movie_seq)')
  console.log('    WHERE kmdb_id IS NOT NULL AND kmdb_movie_seq IS NOT NULL;')

  console.log('\n── 5. 극장/후보 로드 ──')
  const { data: theaters } = await sb.from('theaters').select('id, name')
  const theaterList = (theaters ?? []) as Theater[]
  const movieList: Movie[] = []

  const { data: candidates } = await sb.from('showtime_candidates')
    .select('id, theater_name, movie_title, screen_name, show_date, show_time, end_time, format_type, language, seat_available, seat_total, price, booking_url, matched_theater_id')
    .in('status', ['needs_review', 'draft'])
  const cands = (candidates ?? []) as Candidate[]

  console.log(`  후보 ${cands.length}개`)

  const approved: string[] = []
  const failed: Map<string, string> = new Map()

  for (const c of cands) {
    const theater = matchTheater(c.theater_name, theaterList)
    if (!theater) {
      failed.set(c.movie_title, `극장 매칭 실패: ${c.theater_name}`)
      continue
    }

    let movie: Movie | null = matchMovie(c.movie_title, movieList) ?? null

    if (!movie) {
      for (const title of titleCandidates(c.movie_title)) {
        movie = matchMovie(title, movieList) ?? null
        if (movie) break

        process.stdout.write(`  KMDB: ${title} ... `)
        const hit = await searchKmdb(title)
        if (!hit) { console.log('없음'); continue }

        // (kmdb_id, kmdb_movie_seq) 복합 키로 먼저 조회
        const { data: existing } = await sb.from('movies')
          .select('id, title')
          .eq('kmdb_id', hit.movieId)
          .eq('kmdb_movie_seq', hit.movieSeq)
          .maybeSingle()

        if (existing) {
          movie = existing as Movie
          console.log(`  이미 있음 (${movie.title})`)
          if (!movieList.find(m => m.id === movie!.id)) movieList.push(movie)
          break
        }

        const row = {
          title: hit.title, year: hit.year, genre: hit.genre, director: hit.director,
          kmdb_id: hit.movieId, kmdb_movie_seq: hit.movieSeq,
          poster_url: hit.posterUrl ?? null, nation: hit.nation ?? null,
          synopsis: hit.synopsis ?? null, runtime_minutes: hit.runtimeMinutes ?? null,
          certification: hit.certification ?? null,
          original_title: hit.originalTitle ?? null,
        }

        const { data: inserted, error: insErr } = await sb.from('movies').insert(row).select('id, title').single()
        if (insErr) {
          // 여전히 충돌이면 다시 조회
          if (insErr.code === '23505') {
            const { data: found } = await sb.from('movies').select('id, title').eq('kmdb_id', hit.movieId).maybeSingle()
            if (found) { movie = found as Movie; movieList.push(movie); console.log(`  충돌→재사용 (${movie.title})`); break }
          }
          console.log(`  insert 실패: ${insErr.message}`)
          continue
        }
        movie = inserted as Movie
        movieList.push(movie)
        console.log(`OK → ${movie.title} [감독: ${hit.director.join(', ') || '없음'}]`)
        break
      }
    }

    if (!movie) {
      failed.set(c.movie_title, 'KMDB 매칭 실패')
      await sb.from('showtime_candidates')
        .update({ matched_theater_id: theater.id, status: 'needs_review' }).eq('id', c.id)
      continue
    }

    const { error: uErr } = await sb.from('showtimes').upsert({
      theater_id: theater.id, movie_id: movie.id,
      screen_name: c.screen_name, show_date: c.show_date, show_time: c.show_time,
      end_time: c.end_time, format_type: c.format_type, language: c.language,
      seat_available: c.seat_available, seat_total: c.seat_total, price: c.price,
      booking_url: c.booking_url, is_active: true,
    }, { onConflict: 'theater_id,movie_id,show_date,show_time,screen_name' })

    if (uErr) { failed.set(c.movie_title, uErr.message); continue }

    await sb.from('showtime_candidates').update({
      status: 'approved', matched_theater_id: theater.id, matched_movie_id: movie.id,
      approved_at: new Date().toISOString(), approved_by: 'seed-script',
    }).eq('id', c.id)

    approved.push(`${c.movie_title} @ ${c.theater_name}`)
    console.log(`  ✓ ${c.movie_title} → ${movie.title} (${c.show_date})`)
  }

  console.log(`\n────────────────────────────────`)
  console.log(`승인 완료: ${approved.length}개`)
  console.log(`실패: ${failed.size}개`)
  if (failed.size > 0) {
    console.log('\n실패 목록:')
    for (const [title, reason] of failed) console.log(`  - ${title}: ${reason}`)
  }

  const { data: finalMovies } = await sb.from('movies').select('title, director').order('title')
  console.log(`\n최종 movies 테이블 (${(finalMovies ?? []).length}편):`)
  for (const m of (finalMovies ?? [])) {
    const dir = (Array.isArray(m.director) ? m.director : []).join(', ') || '없음'
    console.log(`  ${m.title} | 감독: ${dir}`)
  }
}

main().catch(console.error)
