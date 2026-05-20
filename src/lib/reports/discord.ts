import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { ReportRecord, ReportStatus } from './types'

const DISCORD_API = 'https://discord.com/api/v10'
const DEFAULT_DISCORD_APPLICATION_ID = '1501298684158283906'
const DEFAULT_DISCORD_PUBLIC_KEY = '05ddf33d252ac952258636446872e4096f44da972266ce2d9fc6522372a01765'

interface DiscordMessage {
  id: string
  content: string
}

interface DiscordUpload {
  name: string
  type: string
  buffer: ArrayBuffer
}

export function discordReportEnabled() {
  return Boolean(discordReportWebhookUrl() || (discordEnv('DISCORD_BOT_TOKEN') && discordReportChannelId()))
}

export async function sendReportToDiscord(report: ReportRecord, uploads: DiscordUpload[] = []) {
  const token = discordEnv('DISCORD_BOT_TOKEN')
  const channelId = discordReportChannelId()
  if (token && channelId) return sendReportByBot(token, channelId, report, uploads)

  const webhookUrl = discordReportWebhookUrl()
  if (webhookUrl) return sendReportByWebhook(webhookUrl, report, uploads)

  return null
}

async function sendReportByBot(token: string, channelId: string, report: ReportRecord, uploads: DiscordUpload[]) {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}` },
    body: discordMessageFormData({
      report,
      uploads,
      components: reportActionComponents(report.id),
    }),
  })

  if (!res.ok) throw new Error(`Discord 전송 실패: ${res.status} ${await res.text()}`)
  return res.json() as Promise<DiscordMessage>
}

async function sendReportByWebhook(webhookUrl: string, report: ReportRecord, uploads: DiscordUpload[]) {
  const url = new URL(webhookUrl)
  url.searchParams.set('wait', 'true')
  url.searchParams.set('with_components', 'true')

  const res = await fetch(url, {
    method: 'POST',
    body: discordMessageFormData({
      report,
      uploads,
      username: 'indi-movie-map',
      components: reportActionComponents(report.id),
    }),
  })

  if (!res.ok) throw new Error(`Discord 웹훅 전송 실패: ${res.status} ${await res.text()}`)
  return res.json() as Promise<DiscordMessage>
}

export function formatDiscordReport(report: ReportRecord, status: ReportStatus = report.status) {
  const lines = [
    `📨 **제보하기**`,
    `상태: ${statusLabel(status)}`,
    `ID: \`${report.id}\``,
    `유형: ${report.category}`,
    report.selectedTheaterName ? `관련 극장: ${report.selectedTheaterName}` : null,
    report.email ? `이메일: ${report.email}` : '이메일: 미입력',
    report.pageUrl ? `페이지: ${report.pageUrl}` : null,
    report.files.length ? `첨부: ${report.files.map((file) => file.name).join(', ')}` : '첨부: 없음',
    '',
    '**내용**',
    trimDiscordText(report.detail, 1200),
  ].filter((line): line is string => Boolean(line))

  return lines.join('\n')
}

export function formatDiscordReportEmbeds(report: ReportRecord, status: ReportStatus = report.status, imageName?: string) {
  const fields = [
    { name: '상태', value: statusLabel(status), inline: true },
    { name: '유형', value: report.category, inline: true },
    { name: '이메일', value: report.email || '미입력', inline: true },
    report.selectedTheaterName ? { name: '관련 극장', value: report.selectedTheaterName, inline: true } : null,
    report.pageUrl ? { name: '페이지', value: report.pageUrl, inline: false } : null,
    report.files.length ? { name: '첨부', value: report.files.map((file) => file.name).join('\n'), inline: false } : null,
    { name: 'Report ID', value: `\`${report.id}\``, inline: false },
  ].filter((field): field is { name: string; value: string; inline: boolean } => Boolean(field))

  return [{
    title: '📨 제보하기',
    description: trimDiscordText(report.detail, 1200),
    color: statusColor(status),
    fields,
    image: imageName ? { url: `attachment://${imageName}` } : undefined,
    footer: { text: 'indi-movie-map' },
    timestamp: report.createdAt,
  }]
}

