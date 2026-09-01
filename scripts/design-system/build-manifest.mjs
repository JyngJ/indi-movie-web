#!/usr/bin/env node
/**
 * 디자인 시스템 매니페스트 빌더
 *
 * 입력  1) src/styles/tokens.css        — 코드 토큰 (값의 source of truth)
 *       2) 피그마 Scripter 덤프 state.json — 피그마 변수·텍스트/이펙트 스타일·컴포넌트 배리언트 실측
 *       3) src/components/primitives/*.tsx — Props (TypeScript 컴파일러 API로 추출)
 * 출력  src/design-system/manifest.json — /design-system 사이트가 읽는 유일한 데이터
 *
 * 문서를 손으로 쓰지 않기 위한 스크립트다. 코드·피그마 값이 어긋나면 drift에 쌓인다.
 *
 * 사용: npm run ds:build            (덤프 없으면 코드만으로 빌드하고 경고)
 *       DUMP=/path/state.json npm run ds:build
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import ts from 'typescript'

const ROOT = path.resolve(import.meta.dirname, '../..')
const TOKENS_CSS = path.join(ROOT, 'src/styles/tokens.css')
const PRIMITIVES = path.join(ROOT, 'src/components/primitives')
const OUT = path.join(ROOT, 'src/design-system/manifest.json')
const DUMP = process.env.DUMP
  || path.join(os.homedir(), '.claude/skills/figma-scripter-sync/figma-dump/state.json')

const drift = []
const addDrift = (kind, id, code, figma, note) => drift.push({ kind, id, code, figma, note })

/* ═══ 1. tokens.css ═══════════════════════════════════════════════════ */
/** `/* ── 제목 ── *\/` 주석을 그룹 경계로, `--name: value;   /* 설명 *\/`을 토큰으로 읽는다. */
function parseTokensCss(css) {
  const groups = []
  let current = { title: '기타', tokens: [] }
  const lines = css.split('\n')
  let inRoot = false

  for (const line of lines) {
    if (/^:root\s*{/.test(line.trim())) { inRoot = true; continue }
    if (inRoot && line.trim() === '}') { inRoot = false; continue }
    if (!inRoot) continue

    const heading = line.match(/^\s*\/\*\s*──+\s*(.+?)\s*──+/)
    if (heading) {
      if (current.tokens.length) groups.push(current)
      current = { title: heading[1].trim(), tokens: [] }
      continue
    }

    const m = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?/)
    if (!m) continue
    current.tokens.push({ name: m[1], value: m[2].trim(), comment: m[3] || '' })
  }
  if (current.tokens.length) groups.push(current)
  return groups
}

/** var(--x) 참조를 실제 값까지 따라간다 (사이트에서 색 스와치를 그리려면 최종값이 필요). */
function resolveValue(value, byName, depth = 0) {
  if (depth > 6) return value
  const m = value.match(/^var\((--[\w-]+)\)$/)
  if (!m) return value
  const ref = byName.get(m[1])
  return ref ? resolveValue(ref.value, byName, depth + 1) : value
}

/* ═══ 2. 피그마 덤프 ═══════════════════════════════════════════════════ */
function loadDump() {
  if (!fs.existsSync(DUMP)) {
    console.warn(`⚠ 덤프 없음: ${DUMP}\n  피그마 대조 없이 코드만으로 빌드한다. Scripter에서 dump-state 실행 후 다시 돌릴 것.`)
    return null
  }
  return JSON.parse(fs.readFileSync(DUMP, 'utf8'))
}

