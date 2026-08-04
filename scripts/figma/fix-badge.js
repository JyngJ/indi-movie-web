// Badge 수정 스크립트 (Scripter 플러그인용)
//
// 문제: 배포판 Badge는 15% 틴트 배경 + 의미색 텍스트인데,
//       피그마엔 100% 원색 배경으로 들어가 텍스트가 안 보임.
//       (변수 바인딩된 paint는 frozen이라 opacity 대입이 무시됐던 버그)
//
// 배포판 스펙 (src/components/primitives/Badge.tsx):
//   success: bg rgba(74,124,89,0.15)  text #4A7C59
//   warning: bg rgba(217,119,6,0.15)  text #D97706
//   error:   bg rgba(185,74,72,0.15)  text #B94A48
//   info:    bg rgba(59,130,246,0.15) text #3B82F6
//   default: bg var(--color-border)   text caption
//   공통: h20, px8, radius pill, 11px semibold(600)

const V = {
  succ: 'VariableID:2:43', warn: 'VariableID:2:42',
  err: 'VariableID:2:44', info: 'VariableID:2:45',
}
const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
// 변수 바인딩 + 불투명도: frozen paint를 스프레드로 복사한 새 객체에 opacity 지정
const tint = async (varId, fallback, opacity) => {
  const v = await figma.variables.getVariableByIdAsync(varId)
  const p = figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: hex(fallback) }, 'color', v)
  return { ...p, opacity }
}

const fixes = {
  'Variant=Success': [V.succ, '#4A7C59'],
  'Variant=Warning': [V.warn, '#D97706'],
  'Variant=Error':   [V.err,  '#B94A48'],
  'Variant=Info':    [V.info, '#3B82F6'],
}

// Pretendard 있으면 텍스트를 SemiBold(600)로 정정 — 배포판은 font-semibold
const fonts = await figma.listAvailableFontsAsync()
const hasPretendard = fonts.some(f => f.fontName.family === 'Pretendard' && f.fontName.style === 'SemiBold')
if (hasPretendard) await figma.loadFontAsync({ family: 'Pretendard', style: 'SemiBold' })

let fixed = 0
for (const page of figma.root.children) {
  await page.loadAsync()
  const badgeSet = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Badge')
  if (!badgeSet) continue
  for (const comp of badgeSet.children) {
    const spec = fixes[comp.name]
    if (!spec) continue // Default는 그대로
    comp.fills = [await tint(spec[0], spec[1], 0.15)]
    for (const t of comp.findAllWithCriteria({ types: ['TEXT'] })) {
      // 텍스트 폰트 로드 후 폰트 교체 (필요 시)
      const f = t.fontName
      if (f !== figma.mixed) await figma.loadFontAsync(f)
      if (hasPretendard) t.fontName = { family: 'Pretendard', style: 'SemiBold' }
    }
    fixed++
  }
  // Default 배지 텍스트도 SemiBold 통일
  const def = badgeSet.children.find(c => c.name === 'Variant=Default')
  if (def && hasPretendard) {
    for (const t of def.findAllWithCriteria({ types: ['TEXT'] })) {
      const f = t.fontName
      if (f !== figma.mixed) await figma.loadFontAsync(f)
      t.fontName = { family: 'Pretendard', style: 'SemiBold' }
    }
  }
}
console.log(`Badge variant ${fixed}개 수정 완료 (틴트 15% 배경 복원)`)
if (!hasPretendard) console.log('주의: Pretendard 미발견 — 폰트는 기존 유지, 배경만 수정됨')
