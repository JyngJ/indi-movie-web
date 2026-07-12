import { USER_REQUEST_KINDS, type CreateUserRequestInput, type UserRequestKind } from '@/lib/userRequests/types'
import { createUserRequest, setUserRequestDiscordMessageId } from '@/lib/userRequests/store'
import { discordUserRequestEnabled, sendUserRequestToDiscord } from '@/lib/userRequests/discord'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = userRequestInputFromBody(body)
    const userRequest = await createUserRequest(input)

    let discordSent = false
    let discordError: string | undefined
    if (discordUserRequestEnabled()) {
      try {
        const message = await sendUserRequestToDiscord(userRequest)
        if (message?.id) {
          await setUserRequestDiscordMessageId(userRequest.id, message.id)
          discordSent = true
        }
      } catch (error) {
        discordError = error instanceof Error ? error.message : 'Discord 전송 실패'
        console.error(discordError)
      }
    }

    return Response.json({ requestId: userRequest.id, discordSent, discordError }, { status: 201 })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'USER_REQUEST_CREATE_ERROR',
          message: error instanceof Error ? error.message : '요청을 저장하지 못했습니다.',
        },
      },
      { status: 400 },
    )
  }
}

function userRequestInputFromBody(body: unknown): CreateUserRequestInput {
  const b = (body ?? {}) as Record<string, unknown>
  const kind = typeof b.kind === 'string' ? b.kind : ''
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const note = typeof b.note === 'string' ? b.note.trim() : ''
  const query = typeof b.query === 'string' ? b.query.trim() : ''

  if (!USER_REQUEST_KINDS.includes(kind as UserRequestKind)) {
    throw new Error('요청 종류를 선택해 주세요.')
  }
  if (!name || name.length > 100) {
    throw new Error('이름은 1자 이상 100자 이하로 입력해 주세요.')
  }
  if (note.length > 500) {
    throw new Error('추가 정보는 500자 이하로 입력해 주세요.')
  }

  return {
    kind: kind as UserRequestKind,
    name,
    note: note || undefined,
    query: query || undefined,
  }
}
