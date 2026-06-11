// ================================
// Share Adapter
// Web: navigator.share / navigator.clipboard
// Native (추후): 플랫폼 공유 시트로 교체
// ================================

export interface ISharePayload {
  title?: string
  url?: string
}

export type ShareResult = 'shared' | 'cancelled' | 'error'

export interface IShareAdapter {
  /** 클립보드 복사 (동기 fire-and-forget). Clipboard API 미지원 시 execCommand fallback */
  copyToClipboard(text: string): void
  /** Clipboard API로 복사. 성공 여부를 Promise로 반환 (미지원이면 false) */
  copyToClipboardAsync(text: string): Promise<boolean>
  canShare(payload: ISharePayload): boolean
  share(payload: ISharePayload): Promise<ShareResult>
}

const webShareAdapter: IShareAdapter = {
  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    } else {
      const el = document.createElement('textarea')
      el.value = text
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
  },

  copyToClipboardAsync(text: string): Promise<boolean> {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(() => true)
    }
    return Promise.resolve(false)
  },

  canShare(payload: ISharePayload): boolean {
    return typeof navigator.share === 'function'
      && (typeof navigator.canShare !== 'function' || navigator.canShare(payload))
  },

  share(payload: ISharePayload): Promise<ShareResult> {
    return navigator.share(payload).then(
      () => 'shared' as const,
      (e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled' as const
        return 'error' as const
      },
    )
  },
}

// 플랫폼 선택 (추후 React Native 대응 시 교체)
export const shareAdapter: IShareAdapter = webShareAdapter
