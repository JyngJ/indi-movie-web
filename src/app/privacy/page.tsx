import type { Metadata } from 'next'
import { BackLink } from './BackLink'

export const metadata: Metadata = {
  title: '개인정보 처리방침 | 영화볼지도',
  description: '영화볼지도 개인정보 처리방침 — 수집 항목, 이용 목적, 제3자 제공, 쿠키·행태정보, 이용자 권리 안내.',
  alternates: { canonical: '/privacy' },
}

// 최종 개정일 — 내용 변경 시 함께 갱신
const EFFECTIVE_DATE = '2026년 7월 7일'
const CONTACT_EMAIL = 'indi.movie.map@gmail.com'

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '40px 20px 80px',
        color: 'var(--color-text-body)',
        lineHeight: 1.7,
        fontSize: 'var(--text-subtitle)',
      }}
    >
      <BackLink />

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-h1)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '20px 0 8px',
        }}
      >
        개인정보 처리방침
      </h1>
      <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', marginBottom: 28 }}>
        시행일: {EFFECTIVE_DATE}
      </p>

      <p style={{ marginBottom: 24 }}>
        영화볼지도(이하 &lsquo;서비스&rsquo;)는 전국 독립·예술영화관의 상영 정보를 지도로
        제공하는 무료 웹 서비스입니다. 서비스는 회원가입·로그인 절차가 없으며, 이름·연락처 등
        이용자를 직접 식별하는 개인정보를 수집·저장하지 않습니다. 다만 서비스 운영·개선과
        통계·광고 성과 측정을 위해 아래와 같이 쿠키 및 자동 생성 정보를 처리하므로, 개인정보
        보호법 제30조에 따라 그 내용을 안내합니다.
      </p>

      <Section title="1. 수집하는 정보 및 수집 방법">
        <p>서비스는 이용자가 직접 입력하는 개인정보를 수집하지 않습니다. 서비스 이용 과정에서
          아래 정보가 자동으로 생성·수집될 수 있습니다.</p>
        <ul style={ulStyle}>
          <li><b>자동 생성 정보</b>: 쿠키, 기기·브라우저 정보(모델·OS·화면 등), IP 주소,
            방문 일시, 페이지 조회·클릭 등 서비스 이용 기록.</li>
          <li><b>위치 정보</b>: 이용자가 위치 권한을 직접 허용한 경우에 한해 브라우저가 제공하는
            현재 위치 좌표. 이 좌표는 <b>이용자 기기 안에서 가까운 극장 정렬·거리 계산에만
            사용</b>되며, 서비스 서버로 전송·저장되지 않습니다.</li>
          <li><b>기기 내 저장 정보</b>: 온보딩 노출 여부, 최근 찾아본 영화·극장·감독, 지역 필터
            설정값 등. 이용자 기기의 로컬 저장소(localStorage)·쿠키에만 저장되며 서버로 수집되지
            않습니다.</li>
        </ul>
        <p style={noteStyle}>수집 방법: 서비스 이용 시 쿠키·SDK를 통한 자동 수집.</p>
      </Section>

      <Section title="2. 정보의 이용 목적">
        <ul style={ulStyle}>
          <li>서비스 제공 및 화면 개인화(최근 본 영화, 지역 필터 등)</li>
          <li>이용 통계 분석을 통한 서비스 품질 개선</li>
          <li>광고·마케팅 성과 측정 및 최적화</li>
          <li>오류 진단 및 부정 이용 방지</li>
        </ul>
      </Section>

      <Section title="3. 쿠키 및 행태정보">
        <p>서비스는 통계 분석과 광고 성과 측정을 위해 아래 도구를 사용하며, 이 과정에서
          쿠키·기기 식별자 등 행태정보가 각 사업자에게 수집·전송됩니다.</p>
        <ul style={ulStyle}>
          <li><b>Meta Pixel</b> (Meta Platforms) — 방문·페이지뷰 등 행태정보 수집, 광고 성과 측정.</li>
          <li><b>Google Analytics 4</b> (Google) — 방문·이용 통계 분석.</li>
          <li><b>PostHog</b> — 서비스 이용 이벤트·세션 분석.</li>
          <li><b>Vercel Analytics</b> (Vercel) — 방문 트래픽 통계.</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 쿠키를 거부하면
          일부 기능(개인화·통계 반영) 이용에 제한이 있을 수 있습니다.
        </p>
        <p style={noteStyle}>
          쿠키 차단 방법 예시 — Chrome: 설정 &gt; 개인정보 및 보안 &gt; 쿠키 및 기타 사이트 데이터.
          광고 목적 수집 거부는 각 사업자의 광고 설정에서도 가능합니다.
        </p>
      </Section>

      <Section title="4. 제3자 제공 및 처리위탁">
        <p>서비스는 이용자의 개인정보를 판매하지 않습니다. 다만 위 3항의 분석·광고 도구 이용을
          위해 관련 정보가 아래 사업자에게 제공·위탁 처리됩니다.</p>
        <ul style={ulStyle}>
          <li>Meta Platforms — 광고 성과 측정(Meta Pixel)</li>
          <li>Google LLC — 통계 분석(Google Analytics)</li>
          <li>PostHog — 제품 분석</li>
          <li>Vercel Inc. — 서비스 호스팅 및 트래픽 통계</li>
          <li>Supabase — 상영 정보 데이터베이스 운영 (이용자 개인정보는 저장하지 않음)</li>
        </ul>
        <p style={noteStyle}>각 사업자는 자체 개인정보 처리방침에 따라 정보를 처리하며, 이용자는
          해당 사업자의 방침을 통해 상세 내용을 확인할 수 있습니다.</p>
      </Section>

      <Section title="5. 보유 및 파기">
        <p>서비스는 서버에 이용자 개인정보를 저장하지 않습니다. 자동 분석·광고 도구가 수집한
          정보의 보유 기간은 각 사업자의 정책을 따릅니다. 기기 내 저장 정보(로컬 저장소·쿠키)는
          이용자가 브라우저에서 직접 삭제할 수 있습니다.</p>
      </Section>

      <Section title="6. 이용자의 권리">
        <p>이용자는 언제든지 브라우저 설정을 통해 쿠키 저장·수집을 거부하거나, 저장된 쿠키·로컬
          데이터를 삭제할 수 있습니다. 위치 권한 역시 브라우저·기기 설정에서 언제든 철회할 수
          있습니다.</p>
      </Section>

      <Section title="7. 개인정보 보호책임자">
        <p>개인정보 처리에 관한 문의는 아래로 연락해 주시기 바랍니다.</p>
        <ul style={ulStyle}>
          <li>담당: 영화볼지도 운영팀</li>
          <li>
            이메일:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--color-primary-base)' }}>
              {CONTACT_EMAIL}
            </a>
          </li>
        </ul>
      </Section>

      <Section title="8. 개정 안내">
        <p>이 개인정보 처리방침은 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지를
          통해 공지합니다.</p>
      </Section>

      <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', marginTop: 32 }}>
        시행일: {EFFECTIVE_DATE}
      </p>
    </main>
  )
}

const ulStyle: React.CSSProperties = {
  margin: '10px 0 0',
  paddingLeft: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-1-5)',
}

const noteStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 'var(--text-meta)',
  color: 'var(--color-text-caption)',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-title)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
