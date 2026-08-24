// rects.json → Figma Scripter 스크립트 생성 (캡처 PNG를 http://127.0.0.1:8766 에서 fetch)
import fs from 'node:fs'
import path from 'node:path'

const CAP = path.resolve('captures')
const rects = JSON.parse(fs.readFileSync(path.join(CAP, 'rects.json'), 'utf8'))
const PORT = process.env.PORT ?? 8766

// 출처·규격 라벨 (07-27 코드 값)
const SPEC = {
  skip:        ['onboarding.module.css · .skip',        'h44 · 14/600 · 배경 없음'],
  mobNavNext:  ['onboarding.module.css · .mobNavNext',  'h44 · 14/600'],
  mobNavPrev:  ['onboarding.module.css · .mobNavPrev',  'h44 · 14/600'],
  cta:         ['onboarding.module.css · .cta',         'h56 · r14 · KIMM 16.5/700 · 그림자 28%'],
  ctaSub:      ['onboarding.module.css · .ctaSub',      'h44 · 13.5/600'],
  ctaGhost:    ['onboarding.module.css · .ctaGhost',    'h52 · 14/600'],
  nextBtn:     ['onboarding.module.css · .nextBtn',     'h52 · r13 · KIMM 15.5/700 · 그림자 26%'],
  mSkip:       ['onboarding.module.css · .mSkip',       'h40 · 13.5/600'],
  mPrevBtn:    ['onboarding.module.css · .mPrevBtn',    'h44 · 14/600'],
  filterChip:  ['filterBar/FilterChip.tsx',             'h36 · r999 · 13/500 · 배경 card'],
  themeToggle: ['map/SettingsPanel.tsx · 테마 토글',     '76×40 · r999'],
  categoryPill:['map/SettingsPanel.tsx · 카테고리',      'py7 px14 · r999 · 13/500 · 배경 page'],
  submit:      ['map/SettingsPanel.tsx · 제출',          'h48 · r12 · KIMM 15/700'],
  choice:      ['survey.module.css · .choice',          'py15 px16 · r12 · 15/400'],
  primaryBtn:  ['survey.module.css · .primaryBtn',      'py12 px22 · r12 · 15/600'],
  ghostBtn:    ['survey.module.css · .ghostBtn',        'py12 px18 · r12 · 15/400'],
  close:       ['survey.module.css · .close',           '32×32 · r8'],
}

const SHOTS = [
  { file: '01-onboarding-p1.png',         w: 375,  h: 812, title: '온보딩 1/4 (모바일)' },
  { file: '02-onboarding-p4.png',         w: 375,  h: 812, title: '온보딩 4/4 (모바일)' },
  { file: '08-onboarding-desktop-p4.png', w: 1280, h: 800, title: '온보딩 4/4 (데스크톱)' },
  { file: '03-map-filterbar.png',         w: 375,  h: 812, title: '지도 · 필터바' },
  { file: '05-report-form.png',           w: 375,  h: 812, title: '설정 · 버그 리포트' },
  { file: '06-survey.png',                w: 375,  h: 812, title: '재방문 설문 1/2' },
  { file: '06b-survey-step2.png',         w: 375,  h: 812, title: '재방문 설문 2/2' },
]

const shots = SHOTS.map(s => {
  const key = s.file.replace('.png', '')
  const rs = (rects[key] ?? []).filter(r => r.w < s.w * 0.95 || r.h < 120) // 전체폭 choice 첫 항목 같은 오탐 제거
    .map(r => ({ name: r.name, x: r.x, y: r.y, w: r.w, h: r.h, radius: parseFloat(r.radius) || 0, src: SPEC[r.name]?.[0] ?? r.name, spec: SPEC[r.name]?.[1] ?? r.font }))
  return { ...s, rects: rs }
})

