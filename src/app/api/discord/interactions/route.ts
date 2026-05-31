/**
 * Discord Interactions Endpoint
 * - PING (엔드포인트 인증)
 * - APPLICATION_COMMAND: /schedule → GPT-4o OCR → showtime_candidates 저장 + 확인 버튼 전송
 * - MESSAGE_COMPONENT: OCR 승인/취소 버튼, 제보 리포트 버튼 액션
 */

import { after } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { formatDiscordReportEmbeds, parseReportAction, reportActionComponents } from '@/lib/reports/discord'
import { updateReportStatus } from '@/lib/reports/store'
import { approveShowtimeCandidates } from '@/lib/admin/store'
import OpenAI from 'openai'
import nacl from 'tweetnacl'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3 } as const
const InteractionResponse = { PONG: 1, CHANNEL_MESSAGE: 4, DEFERRED_CHANNEL_MESSAGE: 5, UPDATE_MESSAGE: 7 } as const

/* ── Discord 서명 검증 ── */
async function verifyRequest(request: Request): Promise<{ valid: boolean; body: string }> {
  const signature = request.headers.get('x-signature-ed25519') ?? ''
  const timestamp = request.headers.get('x-signature-timestamp') ?? ''
  const body = await request.text()

  if (!signature || !timestamp) return { valid: false, body }

  try {
    const isValid = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(DISCORD_PUBLIC_KEY, 'hex'),
    )
    return { valid: isValid, body }
  } catch {
    return { valid: false, body }
  }
}

