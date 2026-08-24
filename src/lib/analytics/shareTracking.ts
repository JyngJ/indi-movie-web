import { shareAdapter, type ISharePayload } from '@/lib/adapters/share'
import { trackEvent } from './client'
import type { AnalyticsProperties } from './types'

/**
 * 공유를 실행하면서 클릭과 **결과**를 함께 기록한다.
 *
 * 전에는 진입점 7곳이 제각기 navigator.share를 부르고 클릭 시점에만 이벤트를 쐈다.
 * 그래서 네이티브 시트를 그냥 닫은 것과 실제로 공유한 것이 한 덩어리였고,
 * 데스크톱에서 클립보드로 빠진 것도 구분되지 않았다 — "공유가 저조하다"는 관찰이
 * 진짜 저조인지 측정 누락인지 가릴 수 없는 상태였다. 결과를 별도 이벤트로 남긴다.
 */

/** 같은 진입점이라도 페이지 전체를 공유하는지, 고른 회차를 공유하는지 갈라 본다. */
export type ShareScope = 'page' | 'showtime'

type ShareArgs = {
  /** 공유 시트에 넘길 제목·URL */
  payload: ISharePayload & { url: string }
  /** 클릭 지점 (films_movie_detail, theater_sheet …) */
  source: string
  scope: ShareScope
  /** 이벤트에 함께 실을 맥락 (movie_id, theater_id …) */
  properties?: AnalyticsProperties
  /** 클립보드로 복사됐을 때 — "링크 복사됨" 같은 피드백을 띄우는 자리 */
  onCopied?: () => void
}

/** 데스크톱 복사 피드백 — 호출부마다 토스트를 배선하지 않도록 여기서 띄운다 (규범: "~했어요" 한 줄) */
function showCopiedToast() {
  const el = document.createElement('div')
  el.textContent = '링크를 복사했어요'
  el.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:48px', 'transform:translateX(-50%)',
    'background:var(--color-neutral-900, #1A1611)', 'color:#fff',
    'padding:10px 16px', 'border-radius:9999px', 'font-size:13px', 'font-weight:500',
    'z-index:9999', 'pointer-events:none', 'opacity:0', 'transition:opacity 160ms ease',
  ].join(';')
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1' })
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200) }, 1600)
}

/** 데스크톱(정밀 포인터) 판정 — 네이티브 공유 시트가 화면 한가운데 이상한 위치에 앵커되는
 *  macOS 브라우저 문제로, 데스크톱에서는 시트 대신 링크 복사가 낫다 (2026-08-24) */
const isDesktopPointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

export async function shareAndTrack({ payload, source, scope, properties = {}, onCopied }: ShareArgs): Promise<void> {
  const base = { ...properties, source, share_scope: scope }
  trackEvent('share clicked', base)

  if (isDesktopPointer()) {
    const copied = await shareAdapter.copyToClipboardAsync(payload.url).catch(() => false)
    if (copied) { (onCopied ?? showCopiedToast)() }
    trackEvent('share completed', { ...base, result: copied ? 'copied' : 'error', method: 'clipboard_desktop' })
    return
  }

  if (shareAdapter.canShare(payload)) {
    const result = await shareAdapter.share(payload)
    if (result !== 'error') {
      // 'shared' | 'cancelled' — 취소도 결과다. 시트까지 갔는지 보려면 이 값이 필요하다.
      trackEvent('share completed', { ...base, result, method: 'native' })
      return
    }
    // 네이티브 시트가 실패하면 클립보드로 떨어진다 — 폴백까지 갔다는 사실을 남긴다
    const copied = await shareAdapter.copyToClipboardAsync(payload.url).catch(() => false)
    if (copied) onCopied?.()
    trackEvent('share completed', { ...base, result: copied ? 'copied' : 'error', method: 'clipboard_fallback' })
    return
  }

  const copied = await shareAdapter.copyToClipboardAsync(payload.url).catch(() => false)
  trackEvent('share completed', { ...base, result: copied ? 'copied' : 'error', method: 'clipboard' })
}
