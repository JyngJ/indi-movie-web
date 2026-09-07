import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Google Search Console(Search Analytics API) 어댑터.
 *
 * 검색 실적을 사람이 GSC 화면을 열어 눈으로 읽는 대신 스크립트로 뽑기 위한 것.
 * SEO 작업의 성패는 "노출이 0에서 벗어났는가"를 몇 주에 걸쳐 반복 확인해야 알 수 있는데,
 * 그때마다 화면을 캡처해 옮기는 건 사람 손이 너무 많이 든다.
 *
 * `googleapis` 패키지는 이 한 엔드포인트를 쓰자고 받기엔 지나치게 크다. 서비스 계정
 * JWT 서명은 Node 내장 crypto로 충분해서 의존성을 늘리지 않는다.
 *
 * Clean Architecture: 구글 API의 형식(dimension 배열, ISO 날짜, rows[].keys)을 여기서
 * 흡수하고 호출부엔 정규화된 행만 넘긴다.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

/** 도메인 속성. URL 접두사 속성이면 'https://www.…/' 형태를 쓴다. */
export const DEFAULT_SITE_URL = 'sc-domain:xn--hq1bv8o5phw2d7wt.com'

/**
 * GSC 데이터는 2~3일 지연된다. 어제까지로 조회하면 마지막 이틀이 0으로 보여
 * "떨어졌다"는 착시를 준다.
 */
export const DATA_LAG_DAYS = 3

export interface SearchConsoleRow {
  /** dimensions와 같은 순서의 키(예: ['서울 독립영화관'] 또는 ['쿼리', 'URL']) */
  keys: string[]
  clicks: number
  impressions: number
  /** 0~1 */
  ctr: number
  /** 평균 게재순위. 낮을수록 위 */
  position: number
}

export type Dimension = 'query' | 'page' | 'date' | 'country' | 'device'

interface ServiceAccount {
  client_email: string
  private_key: string
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function loadServiceAccount(): ServiceAccount {
  const path = process.env.GSC_SERVICE_ACCOUNT_FILE
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON

  const raw = path ? readFileSync(path, 'utf8') : inline
  if (!raw) {
    throw new Error(
      'GSC 인증 정보가 없어요. .env.local에 GSC_SERVICE_ACCOUNT_FILE(서비스 계정 JSON 경로)을 넣어 주세요.',
    )
  }

  const parsed = JSON.parse(raw) as Partial<ServiceAccount>
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('서비스 계정 JSON에 client_email 또는 private_key가 없어요.')
  }

  return {
    client_email: parsed.client_email,
    // .env에 한 줄로 넣은 경우 개행이 '\n' 문자열로 들어온다
    private_key: parsed.private_key.replace(/\\n/g, '\n'),
  }
}

/** 서비스 계정 JWT → 액세스 토큰 (1시간짜리라 매 실행 새로 받는다) */
async function getAccessToken(): Promise<string> {
  const account = loadServiceAccount()
  const now = Math.floor(Date.now() / 1000)

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }))

  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  const signature = base64url(signer.sign(account.private_key))
  const assertion = `${header}.${claim}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const body = await res.json() as { access_token?: string; error_description?: string; error?: string }
  if (!res.ok || !body.access_token) {
    throw new Error(
      `토큰 발급 실패 (HTTP ${res.status}): ${body.error_description ?? body.error ?? '원인 불명'}`,
    )
  }
  return body.access_token
}

export interface QueryOptions {
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD */
  endDate: string
  dimensions: Dimension[]
  /** 검색어 부분 일치 */
  query?: string
  /** 페이지 URL 부분 일치 */
  page?: string
  rowLimit?: number
  siteUrl?: string
}

/** Search Analytics 조회. 필터는 부분 일치(contains)로 건다. */
export async function querySearchAnalytics(options: QueryOptions): Promise<SearchConsoleRow[]> {
  const token = await getAccessToken()
  const siteUrl = options.siteUrl ?? process.env.GSC_SITE_URL ?? DEFAULT_SITE_URL

  const filters: { dimension: string; operator: string; expression: string }[] = []
  if (options.query) filters.push({ dimension: 'query', operator: 'contains', expression: options.query })
  if (options.page) filters.push({ dimension: 'page', operator: 'contains', expression: options.page })

  const res = await fetch(
    `${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: options.dimensions,
        rowLimit: options.rowLimit ?? 100,
        ...(filters.length > 0 ? { dimensionFilterGroups: [{ filters }] } : {}),
      }),
    },
  )

  if (!res.ok) {
    const text = await res.text()
    // 403은 대개 서비스 계정을 속성 사용자로 추가하지 않은 경우다 — 원인을 바로 알려준다
    const hint = res.status === 403
      ? `\n  → Search Console 속성 설정 > 사용자 및 권한에서 서비스 계정 이메일을 추가했는지 확인해 주세요.`
      : ''
    throw new Error(`Search Console 조회 실패 (HTTP ${res.status}): ${text.slice(0, 300)}${hint}`)
  }

  const body = await res.json() as { rows?: SearchConsoleRow[] }
  return body.rows ?? []
}

/** 오늘로부터 days일 구간. 끝은 데이터 지연을 감안해 앞당긴다. */
export function dateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  end.setDate(end.getDate() - DATA_LAG_DAYS)
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)

  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: iso(start), endDate: iso(end) }
}
