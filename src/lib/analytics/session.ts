import type { AnalyticsProperties, SessionIntent } from './types'

const SESSION_KEY = 'movie:analytics-session:v1'

interface StoredSession {
  id: string
  startedAt: number
  landingPath: string
  referrer: string
  utm: Record<string, string>
  milestones: Record<string, number>
  intent?: SessionIntent
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
  return window.matchMedia('(min-width: 1024px)').matches ? 'desktop' : 'mobile'
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
  }
  writeSession(session)
  return session
}

export function getSessionContext(): AnalyticsProperties {
  const session = getOrCreateSession()
  if (!session || typeof window === 'undefined') return {}

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
