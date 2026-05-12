export interface Screening {
  date: string        // YYYY-MM-DD
  time: string        // HH:MM
  movie_title: string
  screen_name: string
}

export interface ExtractResult {
  theater_name: string
  week_range: {
    start: string     // YYYY-MM-DD
    end: string       // YYYY-MM-DD
  }
  screenings: Screening[]
  corrections: string[]  // OCR과 달리 이미지 기준으로 교정한 항목 로그
  confidence: number     // 0~1, Claude 자체 평가
}

export interface PipelineInput {
  imagePath: string
  theaterHint?: string   // 극장명 힌트 (파일명 또는 Discord 채널명 등)
  dateHint?: string      // 기준 날짜 힌트 (이미지에 연도 없을 때) YYYY-MM-DD
}
