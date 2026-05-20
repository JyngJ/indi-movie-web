'use client'

import posthog from 'posthog-js'
import type { AnalyticsEventName, AnalyticsProperties, SessionIntent } from './types'
import { getSessionContext, markMilestone, setSessionIntent } from './session'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const finalActionEvents = new Set<AnalyticsEventName>(['booking clicked', 'directions clicked'])

function gaEventName(name: AnalyticsEventName) {
  return name.replace(/[^a-zA-Z0-9_]+/g, '_')
}

function milestoneProperties(name: AnalyticsEventName): AnalyticsProperties {
  if (name === 'map pin clicked') {
    const milestone = markMilestone('first_pin_click')
    return {
      is_first_pin_click: milestone.isFirst,
      first_pin_click_elapsed_ms: milestone.elapsedMs,
    }
  }

  if (finalActionEvents.has(name)) {
    const milestone = markMilestone('first_final_action')
    return {
      is_first_final_action: milestone.isFirst,
      first_final_action_elapsed_ms: milestone.elapsedMs,
    }
  }

  return {}
}

export function classifySessionIntent(intent: SessionIntent, properties: AnalyticsProperties = {}) {
  setSessionIntent(intent)
  trackEvent('session intent classified', { intent, ...properties })
}

export function trackEvent(name: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  if (typeof window === 'undefined') return

  const payload = {
    ...getSessionContext(),
    ...milestoneProperties(name),
    ...properties,
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[analytics]', name, payload)
  }

  if (process.env.NEXT_PUBLIC_POSTHOG_TOKEN) {
    posthog.capture(name, payload)
  }

  if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && typeof window.gtag === 'function') {
    window.gtag('event', gaEventName(name), payload)
  }
}
