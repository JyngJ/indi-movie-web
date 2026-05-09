import type { AdminTheaterInput } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { createAdminTheater, listAdminTheaters, updateAdminTheater } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminSessionUser(request)
    return Response.json({ theaters: await listAdminTheaters() })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'THEATER_LIST_ERROR',
          message: error instanceof Error ? error.message : '극장 목록을 불러오지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSessionUser(request)
    const payload = (await request.json()) as Partial<AdminTheaterInput>
    const theater = await createAdminTheater(theaterInputFromPayload(payload))

    return Response.json({ theater }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'THEATER_CREATE_ERROR',
          message: error instanceof Error ? error.message : '극장을 저장하지 못했습니다.',
        },
      },
      { status: 400 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSessionUser(request)
    const payload = (await request.json()) as Partial<AdminTheaterInput>
    const theater = await updateAdminTheater(theaterInputFromPayload(payload))

    return Response.json({ theater })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'THEATER_UPDATE_ERROR',
          message: error instanceof Error ? error.message : '극장을 수정하지 못했습니다.',
        },
      },
      { status: 400 },
    )
  }
}

function theaterInputFromPayload(payload: Partial<AdminTheaterInput>): AdminTheaterInput {
  return {
    id: payload.id,
    name: payload.name ?? '',
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    address: payload.address ?? '',
    city: payload.city ?? '',
    phone: payload.phone,
    website: payload.website,
    screenCount: Number(payload.screenCount ?? 0),
    seatCount: payload.seatCount === undefined || payload.seatCount === null ? undefined : Number(payload.seatCount),
  }
}
