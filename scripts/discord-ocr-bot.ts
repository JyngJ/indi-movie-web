/**
 * Discord OCR 봇 — 이미지 기반 상영시간표 자동 파싱
 *
 * 동작:
 * 1. 지정 채널에 이미지 첨부 시 감지
 * 2. Claude Vision으로 OCR + 구조화 파싱
 * 3. showtime_candidates에 draft 상태로 삽입
 *
 * 실행: npx tsx --env-file=.env.local scripts/discord-ocr-bot.ts
 *
 * 필요 환경변수:
 *   DISCORD_BOT_TOKEN      — Discord 봇 토큰
 *   DISCORD_OCR_CHANNEL_ID — 이미지를 받을 채널 ID
 *   ANTHROPIC_API_KEY      — Claude API 키
 */

import { Client, GatewayIntentBits, type Message } from 'discord.js'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_OCR_CHANNEL_ID = process.env.DISCORD_OCR_CHANNEL_ID
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!DISCORD_BOT_TOKEN || !DISCORD_OCR_CHANNEL_ID || !ANTHROPIC_API_KEY) {
  console.error('필수 환경변수 누락: DISCORD_BOT_TOKEN, DISCORD_OCR_CHANNEL_ID, ANTHROPIC_API_KEY')
  process.exit(1)
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

interface ParsedShowtime {
  movieTitle: string
  showDate: string   // YYYY-MM-DD
  showTime: string   // HH:MM
  screenName?: string
  endTime?: string
}

interface ParsedSchedule {
  theaterName: string
  showtimes: ParsedShowtime[]
}

async function ocrScheduleImage(imageUrl: string): Promise<ParsedSchedule> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`이미지 다운로드 실패: ${res.status}`)

  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const rawType = res.headers.get('content-type') ?? 'image/jpeg'
  const mediaType = (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(rawType)
    ? rawType
    : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  const year = new Date().getFullYear()
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        {
          type: 'text',
          text: `이 이미지는 한국 독립/예술 영화관의 상영시간표입니다.
모든 상영 정보를 빠짐없이 추출해서 아래 JSON 형식으로만 반환하세요.
- 날짜: YYYY-MM-DD (연도 없으면 ${year} 사용)
- 시간: HH:MM (24시간제)
- 극장명을 이미지에서 찾을 수 없으면 "알 수 없음" 사용

{
  "theaterName": "극장명",
  "showtimes": [
    {
      "movieTitle": "영화 제목",
      "showDate": "2026-05-28",
      "showTime": "14:00",
      "screenName": "1관",
      "endTime": "16:10"
    }
  ]
}

JSON 외 다른 텍스트는 절대 포함하지 마세요.`,
        },
      ],
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('응답에서 JSON을 찾을 수 없습니다')

  const parsed = JSON.parse(match[0]) as ParsedSchedule
  if (!parsed.theaterName || !Array.isArray(parsed.showtimes)) {
    throw new Error('파싱 결과 형식 오류')
  }

  return parsed
}

async function getOrCreateSource(theaterName: string) {
  const { data: existing } = await sb
    .from('crawl_sources')
    .select('id, theater_name, matched_theater_id')
    .eq('theater_name', theaterName)
    .maybeSingle()

  if (existing) return existing

  // theaters 테이블에서 극장 찾기
  const { data: theater } = await sb
    .from('theaters')
    .select('id, name')
    .ilike('name', `%${theaterName}%`)
    .maybeSingle()

  const id = `ocr-${theaterName.replace(/[^a-z0-9가-힣]/gi, '-').toLowerCase()}`

  const { data: created, error } = await sb
    .from('crawl_sources')
    .insert({
      id,
      theater_id: id,
      theater_name: theaterName,
      matched_theater_id: theater?.id ?? null,
      homepage_url: null,
      listing_url: 'ocr://discord',
      parser: 'ocr',
      enabled: true,
      cadence: 'manual',
      health: 'healthy',
      notes: 'Discord OCR 봇으로 수동 수집',
    })
    .select('id, theater_name, matched_theater_id')
    .single()

  if (error) throw new Error(`소스 생성 실패: ${error.message}`)
  return created
}

function fingerprint(sourceId: string, movieTitle: string, showDate: string, showTime: string) {
  return Buffer.from(`${sourceId}|${movieTitle}|${showDate}|${showTime}`).toString('base64').slice(0, 64)
}

async function saveCandidates(schedule: ParsedSchedule, source: { id: string; matched_theater_id: string | null }) {
  const runId = randomUUID()

  await sb.from('crawl_runs').insert({
    id: runId,
    source_id: source.id,
    source_name: schedule.theaterName,
    status: 'completed',
    input_kind: 'url',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    created_count: schedule.showtimes.length,
    updated_count: 0,
    warning_count: 0,
    error: null,
  })

  const rows = schedule.showtimes.map((st) => ({
    id: randomUUID(),
    source_id: source.id,
    theater_id: source.id,
    theater_name: schedule.theaterName,
    matched_theater_id: source.matched_theater_id ?? null,
    movie_title: st.movieTitle,
    screen_name: st.screenName ?? '1관',
    show_date: st.showDate,
    show_time: st.showTime,
    end_time: st.endTime ?? null,
    format_type: 'normal',
    language: 'korean',
    seat_available: 0,
    seat_total: 0,
    price: 0,
    booking_url: null,
    source_url: null,
    raw_text: JSON.stringify(st),
    confidence: 0.8,
    warnings: [],
    status: 'draft',
    fingerprint: fingerprint(source.id, st.movieTitle, st.showDate, st.showTime),
  }))

  const { error } = await sb
    .from('showtime_candidates')
    .upsert(rows, { onConflict: 'fingerprint' })

  if (error) throw new Error(`후보 저장 실패: ${error.message}`)
  return rows.length
}

async function processMessage(message: Message) {
  const images = [...message.attachments.values()].filter(
    (att) => att.contentType?.startsWith('image/') ?? false,
  )
  if (images.length === 0) return

  const reply = await message.reply('⏳ 상영시간표 분석 중...')

  for (const attachment of images) {
    try {
      console.log(`[OCR] 이미지 처리 중: ${attachment.url}`)
      const schedule = await ocrScheduleImage(attachment.url)

      if (!schedule.showtimes.length) {
        await reply.edit('❌ 상영 정보를 찾을 수 없습니다.')
        continue
      }

      const source = await getOrCreateSource(schedule.theaterName)
      const count = await saveCandidates(schedule, source)

      const preview = schedule.showtimes
        .slice(0, 5)
        .map((st) => `• \`${st.showDate} ${st.showTime}\` ${st.movieTitle}`)
        .join('\n')
      const more = count > 5 ? `\n... 외 ${count - 5}개` : ''

      await reply.edit(
        `✅ **${schedule.theaterName}** — ${count}개 후보 등록 완료\n${preview}${more}\n\n` +
        `어드민 검수 대기열에서 확인 후 승인해주세요.`,
      )
      console.log(`[OCR] ${schedule.theaterName} ${count}개 저장 완료`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[OCR] 실패:`, err)
      await reply.edit(`❌ 처리 실패: ${msg}`)
    }
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once('ready', () => {
  console.log(`✅ 봇 준비 완료: ${client.user?.tag}`)
  console.log(`📺 감시 채널: ${DISCORD_OCR_CHANNEL_ID}`)
})

client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  if (message.channelId !== DISCORD_OCR_CHANNEL_ID) return
  await processMessage(message)
})

client.login(DISCORD_BOT_TOKEN)
