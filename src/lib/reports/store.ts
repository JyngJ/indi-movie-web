import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { CreateReportInput, ReportRecord, ReportStatus } from './types'

interface ReportRow {
  id: string
  category: string
  detail: string
  email: string | null
  consent: boolean
  files: unknown
  page_url: string | null
  selected_theater_id: string | null
  selected_theater_name: string | null
  selected_movie_id: string | null
  status: ReportStatus
  discord_message_id: string | null
  created_at: string
  updated_at: string
}

export async function createReport(input: CreateReportInput) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('reports')
    .insert({
      category: input.category,
      detail: input.detail,
      email: input.email || null,
      consent: input.consent,
      files: input.files,
      page_url: input.pageUrl || null,
      selected_theater_id: input.selectedTheaterId || null,
      selected_theater_name: input.selectedTheaterName || null,
      selected_movie_id: input.selectedMovieId || null,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) throw new Error(`제보 저장 실패: ${error.message}`)
  return reportFromRow(data as ReportRow)
}

export async function setReportDiscordMessageId(reportId: string, messageId: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('reports')
    .update({ discord_message_id: messageId })
    .eq('id', reportId)

  if (error) throw new Error(`Discord 메시지 연결 실패: ${error.message}`)
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('reports')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select('*')
    .single()

  if (error) throw new Error(`제보 상태 변경 실패: ${error.message}`)
  return reportFromRow(data as ReportRow)
}

function reportFromRow(row: ReportRow): ReportRecord {
  return {
    id: row.id,
    category: row.category as ReportRecord['category'],
    detail: row.detail,
    email: row.email ?? undefined,
    consent: row.consent,
    files: Array.isArray(row.files) ? row.files as ReportRecord['files'] : [],
    pageUrl: row.page_url ?? undefined,
    selectedTheaterId: row.selected_theater_id ?? undefined,
    selectedTheaterName: row.selected_theater_name ?? undefined,
    selectedMovieId: row.selected_movie_id ?? undefined,
    status: row.status,
    discordMessageId: row.discord_message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
