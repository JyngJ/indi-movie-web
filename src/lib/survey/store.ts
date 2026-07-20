import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { CreateSurveyInput } from './types'

export async function createSurveyResponse(input: CreateSurveyInput) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('survey_responses')
    .insert({
      good_point: input.goodPoints.join(','),
      etc_text: input.etcText?.trim() || null,
      improvement: input.improvement?.trim() || null,
      session_id: input.sessionId || null,
      device: input.device || null,
      page_url: input.pageUrl || null,
    })
    .select('id, good_point, etc_text, improvement, created_at')
    .single()

  if (error) throw new Error(`설문 저장 실패: ${error.message}`)
  return data as {
    id: string
    good_point: string
    etc_text: string | null
    improvement: string | null
    created_at: string
  }
}
