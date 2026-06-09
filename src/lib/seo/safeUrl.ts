/**
 * Some hostnames (malformed punycode like xn--...) fail new URL() in Node 22+.
 * Use this before passing any DB-sourced URL to href, next/image src, or JSON-LD.
 */
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