const script = `// AS-IS 화면 + 버튼 하이라이트 — 영화볼지도 2026-07-27 (commit 1669ce9)
// 사전 준비: 캡처 폴더를 로컬 서버로 띄워둘 것
//   cd <worktree>/captures && python3 -m http.server ${PORT} --bind 127.0.0.1
// Figma Scripter에서 실행. 현재 페이지에 프레임을 만든다.

const BASE = 'http://127.0.0.1:${PORT}/'
const SHOTS = ${JSON.stringify(shots, null, 2)}

const hex = h => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 } }
const PAPER = hex('#F8F6F2'), INK = hex('#1A1714'), CAPTION = hex('#857F76'), ALERT = hex('#B94A48'), CARD = hex('#FFFFFF')

async function pickFont(cands) {
  for (const f of cands) { try { await figma.loadFontAsync(f); return f } catch (_) {} }
  const fb = { family: 'Inter', style: 'Regular' }; await figma.loadFontAsync(fb); return fb
}
const F = {
  title: await pickFont([{ family: 'Pretendard', style: 'Bold' }, { family: 'Inter', style: 'Bold' }]),
  body:  await pickFont([{ family: 'Pretendard', style: 'Medium' }, { family: 'Inter', style: 'Medium' }]),
  mono:  await pickFont([{ family: 'JetBrains Mono', style: 'Regular' }, { family: 'Roboto Mono', style: 'Regular' }, { family: 'Inter', style: 'Regular' }]),
}
function text(chars, font, size, color) {
  const t = figma.createText(); t.fontName = font; t.characters = chars; t.fontSize = size
  t.fills = [{ type: 'SOLID', color }]; t.textAutoResize = 'WIDTH_AND_HEIGHT'; return t
}
function col(name, gap) {
  const f = figma.createFrame(); f.name = name; f.layoutMode = 'VERTICAL'
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.itemSpacing = gap; f.fills = []; return f
}

async function loadImage(file) {
  const res = await fetch(BASE + file)
  if (!res.ok) throw new Error('fetch 실패 ' + file + ' — 로컬 서버 떠 있는지 확인')
  const buf = new Uint8Array(await res.arrayBuffer())
  return figma.createImage(buf)
}

function highlight(parent, r, idx) {
  const box = figma.createRectangle()
  box.name = 'hl · ' + r.name
  box.x = r.x - 4; box.y = r.y - 4; box.resize(r.w + 8, r.h + 8)
  box.cornerRadius = Math.min(r.radius + 4, (r.h + 8) / 2)
  box.fills = [{ type: 'SOLID', color: ALERT, opacity: 0.10 }]
  box.strokes = [{ type: 'SOLID', color: ALERT }]; box.strokeWeight = 2; box.strokeAlign = 'OUTSIDE'
  parent.appendChild(box)
  // 번호 배지
  const badge = figma.createFrame(); badge.name = 'badge'
  badge.layoutMode = 'HORIZONTAL'; badge.primaryAxisSizingMode = 'AUTO'; badge.counterAxisSizingMode = 'AUTO'
  badge.paddingLeft = badge.paddingRight = 6; badge.paddingTop = badge.paddingBottom = 2
  badge.cornerRadius = 4; badge.fills = [{ type: 'SOLID', color: ALERT }]
  badge.appendChild(text(String(idx), F.mono, 10, CARD))
  parent.appendChild(badge)
  badge.x = r.x - 4; badge.y = Math.max(0, r.y - 4 - badge.height - 2)
}

const root = col('AS-IS 화면 · 2026-07-27', 24)
root.fills = [{ type: 'SOLID', color: PAPER }]
root.paddingTop = root.paddingBottom = root.paddingLeft = root.paddingRight = 48
const head = col('head', 6)
head.appendChild(text('design.md 한 장으로 만든 화면들 — 같은 역할의 버튼이 화면마다 다르다', F.title, 22, INK))
head.appendChild(text('2026-07-27 · commit 1669ce9 · 디자인 시스템 감사(#233) 직전 · 로컬 빌드 캡처, 빨간 박스 = 코드에서 각각 따로 정의된 버튼', F.mono, 11, CAPTION))
root.appendChild(head)

const row = figma.createFrame(); row.name = 'screens'; row.layoutMode = 'HORIZONTAL'
row.primaryAxisSizingMode = 'AUTO'; row.counterAxisSizingMode = 'AUTO'; row.itemSpacing = 32; row.fills = []; row.counterAxisAlignItems = 'MIN'
row.layoutWrap = 'WRAP'; row.counterAxisSpacing = 40
root.appendChild(row)

let n = 0
for (const s of SHOTS) {
  const cell = col(s.title, 10)
  cell.appendChild(text(s.title, F.body, 13, INK))
  const img = await loadImage(s.file)
  const frame = figma.createFrame(); frame.name = s.file
  frame.resize(s.w, s.h); frame.clipsContent = true; frame.cornerRadius = 12
  frame.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }]
  frame.strokes = [{ type: 'SOLID', color: hex('#DDD9CF') }]; frame.strokeWeight = 1
  const legend = col('legend', 4)
  for (const r of s.rects) {
    n += 1
    highlight(frame, r, n)
    legend.appendChild(text(n + '  ' + r.src + '   ' + r.spec, F.mono, 10, INK))
  }
  cell.appendChild(frame)
  cell.appendChild(legend)
  row.appendChild(cell)
}

root.x = figma.viewport.center.x - 600; root.y = figma.viewport.center.y - 400
figma.currentPage.appendChild(root)
figma.currentPage.selection = [root]
figma.viewport.scrollAndZoomIntoView([root])
console.log('done: AS-IS 화면 ' + SHOTS.length + '장, 하이라이트 ' + n + '개')
`
fs.writeFileSync(path.join(CAP, 'asis-screens-highlight.js'), script)
console.log('wrote', path.join(CAP, 'asis-screens-highlight.js'), shots.map(s => `${s.file}:${s.rects.length}`).join(' '))
