/**
 * Discord Bot — 이미지 수신 → 시간표 추출 → 결과 reply
 *
 * 환경변수:
 *   DISCORD_BOT_TOKEN   Discord Bot 토큰
 *   DISCORD_CHANNEL_ID  감시할 채널 ID (쉼표로 여러 개 가능)
 *   OPENAI_API_KEY      GPT-4o API 키
 *
 * 사용법:
 *   npx tsx src/discord-bot.ts
 */

import 'dotenv/config'
import { Client, Events, GatewayIntentBits, AttachmentBuilder } from 'discord.js'
import fs from 'fs'
import path from 'path'
import https from 'https'
import os from 'os'
import { extractWithGPT } from './gpt.ts'

const ALLOWED_CHANNELS = (process.env.DISCORD_CHANNEL_ID ?? '').split(',').map(s => s.trim()).filter(Boolean)
const SUPPORTED_EXTS   = new Set(['.jpg', '.jpeg', '.png', '.webp'])

/* ── 이미지 URL → 임시 파일 다운로드 ── */
function downloadToTemp(url: string, ext: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpPath = path.join(os.tmpdir(), `pipeline_${Date.now()}${ext}`)
    const file    = fs.createWriteStream(tmpPath)
    https.get(url, res => {
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve(tmpPath) })
    }).on('error', reject)
  })
}

/* ── 결과 JSON → Discord 메시지 포맷 ── */
function formatReply(result: Awaited<ReturnType<typeof extractWithGPT>>, filename: string): string {
  const lines = [
    `✅ **${result.theater_name || '(극장명 미확인)'}** ${result.screen_name ?? ''}`,
    `📅 ${result.week_range?.start} ~ ${result.week_range?.end}`,
    `🎬 상영 ${result.screenings.length}건 추출 | confidence: ${result.confidence}`,
    '',
    `\`${filename}\` 처리 완료`,
  ]
  if (result.corrections?.length) {
    lines.push('', '⚠️ 교정 항목:')
    result.corrections.forEach(c => lines.push(`  - ${c}`))
  }
  return lines.join('\n')
}

/* ── Bot 시작 ── */
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
  // 봇 메시지 무시
  if (message.author.bot) return

  // 채널 필터
  if (ALLOWED_CHANNELS.length && !ALLOWED_CHANNELS.includes(message.channelId)) return

  // 이미지 첨부 파일 필터
  const imageAttachments = message.attachments.filter(a => {
    const ext = path.extname(a.name ?? '').toLowerCase()
    return SUPPORTED_EXTS.has(ext) || (a.contentType?.startsWith('image/') ?? false)
  })

  if (imageAttachments.size === 0) return

  // 처리 시작 알림
  const processing = await message.reply(`⏳ ${imageAttachments.size}개 이미지 분석 중...`)

  for (const [, attachment] of imageAttachments) {
    const ext     = path.extname(attachment.name ?? '.jpg').toLowerCase() || '.jpg'
    const tmpPath = await downloadToTemp(attachment.url, ext)

    try {
      // 메시지에서 극장명 힌트 추출 (있으면)
      const theaterHint = message.content.trim() || ''

      const result = await extractWithGPT(tmpPath, '', theaterHint)

      // 결과 텍스트 reply
      await message.reply(formatReply(result, attachment.name ?? 'image'))

      // JSON 파일 첨부
      const jsonBuf  = Buffer.from(JSON.stringify(result, null, 2), 'utf-8')
      const jsonFile = new AttachmentBuilder(jsonBuf, { name: `${path.basename(attachment.name ?? 'result', ext)}.json` })
      await message.reply({ files: [jsonFile] })

    } catch (e) {
      await message.reply(`❌ 처리 실패 (${attachment.name}): ${(e as Error).message}`)
    } finally {
      fs.unlink(tmpPath, () => {})
    }
  }

  // 처리 중 메시지 삭제
  await processing.delete().catch(() => {})
})

client.login(process.env.DISCORD_BOT_TOKEN)
