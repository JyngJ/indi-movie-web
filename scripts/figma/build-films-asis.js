// build-films-asis v3 — 상영작(films) 탭 ASIS 그레이스케일 골격 생성 (Scripter용)
//
// v3: PC 프레임 사이징 축 수정(HORIZONTAL은 primary=가로), 포스터 행 402 클립,
//     rail 72×FILL 고정. FILL은 appendChild 후 설정 (피그마 API 제약)
// 생성물: "Design System - work" 페이지 → 섹션 "FilmsTab ASIS (grayscale)"

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
// 부모에 붙인 뒤 가로 FILL — API 제약 대응 헬퍼
const addFill = (parent, child) => { parent.appendChild(child); child.layoutSizingHorizontal = 'FILL'; return child }
// 가로 스크롤 행 — 부모 폭 채우고 넘치는 포스터는 클립 (실물의 스크롤 잘림 표현)
const addRow = (parent, row) => { parent.appendChild(row); row.layoutSizingHorizontal = 'FILL'; row.clipsContent = true; return row }

// ── 조립 블록 ──
const secTitle = (title, sub) => {
  const f = mkAuto('sec-title','VERTICAL',4,[24,16,8,16])
  f.appendChild(mkText(title,20,{kimm:true,ls:5,lh:130}))
  if (sub) f.appendChild(mkText(sub,12,{color:G.t500}))
  return f
}
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
  addFill(mobile, h)
  const top = mkAuto('top','HORIZONTAL',0,[0,0,0,0])
  top.primaryAxisAlignItems='SPACE_BETWEEN'; top.counterAxisAlignItems='CENTER'
  addFill(h, top)
  top.appendChild(mkText('상영작',24,{kimm:true,ls:5,lh:125}))
  const chip = mkAuto('region-chip','HORIZONTAL',4,[6,12,6,12]); chip.fills=fill(G.card); chip.cornerRadius=9999
  chip.strokes = fill(G.line); chip.strokeWeight = 1
  chip.appendChild(mkText('검색 지역',12,{weight:'Medium',color:G.t600,lh:100}))
  top.appendChild(chip)
  const search = mkAuto('search','HORIZONTAL',8,[12,16,12,16]); search.fills=fill(G.card); search.cornerRadius=12
  search.strokes=fill(G.line); search.strokeWeight=1
  search.appendChild(mkText('영화, 영화관, 감독, 영화제 검색',14,{color:G.t500,lh:100}))
  addFill(h, search)
  h.appendChild(mkText('지금 만날 수 있는 영화 149편',12,{color:G.t500}))
}
// 2. 주목할 영화제
{
  addFill(mobile, secTitle('주목할 영화제','예정 · D-3 · 강릉'))
  const banner = mkBox(402,110,G.raised,0); banner.name='festival-banner'
  mobile.appendChild(banner)
}
// 3. 감독 특별전
{
  addFill(mobile, secTitle('라스 폰 트리에 특별전'))
  const wrap = mkAuto('director-wrap','VERTICAL',0,[0,16,0,16])
  addFill(mobile, wrap)
  const card = mkAuto('director-card','VERTICAL',12,[20,16,20,16]); card.fills=fill(G.card); card.cornerRadius=12
  card.strokes=fill(G.line); card.strokeWeight=1
  addFill(wrap, card)
  const row = mkAuto('row','HORIZONTAL',12,[0,0,0,0]); row.counterAxisAlignItems='CENTER'
  const av = figma.createEllipse(); av.resize(48,48); av.fills=fill(G.t800)
  row.appendChild(av); row.appendChild(mkText('라스 폰 트리에',18,{weight:'Bold'}))
  card.appendChild(row)
  card.appendChild(mkText('감독 설명이 아직 없습니다',13,{color:G.t500}))
  const btn = mkAuto('btn','HORIZONTAL',0,[10,16,10,16]); btn.cornerRadius=8; btn.strokes=fill(G.line); btn.strokeWeight=1
  btn.primaryAxisAlignItems='CENTER'
  btn.appendChild(mkText('감독 상세 보기',13,{weight:'Medium',color:G.t600,lh:100}))
  addFill(card, btn)
  const theater = mkAuto('theater-row','VERTICAL',4,[12,0,0,0])
  theater.appendChild(mkText('아트나인',14,{weight:'Bold'}))
  theater.appendChild(mkText('서울 · 5편 상영중',12,{color:G.t500}))
  addFill(card, theater)
  const cta = mkAuto('cta','HORIZONTAL',0,[10,16,10,16]); cta.cornerRadius=8; cta.fills=fill('#404E81')
  cta.primaryAxisAlignItems='CENTER'
  cta.appendChild(mkText('영화관 보기',13,{weight:'Bold',color:'#FFFFFF',lh:100}))
  addFill(theater, cta)
  const sub = mkAuto('sub','VERTICAL',0,[16,16,0,16]); sub.fills=fill(G.raised)
  addFill(mobile, sub)
  sub.appendChild(mkText('아트나인 상영작',14,{weight:'Bold'}))
  addRow(sub, posterRow(3,120,i=>posterItem(120,['멜랑콜리아','백치들','어둠 속의 댄서'][i],'라스 폰 트리에')))
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
  addFill(mobile, secTitle('지금 출발하면 볼 수 있는','지금 출발하면 늦지 않게 볼 수 있는 회차예요'))
  addRow(mobile, posterRow(3,130,i=>posterItem(130,['경멸','모아나','소영의 노력'][i],['장-뤽 고다르','토마스 카일','오재형'][i],'오늘 18:20')))
  addFill(mobile, secTitle('막바지 상영','상영관이 줄고 있어요. 미리 확인하고 예매하세요'))
  addRow(mobile, posterRow(3,130,i=>posterItem(130,['그녀가 돌아온 날','총총총','엘 시드'][i],['홍상수','한창록','안소니 만'][i],null,'오늘')))
  addFill(mobile, secTitle('이번 주 새롭게 상영하는 영화','이번 주 스크린에 새로 오른 영화들'))
  addRow(mobile, posterRow(3,130,i=>posterItem(130,['노 어더 랜드','남매의 여름밤','잘 알지도 못하면서'][i],['드라마 · 2024','드라마 · 2019','드라마 · 2009'][i])))
}
// 8. 수상작 카드
{
  addFill(mobile, secTitle('베니스 황금사자상','세계에서 가장 오래된 영화제가 선택한 영화들'))
  const wrap = mkAuto('award-wrap','VERTICAL',0,[0,16,24,16])
  addFill(mobile, wrap)
  const card = mkAuto('award-card','HORIZONTAL',12,[16,16,16,16]); card.fills=fill(G.card); card.cornerRadius=12
  card.strokes=fill(G.line); card.strokeWeight=1
  addFill(wrap, card)
  card.appendChild(mkBox(56,84))
  const c = mkAuto('c','VERTICAL',4,[0,0,0,0])
  c.appendChild(mkText('애정만세',14,{weight:'Bold'}))
  c.appendChild(mkText('차이밍량 · 드라마 · 1994',12,{color:G.t500}))
  card.appendChild(c)
}

