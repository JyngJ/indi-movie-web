import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { CreateUserRequestInput, UserRequestRecord, UserRequestStatus } from './types'

interface UserRequestRow {
  id: string
  kind: string
  name: string
  note: string | null
  query: string | null
  status: UserRequestStatus
  discord_message_id: string | null
  created_at: string
  updated_at: string
}

export async function createUserRequest(input: CreateUserRequestInput) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_requests')
    .insert({
      kind: input.kind,
      name: input.name,
      note: input.note || null,
      query: input.query || null,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) throw new Error(`요청 저장 실패: ${error.message}`)
  return userRequestFromRow(data as UserRequestRow)
}

export async function setUserRequestDiscordMessageId(requestId: string, messageId: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('user_requests')
    .update({ discord_message_id: messageId })
    .eq('id', requestId)

  if (error) throw new Error(`Discord 메시지 연결 실패: ${error.message}`)
}

export async function updateUserRequestStatus(requestId: string, status: UserRequestStatus) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_requests')
    .update({ status })
    .eq('id', requestId)
    .select('*')
    .single()

  if (error) throw new Error(`요청 상태 변경 실패: ${error.message}`)
  return userRequestFromRow(data as UserRequestRow)
}

function userRequestFromRow(row: UserRequestRow): UserRequestRecord {
  return {
    id: row.id,
    kind: row.kind as UserRequestRecord['kind'],
    name: row.name,
    note: row.note ?? undefined,
    query: row.query ?? undefined,
    status: row.status,
    discordMessageId: row.discord_message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
