// AS-IS 화면 캡처 — 2026-07-27 커밋(1669ce9) 로컬 dev 서버(:3077) 기준
// 실행: node capture-asis.mjs  (worktree 루트에서, playwright-core + 시스템 Chrome 사용)
// 산출: ./captures/*.png + ./captures/rects.json (CSS px 기준 버튼 좌표 — 피그마 하이라이트용)
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3077'
const OUT = path.resolve('captures')
fs.mkdirSync(OUT, { recursive: true })
const rects = {}

const HIDE_CSS = `nextjs-portal, .tsqd-open-btn-container, [data-nextjs-toast], [data-next-badge-root] { display:none !important }`

async function shot(page, name, picks) {
  await page.addStyleTag({ content: HIDE_CSS }).catch(() => {})
  await page.waitForTimeout(400)
  const list = await page.evaluate((picks) => {
    const out = []
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight }
    for (const p of picks) {
      let els = [...document.querySelectorAll(p.sel)].filter(vis)
      if (p.radius) els = els.filter(e => getComputedStyle(e).borderRadius === p.radius)
      if (p.minH) els = els.filter(e => e.getBoundingClientRect().height >= p.minH)
      if (p.maxH) els = els.filter(e => e.getBoundingClientRect().height <= p.maxH)
      const pick = p.text ? els.filter(e => e.textContent.trim().includes(p.text)) : els
      for (const el of pick.slice(0, p.max ?? 1)) {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        out.push({ name: p.name, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          radius: cs.borderRadius, font: `${cs.fontSize}/${cs.fontWeight} ${cs.fontFamily.split(',')[0]}`, pad: cs.padding, text: el.textContent.trim().slice(0, 20) })
      }
    }
    return out
  }, picks)
  rects[name] = list
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log(name, list.map(l => `${l.name} ${l.w}x${l.h} r=${l.radius} ${l.font}`).join(' | '))
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })

// ── 모바일 375x812 @2x ─────────────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' })
const page = await ctx.newPage()
await page.goto(BASE + '/', { waitUntil: 'load' })
await page.waitForFunction(() => document.querySelector('[class*="__skip"], [class*="mSkip"]'), null, { timeout: 20000 }); await page.waitForTimeout(2500)
await page.waitForTimeout(1200)

await shot(page, '01-onboarding-p1', [
  { name: 'skip', sel: '[class*="__skip"]' },
  { name: 'mobNavNext', sel: '[class*="mobNavNext"]' },
])

// 마지막 페이지로
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('[class*="mobNavNext"]')].find(b => { const r = b.getBoundingClientRect(); return r.x >= 0 && r.x < innerWidth })
    b?.click()
  })
  await page.waitForTimeout(700)
}
await shot(page, '02-onboarding-p4', [
  { name: 'cta', sel: '[class*="__cta"]:not([class*="ctaSub"]):not([class*="ctaGhost"]):not([class*="ctablock"])' },
  { name: 'ctaSub', sel: '[class*="ctaSub"]' },
  { name: 'mobNavPrev', sel: '[class*="mobNavPrev"]' },
  { name: 'skip', sel: '[class*="__skip"]' },
])

// 위치 없이 둘러보기 → 지도 화면 (필터칩)
await page.evaluate(() => document.querySelector('[class*="ctaSub"]')?.click())
await page.waitForTimeout(1500)
await shot(page, '03-map-filterbar', [
  { name: 'filterChip', sel: 'button', text: '서울', max: 1 },
  { name: 'filterChip', sel: 'button', text: '일주일', max: 1 },
  { name: 'filterChip', sel: 'button', text: '장르', max: 1 },
])

// 위치 권한 모달이 떠 있으면 캡처
const locBtn = await page.$('button:has-text("설정했어요")')
if (locBtn && await locBtn.isVisible()) {
  await shot(page, '03b-location-modal', [
    { name: 'locPrimary', sel: 'button', text: '설정했어요' },
    { name: 'locSecondary', sel: 'button', text: '괜찮아요' },
  ])
}

// 설정 → 제보 폼
await page.goto(BASE + '/more', { waitUntil: 'load' })
await page.waitForTimeout(800)
await shot(page, '04-more', [
  { name: 'reportRow', sel: 'button', text: '버그 리포트' },
  { name: 'themeToggle', sel: 'button[aria-label*="모드로 전환"]' },
])
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('버그 리포트'))?.click())
await page.waitForTimeout(1000)
await shot(page, '05-report-form', [
  { name: 'categoryPill', sel: 'button', radius: '999px', maxH: 40, max: 6 },
  { name: 'submit', sel: 'button', minH: 46, maxH: 50, max: 1 },
])

// 재방문 설문 (visits>=2, 15초 뒤 노출)
await page.goto(BASE + '/', { waitUntil: 'load' })
await page.evaluate(() => { localStorage.setItem('movie:visits:v1', '5'); localStorage.removeItem('movie:survey:v1'); sessionStorage.clear() })
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(16500)
if (await page.$('[class*="survey-module"]')) {
  await shot(page, '06-survey', [
    { name: 'choice', sel: '[class*="__choice"]', max: 2 },
    { name: 'primaryBtn', sel: '[class*="primaryBtn"]' },
    { name: 'ghostBtn', sel: '[class*="ghostBtn"]' },
    { name: 'close', sel: '[class*="__close"]' },
  ])
  // 한 개 선택 후 다음 단계
  await page.evaluate(() => document.querySelector('[class*="__choice"]')?.click())
  await page.evaluate(() => document.querySelector('[class*="primaryBtn"]')?.click())
  await page.waitForTimeout(600)
  await shot(page, '06b-survey-step2', [
    { name: 'primaryBtn', sel: '[class*="primaryBtn"]' },
    { name: 'ghostBtn', sel: '[class*="ghostBtn"]' },
  ])
} else {
  console.log('06-survey: 설문 미노출')
}
await ctx.close()

// ── 데스크톱 1280x800 — 온보딩 데스크톱 변종(.nextBtn / .ctaGhost / .mSkip / .mPrevBtn) ──
const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'ko-KR' })
const dpage = await dctx.newPage()
await dpage.goto(BASE + '/', { waitUntil: 'load' })
await dpage.waitForFunction(() => document.querySelector('[class*="__skip"], [class*="mSkip"]'), null, { timeout: 20000 }); await dpage.waitForTimeout(2500)
await dpage.waitForTimeout(1200)
await shot(dpage, '07-onboarding-desktop-p1', [
  { name: 'nextBtn', sel: '[class*="nextBtn"]' },
  { name: 'mSkip', sel: '[class*="mSkip"]' },
  { name: 'mPrevBtn', sel: '[class*="mPrevBtn"]' },
])
for (let i = 0; i < 3; i++) {
  await dpage.evaluate(() => [...document.querySelectorAll('[class*="nextBtn"]')].find(b => b.getBoundingClientRect().width > 0)?.click())
  await dpage.waitForTimeout(700)
}
await shot(dpage, '08-onboarding-desktop-p4', [
  { name: 'nextBtn', sel: '[class*="nextBtn"]' },
  { name: 'ctaGhost', sel: '[class*="ctaGhost"]' },
  { name: 'mPrevBtn', sel: '[class*="mPrevBtn"]' },
])
await dctx.close()
await browser.close()

fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(rects, null, 2))
console.log('done →', OUT)