export function reportActionComponents(reportId: string, disabled = false) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: '저장',
          custom_id: `report:save:${reportId}`,
          disabled,
        },
        {
          type: 2,
          style: 4,
          label: '삭제',
          custom_id: `report:delete:${reportId}`,
          disabled,
        },
      ],
    },
  ]
}

function discordMessageFormData({
  report,
  uploads,
  username,
  components,
}: {
  report: ReportRecord
  uploads: DiscordUpload[]
  username?: string
  components: ReturnType<typeof reportActionComponents>
}) {
  const form = new FormData()
  const safeUploads = uploads.slice(0, 3).map((upload, index) => ({
    ...upload,
    name: safeDiscordFilename(upload.name, index),
  }))

  form.set('payload_json', JSON.stringify({
    username,
    embeds: formatDiscordReportEmbeds(report, report.status, safeUploads[0]?.name),
    allowed_mentions: { parse: [] },
    components,
  }))

  safeUploads.forEach((upload, index) => {
    form.append(`files[${index}]`, new Blob([upload.buffer], { type: upload.type || 'application/octet-stream' }), upload.name)
  })

  return form
}

export function parseReportAction(customId: string) {
  const [, action, reportId] = customId.split(':')
  if ((action !== 'save' && action !== 'delete') || !reportId) return null
  return {
    reportId,
    status: action === 'save' ? 'saved' as const : 'deleted' as const,
  }
}

export function verifyDiscordSignature(body: string, signature: string | null, timestamp: string | null) {
  const publicKey = discordEnv('DISCORD_PUBLIC_KEY')
  if (!publicKey || !signature || !timestamp) return false

  const publicKeyDer = Buffer.concat([
    Buffer.from('302a300506032b6570032100', 'hex'),
    Buffer.from(publicKey, 'hex'),
  ])
  const key = crypto.createPublicKey({ key: publicKeyDer, format: 'der', type: 'spki' })
  return crypto.verify(null, Buffer.from(`${timestamp}${body}`), key, Buffer.from(signature, 'hex'))
}

export function discordApplicationId() {
  return discordEnv('DISCORD_APPLICATION_ID') || DEFAULT_DISCORD_APPLICATION_ID
}

function discordReportChannelId() {
  return discordEnv('DISCORD_REPORT_CHANNEL_ID') || discordEnv('DISCORD_CHANNEL_ID')
}

function discordReportWebhookUrl() {
  return discordEnv('DISCORD_REPORT_WEBHOOK_URL') || discordEnv('DISCORD_WEBHOOK_URL')
}

function statusLabel(status: ReportStatus) {
  if (status === 'saved') return '저장됨'
  if (status === 'deleted') return '삭제됨'
  return '대기'
}

function statusColor(status: ReportStatus) {
  if (status === 'saved') return 0x4A7C59
  if (status === 'deleted') return 0xB94A48
  return 0x4A6380
}

function trimDiscordText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function safeDiscordFilename(name: string, index: number) {
  const fallback = `report-${index + 1}`
  const ext = path.extname(name).slice(0, 12)
  const base = path.basename(name, ext).replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 72)
  return `${base || fallback}${ext || '.jpg'}`
}

function discordEnv(name: string) {
  if (name === 'DISCORD_PUBLIC_KEY') return process.env.DISCORD_PUBLIC_KEY || DEFAULT_DISCORD_PUBLIC_KEY
  return process.env[name] || readLocalPipelineEnv(name)
}

function readLocalPipelineEnv(name: string) {
  if (process.env.NODE_ENV === 'production') return ''

  try {
    const envPath = path.join(process.cwd(), 'pipeline', '.env')
    const text = fs.readFileSync(envPath, 'utf8')
    const line = text.split(/\r?\n/).find((item) => item.startsWith(`${name}=`))
    return line?.slice(name.length + 1).trim() ?? ''
  } catch {
    return ''
  }
}
