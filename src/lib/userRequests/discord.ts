import type { UserRequestRecord, UserRequestStatus } from './types'

const DISCORD_API = 'https://discord.com/api/v10'

interface DiscordMessage {
  id: string
  content: string
}

const KIND_LABEL: Record<UserRequestRecord['kind'], string> = {
  movie: '영화',
  theater: '영화관',
  director: '감독',
  etc: '기타',
}

export function discordUserRequestEnabled() {
  return Boolean(discordUserRequestWebhookUrl() || (discordEnv('DISCORD_BOT_TOKEN') && discordUserRequestChannelId()))
}

export async function sendUserRequestToDiscord(request: UserRequestRecord) {
  const token = discordEnv('DISCORD_BOT_TOKEN')
  const channelId = discordUserRequestChannelId()
  if (token && channelId) return sendByBot(token, channelId, request)

  const webhookUrl = discordUserRequestWebhookUrl()
  if (webhookUrl) return sendByWebhook(webhookUrl, request)

  return null
}

async function sendByBot(token: string, channelId: string, request: UserRequestRecord) {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      embeds: formatDiscordUserRequestEmbeds(request),
      components: userRequestActionComponents(request.id),
    }),
  })

  if (!res.ok) throw new Error(`Discord 전송 실패: ${res.status} ${await res.text()}`)
  return res.json() as Promise<DiscordMessage>
}

async function sendByWebhook(webhookUrl: string, request: UserRequestRecord) {
  const url = new URL(webhookUrl)
  url.searchParams.set('wait', 'true')
  url.searchParams.set('with_components', 'true')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'indi-movie-map',
      embeds: formatDiscordUserRequestEmbeds(request),
      allowed_mentions: { parse: [] },
      components: userRequestActionComponents(request.id),
    }),
  })

  if (!res.ok) throw new Error(`Discord 웹훅 전송 실패: ${res.status} ${await res.text()}`)
  return res.json() as Promise<DiscordMessage>
}

export function formatDiscordUserRequestEmbeds(request: UserRequestRecord, status: UserRequestStatus = request.status) {
  const fields = [
    { name: '상태', value: statusLabel(status), inline: true },
    { name: '종류', value: KIND_LABEL[request.kind], inline: true },
    { name: '이름', value: request.name, inline: true },
    request.query ? { name: '검색어', value: request.query, inline: true } : null,
    { name: 'Request ID', value: `\`${request.id}\``, inline: false },
  ].filter((field): field is { name: string; value: string; inline: boolean } => Boolean(field))

  return [{
    title: '📝 추가 요청하기',
    description: request.note ? trimDiscordText(request.note, 1200) : undefined,
    color: statusColor(status),
    fields,
    footer: { text: 'indi-movie-map' },
    timestamp: request.createdAt,
  }]
}

export function userRequestActionComponents(requestId: string, disabled = false) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: '저장',
          custom_id: `user_request:save:${requestId}`,
          disabled,
        },
        {
          type: 2,
          style: 4,
          label: '삭제',
          custom_id: `user_request:delete:${requestId}`,
          disabled,
        },
      ],
    },
  ]
}

export function parseUserRequestAction(customId: string) {
  const [, action, requestId] = customId.split(':')
  if ((action !== 'save' && action !== 'delete') || !requestId) return null
  return {
    requestId,
    status: action === 'save' ? 'saved' as const : 'deleted' as const,
  }
}

function statusLabel(status: UserRequestStatus) {
  if (status === 'saved') return '저장됨'
  if (status === 'deleted') return '삭제됨'
  return '대기'
}

function statusColor(status: UserRequestStatus) {
  if (status === 'saved') return 0x4A7C59
  if (status === 'deleted') return 0xB94A48
  return 0x4A6380
}

function trimDiscordText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function discordUserRequestChannelId() {
  return discordEnv('DISCORD_USER_REQUEST_CHANNEL_ID') || discordEnv('DISCORD_CHANNEL_ID')
}

function discordUserRequestWebhookUrl() {
  return discordEnv('DISCORD_USER_REQUEST_WEBHOOK_URL') || discordEnv('DISCORD_WEBHOOK_URL')
}

function discordEnv(name: string) {
  return process.env[name] ?? ''
}
