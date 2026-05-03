import type { AdminTheaterSourceInput } from '@/types/admin'
import { createAdminSource, listAdminSources } from '@/lib/admin/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ sources: listAdminSources() })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<AdminTheaterSourceInput>

  try {
    const source = createAdminSource({
      theaterName: payload.theaterName ?? '',
      homepageUrl: payload.homepageUrl ?? '',
      listingUrl: payload.listingUrl ?? '',
      parser: payload.parser ?? 'tableText',
      cadence: payload.cadence ?? 'manual',
      notes: payload.notes,
    })

    return Response.json({ source }, { status: 201 })
  } catch (error) {
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