/* ── Discord 웹훅 메시지 전송 ── */
async function sendDiscordWebhook(token: string, payload: Record<string, unknown>) {
  await fetch(`https://discord.com/api/v10/webhooks/${process.env.DISCORD_APPLICATION_ID}/${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/* ── /schedule OCR 처리 ── */
interface ParsedShowtime { movieTitle: string; showDate: string; showTime: string; screenName: string; endTime?: string }
interface ParsedSchedule { theaterName: string; showtimes: ParsedShowtime[]; corrections: string[]; confidence: number }

async function ocrScheduleImage(imageUrl: string, theaterHint: string): Promise<ParsedSchedule> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`이미지 다운로드 실패: ${res.status}`)

  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const rawType = res.headers.get('content-type') ?? 'image/jpeg'
  const mediaType = (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(rawType)
    ? rawType : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  const openai = new OpenAI()
  const year = new Date().getFullYear()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
        { type: 'text', text: `이 이미지는 한국 독립/예술 영화관의 상영시간표입니다.\n${theaterHint ? `극장명 힌트: ${theaterHint}` : ''}\n\n모든 상영 정보를 빠짐없이 추출해서 JSON으로만 반환하세요.\n- 날짜: YYYY-MM-DD (연도 없으면 ${year} 사용)\n- 시간: HH:MM (24시간제)\n- 대관/휴관/이벤트는 제외\n\n{"theaterName":"극장명","showtimes":[{"movieTitle":"영화 제목","showDate":"2026-05-28","showTime":"14:00","screenName":"1관","endTime":"16:10"}],"corrections":["교정 메모"],"confidence":0.95}` },
      ],
    }],
  })

  const text = response.choices[0].message.content?.trim() ?? ''
  if (response.choices[0].finish_reason === 'length') throw new Error('응답이 너무 길어 잘렸습니다. 이미지 한 장에 상영 정보가 너무 많으면 날짜별로 나눠서 전송해주세요.')
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON 파싱 실패')
  return JSON.parse(match[0]) as ParsedSchedule
}

async function saveOcrToSupabase(schedule: ParsedSchedule): Promise<{ count: number; sourceId: string }> {
  const supabase = createSupabaseAdminClient()
  const id = `ocr-${schedule.theaterName.replace(/[^a-z0-9가-힣]/gi, '-').toLowerCase()}`

  let { data: source } = await supabase.from('crawl_sources').select('id, matched_theater_id').eq('id', id).maybeSingle()
  if (!source) {
    const { data: theater } = await supabase.from('theaters').select('id').ilike('name', `%${schedule.theaterName}%`).maybeSingle()
    const { data: created } = await supabase.from('crawl_sources').insert({
      id, theater_id: id, theater_name: schedule.theaterName, matched_theater_id: theater?.id ?? null,
      homepage_url: null, listing_url: 'ocr://discord', parser: 'ocr',
      enabled: true, cadence: 'manual', health: 'healthy', notes: 'Discord /schedule 커맨드로 수집',
    }).select('id, matched_theater_id').single()
    source = created
  }
  if (!source) throw new Error('소스 생성 실패')

  await supabase.from('crawl_runs').insert({
    id: randomUUID(), source_id: source.id, source_name: schedule.theaterName,
    status: 'completed', input_kind: 'url', started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(), created_count: schedule.showtimes.length,
    updated_count: 0, warning_count: schedule.corrections.length, error: null,
  })

  const seenFingerprints = new Set<string>()
  const rows = schedule.showtimes.flatMap((st) => {
    const fingerprint = Buffer.from(`${source!.id}|${st.movieTitle}|${st.showDate}|${st.showTime}|${st.screenName || '1관'}`).toString('base64').slice(0, 64)
    if (seenFingerprints.has(fingerprint)) return []
    seenFingerprints.add(fingerprint)
    return [{
      id: randomUUID(), source_id: source!.id, theater_id: source!.id,
      theater_name: schedule.theaterName, matched_theater_id: source!.matched_theater_id ?? null,
      movie_title: st.movieTitle, screen_name: st.screenName || '1관',
      show_date: st.showDate, show_time: st.showTime, end_time: st.endTime ?? null,
      format_type: 'standard', language: 'korean', seat_available: 0, seat_total: 0,
      price: 0, booking_url: null, source_url: null, raw_text: JSON.stringify(st),
      confidence: schedule.confidence, warnings: schedule.corrections, status: 'draft',
      fingerprint,
    }]
  })

  const { error } = await supabase.from('showtime_candidates').upsert(rows, { onConflict: 'fingerprint' })
  if (error) throw new Error(error.message)
  return { count: rows.length, sourceId: id }
}

function buildOcrEmbed(schedule: ParsedSchedule, count: number) {
  // 날짜별로 그룹핑
  const byDate = new Map<string, string[]>()
  for (const st of schedule.showtimes) {
    const list = byDate.get(st.showDate) ?? []
    list.push(`\`${st.showTime}\` ${st.movieTitle}`)
    byDate.set(st.showDate, list)
  }

  const fields = Array.from(byDate.entries()).slice(0, 25).map(([date, times]) => ({
    name: date,
    value: times.join('\n').slice(0, 1024),
    inline: true,
  }))

  return {
    title: `📋 ${schedule.theaterName} — ${count}개 후보`,
    color: 0x5865F2,
    fields,
    footer: { text: `신뢰도 ${Math.round(schedule.confidence * 100)}% · 승인하면 즉시 상영시간표에 등록됩니다` },
  }
}

function ocrActionComponents(sourceId: string) {
  return [{
    type: 1,
    components: [
      { type: 2, style: 3, label: '✅ 전체 승인', custom_id: `ocr_confirm:${sourceId}` },
      { type: 2, style: 4, label: '❌ 취소', custom_id: `ocr_cancel:${sourceId}` },
    ],
  }]
}

async function processScheduleCommand(token: string, imageUrl: string, theaterHint: string) {
  try {
    const schedule = await ocrScheduleImage(imageUrl, theaterHint)
    if (!schedule.showtimes.length) {
      await sendDiscordWebhook(token, { content: '❌ 상영 정보를 찾을 수 없습니다. 상영시간표 이미지인지 확인해주세요.' })
      return
    }
    const { count, sourceId } = await saveOcrToSupabase(schedule)
    await sendDiscordWebhook(token, {
      embeds: [buildOcrEmbed(schedule, count)],
      components: ocrActionComponents(sourceId),
    })
  } catch (err) {
    await sendDiscordWebhook(token, { content: `❌ 처리 실패: ${err instanceof Error ? err.message : String(err)}` })
  }
}

