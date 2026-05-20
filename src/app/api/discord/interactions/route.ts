import { formatDiscordReport, parseReportAction, reportActionComponents, verifyDiscordSignature } from '@/lib/reports/discord'
import { updateReportStatus } from '@/lib/reports/store'

export const dynamic = 'force-dynamic'

const InteractionType = {
  Ping: 1,
  MessageComponent: 3,
} as const

const InteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4,
  UpdateMessage: 7,
} as const

interface DiscordInteraction {
  type: number
  data?: {
    custom_id?: string
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-signature-ed25519')
  const timestamp = request.headers.get('x-signature-timestamp')

  if (!verifyDiscordSignature(body, signature, timestamp)) {
    return new Response('invalid request signature', { status: 401 })
  }

  const interaction = JSON.parse(body) as DiscordInteraction
  if (interaction.type === InteractionType.Ping) {
    return Response.json({ type: InteractionResponseType.Pong })
  }

  if (interaction.type !== InteractionType.MessageComponent) {
    return ephemeralResponse('지원하지 않는 Discord 액션입니다.')
  }

  const action = parseReportAction(interaction.data?.custom_id ?? '')
  if (!action) return ephemeralResponse('알 수 없는 제보 액션입니다.')

  try {
    const report = await updateReportStatus(action.reportId, action.status)
    return Response.json({
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: formatDiscordReport(report, action.status),
        components: reportActionComponents(report.id, true),
        allowed_mentions: { parse: [] },
      },
    })
  } catch (error) {
    return ephemeralResponse(error instanceof Error ? error.message : '제보 상태를 변경하지 못했습니다.')
  }
}

function ephemeralResponse(content: string) {
  return Response.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: 64,
      allowed_mentions: { parse: [] },
    },
  })
}
