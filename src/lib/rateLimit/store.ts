import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { RateLimitResult } from './types'

interface ConsumeRateLimitRow {
  allowed: boolean
  hit_count: number
  retry_after_seconds: number
}

/**
 * consume_rate_limit RPC 어댑터 (supabase/seeds/15_rate_limit.sql).
 * 증가와 판정이 한 문장 안에서 끝나 동시 요청 사이의 경합이 없다.
 */
export async function consumeRateLimit(params: {
  bucketKey: string
  windowSeconds: number
  limit: number
}): Promise<RateLimitResult> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key: params.bucketKey,
    p_window_seconds: params.windowSeconds,
    p_limit: params.limit,
  })

  if (error) throw new Error(`레이트리밋 조회 실패: ${error.message}`)

  const row = (Array.isArray(data) ? data[0] : data) as ConsumeRateLimitRow | undefined
  if (!row) throw new Error('레이트리밋 조회 실패: 빈 응답')

  return {
    allowed: row.allowed,
    hitCount: row.hit_count,
    retryAfterSeconds: row.retry_after_seconds,
  }
}
