import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveOcrSource, type OcrSourceRef, type TheaterRef } from './ocrSource'

export interface EnsuredOcrSource {
  id: string
  matched_theater_id: string | null
}

/**
 * 수동(OCR) 업로드가 담길 수집처를 찾거나 만든다. 판정은 ocrSource.ts의 resolveOcrSource가 한다.
 * 어드민 업로드(`ocr://admin`) · 디스코드 /schedule(`ocr://discord`) · 디스코드 봇이 같이 쓴다.
 */
export async function ensureOcrSource(
  supabase: SupabaseClient,
  input: { ocrTheaterName: string; theaterHint?: string | null; listingUrl: string; notes: string },
): Promise<EnsuredOcrSource> {
  const [{ data: theaters, error: theaterError }, { data: sources, error: sourceError }] = await Promise.all([
    supabase.from('theaters').select('id, name'),
    supabase.from('crawl_sources').select('id, parser, matched_theater_id, created_at').eq('parser', 'ocr'),
  ])
  if (theaterError) throw new Error(`극장 조회 실패: ${theaterError.message}`)
  if (sourceError) throw new Error(`수집처 조회 실패: ${sourceError.message}`)

  const resolution = resolveOcrSource({
    ocrTheaterName: input.ocrTheaterName,
    theaterHint: input.theaterHint,
    theaters: (theaters ?? []) as TheaterRef[],
    ocrSources: (sources ?? []).map((s): OcrSourceRef => ({
      id: s.id,
      parser: s.parser,
      matchedTheaterId: s.matched_theater_id ?? null,
      createdAt: s.created_at ?? null,
    })),
  })

  if (resolution.kind === 'existing') {
    const { data, error } = await supabase
      .from('crawl_sources')
      .select('id, matched_theater_id')
      .eq('id', resolution.sourceId)
      .single()
    if (error || !data) throw new Error(`수집처 조회 실패: ${error?.message ?? resolution.sourceId}`)
    return data
  }

  const { data, error } = await supabase
    .from('crawl_sources')
    .insert({
      id: resolution.sourceId,
      theater_id: resolution.sourceId,
      theater_name: resolution.theaterName,
      matched_theater_id: resolution.matchedTheaterId,
      homepage_url: null,
      listing_url: input.listingUrl,
      parser: 'ocr',
      enabled: true,
      cadence: 'manual',
      health: 'healthy',
      notes: input.notes,
    })
    .select('id, matched_theater_id')
    .single()
  if (error || !data) throw new Error(`소스 생성 실패: ${error?.message ?? resolution.sourceId}`)
  return data
}