/** 피그마 변수 이름(`neutral/900`)을 코드 이름 조각(`neutral-900`)으로. */
const flat = n => n.replace(/\//g, '-')

/** 코드 토큰 이름 → 피그마 변수 후보 키들. 시맨틱은 접두사가 달라 별칭이 필요하다. */
function figmaKeyCandidates(name) {
  const c = []
  const strip = p => (name.startsWith(p) ? name.slice(p.length) : null)
  const color = strip('--color-')
  if (color) {
    c.push(color)                       // neutral-900 · primary-700
    c.push(`status-${color}`)           // --color-warning     → status/warning
    c.push(`surface-${color}`)          // --color-surface-bg  → surface/bg (이미 접두사 포함)
    c.push(`text-${color}`)
    c.push(`brand-${color}`)
    c.push(color.replace(/^surface-/, 'surface-'))
  }
  const radius = strip('--radius-')
  if (radius) c.push(`radius-${radius}`)
  const spacing = strip('--spacing-')
  if (spacing) c.push(`spacing-${spacing}`)
  const shadow = strip('--shadow-')
  if (shadow) c.push(`shadow-${shadow}`)
  return c
}

function indexFigmaVars(dump) {
  const map = new Map()   // flatName → {collection, name, val, css}
  if (!dump) return map
  for (const col of dump.variables || []) {
    for (const v of col.vars || []) {
      map.set(flat(v.name), { collection: col.collection, name: v.name, val: v.val, css: v.css })
    }
  }
  return map
}

/** 피그마 값 → 코드와 견줄 수 있는 문자열.
 *  - 시맨틱 변수는 {alias:'neutral/100'} 형태라 원시 변수까지 따라간다
 *  - 숫자(스페이싱·래디우스)는 px로
 *  - `#000000 @0.06` 알파 표기는 rgba로 */
function resolveFigmaValue(val, vars, depth = 0) {
  if (depth > 6) return String(val)
  if (val && typeof val === 'object' && val.alias) {
    const ref = vars.get(flat(val.alias))
    return ref ? resolveFigmaValue(ref.val, vars, depth + 1) : `→ ${val.alias}`
  }
  if (typeof val === 'number') return `${val}px`
  if (typeof val === 'string') {
    const m = val.match(/^(#[0-9a-fA-F]{6})\s*@\s*([\d.]+)$/)
    if (m) {
      const n = parseInt(m[1].slice(1), 16)
      const a = Math.round(parseFloat(m[2]) * 100) / 100
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
    }
  }
  return String(val)
}

/** 표기 차이(대소문자·공백·소수점 알파)를 지우고 값만 남긴다. */
function norm(v) {
  if (v == null) return v
  let s = String(v).trim().toLowerCase().replace(/\s+/g, '')
  const rgba = s.match(/^rgba?\(([\d.]+),([\d.]+),([\d.]+)(?:,([\d.]+))?\)$/)
  if (rgba) {
    const a = rgba[4] === undefined ? 1 : Math.round(parseFloat(rgba[4]) * 100) / 100
    return `rgba(${+rgba[1]},${+rgba[2]},${+rgba[3]},${a})`
  }
  const px = s.match(/^(-?[\d.]+)px$/)
  if (px) return String(+px[1])
  if (/^-?[\d.]+$/.test(s)) return String(+s)
  return s
}

/* ═══ 3. 컴포넌트 배리언트 (덤프 노드 트리) ═════════════════════════════ */
function collectComponentSets(dump) {
  const sets = []
  if (!dump) return sets
  const walk = node => {
    if (node.type === 'COMPONENT_SET') {
      const axes = {}
      const variants = (node.kids || []).map(k => {
        const props = {}
        for (const part of (k.name || '').split(',')) {
          const [ax, val] = part.split('=').map(s => (s || '').trim())
          if (!ax || val === undefined) continue
          props[ax] = val
          ;(axes[ax] ||= new Set()).add(val)
        }
        return {
          props,
          w: k.w, h: k.h,
          radius: k.radius ?? null,
          pad: k.layout?.pad ?? null,
          gap: k.layout?.gap ?? null,
          dir: k.layout?.dir ?? null,
          fill: k.fills?.[0]?.var || k.fills?.[0]?.hex || null,
        }
      })
      sets.push({
        name: node.name,
        axes: Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, [...v]])),
        variants,
      })
      return
    }
    // 배리언트가 없는 단일 COMPONENT도 세트 하나로 취급한다.
    if (node.type === 'COMPONENT') {
      sets.push({
        name: node.name,
        axes: {},
        variants: [{
          props: {},
          w: node.w, h: node.h,
          radius: node.radius ?? null,
          pad: node.layout?.pad ?? null,
          gap: node.layout?.gap ?? null,
          dir: node.layout?.dir ?? null,
          fill: node.fills?.[0]?.var || node.fills?.[0]?.hex || null,
        }],
      })
      return
    }
    for (const k of node.kids || []) walk(k)
  }
  for (const page of dump.pages || []) {
    for (const sec of page.sections || []) {
      for (const arr of ['componentSets', 'components', 'frames']) {
        for (const n of sec[arr] || []) walk(n)
      }
    }
  }
  return sets
}

