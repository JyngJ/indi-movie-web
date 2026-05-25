/**
 * Discord Bot — 이미지 수신 → 시간표 추출 → Supabase 저장
 *
 * 환경변수:
 *   ANTHROPIC_API_KEY       Claude API 키
 *   DISCORD_BOT_TOKEN       Discord 봇 토큰
 *   DISCORD_CHANNEL_ID      감시할 채널 ID (쉼표로 여러 개 가능)
 *   SUPABASE_URL            Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_KEY    Supabase Service Role 키
 *
 * 사용법:
 *   npx tsx src/discord-bot.ts
 */

import 'dotenv/config'
import { Client, Events, GatewayIntentBits } from 'discord.js'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import https from 'https'
import os from 'os'
import { extractWithGPT } from './gpt.ts'
import type { ExtractResult } from './types.ts'

const ALLOWED_CHANNELS = (process.env.DISCORD_CHANNEL_ID ?? '').split(',').map(s => s.trim()).filter(Boolean)
const SUPPORTED_EXTS   = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

/* ── 이미지 URL → 임시 파일 다운로드 ── */
function downloadToTemp(url: string, ext: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpPath = path.join(os.tmpdir(), `pipeline_${Date.now()}${ext}`)
    const file = fs.createWriteStream(tmpPath)
    https.get(url, res => {
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve(tmpPath) })
    }).on('error', reject)
  })
}

/* ── crawl_sources에서 찾거나 생성 ── */
async function getOrCreateSource(theaterName: string) {
  const { data: existing } = await sb
    .from('crawl_sources')
    .select('id, theater_name, matched_theater_id')
    .eq('theater_name', theaterName)
    .maybeSingle()

  if (existing) return existing

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

/* ── showtime_candidates 저장 ── */
async function saveCandidates(result: ExtractResult, source: { id: string; matched_theater_id: string | null }) {
  const runId = randomUUID()

  await sb.from('crawl_runs').insert({
    id: runId,
    source_id: source.id,
    source_name: result.theater_name,
    status: 'completed',
    input_kind: 'url',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    created_count: result.screenings.length,
    updated_count: 0,
    warning_count: result.corrections.length,
    error: null,
  })

  const rows = result.screenings.map((s) => {
    const fp = Buffer.from(`${source.id}|${s.movie_title}|${s.date}|${s.time}`).toString('base64').slice(0, 64)
    return {
      id: randomUUID(),
      source_id: source.id,
      theater_id: source.id,
      theater_name: result.theater_name,
      matched_theater_id: source.matched_theater_id ?? null,
      movie_title: s.movie_title,
      screen_name: s.screen_name || '1관',
      show_date: s.date,
      show_time: s.time,
      end_time: null,
      format_type: 'normal',
      language: 'korean',
      seat_available: 0,
      seat_total: 0,
      price: 0,
      booking_url: null,
      source_url: null,
      raw_text: JSON.stringify(s),
      confidence: result.confidence,
      warnings: result.corrections.length ? result.corrections : [],
      status: 'draft',
      fingerprint: fp,
    }
  })

  const { error } = await sb
    .from('showtime_candidates')
    .upsert(rows, { onConflict: 'fingerprint' })

  if (error) throw new Error(`후보 저장 실패: ${error.message}`)
  return rows.length
}

/* ── Discord 결과 포맷 ── */
function formatReply(result: ExtractResult, count: number): string {
  const lines = [
    `✅ **${result.theater_name || '(극장명 미확인)'}** — ${count}개 후보 등록`,
    `📅 ${result.week_range?.start} ~ ${result.week_range?.end}  |  confidence: ${Math.round(result.confidence * 100)}%`,
    '',
    ...result.screenings.slice(0, 6).map(s => `• \`${s.date} ${s.time}\` ${s.movie_title}`),
    ...(result.screenings.length > 6 ? [`... 외 ${result.screenings.length - 6}개`] : []),
    '',
    '어드민 검수 대기열에서 확인 후 승인해주세요.',
  ]
  if (result.corrections.length) {
    lines.push('', `⚠️ 교정 항목 ${result.corrections.length}개:`)
    result.corrections.slice(0, 3).forEach(c => lines.push(`  - ${c}`))
  }
  return lines.join('\n')
}

/* ── Bot ── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once(Events.ClientReady, (c) => {
  console.log(`[Bot] 로그인 완료: ${c.user.tag}`)
  if (ALLOWED_CHANNELS.length) {
    console.log(`[Bot] 감시 채널: ${ALLOWED_CHANNELS.join(', ')}`)
  } else {
    console.warn('[Bot] DISCORD_CHANNEL_ID 미설정 — 모든 채널 메시지 수신')
  }
})

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return
  if (ALLOWED_CHANNELS.length && !ALLOWED_CHANNELS.includes(message.channelId)) return

  const imageAttachments = [...message.attachments.values()].filter(a => {
    const ext = path.extname(a.name ?? '').toLowerCase()
    return SUPPORTED_EXTS.has(ext) || (a.contentType?.startsWith('image/') ?? false)
  })

  if (imageAttachments.length === 0) return

  const processing = await message.reply(`⏳ ${imageAttachments.length}개 이미지 분석 중...`)

  for (const attachment of imageAttachments) {
    const ext = path.extname(attachment.name ?? '.jpg').toLowerCase() || '.jpg'
    const tmpPath = await downloadToTemp(attachment.url, ext)

    try {
      const theaterHint = message.content.trim()
      const result = await extractWithGPT(tmpPath, '', theaterHint)
      const source = await getOrCreateSource(result.theater_name || theaterHint || '알 수 없음')
      const count = await saveCandidates(result, source)
      await message.reply(formatReply(result, count))
    } catch (e) {
      await message.reply(`❌ 처리 실패 (${attachment.name}): ${(e as Error).message}`)
    } finally {
      fs.unlink(tmpPath, () => {})
    }
  }

  await processing.delete().catch(() => {})
})

client.login(process.env.DISCORD_BOT_TOKEN)
