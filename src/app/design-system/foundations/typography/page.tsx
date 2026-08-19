import { manifest } from '@/design-system'
import { DocPage, DocSection, SubHeading, Code, Stage, DefTable, UsageCards } from '../../_ui/shell'

const SAMPLE: Record<string, string> = {
  'display/h1': '중경삼림',
  'display/h2': '씨네큐브 광화문',
  title: '고령가 소년 살인사건',
  'body-strong': '오늘 상영하는 특별전',
  body: '서울의 예술영화관 상영 정보를 한눈에 모아 봅니다.',
  meta: '왕가위 · 1994 · Chungking Express',
  caption: 'NOW SHOWING',
  label: 'D-1 · 화',
  note: '상영 정보는 매일 갱신됩니다.',
  badge: '+11',
  'meta-strong': '예매 가능만 보기',
  'num/time': '19:30',
  'num/seat': '82/120석',
}

const USE: Record<string, string> = {
  'display/h1': '상세 히어로 제목, 온보딩 타이틀',
  'display/h2': '바텀시트 극장명, 큐레이션 섹션 대제목',
  title: '영화 카드 제목, 시간표 행 영화명',
  'body-strong': '큐레이션 소제목, CTA 라벨',
  body: '시놉시스, 안내 문구',
  meta: '감독·연도·영문원제, 극장 주소',
  caption: 'NOW SHOWING 같은 섹션 아이브로우',
  label: 'D-1 칩, 날짜바 요일',
  note: '문단형 안내',
  badge: '포스터 오버레이 칩 숫자',
  'meta-strong': '필터 칩·토글 라벨',
  'num/time': '상영 시간, 날짜바 일자',
  'num/seat': 'ShowtimeCell 잔여석',
}

const fontFamily = (font: string) =>
  font.startsWith('KIMM') ? 'var(--font-display)'
  : font.startsWith('Libre') ? 'var(--font-serif-en)'
  : 'var(--font-sans)'

const fontWeight = (font: string) =>
  font.includes('SemiBold') ? 600
  : font.includes('Bold') ? 700
  : font.includes('Medium') ? 500
  : 400

const key = (name: string) => name.replace(/^2\.0\//, '')

export default function TypographyPage() {
  const styles20 = manifest.typography.figma.filter(s => s.name.startsWith('2.0/'))
  const legacy = manifest.typography.figma.filter(s => !s.name.startsWith('2.0/'))

  return (
    <DocPage
      href="/design-system/foundations/typography"
      title="Typography"
      lead="스케일은 10 · 12 · 14 · 16 · 20 · 24 여섯 단계입니다. 단계를 늘리는 대신 굵기와 색으로 위계를 만들어 화면 사이의 일관성을 유지합니다."
      toc={[
        { id: 'typeface', label: 'Typeface' },
        { id: 'scale', label: 'Scale' },
        { id: 'tokens', label: '코드 토큰' },
        { id: 'usage', label: 'Usage' },
        ...(legacy.length ? [{ id: 'legacy', label: '이전 버전' }] : []),
      ]}
    >
      <DocSection id="typeface" title="Typeface" lead="두 서체를 사용합니다. 제목과 간판은 KIMM, 나머지는 Pretendard입니다.">
        <Stage tone="paper" minHeight={200}>
          <div style={{ display: 'flex', gap: 'var(--spacing-12)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 700, color: 'var(--color-text-primary)' }}>영화</div>
              <div style={{ marginTop: 8, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>KIMM Bold</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 56, fontWeight: 500, color: 'var(--color-text-primary)' }}>영화</div>
              <div style={{ marginTop: 8, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>Pretendard</div>
            </div>
          </div>
        </Stage>
        <div style={{ marginTop: 'var(--spacing-6)' }}>
          <DefTable
            rows={[
              ['1. KIMM Bold', '제목·간판·숫자 강조에 사용합니다. 극장 간판 같은 인상을 만드는 자리에 한정합니다.'],
              ['2. Pretendard', 'UI 전반과 본문에 사용합니다. 400/500/600/700 네 굵기를 사용합니다.'],
            ]}
          />
        </div>
      </DocSection>

      <DocSection
        id="scale"
        title="Scale"
        lead="피그마 텍스트 스타일이 원본입니다. 아래 견본은 실측값(서체·크기·행간)을 그대로 옮겨 그린 것입니다."
      >
        {styles20.map(st => (
          <div key={st.name} style={{
            display: 'grid', gap: 'var(--spacing-4)', alignItems: 'baseline',
            gridTemplateColumns: 'minmax(0, 1fr)', padding: 'var(--spacing-5) 0',
            borderTop: '1px solid var(--color-border)',
          }}>
            <div style={{
              fontFamily: fontFamily(st.font), fontWeight: fontWeight(st.font), fontSize: st.size,
              lineHeight: typeof st.lineHeight === 'string' ? st.lineHeight : 1.4,
              color: 'var(--color-text-primary)',
              textTransform: key(st.name) === 'caption' ? 'uppercase' : undefined,
              letterSpacing: key(st.name) === 'caption' ? '0.4px' : undefined,
            }}>
              {SAMPLE[key(st.name)] ?? '영화볼지도 상영 정보'}
            </div>
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', fontFamily: 'var(--font-mono)' }}>
              {st.name} · {st.font} · {st.size}px · lh {st.lineHeight}
              {USE[key(st.name)] && (
                <span style={{ fontFamily: 'var(--font-sans)' }}> — {USE[key(st.name)]}</span>
              )}
            </div>
          </div>
        ))}
      </DocSection>

      <DocSection id="tokens" title="코드 토큰" lead="--text-* 는 px 크기만 정의합니다. 굵기와 행간은 컴포넌트에서 지정합니다.">
        <DefTable
          rows={manifest.typography.code.map(t => [
            <Code key={t.name}>{t.name}</Code>,
            <span key="v">{t.value}{t.comment && <span style={{ color: 'var(--color-text-caption)' }}> — {t.comment}</span>}</span>,
          ])}
        />
      </DocSection>

      <DocSection id="usage" title="Usage">
        <UsageCards
          items={[
            {
              kind: 'do',
              rule: '같은 크기 안에서 굵기와 색으로 위계를 만듭니다. body(14/500)와 body-strong(14/700)이 그 예입니다.',
              visual: (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>오늘 상영하는 특별전</div>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: 'var(--color-text-sub)' }}>전국 독립·예술영화관 기준</div>
                </div>
              ),
            },
            {
              kind: 'dont',
              rule: '스케일에 없는 크기(11 · 13 · 15px)를 새로 만들지 않습니다. 시안과 코드가 어긋나는 지점이 됩니다.',
              visual: (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>13px 임의 크기</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>11px 임의 크기</div>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      {legacy.length > 0 && (
        <DocSection id="legacy" title="이전 버전 스타일" lead="2.0 이전 스타일입니다. 신규 작업에는 사용하지 않습니다.">
          <DefTable rows={legacy.map(st => [st.name, `${st.font} · ${st.size}px`])} />
        </DocSection>
      )}
    </DocPage>
  )
}
