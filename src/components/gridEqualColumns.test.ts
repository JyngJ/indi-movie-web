import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/* 그리드 열을 `repeat(N, 1fr)`로 나누면 안 된다.
 *
 * 1fr은 minmax(auto, 1fr)이라 열의 최소 폭이 그 열에서 가장 긴 한 줄짜리 내용으로 정해진다.
 * 2026-10 상영작 전체 그리드에서 더 불러온 영화 중 긴 감독 이름(nowrap) 하나가 3열 전체를
 * 넓혀, 위로 올라오면 한 열 포스터만 커져 있었다(#419). 같은 폭으로 나누려면
 * `repeat(N, minmax(0, 1fr))`을 쓰고, 칸에는 minWidth: 0을 준다.
 *
 * 문서 사이트(design-system)와 dev 갤러리는 제품 화면이 아니라 뺀다. */
const ROOT = join(process.cwd(), 'src')
const EXCLUDE = [/^app\/design-system\//, /^app\/dev\//, /\.test\./]
const BAD = /repeat\(\s*\d+\s*,\s*1fr\s*\)/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|css)$/.test(name)) out.push(p)
  }
  return out
}

describe('그리드 열 나누기', () => {
  it('repeat(N, 1fr) 대신 repeat(N, minmax(0, 1fr))를 쓴다', () => {
    const offenders = walk(ROOT)
      .map((p) => relative(ROOT, p).split('\\').join('/'))
      .filter((rel) => !EXCLUDE.some((re) => re.test(rel)))
      .flatMap((rel) =>
        readFileSync(join(ROOT, rel), 'utf8').split('\n')
          .map((line, i) => (BAD.test(line) ? `src/${rel}:${i + 1}` : null))
          .filter((x): x is string => x !== null),
      )
    expect(offenders).toEqual([])
  })
})
