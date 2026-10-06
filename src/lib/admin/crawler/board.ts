import { decodeHtmlEntity } from './utils'

/* 그누보드 게시판에서 시간표 게시글·이미지를 찾는 순수 함수들.
 * 시네마 in 선암은 매달 새 글로 시간표를 올린다. 글 주소를 소스에 고정했더니
 * 2024년 12월 글을 2년 가까이 다시 읽어 올해 12월 가짜 회차를 만들었다(2026-10). */

function compactText(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, '').toLowerCase()
}

export function isBoardPostUrl(url: string) {
  try {
    return new URL(url).searchParams.has('wr_id')
  } catch {
    return false
  }
}

/** 목록에서 제목에 keyword(띄어쓰기 무시)가 든 글 중 가장 최근 글(wr_id 최대) 주소 */
export function findLatestBoardPostUrl(listHtml: string, listUrl: string, keyword: string) {
  const needle = compactText(keyword)
  let best: { id: number; url: string } | undefined
  for (const match of listHtml.matchAll(/<a[^>]+href=["']([^"']*wr_id=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/g)) {
    const title = compactText(decodeHtmlEntity(match[3]))
    if (!needle || !title.includes(needle)) continue
    const id = Number(match[2])
    if (best && best.id >= id) continue
    try {
      best = { id, url: new URL(decodeHtmlEntity(match[1]), listUrl).toString() }
    } catch {
      // 잘못된 주소는 건너뛴다
    }
  }
  return best?.url
}

/** 게시글 본문 이미지 주소. 그누보드 썸네일(thumb-…_WxH)은 원본 파일 주소로 바꿔 앞에 둔다 */
export function extractBoardImageUrls(html: string, pageUrl: string) {
  const base = new URL(pageUrl)
  const originals: string[] = []
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']*view_image\.php[^"']*)["'][^>]*>\s*<img[^>]+src=["']([^"']+)["']/g)) {
    try {
      const fn = new URL(decodeHtmlEntity(match[1]), base).searchParams.get('fn')
      const thumb = new URL(decodeHtmlEntity(match[2]), base)
      if (!fn) continue
      thumb.pathname = thumb.pathname.replace(/[^/]+$/, fn)
      originals.push(thumb.toString())
    } catch {
      // 잘못된 주소는 건너뛴다
    }
  }

  const contentImages = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/g)]
    .map((m) => {
      const src = decodeHtmlEntity(m[1])
      if (!src || /logo|icon|banner|btn|\/theme\//.test(src)) return null
      try { return new URL(src, base).toString() } catch { return null }
    })
    .filter((u): u is string => Boolean(u))
    // 콘텐츠 이미지만 (editor/data 경로 우선)
    .sort((a, b) => {
      const score = (u: string) => (u.includes('editor') || u.includes('data') || u.includes('upload') || u.includes('attach')) ? 1 : 0
      return score(b) - score(a)
    })

  return Array.from(new Set([...originals, ...contentImages]))
}
