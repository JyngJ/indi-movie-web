import type { AnalyticsProperties, AnalyticsSurface, SessionIntent } from './types'

const SESSION_KEY = 'movie:analytics-session:v1'

interface StoredSession {
  id: string
  startedAt: number
  landingPath: string
  referrer: string
  utm: Record<string, string>
  milestones: Record<string, number>
  intent?: SessionIntent
  /** 이 세션에서 방문한 탭 표면(방문 순서 유지). v1 세션에는 없을 수 있어 optional. */
  surfaces?: AnalyticsSurface[]
}

/**
 * 경로를 탭 단위 표면으로 접는다.
 * 홈('/')은 상영작 탭이다 — 지도는 '/map'.
 * /movie/[id], /theater/[id]는 지도 탭에서 여는 상세라 map으로 본다.
 */
export function surfaceFromPath(pathname: string): AnalyticsSurface {
  if (pathname === '/' || pathname === '/films' || pathname.startsWith('/films/')) return 'films'
  if (pathname === '/more' || pathname.startsWith('/more/')) return 'more'
  if (
    pathname === '/map'
    || pathname.startsWith('/movie/')
    || pathname.startsWith('/theater/')
  ) return 'map'
  return 'other'
}

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) as StoredSession : null
  } catch {
    return null
  }
}

function writeSession(session: StoredSession) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {}
}

function collectUtm() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  return Object.fromEntries(keys.map((key) => [key, params.get(key) || '']).filter(([, value]) => value))
}

function deviceType() {
  if (typeof window === 'undefined') return 'unknown'
  return window.matchMedia('(min-width: 1280px)').matches ? 'desktop' : 'mobile'
}

function getOrCreateSession() {
  if (typeof window === 'undefined') return null
  const existing = readSession()
  if (existing) return existing

  const session: StoredSession = {
    id: uuid(),
    startedAt: Date.now(),
    landingPath: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || '',
    utm: collectUtm(),
    milestones: {},
    surfaces: [surfaceFromPath(window.location.pathname)],
  }
  writeSession(session)
  return session
}

/** 현재 경로의 표면을 세션 여정에 누적하고, 갱신된 여정을 돌려준다. */
function recordSurface(session: StoredSession): AnalyticsSurface[] {
  const current = surfaceFromPath(window.location.pathname)
  const surfaces = session.surfaces ?? []
  if (surfaces[surfaces.length - 1] !== current) {
    surfaces.push(current)
    session.surfaces = surfaces
    writeSession(session)
  }
  return surfaces
}

export function getSessionContext(): AnalyticsProperties {
  const session = getOrCreateSession()
  if (!session || typeof window === 'undefined') return {}

  const surfaces = recordSurface(session)
  const entrySurface = surfaces[0]
  const currentSurface = surfaces[surfaces.length - 1]
  const visited = Array.from(new Set(surfaces))

  return {
    analytics_session_id: session.id,
    session_started_at: session.startedAt,
    time_since_session_start_ms: Date.now() - session.startedAt,
    landing_path: session.landingPath,
    referrer: session.referrer || null,
    device_type: deviceType(),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    ...session.utm,
    session_intent: session.intent,
    entry_surface: entrySurface,
    current_surface: currentSurface,
    surfaces_visited: visited,
    surface_switch_count: surfaces.length - 1,
    /** 진입 탭과 지금 탭이 다름 = 크로스탭 여정. source만으로는 안 보이는 축. */
    is_cross_surface: entrySurface !== currentSurface,
  }
}

export function markMilestone(name: string) {
  const session = getOrCreateSession()
  if (!session) return { isFirst: false, elapsedMs: undefined }
  const current = session.milestones[name]
  if (current) return { isFirst: false, elapsedMs: current - session.startedAt }

  const now = Date.now()
  session.milestones[name] = now
  writeSession(session)
  return { isFirst: true, elapsedMs: now - session.startedAt }
}

export function setSessionIntent(intent: SessionIntent) {
  const session = getOrCreateSession()
  if (!session) return
  if (session.intent && session.intent !== intent) {
    session.intent = 'mixed'
  } else {
    session.intent = intent
  }
  writeSession(session)
}
