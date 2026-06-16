/**
 * 큐레이션 리스트 대기 제목 해소 스크립트
 * 사용법: npm run curate:resolve-pending
 *
 * curation_list.pending_titles 에 등록된 제목 중 movies 테이블에 추가된 것을
 * member_ids 로 자동 편입하고 pending_titles 에서 제거한다.
 * crawl:showtimes 완료 후 자동 실행 (package.json 참고).
 */

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, '').toLowerCase()
}

async function main() {
  const supabase = createSupabaseAdminClient()

  const { data: lists, error: listErr } = await supabase
    .from('curation_list')
    .select('list_id, name_ko, member_ids, pending_titles')
    .eq('type', 'static')
    .neq('pending_titles', '[]')

  if (listErr) {
    // pending_titles 컬럼 미생성 시 graceful skip (add_curation_pending_titles.sql 먼저 실행 필요)
    if (String(listErr.message).includes('pending_titles')) {
      console.log('pending_titles 컬럼 없음 — add_curation_pending_titles.sql 실행 후 재시도.')
      return
    }
    throw listErr
  }
  if (!lists?.length) { console.log('대기 중인 제목 없음.'); return }

  const { data: movies, error: movieErr } = await supabase
    .from('movies')
    .select('id, title')
  if (movieErr) throw movieErr

  // 정규화된 제목 → id 맵
  const titleMap = new Map<string, string>()
  for (const m of movies ?? []) {
    titleMap.set(normalizeTitle(m.title), m.id)
  }

  let totalResolved = 0

  for (const list of lists) {
    const pending: string[] = list.pending_titles ?? []
    const memberIds: string[] = list.member_ids ?? []
    const memberSet = new Set(memberIds)

    const resolved: string[] = []
    const stillPending: string[] = []

    for (const title of pending) {
      const id = titleMap.get(normalizeTitle(title))
      if (id && !memberSet.has(id)) {
        resolved.push(title)
        memberIds.push(id)
        memberSet.add(id)
      } else {
        stillPending.push(title)
      }
    }

    if (resolved.length === 0) continue

    const { error: updateErr } = await supabase
      .from('curation_list')
      .update({ member_ids: memberIds, pending_titles: stillPending })
      .eq('list_id', list.list_id)

    if (updateErr) {
      console.error(`[${list.list_id}] 업데이트 실패:`, updateErr.message)
      continue
    }

    console.log(`[${list.name_ko}] ${resolved.length}편 편입: ${resolved.join(', ')}`)
    totalResolved += resolved.length
  }

  if (totalResolved === 0) console.log('새로 해소된 영화 없음.')
  else console.log(`\n총 ${totalResolved}편 member_ids 편입 완료.`)
}

main()
