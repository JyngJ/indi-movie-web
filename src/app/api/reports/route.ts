import { REPORT_CATEGORIES, type CreateReportInput, type ReportCategory, type ReportFileMeta } from '@/lib/reports/types'
import { createReport, setReportDiscordMessageId } from '@/lib/reports/store'
import { discordReportEnabled, sendReportToDiscord } from '@/lib/reports/discord'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const input = reportInputFromForm(form)
    const report = await createReport(input)

    let discordSent = false
    let discordError: string | undefined
    if (discordReportEnabled()) {
      try {
        const message = await sendReportToDiscord(report)
        if (message?.id) {
          await setReportDiscordMessageId(report.id, message.id)
          discordSent = true
        }
      } catch (error) {
        discordError = error instanceof Error ? error.message : 'Discord 전송 실패'
        console.error(discordError)
      }
    }

    return Response.json({ reportId: report.id, discordSent, discordError }, { status: 201 })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'REPORT_CREATE_ERROR',
          message: error instanceof Error ? error.message : '제보를 저장하지 못했습니다.',
        },
      },
      { status: 400 },
    )
  }
}

function reportInputFromForm(form: FormData): CreateReportInput {
  const category = stringValue(form.get('category'))
  const detail = stringValue(form.get('detail')).trim()
  const email = stringValue(form.get('email')).trim()
  const consent = stringValue(form.get('consent')) === 'true'

  if (!REPORT_CATEGORIES.includes(category as ReportCategory)) {
    throw new Error('제보 카테고리를 선택해 주세요.')
  }
  if (!detail || detail.length > 500) {
    throw new Error('상세 내용은 1자 이상 500자 이하로 입력해 주세요.')
  }
  if (!consent) {
    throw new Error('개인정보 수집 동의가 필요합니다.')
  }

  return {
    category: category as ReportCategory,
    detail,
    email: email || undefined,
    consent,
    files: fileMetaFromForm(form),
    pageUrl: stringValue(form.get('pageUrl')) || undefined,
    selectedTheaterId: stringValue(form.get('selectedTheaterId')) || undefined,
    selectedTheaterName: stringValue(form.get('selectedTheaterName')) || undefined,
    selectedMovieId: stringValue(form.get('selectedMovieId')) || undefined,
  }
}

function fileMetaFromForm(form: FormData): ReportFileMeta[] {
  return form.getAll('files')
    .filter((value): value is File => value instanceof File)
    .slice(0, 3)
    .map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    }))
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}
