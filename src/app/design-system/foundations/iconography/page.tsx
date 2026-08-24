import { Icon, ICON_SIZE, ICON_NAMES } from '@/components/primitives'
import { DocPage, DocSection, Code, SpecRow, UsageCards } from '../../_ui/shell'
import { IconGallery } from '../../_ui/IconGallery'

/**
 * 아이콘은 컴포넌트가 아니라 파운데이션이다.
 * 버튼·칩·줄 안에 들어가 그것들의 크기와 색을 따라가지, 혼자 서서 무언가를 하지 않는다.
 * 색·타이포와 같은 층에 두는 이유가 그것이다.
 */
export default function IconographyPage() {
  return (
    <DocPage
      href="/design-system/foundations/iconography"
      title="Iconography"
      lead="아이콘은 lucide 하나만 씁니다. 서비스에서 실제로 쓰는 것만 이름을 붙여 레지스트리에 두고, 호출부는 이름으로만 부릅니다. 크기와 획 굵기는 레지스트리가 정합니다."
    >
      <DocSection
        id="scale"
        title="크기"
        lead="다섯 단계입니다. px를 직접 넘길 수 있지만, 새 자리를 만들 때는 이 중에서 고릅니다."
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-8)', flexWrap: 'wrap' }}>
          {(Object.keys(ICON_SIZE) as (keyof typeof ICON_SIZE)[]).map(size => (
            <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <Icon name="calendar" size={size} />
              <Code>{size}</Code>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>
                {ICON_SIZE[size]}px
              </span>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection id="spec" title="규칙">
        <SpecRow
          title="획 굵기는 크기에서 나온다"
          desc="12 이하 2.5 · 16 이하 2 · 그 위 1.75입니다. 24 뷰박스를 12px로 줄이면 1.75 획은 실제 0.9px가 되어 사라지므로, 작을수록 굵게 그려야 같은 밀도로 보입니다. 호출부에서 strokeWidth를 적지 않습니다."
          visual={
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-6)' }}>
              {([12, 16, 24] as const).map(px => (
                <div key={px} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <Icon name="check" size={px} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>{px}px</span>
                </div>
              ))}
            </div>
          }
        />
        <SpecRow
          title="색은 물려받는다"
          desc="기본은 currentColor입니다. 부모의 글자색을 그대로 따르므로 버튼·칩 안에서 상태(hover·disabled)가 저절로 맞습니다. 예외적으로 색을 고정해야 하면 color prop에 시맨틱 토큰을 넘깁니다."
          visual={
            <div style={{ display: 'flex', gap: 'var(--spacing-5)' }}>
              <span style={{ color: 'var(--color-text-primary)' }}><Icon name="heart" size="lg" /></span>
              <span style={{ color: 'var(--color-text-placeholder)' }}><Icon name="heart" size="lg" /></span>
              <Icon name="heart" size="lg" color="var(--color-error)" fill="var(--color-error)" strokeWidth={0} />
            </div>
          }
        />
        <SpecRow
          title="레지스트리에 없으면 추가한다"
          desc={`지금 ${ICON_NAMES.length}개입니다. 필요한 글리프가 없으면 호출부에서 svg를 그리지 말고 Icon.tsx에 이름을 추가합니다. 쓰지 않게 된 이름은 지웁니다 — 목록이 곧 "우리가 쓰는 아이콘"이어야 합니다.`}
          visual={<Code>{'<Icon name="map-pin" size="lg" />'}</Code>}
        />
        <SpecRow
          title="규격이 걸린 브랜드 마크는 예외"
          desc="카카오 로그인처럼 색·비율·문구가 외부 가이드로 정해진 마크는 레지스트리에 두지 않습니다. 여기 규칙(획 굵기·크기)이 그 규격을 덮어쓸 수 있기 때문입니다. 그런 마크는 해당 컴포넌트가 직접 갖습니다."
          visual={
            <div style={{ display: 'flex', gap: 'var(--spacing-5)' }}>
              <Icon name="instagram" size="lg" />
              <Icon name="github" size="lg" />
              <Icon name="linkedin" size="lg" />
            </div>
          }
        />
      </DocSection>

      <DocSection
        id="catalog"
        title="Catalog"
        lead="레지스트리 전체입니다. 칸을 누르면 호출 코드가 복사됩니다."
      >
        <IconGallery />
      </DocSection>

      <DocSection id="usage" title="Usage">
        <UsageCards
          items={[
            { kind: 'do', rule: '뜻이 하나로 읽히는 아이콘만 글자 없이 씁니다. 그 외에는 라벨을 함께 둡니다.' },
            { kind: 'dont', rule: '호출부에서 <svg>를 직접 그리지 않습니다 — 같은 글리프가 굵기만 다른 채 여러 벌 생깁니다.' },
            { kind: 'dont', rule: '쓰지도 않을 이름을 미리 등록하지 않습니다. 목록이 실제 사용과 어긋나면 그 목록을 아무도 믿지 않습니다.' },
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