// ── PC 1280 (rail 72 + 본문) ──
const pc = mkAuto('ASIS · PC','HORIZONTAL',0,[0,0,0,0])
pc.resize(1280, 900)
pc.primaryAxisSizingMode='FIXED'   // 가로 1280 고정
pc.counterAxisSizingMode='AUTO'    // 세로는 본문 허그
pc.fills = fill(G.raised)
{
  const rail = mkAuto('rail','VERTICAL',20,[16,12,16,12])
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
  rail.layoutSizingHorizontal='FIXED'; rail.resize(72, rail.height)
  rail.layoutSizingVertical='FILL'   // 레일은 본문 높이 따라감
  const body = mkAuto('body','VERTICAL',0,[0,0,0,0]); body.fills=fill(G.bg)
  body.topLeftRadius=16; body.bottomLeftRadius=16
  pc.appendChild(body)
  body.layoutSizingHorizontal='FILL'
  // 헤더
  const h = mkAuto('header','HORIZONTAL',24,[20,24,12,24])
  h.counterAxisAlignItems='CENTER'; h.primaryAxisAlignItems='SPACE_BETWEEN'
  addFill(body, h)
  h.appendChild(mkText('상영작',24,{kimm:true,ls:5,lh:125}))
  const search = mkAuto('search','HORIZONTAL',8,[12,16,12,16]); search.fills=fill(G.card); search.cornerRadius=9999
  search.strokes=fill(G.line); search.strokeWeight=1
  search.appendChild(mkText('영화, 영화관, 감독, 영화제 검색',14,{color:G.t500,lh:100}))
  h.appendChild(search)
  search.layoutSizingHorizontal='FIXED'; search.resize(420, search.height)
  const chip = mkAuto('region','HORIZONTAL',4,[6,12,6,12]); chip.fills=fill(G.card); chip.cornerRadius=9999
  chip.strokes=fill(G.line); chip.strokeWeight=1
  chip.appendChild(mkText('검색 지역',12,{weight:'Medium',color:G.t600,lh:100}))
  h.appendChild(chip)
  // 배너 + 와이드 행 2종
  addFill(body, secTitle('주목할 영화제','예정 · D-3 · 강릉'))
  const bw = mkAuto('bw','VERTICAL',0,[0,24,0,24])
  addFill(body, bw)
  const banner = mkBox(1208,120,G.raised,8); banner.name='festival-banner'
  bw.appendChild(banner)
  banner.layoutSizingHorizontal='FILL'
  addFill(body, secTitle('지금 출발하면 볼 수 있는','지금 출발하면 늦지 않게 볼 수 있는 회차예요'))
  const row1 = mkAuto('row','HORIZONTAL',16,[8,24,16,24])
  for (let i=0;i<6;i++) row1.appendChild(posterItem(176,'영화 제목','감독','오늘 18:20'))
  addRow(body, row1)
  addFill(body, secTitle('막바지 상영','상영관이 줄고 있어요'))
  const row2 = mkAuto('row','HORIZONTAL',16,[8,24,16,24])
  for (let i=0;i<6;i++) row2.appendChild(posterItem(176,'영화 제목','장르 · 연도',null,'오늘'))
  addRow(body, row2)

  // ── 개인화: 〈X〉를 보셨다면 ──
  addFill(body, secTitle('〈경멸〉을 보셨다면','최근 본 영화와 닿아 있는 작품들'))
  const rowP = mkAuto('row','HORIZONTAL',16,[8,24,16,24])
  for (let i=0;i<6;i++) rowP.appendChild(posterItem(176,'영화 제목','감독'))
  addRow(body, rowP)

  // ── 인스타그램 추천 — 다크 히어로 (검정 카드 + 우측 커버 이미지) ──
  {
    const wrap = mkAuto('insta-wrap','VERTICAL',0,[24,24,8,24])
    addFill(body, wrap)
    const hero = mkAuto('insta-hero','HORIZONTAL',0,[0,0,0,0]); hero.fills=fill('#000000'); hero.cornerRadius=12
    hero.clipsContent = true
    addFill(wrap, hero)
    const left = mkAuto('left','VERTICAL',8,[28,28,28,28])
    left.appendChild(mkText('2026년 여름, 영화 소식을 소개할지도',11,{color:'#A7A19A'}))
    left.appendChild(mkText('자려고 누웠는데\n특별 상영전',22,{kimm:true,ls:5,lh:130,color:'#FFFFFF'}))
    hero.appendChild(left)
    const img = mkBox(560,180,'#4A4540',0); img.name='cover-img'
    hero.appendChild(img)
    img.layoutSizingHorizontal='FILL'
  }

  // ── 감독 특별전 — 좌 감독카드 + 우 포스터 행 ──
  addFill(body, secTitle('라스 폰 트리에 특별전'))
  {
    const row = mkAuto('special-row','HORIZONTAL',16,[0,24,16,24])
    addFill(body, row)
    const card = mkAuto('director-card','VERTICAL',12,[20,20,20,20]); card.fills=fill(G.card); card.cornerRadius=12
    card.strokes=fill(G.line); card.strokeWeight=1
    card.resize(300, card.height); card.counterAxisSizingMode='FIXED'; card.primaryAxisSizingMode='AUTO'
    const rr = mkAuto('r','HORIZONTAL',12,[0,0,0,0]); rr.counterAxisAlignItems='CENTER'
    const av = figma.createEllipse(); av.resize(48,48); av.fills=fill(G.t800)
    rr.appendChild(av); rr.appendChild(mkText('라스 폰 트리에',18,{weight:'Bold'}))
    card.appendChild(rr)
    card.appendChild(mkText('감독 설명이 아직 없습니다',13,{color:G.t500}))
    const btn = mkAuto('btn','HORIZONTAL',0,[10,16,10,16]); btn.cornerRadius=8; btn.strokes=fill(G.line); btn.strokeWeight=1
    btn.primaryAxisAlignItems='CENTER'
    btn.appendChild(mkText('감독 상세 보기',13,{weight:'Medium',color:G.t600,lh:100}))
    addFill(card, btn)
    const th = mkAuto('t','VERTICAL',4,[8,0,0,0])
    th.appendChild(mkText('아트나인',14,{weight:'Bold'}))
    th.appendChild(mkText('서울 · 5편 상영중',12,{color:G.t500}))
    addFill(card, th)
    const cta = mkAuto('cta','HORIZONTAL',0,[10,16,10,16]); cta.cornerRadius=8; cta.fills=fill('#404E81')
    cta.primaryAxisAlignItems='CENTER'
    cta.appendChild(mkText('영화관 보기',13,{weight:'Bold',color:'#FFFFFF',lh:100}))
    addFill(th, cta)
    row.appendChild(card)
    const sub = mkAuto('sub','VERTICAL',8,[16,16,16,16]); sub.fills=fill(G.raised); sub.cornerRadius=12
    sub.appendChild(mkText('아트나인 상영작',14,{weight:'Bold'}))
    const pr = mkAuto('pr','HORIZONTAL',16,[0,0,0,0])
    for (let i=0;i<4;i++) pr.appendChild(posterItem(176,'영화 제목','라스 폰 트리에'))
    sub.appendChild(pr)
    row.appendChild(sub)
    sub.layoutSizingHorizontal='FILL'
  }

  // ── 기념일 sparse — 2열 compact 카드 ──
  {
    const pair = mkAuto('anniversary-pair','HORIZONTAL',12,[24,24,8,24])
    addFill(body, pair)
    for (const [t,d] of [['오즈 야스지로 기일','12월 12일 — 감독 오즈 야스지로'],['잉마르 베리만 탄생','7월 14일 — 감독 잉마르 베리만']]) {
      const c = mkAuto('ann-card','VERTICAL',8,[14,16,14,16]); c.fills=fill(G.card); c.cornerRadius=12
      c.strokes=fill(G.line); c.strokeWeight=1
      c.appendChild(mkText(t,14,{weight:'Bold'}))
      c.appendChild(mkText(d,12,{color:G.t500}))
      const pr = mkAuto('pr','HORIZONTAL',12,[4,0,0,0])
      pr.appendChild(mkBox(80,120)); pr.appendChild(mkBox(80,120))
      c.appendChild(pr)
      pair.appendChild(c)
      c.layoutSizingHorizontal='FILL'
    }
  }

  // ── 수상작 sparse — 2열 compact 카드 (베니스/거장의 데뷔작) ──
  {
    const pair = mkAuto('award-pair','HORIZONTAL',12,[24,24,24,24])
    addFill(body, pair)
    for (const [t,d,m,cap] of [['베니스 황금사자상','세계에서 가장 오래된 영화제가 선택한 영화들','애정만세','차이밍량 · 드라마 · 1994'],['거장의 데뷔작','지금의 거장이 처음 카메라를 든 순간','천국보다 낯선','짐 자무쉬 · 코미디 · 1984']]) {
      const c = mkAuto('award-card','VERTICAL',8,[14,16,14,16]); c.fills=fill(G.card); c.cornerRadius=12
      c.strokes=fill(G.line); c.strokeWeight=1
      c.appendChild(mkText(t,14,{weight:'Bold'}))
      c.appendChild(mkText(d,12,{color:G.t500}))
      const rr = mkAuto('r','HORIZONTAL',12,[4,0,0,0]); rr.counterAxisAlignItems='CENTER'
      rr.appendChild(mkBox(56,84))
      const cc = mkAuto('c','VERTICAL',2,[0,0,0,0])
      cc.appendChild(mkText(m,14,{weight:'Bold'}))
      cc.appendChild(mkText(cap,12,{color:G.t500}))
      rr.appendChild(cc)
      c.appendChild(rr)
      pair.appendChild(c)
      c.layoutSizingHorizontal='FILL'
    }
  }
}

// ── 섹션 배치 ──
const work = figma.root.children.find(p => p.name === 'Design System - work')
await work.loadAsync()
figma.currentPage = work
const sec = figma.createSection()
sec.name = 'FilmsTab ASIS (grayscale)'
let maxX = 0
for (const c of work.children) if (c !== sec) maxX = Math.max(maxX, c.x + c.width)
sec.x = maxX + 200; sec.y = 0
sec.appendChild(mobile); mobile.x = 60; mobile.y = 80
sec.appendChild(pc); pc.x = 60 + 402 + 120; pc.y = 80
sec.resizeWithoutConstraints(60 + 402 + 120 + 1280 + 60, Math.max(mobile.height, 900) + 160)
figma.viewport.scrollAndZoomIntoView([sec])
figma.notify('FilmsTab ASIS 골격 생성 완료')
