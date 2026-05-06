import type { AdminTheaterSourceInput } from '@/types/admin'
import { adminAuthErrorResponse, requireAdminSessionUser } from '@/lib/admin/auth'
import { createAdminSource, listAdminSources } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminSessionUser(request)
    return Response.json({ sources: await listAdminSources() })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'SOURCE_LIST_ERROR',
          message: error instanceof Error ? error.message : '크롤링 소스를 불러오지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSessionUser(request)
    const payload = (await request.json()) as Partial<AdminTheaterSourceInput>
    const source = await createAdminSource({
      theaterName: payload.theaterName ?? '',
      matchedTheaterId: payload.matchedTheaterId,
      homepageUrl: payload.homepageUrl ?? '',
      listingUrl: payload.listingUrl ?? '',
      parser: payload.parser ?? 'tableText',
      cadence: payload.cadence ?? 'manual',
      notes: payload.notes,
    })

    return Response.json({ source }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return adminAuthErrorResponse(error)
    }

    return Response.json(
      {
        error: {
          code: 'INVALID_SOURCE',
          message: error instanceof Error ? error.message : '크롤링 소스를 저장하지 못했습니다.',
        },
      },
      { status: 400 },
    )
  }
}