/* ── OCR 후보 승인/취소 ── */
async function handleOcrConfirm(sourceId: string) {
  const supabase = createSupabaseAdminClient()
  const { data: rows } = await supabase
    .from('showtime_candidates')
    .select('id')
    .eq('source_id', sourceId)
    .eq('status', 'draft')

  if (!rows?.length) {
    return { ok: false, message: '승인할 후보가 없습니다. 이미 처리됐거나 만료됐을 수 있습니다.' }
  }

  const result = await approveShowtimeCandidates(rows.map((r) => r.id), 'discord')
  return {
    ok: true,
    message: `✅ 승인 완료: **${result.approved.length}개** 등록${result.failed.length > 0 ? ` / 실패 ${result.failed.length}개` : ''}`,
  }
}

async function handleOcrCancel(sourceId: string) {
  const supabase = createSupabaseAdminClient()
  await supabase
    .from('showtime_candidates')
    .update({ status: 'rejected' })
    .eq('source_id', sourceId)
    .eq('status', 'draft')
  return { ok: false, message: '❌ 취소됐습니다. 후보가 삭제됐습니다.' }
}

/* ── Route Handler ── */
export async function POST(request: Request) {
  const { valid, body } = await verifyRequest(request)
  if (!valid) return new Response('Invalid signature', { status: 401 })

  const interaction = JSON.parse(body) as {
    type: number; token: string
    data?: { name?: string; custom_id?: string; options?: Array<{ name: string; value: string }>; resolved?: { attachments?: Record<string, { url: string; content_type?: string }> } }
  }

  // PING
  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponse.PONG })
  }

  // /schedule 슬래시 커맨드
  if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data?.name === 'schedule') {
    const attachmentId = interaction.data.options?.find((o) => o.name === 'image')?.value
    const theaterHint = interaction.data.options?.find((o) => o.name === 'theater')?.value ?? ''
    const attachment = attachmentId ? interaction.data.resolved?.attachments?.[attachmentId] : undefined

    if (!attachment?.url) {
      return Response.json({ type: InteractionResponse.CHANNEL_MESSAGE, data: { content: '❌ 이미지를 첨부해주세요. `/schedule image:파일 theater:극장명`' } })
    }

    after(() => processScheduleCommand(interaction.token, attachment.url, theaterHint))
    return Response.json({ type: InteractionResponse.DEFERRED_CHANNEL_MESSAGE })
  }

  // 버튼 컴포넌트 액션
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id ?? ''

    // OCR 승인/취소
    if (customId.startsWith('ocr_confirm:') || customId.startsWith('ocr_cancel:')) {
      const colonIdx = customId.indexOf(':')
      const action = customId.slice(0, colonIdx)
      const sourceId = customId.slice(colonIdx + 1)

      try {
        const result = action === 'ocr_confirm'
          ? await handleOcrConfirm(sourceId)
          : await handleOcrCancel(sourceId)

        return Response.json({
          type: InteractionResponse.UPDATE_MESSAGE,
          data: {
            embeds: [{
              description: result.message,
              color: result.ok ? 0x57F287 : 0xED4245,
            }],
            components: [],
            allowed_mentions: { parse: [] },
          },
        })
      } catch (error) {
        return ephemeralResponse(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.')
      }
    }

    // 제보 리포트 버튼 액션
    const action = parseReportAction(customId)
    if (!action) return ephemeralResponse('알 수 없는 액션입니다.')

    try {
      const report = await updateReportStatus(action.reportId, action.status)
      return Response.json({
        type: InteractionResponse.UPDATE_MESSAGE,
        data: {
          embeds: formatDiscordReportEmbeds(report, action.status),
          components: reportActionComponents(report.id, true),
          allowed_mentions: { parse: [] },
        },
      })
    } catch (error) {
      return ephemeralResponse(error instanceof Error ? error.message : '제보 상태를 변경하지 못했습니다.')
    }
  }

  return Response.json({ type: InteractionResponse.CHANNEL_MESSAGE, data: { content: '알 수 없는 커맨드입니다.' } })
}

function ephemeralResponse(content: string) {
  return Response.json({
    type: InteractionResponse.CHANNEL_MESSAGE,
    data: { content, flags: 64, allowed_mentions: { parse: [] } },
  })
}
