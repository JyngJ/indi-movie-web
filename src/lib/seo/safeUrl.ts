/**
 * Some hostnames (malformed punycode like xn--...) fail new URL() in Node 22+.
 * Use this before passing any DB-sourced URL to href, next/image src, or JSON-LD.
 */
/**
 * 이미지 src용 — safeUrl에 더해 같은 사이트의 루트 경로(`/images/...`)를 허용한다.
 * 프로토콜 상대 경로(`//host/...`)는 외부 호스트라 막는다.
 */
export function safeImageSrc(url: string | null | undefined): string | undefined {
  if (url && url.startsWith('/') && !url.startsWith('//')) return url
  return safeUrl(url)
}

export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    // Only allow http(s) — reject data:, javascript:, etc.
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined
    return url
  } catch {
    return undefined
  }
}
