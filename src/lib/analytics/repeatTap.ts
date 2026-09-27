// ================================
// 연타(repeat tap) 판정 — 순수 로직.
//
// "눌렀는데 반응이 안 보여서 다시 누름"을 센다. 같은 요소를 STREAK_MS 안에 다시 누르고
// 그사이 주소(URL)가 바뀌지 않았으면 한 연타 묶음으로 본다. 묶음이 끝나면(마지막 탭 뒤
// STREAK_MS 동안 조용하면) 2번 이상일 때만 한 건으로 올린다.
//
// PostHog $rageclick은 1초 안 3번 이상·같은 좌표만 잡아서, 2~7초 걸린 영화제 바로가기의
// "1~2초 간격 3번"을 놓쳤다(#376). 이 판정은 요소 단위·2초 창·2번부터 센다.
// ================================

export const STREAK_MS = 2_000

export interface RepeatTapEvent {
  /** 요소 식별 — data-rc > aria-label > 글자 > 태그 */
  target: string
  count: number
  path: string
}

interface Streak {
  target: string
  url: string
  path: string
  count: number
  lastAt: number
}

/**
 * tap()으로 누를 때마다 넣고, flush()는 타이머에서 부른다.
 * 끝난 묶음 중 2번 이상인 것만 돌려준다.
 */
export class RepeatTapTracker {
  private streak: Streak | null = null

  tap(target: string, url: string, path: string, now: number): RepeatTapEvent | null {
    const s = this.streak
    if (s && s.target === target && s.url === url && now - s.lastAt <= STREAK_MS) {
      s.count += 1
      s.lastAt = now
      return null
    }
    // 다른 요소거나 창을 넘겼거나 주소가 바뀌었으면 — 이전 묶음을 닫고 새로 시작
    const closed = this.close()
    this.streak = { target, url, path, count: 1, lastAt: now }
    return closed
  }

  /** 마지막 탭 뒤 STREAK_MS가 지났으면 묶음을 닫는다 */
  flush(now: number): RepeatTapEvent | null {
    if (!this.streak || now - this.streak.lastAt < STREAK_MS) return null
    return this.close()
  }

  private close(): RepeatTapEvent | null {
    const s = this.streak
    this.streak = null
    if (!s || s.count < 2) return null
    return { target: s.target, count: s.count, path: s.path }
  }
}

/** 요소를 사람이 읽을 수 있는 키로 — data-rc > aria-label > 보이는 글자 앞 30자 > 태그 */
export function tapTargetKey(el: { rc: string | null; ariaLabel: string | null; text: string | null; tag: string }): string {
  if (el.rc) return el.rc
  if (el.ariaLabel?.trim()) return el.ariaLabel.trim().slice(0, 60)
  const text = el.text?.replace(/\s+/g, ' ').trim()
  if (text) return text.slice(0, 30)
  return el.tag.toLowerCase()
}
