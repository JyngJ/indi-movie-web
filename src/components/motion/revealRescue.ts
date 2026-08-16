'use client'

/**
 * IntersectionObserver가 콜백을 아예 안 주는 경우의 구조 장치.
 *
 * IO는 "임계 교차"가 있을 때만 콜백을 준다. 그래서 다음 상황에선 콜백이 한 번도 오지 않고
 * 항목이 영영 opacity 0으로 남는다 (실제 증상: 섹션 제목과 화살표만 있고 포스터 자리가 빈칸):
 * - 한 프레임에 화면을 통째로 지나친 경우 — 아래쪽 밖(비율 0) → 위쪽 밖(비율 0)이라 교차가 없다.
 *   창 높이가 낮을수록 같은 스크롤 양이 더 많은 행을 건너뛰므로 화면 비율을 탄다.
 * - 문서가 hidden인 동안의 스크롤(백그라운드 탭·가려진 패널)에서 관찰이 멈춘 경우.
 *
 * 그래서 스크롤이 멎을 때마다 등록된 노드의 실제 사각형을 한 번씩 직접 확인한다.
 * 리스너는 모듈 전체에 하나만 둔다 (행마다 달면 스크롤 핸들러가 수십 개가 된다).
 */

type Entry = { el: Element; onVisible: () => void }

const entries = new Set<Entry>()
let listening = false
let timer: ReturnType<typeof setTimeout> | null = null

function check() {
  timer = null
  const vh = window.innerHeight
  for (const entry of [...entries]) {
    const r = entry.el.getBoundingClientRect()
    /* 화면에 걸쳐 있거나(아래 15%는 제외 — IO 쪽 rootMargin과 같은 기준), 이미 위로 지나갔다 */
    const passed = r.bottom <= 0
    const onScreen = r.top < vh * 0.85 && r.bottom > 0
    if (passed || onScreen) {
      entries.delete(entry)
      entry.onVisible()
    }
  }
  if (entries.size === 0) stop()
}

function schedule() {
  if (timer != null) return
  timer = setTimeout(check, 150)   // 스크롤이 멎은 뒤 한 번만
}

function start() {
  if (listening) return
  listening = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  document.addEventListener('visibilitychange', schedule)
}

function stop() {
  if (!listening) return
  listening = false
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  document.removeEventListener('visibilitychange', schedule)
  if (timer != null) { clearTimeout(timer); timer = null }
}

/** 등록. IO가 먼저 띄우면 해제만 하면 된다 */
export function registerRevealRescue(el: Element, onVisible: () => void): () => void {
  const entry: Entry = { el, onVisible }
  entries.add(entry)
  start()
  return () => {
    entries.delete(entry)
    if (entries.size === 0) stop()
  }
}
