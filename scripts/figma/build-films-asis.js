// build-films-asis — 상영작(films) 탭 ASIS 그레이스케일 골격을 피그마에 생성 (Scripter용)
//
// 생성물: "Design System - work" 페이지에 섹션 "FilmsTab ASIS (grayscale)"
//   - ASIS · Mobile (402) — 실물 구조 그대로: 헤더/영화제 배너/감독 특별전/다크 히어로/
//     큐레이션 행 3종/수상작 카드
//   - ASIS · PC (1280, rail 72 + 본문) — 동일 섹션 와이드 배치
// 전부 그레이스케일 골격(박스+텍스트) — TOBE는 이걸 복제해서 다듬는 용도.

const G = { bg:'#FAF9F8', card:'#FFFFFF', raised:'#EAE5E1', line:'#DDD9CF',
  poster:'#C6BFB9', ink:'#0C0A08', t800:'#2B2622', t600:'#726B65', t500:'#8D8781', dark:'#1A1714' }
const hex = h => { const n=parseInt(h.slice(1),16); return {r:((n>>16)&255)/255,g:((n>>8)&255)/255,b:(n&255)/255} }
const fill = h => [{ type:'SOLID', color:hex(h) }]

await figma.loadFontAsync({ family:'KIMM_Bold', style:'B' })
for (const st of ['Regular','Medium','Bold']) await figma.loadFontAsync({ family:'Pretendard', style:st })

