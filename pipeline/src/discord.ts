/**
 * Discord 유틸 — 메시지 수신 / 송신
 *
 * 환경변수:
 *   DISCORD_BOT_TOKEN   Discord Bot 토큰
 *   DISCORD_CHANNEL_ID  기본 채널 ID
 */

import 'dotenv/config'

const BASE_URL = 'https://discord.com/api/v10'
const TOKEN    = process.env.DISCORD_BOT_TOKEN ?? ''
const CHANNEL  = process.env.DISCORD_CHANNEL_ID ?? ''

function headers() {
  return {
    'Authorization': `Bot ${TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export interface DiscordAttachment {
  id: string
  filename: string
  url: string
  content_type: string
}

export interface DiscordMessage {
  id: string
  content: string
  author: { id: string; username: string; bot?: boolean }
  attachments: DiscordAttachment[]
  timestamp: string
}

/**
 * 채널의 최근 메시지 가져오기
 * @param channelId  채널 ID (기본값: 환경변수 DISCORD_CHANNEL_ID)
 * @param limit      가져올 메시지 수 (최대 100, 기본 20)
 */
export async function fetchMessages(
  channelId = CHANNEL,
  limit = 20,
): Promise<DiscordMessage[]> {
  const res = await fetch(`${BASE_URL}/channels/${channelId}/messages?limit=${limit}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`fetchMessages 실패: ${res.status} ${await res.text()}`)
  return res.json() as Promise<DiscordMessage[]>
}

/**
 * 채널에 텍스트 메시지 보내기
 * @param content    보낼 텍스트
 * @param channelId  채널 ID (기본값: 환경변수 DISCORD_CHANNEL_ID)
 */
export async function sendMessage(
  content: string,
  channelId = CHANNEL,
): Promise<DiscordMessage> {
  const res = await fetch(`${BASE_URL}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`sendMessage 실패: ${res.status} ${await res.text()}`)
  return res.json() as Promise<DiscordMessage>
}

/**
 * 특정 메시지에 reply
 * @param content         보낼 텍스트
 * @param replyToMsgId    reply 대상 메시지 ID
 * @param channelId       채널 ID
 */
export async function replyMessage(
  content: string,
  replyToMsgId: string,
  channelId = CHANNEL,
): Promise<DiscordMessage> {
  const res = await fetch(`${BASE_URL}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      content,
      message_reference: { message_id: replyToMsgId },
    }),
  })
  if (!res.ok) throw new Error(`replyMessage 실패: ${res.status} ${await res.text()}`)
  return res.json() as Promise<DiscordMessage>
}
