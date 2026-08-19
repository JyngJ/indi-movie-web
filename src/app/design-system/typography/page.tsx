import { manifest } from '@/design-system'
import { Page, Section, Code, Table } from '../_ui/shell'

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

const sampleFor = (name: string) => SAMPLE[name.replace(/^2\.0\//, '')] ?? '영화볼지도 상영 정보'

const fontFamily = (font: string) =>
  font.startsWith('KIMM') ? 'var(--font-display)'
  : font.startsWith('Libre') ? 'var(--font-serif-en)'
  : 'var(--font-sans)'

const fontWeight = (font: string) =>
  font.includes('Bold') && !font.includes('SemiBold') ? 700
  : font.includes('SemiBold') ? 600
  : font.includes('Medium') ? 500
  : 400

export default function TypographyPage() {
  const styles20 = manifest.typography.figma.filter(s => s.name.startsWith('2.0/'))
  const legacy = manifest.typography.figma.filter(s => !s.name.startsWith('2.0/'))

  return (
    <Page
      title="타이포그래피"
      lead={
        <>
          스케일은 10 · 12 · 14 · 16 · 20 · 24. 본문은 Pretendard, 제목·간판은 KIMM Bold.
          견본은 피그마 텍스트 스타일 실측(크기·굵기·행간)을 그대로 CSS로 옮겨 그린다.
        </>
      }
    >
      <Section title="2.0 스타일" note="피그마 텍스트 스타일 = 시안의 원본. 코드 --text-* 토큰과 크기가 일치해야 한다.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          {styles20.map(s => (
            <div key={s.name} style={{
              display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--spacing-2)',
              paddingBottom: 'var(--spacing-4)', borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', fontFamily: 'var(--font-mono)' }}>
                {s.name} · {s.font} · {s.size}px · lh {s.lineHeight}
              </div>
              <div style={{
                fontFamily: fontFamily(s.font),
                fontWeight: fontWeight(s.font),
                fontSize: s.size,
                lineHeight: typeof s.lineHeight === 'string' ? s.lineHeight : 1.4,
                color: 'var(--color-text-primary)',
                textTransform: s.name.endsWith('caption') ? 'uppercase' : undefined,
                letterSpacing: s.name.endsWith('caption') ? '0.4px' : undefined,
              }}>
                {sampleFor(s.name)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="코드 토큰" note="--text-* 는 px 값만 정한다. 굵기·행간은 컴포넌트가 정한다.">
        <Table
          head={['토큰', '값', '설명']}
          rows={manifest.typography.code.map(t => [
            <Code key={t.name}>{t.name}</Code>,
            t.value,
            t.comment || '—',
          ])}
        />
      </Section>

      {legacy.length > 0 && (
        <Section title="1.0 잔재" note="2.0 이전 스타일. 새로 쓰지 말 것 — 지우기 전까지 목록에만 남긴다.">
          <Table
            head={['스타일', '폰트', '크기']}
            rows={legacy.map(s => [s.name, s.font, `${s.size}px`])}
          />
        </Section>
      )}
    </Page>
  )
}
