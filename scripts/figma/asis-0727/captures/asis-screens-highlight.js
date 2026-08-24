// AS-IS 화면 + 버튼 하이라이트 — 영화볼지도 2026-07-27 (commit 1669ce9)
// 사전 준비: 캡처 폴더를 로컬 서버로 띄워둘 것
//   cd <worktree>/captures && python3 -m http.server 8766 --bind 127.0.0.1
// Figma Scripter에서 실행. 현재 페이지에 프레임을 만든다.

const BASE = 'http://127.0.0.1:8766/'
const SHOTS = [
  {
    "file": "01-onboarding-p1.png",
    "w": 375,
    "h": 812,
    "title": "온보딩 1/4 (모바일)",
    "rects": [
      {
        "name": "skip",
        "x": 283,
        "y": 6,
        "w": 84,
        "h": 44,
        "radius": 0,
        "src": "onboarding.module.css · .skip",
        "spec": "h44 · 14/600 · 배경 없음"
      },
      {
        "name": "mobNavNext",
        "x": 282,
        "y": 742,
        "w": 63,
        "h": 44,
        "radius": 0,
        "src": "onboarding.module.css · .mobNavNext",
        "spec": "h44 · 14/600"
      }
    ]
  },
  {
    "file": "02-onboarding-p4.png",
    "w": 375,
    "h": 812,
    "title": "온보딩 4/4 (모바일)",
    "rects": [
      {
        "name": "cta",
        "x": 30,
        "y": 674,
        "w": 315,
        "h": 56,
        "radius": 14,
        "src": "onboarding.module.css · .cta",
        "spec": "h56 · r14 · KIMM 16.5/700 · 그림자 28%"
      },
      {
        "name": "ctaSub",
        "x": 221,
        "y": 742,
        "w": 124,
        "h": 44,
        "radius": 0,
        "src": "onboarding.module.css · .ctaSub",
        "spec": "h44 · 13.5/600"
      },
      {
        "name": "mobNavPrev",
        "x": 30,
        "y": 742,
        "w": 63,
        "h": 44,
        "radius": 0,
        "src": "onboarding.module.css · .mobNavPrev",
        "spec": "h44 · 14/600"
      },
      {
        "name": "skip",
        "x": 283,
        "y": 6,
        "w": 84,
        "h": 44,
        "radius": 0,
        "src": "onboarding.module.css · .skip",
        "spec": "h44 · 14/600 · 배경 없음"
      }
    ]
  },
  {
    "file": "08-onboarding-desktop-p4.png",
    "w": 1280,
    "h": 800,
    "title": "온보딩 4/4 (데스크톱)",
    "rects": [
      {
        "name": "nextBtn",
        "x": 923,
        "y": 567,
        "w": 111,
        "h": 53,
        "radius": 13,
        "src": "onboarding.module.css · .nextBtn",
        "spec": "h52 · r13 · KIMM 15.5/700 · 그림자 26%"
      },
      {
        "name": "ctaGhost",
        "x": 841,
        "y": 567,
        "w": 76,
        "h": 53,
        "radius": 0,
        "src": "onboarding.module.css · .ctaGhost",
        "spec": "h52 · 14/600"
      },
      {
        "name": "mPrevBtn",
        "x": 672,
        "y": 571,
        "w": 60,
        "h": 44,
        "radius": 0,
        "src": "onboarding.module.css · .mPrevBtn",
        "spec": "h44 · 14/600"
      }
    ]
  },
  {
    "file": "03-map-filterbar.png",
    "w": 375,
    "h": 812,
    "title": "지도 · 필터바",
    "rects": [
      {
        "name": "filterChip",
        "x": 115,
        "y": 76,
        "w": 161,
        "h": 36,
        "radius": 999,
        "src": "filterBar/FilterChip.tsx",
        "spec": "h36 · r999 · 13/500 · 배경 card"
      },
      {
        "name": "filterChip",
        "x": 284,
        "y": 76,
        "w": 65,
        "h": 36,
        "radius": 999,
        "src": "filterBar/FilterChip.tsx",
        "spec": "h36 · r999 · 13/500 · 배경 card"
      }
    ]
  },
  {
    "file": "05-report-form.png",
    "w": 375,
    "h": 812,
    "title": "설정 · 버그 리포트",
    "rects": [
      {
        "name": "categoryPill",
        "x": 16,
        "y": 155,
        "w": 78,
        "h": 36,
        "radius": 999,
        "src": "map/SettingsPanel.tsx · 카테고리",
        "spec": "py7 px14 · r999 · 13/500 · 배경 page"
      },
      {
        "name": "categoryPill",
        "x": 102,
        "y": 155,
        "w": 104,
        "h": 36,
        "radius": 999,
        "src": "map/SettingsPanel.tsx · 카테고리",
        "spec": "py7 px14 · r999 · 13/500 · 배경 page"
      },
      {
        "name": "categoryPill",
        "x": 214,
        "y": 155,
        "w": 78,
        "h": 36,
        "radius": 999,
        "src": "map/SettingsPanel.tsx · 카테고리",
        "spec": "py7 px14 · r999 · 13/500 · 배경 page"
      },
      {
        "name": "categoryPill",
        "x": 16,
        "y": 199,
        "w": 78,
        "h": 36,
        "radius": 999,
        "src": "map/SettingsPanel.tsx · 카테고리",
        "spec": "py7 px14 · r999 · 13/500 · 배경 page"
      },
      {
        "name": "categoryPill",
        "x": 102,
        "y": 199,
        "w": 52,
        "h": 36,
        "radius": 999,
        "src": "map/SettingsPanel.tsx · 카테고리",
        "spec": "py7 px14 · r999 · 13/500 · 배경 page"
      },
      {
        "name": "categoryPill",
        "x": 16,
        "y": 452,
        "w": 121,
        "h": 38,
        "radius": 999,
        "src": "map/SettingsPanel.tsx · 카테고리",
        "spec": "py7 px14 · r999 · 13/500 · 배경 page"
      },
      {
        "name": "submit",
        "x": 16,
        "y": 652,
        "w": 343,
        "h": 48,
        "radius": 12,
        "src": "map/SettingsPanel.tsx · 제출",
        "spec": "h48 · r12 · KIMM 15/700"
      }
    ]
  },
  {
    "file": "06-survey.png",
    "w": 375,
    "h": 812,
    "title": "재방문 설문 1/2",
    "rects": [
      {
        "name": "choice",
        "x": 22,
        "y": 431,
        "w": 331,
        "h": 313,
        "radius": 0,
        "src": "survey.module.css · .choice",
        "spec": "py15 px16 · r12 · 15/400"
      },
      {
        "name": "choice",
        "x": 22,
        "y": 431,
        "w": 331,
        "h": 55,
        "radius": 12,
        "src": "survey.module.css · .choice",
        "spec": "py15 px16 · r12 · 15/400"
      },
      {
        "name": "primaryBtn",
        "x": 283,
        "y": 744,
        "w": 70,
        "h": 47,
        "radius": 12,
        "src": "survey.module.css · .primaryBtn",
        "spec": "py12 px22 · r12 · 15/600"
      },
      {
        "name": "close",
        "x": 329,
        "y": 322,
        "w": 32,
        "h": 44,
        "radius": 8,
        "src": "survey.module.css · .close",
        "spec": "32×32 · r8"
      }
    ]
  },
  {
    "file": "06b-survey-step2.png",
    "w": 375,
    "h": 812,
    "title": "재방문 설문 2/2",
    "rects": [
      {
        "name": "primaryBtn",
        "x": 283,
        "y": 744,
        "w": 70,
        "h": 47,
        "radius": 12,
        "src": "survey.module.css · .primaryBtn",
        "spec": "py12 px22 · r12 · 15/600"
      }
    ]
  }
]

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
