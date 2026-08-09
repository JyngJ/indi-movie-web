import { REPORT_CATEGORIES, type CreateReportInput, type ReportCategory, type ReportFileMeta } from '@/lib/reports/types'
import { createReport, setReportDiscordMessageId } from '@/lib/reports/store'
import { discordReportEnabled, sendReportToDiscord } from '@/lib/reports/discord'
import { enforceRateLimit } from '@/lib/rateLimit/guard'
import { RATE_LIMIT_POLICIES } from '@/lib/rateLimit/policies'

export const dynamic = 'force-dynamic'

/** 첨부 상한 — UI는 이미지 3장까지만 붙이지만, 라우트는 UI를 거치지 않은 요청도 받는다. */
const MAX_FILES = 3
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_BYTES = 20 * 1024 * 1024

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, RATE_LIMIT_POLICIES.reports)
  if (limited) return limited

  try {
    const form = await request.formData()
    const input = reportInputFromForm(form)
    const report = await createReport(input)
    const uploads = await discordUploadsFromForm(form)

    let discordSent = false
    let discordError: string | undefined
    if (discordReportEnabled()) {
      try {
        const message = await sendReportToDiscord(report, uploads)
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
  return filesFromForm(form).map((file) => ({
    name: file.name,
    type: file.type,
    size: file.size,
  }))
}

async function discordUploadsFromForm(form: FormData) {
  return Promise.all(filesFromForm(form).map(async (file) => ({
    name: file.name,
    type: file.type,
    buffer: await file.arrayBuffer(),
  })))
}

/**
 * 첨부 검증 후 목록 반환. 메타 생성과 Discord 업로드가 같은 규칙을 보도록 여기 한 곳에 모은다.
 * arrayBuffer()로 메모리에 올리기 **전에** 크기를 거른다 — 통과한 파일만 버퍼링한다.
 */
function filesFromForm(form: FormData) {
  const files = form.getAll('files').filter((value): value is File => value instanceof File)

  if (files.length > MAX_FILES) {
    throw new Error(`첨부는 최대 ${MAX_FILES}개까지 가능합니다.`)
  }

  let total = 0
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      throw new Error('첨부는 이미지 파일만 가능합니다.')
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`첨부 파일은 개당 ${MAX_FILE_BYTES / 1024 / 1024}MB 이하여야 합니다.`)
    }
    total += file.size
  }
  if (total > MAX_TOTAL_BYTES) {
    throw new Error(`첨부 파일 총합은 ${MAX_TOTAL_BYTES / 1024 / 1024}MB 이하여야 합니다.`)
  }

  return files
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}
