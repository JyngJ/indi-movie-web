import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { CreateSurveyInput } from './types'

export async function createSurveyResponse(input: CreateSurveyInput) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('survey_responses')
    .insert({
      verdict: input.verdict,
      good_point: input.goodPoints.join(','),
      bad_point: input.badPoints.join(','),
      etc_text: input.etcText?.trim() || null,
      movie_missing_text: input.movieMissingText?.trim() || null,
      improvement: input.improvement?.trim() || null,
      session_id: input.sessionId || null,
      device: input.device || null,
      page_url: input.pageUrl || null,
    })
    .select('id, verdict, good_point, bad_point, created_at')
    .single()

  if (error) throw new Error(`설문 저장 실패: ${error.message}`)
  return data as {
    id: string
    verdict: string
    good_point: string
    bad_point: string
    created_at: string
  }
}