const mkAuto = (name, dir, gap, pad, w) => {
  const f = figma.createFrame()
  f.name = name; f.layoutMode = dir; f.itemSpacing = gap
  ;[f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = pad
  f.fills = []
  if (w) { f.resize(w, f.height); f.primaryAxisSizingMode='AUTO'; f.counterAxisSizingMode='FIXED' }
  else { f.primaryAxisSizingMode='AUTO'; f.counterAxisSizingMode='AUTO' }
  return f
}
const mkText = (chars, size, opts={}) => {
  const t = figma.createText()
  t.fontName = opts.kimm ? { family:'KIMM_Bold', style:'B' } : { family:'Pretendard', style:opts.weight||'Regular' }
  t.characters = chars; t.fontSize = size
  t.fills = fill(opts.color||G.ink)
  if (opts.ls) t.letterSpacing = { value:opts.ls, unit:'PERCENT' }
  t.lineHeight = { value:opts.lh||150, unit:'PERCENT' }
  return t
}
const mkBox = (w,h,c=G.poster,r=2) => { const b=figma.createRectangle(); b.resize(w,h); b.fills=fill(c); b.cornerRadius=r; return b }

// ── 조립 블록 ──
// 섹션 타이틀 (h2 + 부제)
const secTitle = (title, sub) => {
  const f = mkAuto('sec-title','VERTICAL',4,[24,16,8,16])
  f.appendChild(mkText(title,20,{kimm:true,ls:5,lh:130}))
  if (sub) f.appendChild(mkText(sub,12,{color:G.t500}))
  return f
}
// 포스터 캡션 아이템 — mode: 'meta'(장르·연도) | 'theater'(극장·시간)
const posterItem = (w, title, l2, l3, badge) => {
  const f = mkAuto('poster-item','VERTICAL',2,[0,0,0,0])
  const imgWrap = figma.createFrame(); imgWrap.name='img'; imgWrap.resize(w, Math.round(w*1.5)); imgWrap.fills=fill(G.poster); imgWrap.cornerRadius=2
  if (badge) {
    const b = mkAuto('badge','HORIZONTAL',0,[4,8,4,8]); b.fills=fill(G.dark); b.cornerRadius=4
    b.appendChild(mkText(badge,11,{weight:'Medium',color:'#FFFFFF',lh:100}))
    imgWrap.appendChild(b); b.x=6; b.y=imgWrap.height-b.height-6
  }
  f.appendChild(imgWrap)
  const cap = mkAuto('cap','VERTICAL',0,[6,0,0,0])
  cap.appendChild(mkText(title,14,{weight:'Bold',color:G.ink}))
  if (l2) cap.appendChild(mkText(l2,12,{color:G.t500}))
  if (l3) cap.appendChild(mkText(l3,12,{weight:'Medium',color:G.t600}))
  f.appendChild(cap)
  return f
}
// 가로 포스터 행
const posterRow = (n, w, mk) => {
  const row = mkAuto('poster-row','HORIZONTAL',12,[8,16,16,16])
  for (let i=0;i<n;i++) row.appendChild(mk(i))
  return row
}

// ── Mobile 402 ──
const mobile = mkAuto('ASIS · Mobile','VERTICAL',0,[0,0,0,0],402)
mobile.fills = fill(G.bg)

// 1. 헤더
{
  const h = mkAuto('header','VERTICAL',12,[20,16,12,16])
  const top = mkAuto('top','HORIZONTAL',0,[0,0,0,0]); top.primaryAxisAlignItems='SPACE_BETWEEN'; top.counterAxisAlignItems='CENTER'
  top.layoutSizingHorizontal='FILL'
  top.appendChild(mkText('상영작',24,{kimm:true,ls:5,lh:125}))
  const chip = mkAuto('region-chip','HORIZONTAL',4,[6,12,6,12]); chip.fills=fill(G.card); chip.cornerRadius=9999
  chip.strokes = fill(G.line); chip.strokeWeight = 1
  chip.appendChild(mkText('검색 지역',12,{weight:'Medium',color:G.t600,lh:100}))
  top.appendChild(chip)
  h.appendChild(top)
  const search = mkAuto('search','HORIZONTAL',8,[12,16,12,16]); search.fills=fill(G.card); search.cornerRadius=12
  search.strokes=fill(G.line); search.strokeWeight=1; search.layoutSizingHorizontal='FILL'
  search.appendChild(mkText('영화, 영화관, 감독, 영화제 검색',14,{color:G.t500,lh:100}))
  h.appendChild(search)
  h.appendChild(mkText('지금 만날 수 있는 영화 149편',12,{color:G.t500}))
  mobile.appendChild(h); h.layoutSizingHorizontal='FILL'
}
// 2. 주목할 영화제
{
  mobile.appendChild(secTitle('주목할 영화제','예정 · D-3 · 강릉')).layoutSizingHorizontal='FILL'
  const banner = mkBox(402,110,G.raised,0); banner.name='festival-banner'
  mobile.appendChild(banner)
}
// 3. 감독 특별전
{
  mobile.appendChild(secTitle('라스 폰 트리에 특별전')).layoutSizingHorizontal='FILL'
  const card = mkAuto('director-card','VERTICAL',12,[20,16,20,16]); card.fills=fill(G.card); card.cornerRadius=12
  card.strokes=fill(G.line); card.strokeWeight=1
  const row = mkAuto('row','HORIZONTAL',12,[0,0,0,0]); row.counterAxisAlignItems='CENTER'
  const av = figma.createEllipse(); av.resize(48,48); av.fills=fill(G.t800)
  row.appendChild(av); row.appendChild(mkText('라스 폰 트리에',18,{weight:'Bold'}))
  card.appendChild(row)
  card.appendChild(mkText('감독 설명이 아직 없습니다',13,{color:G.t500}))
  const btn = mkAuto('btn','HORIZONTAL',0,[10,16,10,16]); btn.cornerRadius=8; btn.strokes=fill(G.line); btn.strokeWeight=1
  btn.primaryAxisAlignItems='CENTER'; btn.appendChild(mkText('감독 상세 보기',13,{weight:'Medium',color:G.t600,lh:100}))
  card.appendChild(btn); btn.layoutSizingHorizontal='FILL'
  const theater = mkAuto('theater-row','VERTICAL',4,[12,0,0,0])
  theater.appendChild(mkText('아트나인',14,{weight:'Bold'}))
  theater.appendChild(mkText('서울 · 5편 상영중',12,{color:G.t500}))
  const cta = mkAuto('cta','HORIZONTAL',0,[10,16,10,16]); cta.cornerRadius=8; cta.fills=fill('#404E81')
  cta.primaryAxisAlignItems='CENTER'; cta.appendChild(mkText('영화관 보기',13,{weight:'Bold',color:'#FFFFFF',lh:100}))
  theater.appendChild(cta); card.appendChild(theater)
  cta.layoutSizingHorizontal='FILL'; theater.layoutSizingHorizontal='FILL'
  const wrap = mkAuto('director-wrap','VERTICAL',0,[0,16,0,16]); wrap.appendChild(card)
  card.layoutSizingHorizontal='FILL'
  mobile.appendChild(wrap); wrap.layoutSizingHorizontal='FILL'
  const sub = mkAuto('sub','VERTICAL',0,[16,16,0,16]); sub.fills=fill(G.raised)
  sub.appendChild(mkText('아트나인 상영작',14,{weight:'Bold'}))
  const r = posterRow(3,120,i=>posterItem(120,['멜랑콜리아','백치들','어둠 속의 댄서'][i],'라스 폰 트리에'))
  sub.appendChild(r)
  mobile.appendChild(sub); sub.layoutSizingHorizontal='FILL'
}
// 4. 테마 특별전 다크 히어로
{
  const hero = mkAuto('theme-hero','VERTICAL',8,[24,16,20,16],402)
  hero.fills=fill(G.dark)
  hero.appendChild(mkText('2026년 여름, 영화 소식을 소개할지도',11,{color:'#A7A19A'}))
  hero.appendChild(mkText('자려고 누웠는데\n특별 상영전',22,{kimm:true,ls:5,lh:130,color:'#FFFFFF'}))
  const r = mkAuto('row','HORIZONTAL',10,[8,0,0,0])
  for (let i=0;i<3;i++) r.appendChild(mkBox(96,144,'#4A4540',2))
  hero.appendChild(r)
  mobile.appendChild(hero)
}
// 5·6·7. 큐레이션 행 3종
{
  mobile.appendChild(secTitle('지금 출발하면 볼 수 있는','지금 출발하면 늦지 않게 볼 수 있는 회차예요')).layoutSizingHorizontal='FILL'
  mobile.appendChild(posterRow(3,130,i=>posterItem(130,['경멸','모아나','소영의 노력'][i],['장-뤽 고다르','토마스 카일','오재형'][i],'오늘 18:20')))
  mobile.appendChild(secTitle('막바지 상영','상영관이 줄고 있어요. 미리 확인하고 예매하세요')).layoutSizingHorizontal='FILL'
  mobile.appendChild(posterRow(3,130,i=>posterItem(130,['그녀가 돌아온 날','총총총','엘 시드'][i],['홍상수','한창록','안소니 만'][i],null,'오늘')))
  mobile.appendChild(secTitle('이번 주 새롭게 상영하는 영화','이번 주 스크린에 새로 오른 영화들')).layoutSizingHorizontal='FILL'
  mobile.appendChild(posterRow(3,130,i=>posterItem(130,['노 어더 랜드','남매의 여름밤','잘 알지도 못하면서'][i],['드라마 · 2024','드라마 · 2019','드라마 · 2009'][i])))
}
// 8. 수상작 카드
{
  mobile.appendChild(secTitle('베니스 황금사자상','세계에서 가장 오래된 영화제가 선택한 영화들')).layoutSizingHorizontal='FILL'
  const card = mkAuto('award-card','HORIZONTAL',12,[16,16,16,16]); card.fills=fill(G.card); card.cornerRadius=12
  card.strokes=fill(G.line); card.strokeWeight=1
  card.appendChild(mkBox(56,84))
  const c = mkAuto('c','VERTICAL',4,[0,0,0,0])
  c.appendChild(mkText('애정만세',14,{weight:'Bold'}))
  c.appendChild(mkText('차이밍량 · 드라마 · 1994',12,{color:G.t500}))
  card.appendChild(c)
  const wrap = mkAuto('award-wrap','VERTICAL',0,[0,16,24,16]); wrap.appendChild(card)
  card.layoutSizingHorizontal='FILL'
  mobile.appendChild(wrap); wrap.layoutSizingHorizontal='FILL'
}

// ── PC 1280 (rail 72 + 본문) ──
const pc = mkAuto('ASIS · PC','HORIZONTAL',0,[0,0,0,0],1280)
pc.fills = fill(G.raised)
{
  const rail = mkAuto('rail','VERTICAL',20,[16,12,16,12]); rail.resize(72, 900)
  rail.counterAxisSizingMode='FIXED'; rail.primaryAxisSizingMode='FIXED'
  rail.fills=fill(G.raised); rail.counterAxisAlignItems='CENTER'
  rail.appendChild(mkBox(40,40,'#404E81',4))
  for (const label of ['지도','상영작']) {
    const t2 = mkAuto('tab','VERTICAL',4,[8,4,8,4]); t2.cornerRadius=8; t2.counterAxisAlignItems='CENTER'
    if (label==='상영작') t2.fills=fill('#DCDFEA')
    t2.appendChild(mkBox(22,22,G.t600,4))
    t2.appendChild(mkText(label,10,{weight:'Medium',color:G.t600,lh:100}))
    rail.appendChild(t2)
  }
  pc.appendChild(rail)
  const body = mkAuto('body','VERTICAL',0,[0,0,0,0]); body.fills=fill(G.bg)
  body.topLeftRadius=16; body.bottomLeftRadius=16
  // 헤더: 타이틀 — 중앙 검색 — 지역칩
  const h = mkAuto('header','HORIZONTAL',24,[20,24,12,24]); h.counterAxisAlignItems='CENTER'; h.primaryAxisAlignItems='SPACE_BETWEEN'
  h.appendChild(mkText('상영작',24,{kimm:true,ls:5,lh:125}))
  const search = mkAuto('search','HORIZONTAL',8,[12,16,12,16]); search.fills=fill(G.card); search.cornerRadius=9999
  search.strokes=fill(G.line); search.strokeWeight=1; search.resize(420,search.height)
  search.counterAxisSizingMode='AUTO'; search.primaryAxisSizingMode='FIXED'
  search.appendChild(mkText('영화, 영화관, 감독, 영화제 검색',14,{color:G.t500,lh:100}))
  h.appendChild(search)
  const chip = mkAuto('region','HORIZONTAL',4,[6,12,6,12]); chip.fills=fill(G.card); chip.cornerRadius=9999
  chip.strokes=fill(G.line); chip.strokeWeight=1
  chip.appendChild(mkText('검색 지역',12,{weight:'Medium',color:G.t600,lh:100}))
  h.appendChild(chip)
  body.appendChild(h); h.layoutSizingHorizontal='FILL'
  // 배너 + 행 2종 (와이드)
  body.appendChild(secTitle('주목할 영화제','예정 · D-3 · 강릉')).layoutSizingHorizontal='FILL'
  const banner = mkBox(1208,120,G.raised,8); banner.name='festival-banner'
  const bw = mkAuto('bw','VERTICAL',0,[0,24,0,24]); bw.appendChild(banner); body.appendChild(bw); bw.layoutSizingHorizontal='FILL'
  body.appendChild(secTitle('지금 출발하면 볼 수 있는','지금 출발하면 늦지 않게 볼 수 있는 회차예요')).layoutSizingHorizontal='FILL'
  const row1 = mkAuto('row','HORIZONTAL',16,[8,24,16,24])
  for (let i=0;i<6;i++) row1.appendChild(posterItem(176,'영화 제목','감독','오늘 18:20'))
  body.appendChild(row1)
  body.appendChild(secTitle('막바지 상영','상영관이 줄고 있어요')).layoutSizingHorizontal='FILL'
  const row2 = mkAuto('row','HORIZONTAL',16,[8,24,24,24])
  for (let i=0;i<6;i++) row2.appendChild(posterItem(176,'영화 제목','장르 · 연도',null,'오늘'))
  body.appendChild(row2)
  pc.appendChild(body); body.layoutSizingHorizontal='FILL'; body.layoutSizingVertical='FILL'
}

// ── 섹션 배치 ──
const work = figma.root.children.find(p => p.name === 'Design System - work')
await work.loadAsync()
figma.currentPage = work
const sec = figma.createSection()
sec.name = 'FilmsTab ASIS (grayscale)'
// 기존 콘텐츠 오른쪽 빈 공간에
let maxX = 0
for (const c of work.children) if (c !== sec) maxX = Math.max(maxX, c.x + c.width)
sec.x = maxX + 200; sec.y = 0
sec.appendChild(mobile); mobile.x = 60; mobile.y = 80
sec.appendChild(pc); pc.x = 60 + 402 + 120; pc.y = 80
sec.resizeWithoutConstraints(60 + 402 + 120 + 1280 + 60, Math.max(mobile.height, 900) + 160)
figma.viewport.scrollAndZoomIntoView([sec])
figma.notify('FilmsTab ASIS 골격 생성 완료')
