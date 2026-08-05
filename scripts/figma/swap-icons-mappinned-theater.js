// swap-icons-mappinned-theater — 아이콘 세트에 map-pinned·theater 추가 + 사용처 교체 (Scripter용)
//
// 1. lucide-static에서 map-pinned·theater SVG 가져와 2.0/icon/* 컴포넌트 생성
//    (기존 아이콘과 동일 규격: 24 프레임, stroke 1.75 → 아웃라인 글리프)
// 2. 사용처 교체:
//    - TheaterSheet TOBE의 길찾기(2.0/icon/route) 인스턴스 → 2.0/icon/map-pinned
//    - FilmsTab TOBE 특별전 헤더의 클래퍼보드 인스턴스 → 2.0/icon/theater
//      (히어로·레일 등 다른 클래퍼보드는 유지 — 특별전 틴트 박스 안 것만)
//
// 실행: Scripter 붙여넣고 Run. 인터넷 필요(unpkg fetch).

const report = []
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

// ── 아이콘 섹션·기존 컴포넌트 색인 ──
let iconSection = null
const comps = {}
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && /icon/i.test(sec.name)) iconSection = iconSection || sec
  }
  walk(page, n => { if (n.type === 'COMPONENT' && n.name.startsWith('2.0/icon/')) comps[n.name] = n })
}

// ── 1. 새 아이콘 컴포넌트 생성 ──
async function makeIcon(slug) {
  const name = `2.0/icon/${slug}`
  if (comps[name]) { report.push(`${name} 이미 있음`); return comps[name] }
  const res = await fetch(`https://unpkg.com/lucide-static@latest/icons/${slug}.svg`)
  if (!res.ok) { report.push(`✗ ${slug} fetch 실패 ${res.status}`); return null }
  let svg = await res.text()
  svg = svg.replace(/stroke-width="[^"]*"/, 'stroke-width="1.75"')
  const node = figma.createNodeFromSvg(svg)
  const comp = figma.createComponent()
  comp.name = name
  comp.resizeWithoutConstraints(24, 24)
  comp.fills = []
  // svg 내용물을 컴포넌트로 이관
  for (const c of [...node.children]) comp.appendChild(c)
  node.remove()
  // 아웃라인 → 단일 glyph (기존 세트 규칙: 색 오버라이드 가능하게)
  try {
    const strokes = findAll(comp, n => 'outlineStroke' in n)
    const outlined = []
    for (const v of strokes) {
      const o = v.outlineStroke()
      if (o) { comp.appendChild(o); outlined.push(o); v.remove() }
    }
    if (outlined.length > 1) {
      const union = figma.union(outlined, comp)
      const flat = figma.flatten([union], comp)
      flat.name = 'glyph'
    } else if (outlined.length === 1) outlined[0].name = 'glyph'
    const glyph = comp.children.find(n => n.name === 'glyph')
    if (glyph) glyph.fills = [{ type:'SOLID', color:{ r:0x2B/255, g:0x26/255, b:0x22/255 } }]
  } catch (e) { report.push(`(${slug} 아웃라인 스킵: ${String(e).slice(0, 40)})`) }

  if (iconSection) {
    iconSection.appendChild(comp)
    // 섹션 안 빈 자리에
    comp.x = 40; comp.y = iconSection.height - 60
  }
  comps[name] = comp
  report.push(`${name} 생성`)
  return comp
}
const mapPinned = await makeIcon('map-pinned')
const theaterIcon = await makeIcon('theater')

// ── 2. 사용처 교체 ──
// 2a. 길찾기: route → map-pinned (TheaterSheet TOBE 전부)
if (mapPinned) {
  let n = 0
  for (const page of figma.root.children) {
    for (const sec of page.children) {
      if (sec.type !== 'SECTION' || !sec.name.startsWith('TheaterSheet TOBE')) continue
      for (const inst of findAll(sec, x => x.type === 'INSTANCE' && x.name === '2.0/icon/route')) {
        try { inst.swapComponent(mapPinned); n++ } catch (e) { report.push('✗ route swap: ' + String(e).slice(0, 40)) }
      }
    }
  }
  report.push(`길찾기 route → map-pinned ${n}개`)
}
// 2b. 특별전 헤더 클래퍼보드 → theater (틴트 박스 안 것만)
if (theaterIcon) {
  let n = 0
  for (const page of figma.root.children) {
    for (const sec of page.children) {
      if (sec.type !== 'SECTION' || !sec.name.startsWith('FilmsTab TOBE')) continue
      for (const inst of findAll(sec, x => x.type === 'INSTANCE' && x.name === '2.0/icon/clapperboard')) {
        // 부모가 틴트 박스(primary/100 fill)인 경우만 = 특별전 헤더
        const p = inst.parent
        const tinted = p && p.fills !== figma.mixed && p.fills?.some?.(f =>
          f.type === 'SOLID' && Math.round(f.color.r * 255) === 0xEC && Math.round(f.color.g * 255) === 0xEF)
        if (!tinted) continue
        try { inst.swapComponent(theaterIcon); n++ } catch (e) { report.push('✗ theater swap: ' + String(e).slice(0, 40)) }
      }
    }
  }
  report.push(`특별전 클래퍼보드 → theater ${n}개`)
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'swap-icons 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = figma.viewport.center.x; t.y = figma.viewport.center.y
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('아이콘 추가·교체 완료')
