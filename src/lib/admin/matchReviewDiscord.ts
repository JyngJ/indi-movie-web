import crypto from 'node:crypto'
import type { MovieRow } from './store/converters'

const DISCORD_API = 'https://discord.com/api/v10'

export interface AmbiguousMovieGroup {
  title: string
  theaterNames: string[]
  options: MovieRow[]
}

interface DiscordMessage {
  id: string
  content: string
}

function discordEnv(name: string) {
  return process.env[name] ?? ''
}

function matchReviewChannelId() {
  return discordEnv('DISCORD_REPORT_CHANNEL_ID') || discordEnv('DISCORD_CHANNEL_ID')
}

function matchReviewWebhookUrl() {
  return discordEnv('DISCORD_REPORT_WEBHOOK_URL') || discordEnv('DISCORD_WEBHOOK_URL')
}

/** movie_match 버튼의 custom_id에 영화 제목 대신 넣을 짧은 해시 — Discord custom_id는 100자 제한이라 원문 제목 대신 사용 */
export function titleHash(title: string) {
  return crypto.createHash('sha1').update(title.trim()).digest('hex').slice(0, 12)
}

function naverSearchUrl(movie: MovieRow) {
  const q = [movie.title, movie.year ? `${movie.year}` : null, '영화'].filter(Boolean).join(' ')
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}`
}

function movieOptionLabel(movie: MovieRow, index: number) {
  const director = movie.director?.length ? movie.director.join(', ') : '감독 미상'
  const year = movie.year ?? '연도 미상'
  return `${index + 1}) ${movie.title} (${year}, ${director})`
}

function buildGroupComponents(group: AmbiguousMovieGroup) {
  const hash = titleHash(group.title)
  const options = group.options.slice(0, 5)

  const choiceRow = {
    type: 1,
    components: options.map((movie, i) => ({
      type: 2,
      style: 1,
      label: `${i + 1}번`,
      custom_id: `movie_match:${hash}:${movie.id}`,
    })),
  }

  const linkRow = {
    type: 1,
    components: options.map((movie, i) => ({
      type: 2,
      style: 5,
      label: `${i + 1}번 검색`,
      url: naverSearchUrl(movie),
    })),
  }

  return [choiceRow, linkRow]
}

function buildGroupEmbed(group: AmbiguousMovieGroup) {
  const optionLines = group.options.slice(0, 5).map((movie, i) => movieOptionLabel(movie, i))
  const theaterSample = group.theaterNames.slice(0, 5).join(', ') + (group.theaterNames.length > 5 ? ` 외 ${group.theaterNames.length - 5}곳` : '')

  return {
    title: `🎬 동명 영화 매칭 보류: ${group.title}`,
    description: [
      `DB에 같은 제목 영화가 ${group.options.length}개 있어서 자동으로 못 골랐어요. 아래 버튼으로 확인해주세요.`,
      '',
      optionLines.join('\n'),
    ].join('\n'),
    color: 0xF39C12,
    fields: [
      { name: '상영관', value: theaterSample || '알 수 없음', inline: false },
    ],
  }
}

async function sendGroupMessage(group: AmbiguousMovieGroup) {
  const payload = {
    embeds: [buildGroupEmbed(group)],
    components: buildGroupComponents(group),
    allowed_mentions: { parse: [] },
  }

  const token = discordEnv('DISCORD_BOT_TOKEN')
  const channelId = matchReviewChannelId()
  if (token && channelId) {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) console.error(`Discord 매칭 보류 알림 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return res.ok ? (res.json() as Promise<DiscordMessage>) : null
  }

  const webhookUrl = matchReviewWebhookUrl()
  if (!webhookUrl) return null

  const url = new URL(webhookUrl)
  url.searchParams.set('wait', 'true')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, username: 'indi-movie-map' }),
  })
  if (!res.ok) console.error(`Discord 매칭 보류 웹훅 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.ok ? (res.json() as Promise<DiscordMessage>) : null
}

export async function notifyAmbiguousMovieMatches(groups: AmbiguousMovieGroup[]) {
  for (const group of groups) {
    try {
      await sendGroupMessage(group)
    } catch (error) {
      console.error('[notifyAmbiguousMovieMatches] 전송 실패:', (error as Error).message)
    }
  }
}

export function parseMovieMatchAction(customId: string) {
  const parts = customId.split(':')
  if (parts.length !== 3 || parts[0] !== 'movie_match') return null
  const [, hash, movieId] = parts
  if (!hash || !movieId) return null
  return { hash, movieId }
}
