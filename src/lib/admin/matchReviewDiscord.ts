import crypto from 'node:crypto'
import type { MovieRow } from './store/converters'
import { formatListingHints, runtimeMatchIndex, type ListingHints } from './matchReviewHints'

const DISCORD_API = 'https://discord.com/api/v10'

/** 상영관 한 곳이 이 영화를 어떻게 적었는지 — 검수자가 후보와 대조하는 근거 */
export interface ProviderListing {
  theaterName: string
  rawTitle: string
  hints: ListingHints
  firstDate: string
  lastDate: string
  showCount: number
}

export interface AmbiguousMovieGroup {
  title: string
  listings: ProviderListing[]
  options: MovieRow[]
}

interface DiscordMessage {
  id: string
  content: string
}

function discordEnv(name: string) {
  return process.env[name] ?? ''
}

// 검수(duplicated) 채널 전용 — report 채널 폴백 금지 (2026-08-09).
// 폴백이 있으면 전용 env 미설정 시 검수 메시지가 report 채널을 오염시킨다.
// DISCORD_MATCH_REVIEW_CHANNEL_ID(봇 전송·버튼 인터랙션) 또는
// DISCORD_MATCH_REVIEW_WEBHOOK_URL 중 하나를 설정할 것 — 둘 다 없으면 전송 스킵.
function matchReviewChannelId() {
  return discordEnv('DISCORD_MATCH_REVIEW_CHANNEL_ID')
}

function matchReviewWebhookUrl() {
  return discordEnv('DISCORD_MATCH_REVIEW_WEBHOOK_URL')
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
  const runtime = movie.runtime_minutes ? `, ${movie.runtime_minutes}분` : ''
  return `${index + 1}) ${movie.title} (${year}, ${director}${runtime})`
}

function formatShortDate(date: string) {
  const [, month, day] = date.split('-').map(Number)
  return month && day ? `${month}월 ${day}일` : date
}

function listingField(listing: ProviderListing) {
  const period = listing.firstDate === listing.lastDate
    ? formatShortDate(listing.firstDate)
    : `${formatShortDate(listing.firstDate)}~${formatShortDate(listing.lastDate)}`
  return {
    name: `${listing.theaterName} 표기`,
    value: [
      `제목 「${listing.rawTitle}」`,
      formatListingHints(listing.hints),
      `${period} · ${listing.showCount}회차`,
    ].join('\n').slice(0, 1024),
    inline: false,
  }
}

/** 상영관 러닝타임이 후보 하나와만 맞으면 그 번호를 알려 준다 */
function runtimeHintLine(group: AmbiguousMovieGroup, options: MovieRow[]) {
  const optionRuntimes = options.map((movie) => movie.runtime_minutes)
  for (const listing of group.listings) {
    const index = runtimeMatchIndex(listing.hints.runtimeMinutes, optionRuntimes)
    if (index !== undefined) return `러닝타임 ${listing.hints.runtimeMinutes}분 — ${index + 1}번과 맞아요`
  }
  return undefined
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
  const options = group.options.slice(0, 5)
  const optionLines = options.map((movie, i) => movieOptionLabel(movie, i))
  const runtimeHint = runtimeHintLine(group, options)
  const shownListings = group.listings.slice(0, 5)
  const hiddenCount = group.listings.length - shownListings.length

  return {
    title: `🎬 동명 영화 매칭 보류: ${group.title}`,
    description: [
      `DB에 같은 제목 영화가 ${group.options.length}개 있어서 자동으로 못 골랐어요. 아래 버튼으로 확인해주세요.`,
      '',
      optionLines.join('\n'),
      ...(runtimeHint ? ['', runtimeHint] : []),
    ].join('\n'),
    color: 0xF39C12,
    fields: [
      ...shownListings.map(listingField),
      ...(hiddenCount > 0 ? [{ name: '다른 상영관', value: `${hiddenCount}곳 더 있어요`, inline: false }] : []),
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
  if (!webhookUrl) {
    console.warn('[matchReview] DISCORD_MATCH_REVIEW_CHANNEL_ID/WEBHOOK_URL 미설정 — 동명 영화 검수 알림 스킵')
    return null
  }

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