/* ═══ 4. Props (TypeScript 컴파일러 API) ═══════════════════════════════ */
/** 코드 컴포넌트 → 피그마 세트 이름. 이름이 다른 것만 손으로 적는다. */
/* 이름만 다르고 같은 컴포넌트인 것들. 피그마에 따로 없는 컴포넌트를 비슷한 세트에
   억지로 붙이지 말 것 — 사이트가 그 세트의 수치를 "이 컴포넌트의 실측값"으로 싣는다.
   2026-09-01: PosterChip·GenreChip·DirectorChip이 2.0/Chip을 가리키고 있어서,
   포스터 칩 문서에 필터 칩(73×32 · radius 9999)의 수치가 실려 있었다. */
const FIGMA_ALIAS = {
  FabRound: '2.0/FAB', FabPill: '2.0/FAB',
  SearchBarButton: '2.0/FilterButton',
  Wordmark: '2.0/logo/wordmark',
}

function extractComponents(setsByName) {
  const files = fs.readdirSync(PRIMITIVES).filter(f => f.endsWith('.tsx')).map(f => path.join(PRIMITIVES, f))
  const program = ts.createProgram(files, {
    jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmit: true,
    baseUrl: ROOT, paths: { '@/*': ['src/*'] },
  })
  const checker = program.getTypeChecker()
  const out = []

  for (const file of files) {
    const sf = program.getSourceFile(file)
    if (!sf) continue
    const rel = path.relative(ROOT, file)

    ts.forEachChild(sf, node => {
      const isFn = ts.isFunctionDeclaration(node) && node.name
      const isConst = ts.isVariableStatement(node)
      if (!isFn && !isConst) return
      const exported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      if (!exported) return

      const decl = isFn ? node : node.declarationList.declarations[0]
      const name = isFn ? node.name.text : (decl.name && ts.isIdentifier(decl.name) ? decl.name.text : null)
      if (!name || !/^[A-Z]/.test(name)) return

      // export const X = forwardRef<Ref, XProps>(function X(props, ref) {…}) 형태를 벗긴다.
      // 벗기지 않으면 forwardRef로 감싼 Input·SearchBar가 통째로 빠진다.
      let fnNode = isFn ? node : decl.initializer
      let propsTypeNode = null
      while (fnNode && ts.isCallExpression(fnNode)) {
        const callee = ts.isIdentifier(fnNode.expression) ? fnNode.expression.text
          : ts.isPropertyAccessExpression(fnNode.expression) ? fnNode.expression.name.text : ''
        if (!['forwardRef', 'memo'].includes(callee)) break
        if (fnNode.typeArguments?.length >= 2) propsTypeNode = fnNode.typeArguments[1]
        fnNode = fnNode.arguments[0]
      }
      if (!fnNode || !fnNode.parameters) return

      // props를 안 받는 컴포넌트(MovieCardSkeleton 등)도 목록에는 남긴다.
      const param = fnNode.parameters[0]
      propsTypeNode = propsTypeNode || param?.type || null

      // 구조분해 기본값 (variant = 'primary')
      const defaults = {}
      if (param?.name && ts.isObjectBindingPattern(param.name)) {
        for (const el of param.name.elements) {
          if (el.initializer) defaults[el.name.getText(sf)] = el.initializer.getText(sf)
        }
      }

      // props 타입 — 이 파일에서 선언된 프로퍼티만 남긴다(HTML 속성 상속분 제외)
      const props = []
      if (propsTypeNode) {
        const type = checker.getTypeAtLocation(propsTypeNode)
        for (const sym of checker.getPropertiesOfType(type)) {
          const d = sym.declarations?.[0]
          if (!d) continue
          const declFile = d.getSourceFile().fileName
          if (!declFile.startsWith(PRIMITIVES)) continue
          props.push({
            name: sym.getName(),
            type: checker.typeToString(checker.getTypeOfSymbolAtLocation(sym, d)),
            optional: !!(sym.flags & ts.SymbolFlags.Optional),
            default: defaults[sym.getName()] ?? null,
            doc: ts.displayPartsToString(sym.getDocumentationComment(checker)) || '',
          })
        }
      }

      const jsdoc = ts.getJSDocCommentsAndTags(isFn ? node : node)
        .map(t => (typeof t.comment === 'string' ? t.comment : ''))
        .join('\n').trim()

      const figmaSet = FIGMA_ALIAS[name] || (setsByName.has(`2.0/${name}`) ? `2.0/${name}` : null)
      out.push({ name, file: rel, doc: jsdoc, props, figmaSet })
    })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/* ═══ 5. 조립 ════════════════════════════════════════════════════════ */
const dump = loadDump()
const css = fs.readFileSync(TOKENS_CSS, 'utf8')
const groups = parseTokensCss(css)

const byName = new Map()
for (const g of groups) for (const t of g.tokens) byName.set(t.name, t)

const figmaVars = indexFigmaVars(dump)
const matchedFigma = new Set()

for (const g of groups) {
  for (const t of g.tokens) {
    t.resolved = resolveValue(t.value, byName)
    t.figma = null
    for (const key of figmaKeyCandidates(t.name)) {
      const hit = figmaVars.get(key)
      if (hit) {
        t.figma = {
          name: hit.name,
          value: resolveFigmaValue(hit.val, figmaVars),
          alias: hit.val && typeof hit.val === 'object' ? hit.val.alias : null,
          collection: hit.collection,
        }
        matchedFigma.add(key)
        break
      }
    }
    if (t.figma && norm(t.figma.value) !== norm(t.resolved)) {
      addDrift('token-value', t.name, t.resolved, t.figma.value, `피그마 ${t.figma.name}와 값이 다르다`)
    }
  }
}

// 피그마에만 있는 변수
for (const [key, v] of figmaVars) {
  if (!matchedFigma.has(key)) {
    addDrift('figma-only', v.name, null, resolveFigmaValue(v.val, figmaVars), `코드에 대응 토큰이 없다 (${v.collection})`)
  }
}

/* 타이포그래피 — 코드 --text-* ↔ 피그마 텍스트 스타일 */
const textTokens = [...byName.values()].filter(t => t.name.startsWith('--text-'))
const figmaTextStyles = (dump?.textStyles || []).map(s => ({
  name: s.name,
  font: s.font,
  size: s.size,
  lineHeight: typeof s.lh === 'string' && s.lh.endsWith('%')
    ? `${Math.round(parseFloat(s.lh))}%` : s.lh,
}))
const sizesInFigma = new Set(figmaTextStyles.filter(s => s.name.startsWith('2.0/')).map(s => s.size))
for (const t of textTokens) {
  const px = parseInt(t.value, 10)
  if (Number.isNaN(px)) continue
  // 폐지 예정으로 표시된 토큰은 스케일 밖이어도 알리지 않는다 — 이미 알고 있는 부채다
  if (t.comment.includes('폐지')) continue
  if (!sizesInFigma.has(px)) {
    addDrift('type-scale', t.name, t.value, null, `2.0 텍스트 스타일에 ${px}px가 없다 — 스케일 밖이거나 스타일 미신설`)
  }
}

/* 1.0 잔재 — 2.0 접두사가 없는 피그마 스타일. 남아 있으면 다음 사람이 또 집는다. */
for (const st of dump?.textStyles ?? []) {
  if (!st.name.startsWith('2.0/')) {
    addDrift('legacy-figma-style', st.name, null, `${st.font} · ${st.size}px`, '1.0 텍스트 스타일 — 2.0으로 옮기고 삭제할 것')
  }
}
for (const es of dump?.effectStyles ?? []) {
  if (!es.name.startsWith('2.0/')) {
    addDrift('legacy-figma-style', es.name, null, `${es.effects.length}겹`, '1.0 이펙트 스타일 — 2.0/shadow/*로 옮기고 삭제할 것')
  }
}

const sets = collectComponentSets(dump)
const setsByName = new Map(sets.map(s => [s.name, s]))
/** 배리언트로 그려져야 하는 prop 이름 — 이것만 축 누락을 따진다. */
const VARIANT_PROPS = new Set(['variant', 'size', 'tone', 'shape', 'state'])

/** 코드 prop의 리터럴 유니온("32 | 44 | 52", "\"ghost\" | \"overlay\"")에서 값만 뽑는다. */
function unionValues(type) {
  if (!type || !type.includes('|')) return null
  /* 'number' · 'string' 같은 원시 타입은 배리언트가 아니다 — Icon의 size가 number를 겸한다 */
  const vals = type.split('|').map(v => v.trim().replace(/^["']|["']$/g, ''))
    .filter(v => v && !['undefined', 'null', 'number', 'string', 'boolean'].includes(v))
  return vals.length > 1 ? vals : null
}

/* 코드가 가진 배리언트를 피그마 세트가 갖고 있는지 — 축 이름이 같은 것만 본다.
   값 대조(radius·크기)는 아직 안 한다. 코드 쪽 기하가 토큰·조건부라 기계로 못 읽는다. */
function checkVariantCoverage(c, set) {
  for (const prop of c.props) {
    const codeVals = unionValues(prop.type)
    if (!codeVals) continue
    const axisKey = Object.keys(set.axes || {}).find(k => k.toLowerCase() === prop.name.toLowerCase())
    if (!axisKey) {
      /* 코드엔 배리언트 축이 있는데 피그마 세트엔 그 축이 통째로 없는 경우.
         FavoriteButton이 그랬다 — 코드 size 32·44·52인데 피그마는 44 하나로만 그려져 있다. */
      if (VARIANT_PROPS.has(prop.name)) {
        addDrift('axis-missing', `${c.name}.${prop.name}`, codeVals.join(' · '), null,
          `피그마 ${set.name}에 ${prop.name} 축이 없다`)
      }
      continue
    }
    const figmaVals = (set.axes[axisKey] || []).map(String)
    const missing = codeVals.filter(v => !figmaVals.includes(v))
    if (missing.length) {
      addDrift('variant-missing', `${c.name}.${prop.name}`, codeVals.join(' · '), figmaVals.join(' · '),
        `피그마 ${set.name}에 ${missing.join('·')} 배리언트가 없다`)
    }
  }
}

const components = extractComponents(setsByName).map(c => {
  const set = c.figmaSet ? setsByName.get(c.figmaSet) : null
  if (!c.figmaSet) addDrift('component-unmapped', c.name, c.file, null, '대응하는 피그마 컴포넌트 세트가 없다')
  if (set) checkVariantCoverage(c, set)
  return { ...c, figma: set ? { name: set.name, axes: set.axes, variants: set.variants } : null }
})

const manifest = {
  generatedAt: new Date().toISOString(),
  figmaDumpAt: dump?.exportedAt ?? null,
  tokenGroups: groups,
  typography: {
    code: textTokens.map(t => ({ name: t.name, value: t.value, comment: t.comment })),
    figma: figmaTextStyles,
  },
  effects: dump?.effectStyles ?? [],
  figmaCollections: (dump?.variables || []).map(c => ({
    name: c.collection, modes: c.modes, count: c.vars.length,
    vars: c.vars.map(v => ({ name: v.name, value: v.val, scopes: v.scopes || [] })),
  })),
  components,
  drift,
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n')

const tokenCount = groups.reduce((n, g) => n + g.tokens.length, 0)
const byKind = drift.reduce((a, d) => ({ ...a, [d.kind]: (a[d.kind] || 0) + 1 }), {})
console.log(`✓ ${path.relative(ROOT, OUT)}`)
console.log(`  토큰 ${tokenCount} (그룹 ${groups.length}) · 컴포넌트 ${components.length} · 피그마 세트 ${sets.length}`)
console.log(`  drift ${drift.length}`, byKind)
