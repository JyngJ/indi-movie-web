export const REPORT_CATEGORIES = ['영화관 추가 요청', '버그 제보', '데이터 수정', '불만 및 제안', '기타'] as const

export type ReportCategory = typeof REPORT_CATEGORIES[number]
export type ReportStatus = 'pending' | 'saved' | 'deleted'

export interface ReportFileMeta {
  name: string
  type: string
  size: number
}

export interface CreateReportInput {
  category: ReportCategory
  detail: string
  email?: string
  consent: boolean
  files: ReportFileMeta[]
  pageUrl?: string
  selectedTheaterId?: string
  selectedTheaterName?: string
  selectedMovieId?: string
}

export interface ReportRecord extends CreateReportInput {
  id: string
  status: ReportStatus
  discordMessageId?: string | null
  createdAt: string
  updatedAt: string
}
