/** 전역 한 줄 토스트 — 컴포넌트 트리 밖(어댑터·프로바이더)에서 결과를 알릴 때.
 *  Toast 프리미티브는 마운트된 화면 안에서 쓰고, 언마운트를 넘나드는 결과
 *  (로그아웃·데스크톱 링크 복사)는 이걸 쓴다. 문구는 규범대로 "~했어요" 한 줄. */
export function showGlobalToast(text: string) {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.textContent = text
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
