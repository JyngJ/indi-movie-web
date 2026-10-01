import type { Metadata } from 'next'
import { BackLink } from './BackLink'

export const metadata: Metadata = {
  title: '개인정보 처리방침 | 영화볼지도',
  description: '영화볼지도 개인정보 처리방침 — 수집 항목, 이용 목적, 쿠키·맞춤형 광고(행태정보), 제3자 제공, 이용자 권리 안내.',
  alternates: { canonical: '/privacy' },
}

// 최종 개정일 — 내용 변경 시 함께 갱신
const EFFECTIVE_DATE = '2026년 10월 1일'
const CONTACT_EMAIL = 'indi.movie.map@gmail.com'

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '40px var(--gutter) 80px',
        color: 'var(--color-text-body)',
        lineHeight: 1.7,
        fontSize: 'var(--text-subtitle)',
      }}
    >
      <BackLink />

      <h1
        className="display-h1"
        style={{
          color: 'var(--color-text-primary)',
          margin: '20px 0 8px',
        }}
      >
        개인정보 처리방침
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-caption)', marginBottom: 28 }}>
        시행일: {EFFECTIVE_DATE}
      </p>

      <p style={{ marginBottom: 24 }}>
        영화볼지도(이하 &lsquo;서비스&rsquo;)는 전국 독립·예술영화관의 상영 정보를 지도로
        제공하는 무료 웹 서비스입니다. 로그인 없이도 모든 상영 정보를 이용할 수 있으며,
        관심 목록·알림 등 일부 기능을 위해 카카오 계정으로 로그인할 수 있습니다. 서비스
        운영·개선과 통계·광고 성과 측정, 광고 게재, 회원 기능 제공을 위해 아래와 같이 개인정보를
        처리하므로, 개인정보 보호법 제30조에 따라 그 내용을 안내합니다.
      </p>

      <Section title="1. 수집하는 정보 및 수집 방법">
        <p>로그인하지 않은 이용자에게서는 직접 입력하는 개인정보를 수집하지 않습니다.
          카카오 로그인 시와 서비스 이용 과정에서 아래 정보가 수집될 수 있습니다.</p>
        <ul style={ulStyle}>
          <li><b>회원 정보</b> (카카오 로그인 시): 카카오 회원번호, 닉네임, 프로필 이미지.
            서비스 안에서 닉네임은 직접 수정할 수 있습니다.</li>
          <li><b>회원이 만든 정보</b>: 관심 영화·감독·영화관 목록, 알림 설정값.</li>
          <li><b>알림 발송용 정보</b>: 카카오톡 메시지 수신에 동의한 경우, 알림 발송에
            필요한 카카오 연동 토큰. 알림 기능이 제공되기 전까지는 발송에 사용하지 않습니다.</li>
          <li><b>자동 생성 정보</b>: 쿠키, 기기·브라우저 정보(모델·OS·화면 등), IP 주소,
            방문 일시, 페이지 조회·클릭 등 서비스 이용 기록.</li>
          <li><b>위치 정보</b>: 이용자가 위치 권한을 직접 허용한 경우에 한해 브라우저가 제공하는
            현재 위치 좌표. 이 좌표는 <b>이용자 기기 안에서 가까운 극장 정렬·거리 계산에만
            사용</b>되며, 서비스 서버로 전송·저장되지 않습니다.</li>
          <li><b>기기 내 저장 정보</b>: 온보딩 노출 여부, 최근 찾아본 영화·극장·감독, 지역 필터
            설정값 등. 이용자 기기의 로컬 저장소(localStorage)·쿠키에만 저장되며 서버로 수집되지
            않습니다.</li>
        </ul>
        <p style={noteStyle}>수집 방법: 카카오 로그인 시 카카오로부터 제공, 서비스 이용 시
          이용자의 직접 입력 및 쿠키·SDK를 통한 자동 수집.</p>
      </Section>

      <Section title="2. 정보의 이용 목적">
        <ul style={ulStyle}>
          <li>로그인 상태 유지와 관심 목록·알림 설정 등 회원 기능 제공</li>
          <li>관심 영화·감독·영화관의 새 상영 소식 알림 제공</li>
          <li>서비스 제공 및 화면 개인화(최근 본 영화, 지역 필터 등)</li>
          <li>이용 통계 분석을 통한 서비스 품질 개선</li>
          <li>맞춤형 광고를 포함한 광고 게재</li>
          <li>광고·마케팅 성과 측정 및 최적화</li>
          <li>오류 진단 및 부정 이용 방지</li>
        </ul>
      </Section>

      <Section title="3. 쿠키와 분석·광고 도구">
        <p>서비스는 통계 분석, 광고 게재와 성과 측정을 위해 아래 도구를 사용하며, 이 과정에서
          쿠키·기기 식별자 등 행태정보가 각 사업자에게 수집·전송됩니다.</p>
        <ul style={ulStyle}>
          <li><b>Google AdSense</b> (Google) — 광고 게재, 맞춤형 광고 제공(4항 참고).</li>
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

      <Section title="4. 맞춤형 광고와 행태정보">
        <p>서비스는 Google AdSense로 광고를 게재합니다. Google을 비롯한 제3자 광고 사업자는
          쿠키를 사용해 이용자가 이 서비스나 다른 웹사이트를 방문한 기록을 바탕으로 광고를
          게재합니다. Google은 광고 쿠키를 사용해 Google과 파트너가 이용자의 방문 기록에 맞는
          광고를 보여 줄 수 있도록 합니다.</p>
        <ul style={ulStyle}>
          <li><b>수집하는 행태정보</b>: 서비스 방문 기록, 페이지 조회·클릭 기록, 광고 노출·클릭
            기록, 쿠키·광고 식별자, 기기·브라우저 정보, IP 주소.</li>
          <li><b>수집 방법</b>: 이용자가 서비스를 방문하면 Google 광고 스크립트가 쿠키 등을 통해
            자동으로 수집합니다.</li>
          <li><b>수집 목적</b>: 이용자의 관심에 맞는 광고 제공, 광고 노출·성과 측정, 부정 클릭
            방지.</li>
          <li><b>수집·처리하는 사업자</b>: Google LLC 및 Google이 인증한 제3자 광고 사업자.</li>
          <li><b>보유·이용 기간</b>: 각 사업자의 정책을 따릅니다. Google의 광고 쿠키 이용 방식은{' '}
            <a href="https://policies.google.com/technologies/ads?hl=ko" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Google 광고 정책
            </a>
            에서 확인할 수 있습니다.</li>
        </ul>
        <p style={{ marginTop: 12 }}>이용자는 아래 방법으로 맞춤형 광고를 거부할 수 있습니다.
          거부해도 광고는 표시되지만, 방문 기록에 기반하지 않은 일반 광고로 바뀝니다.</p>
        <ul style={ulStyle}>
          <li>
            <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Google 내 광고 센터
            </a>
            에서 맞춤 광고 사용 중지
          </li>
          <li>
            <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              aboutads.info
            </a>
            에서 제3자 광고 사업자의 맞춤 광고 쿠키 거부
          </li>
          <li>브라우저 설정에서 쿠키 저장 차단 또는 삭제(3항 참고)</li>
          <li>모바일 기기 설정에서 광고 ID 재설정 또는 맞춤 광고 해제 — Android: 설정 &gt; Google
            &gt; 광고, iOS: 설정 &gt; 개인정보 보호 및 보안 &gt; Apple 광고</li>
        </ul>
        <p style={noteStyle}>서비스는 만 14세 미만 아동임을 알고 있는 이용자에게 맞춤형 광고를
          제공하지 않으며, 건강·종교·정치 성향 등 민감한 행태정보를 수집하지 않습니다.
          행태정보 관련 문의와 피해 신고는 8항의 개인정보 보호책임자에게 접수할 수 있습니다.</p>
      </Section>

      <Section title="5. 제3자 제공 및 처리위탁">
        <p>서비스는 이용자의 개인정보를 판매하지 않습니다. 다만 위 3·4항의 분석·광고 도구 이용을
          위해 관련 정보가 아래 사업자에게 제공·위탁 처리됩니다.</p>
        <ul style={ulStyle}>
          <li>Kakao Corp. — 카카오 로그인(소셜 로그인) 제공</li>
          <li>Meta Platforms — 광고 성과 측정(Meta Pixel)</li>
          <li>Google LLC — 통계 분석(Google Analytics), 광고 게재(Google AdSense)</li>
          <li>PostHog — 제품 분석</li>
          <li>Vercel Inc. — 서비스 호스팅 및 트래픽 통계</li>
          <li>Supabase — 상영 정보 및 회원 정보(계정·관심 목록·알림 설정) 데이터베이스 운영</li>
        </ul>
        <p style={noteStyle}>각 사업자는 자체 개인정보 처리방침에 따라 정보를 처리하며, 이용자는
          해당 사업자의 방침을 통해 상세 내용을 확인할 수 있습니다.</p>
      </Section>

      <Section title="6. 보유 및 파기">
        <p>회원 정보(계정·관심 목록·알림 설정·카카오 연동 토큰)는 회원 탈퇴 시 지체 없이
          파기합니다. 자동 분석·광고 도구가 수집한 정보의 보유 기간은 각 사업자의 정책을
          따릅니다. 기기 내 저장 정보(로컬 저장소·쿠키)는 이용자가 브라우저에서 직접 삭제할 수
          있습니다.</p>
      </Section>

      <Section title="7. 이용자의 권리">
        <p>로그인한 이용자는 MY &gt; 프로필 · 계정 관리에서 언제든지 닉네임을 수정하고,
          로그아웃하거나 회원 탈퇴로 계정과 저장된 정보를 삭제할 수 있습니다. 또한 브라우저
          설정을 통해 쿠키 저장·수집을 거부하거나 저장된 쿠키·로컬 데이터를 삭제할 수 있으며,
          위치 권한 역시 브라우저·기기 설정에서 언제든 철회할 수 있습니다.</p>
      </Section>

      <Section title="8. 개인정보 보호책임자">
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

      <Section title="9. 권익침해 구제방법">
        <p>개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의할 수 있습니다.</p>
        <ul style={ulStyle}>
          <li>개인정보침해신고센터 — (국번 없이) 118, privacy.kisa.or.kr</li>
          <li>개인정보분쟁조정위원회 — 1833-6972, www.kopico.go.kr</li>
          <li>대검찰청 — (국번 없이) 1301, www.spo.go.kr</li>
          <li>경찰청 — (국번 없이) 182, ecrm.police.go.kr</li>
        </ul>
      </Section>

      <Section title="10. 개정 안내">
        <p>이 개인정보 처리방침은 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지를
          통해 공지합니다.</p>
        <ul style={ulStyle}>
          <li>2026년 10월 1일 — Google AdSense 광고 게재에 따른 맞춤형 광고·행태정보 항목(4항),
            권익침해 구제방법(9항) 추가</li>
          <li>2026년 8월 24일 — 이전 방침 시행</li>
        </ul>
      </Section>

      <p style={{ fontSize: 13, color: 'var(--color-text-caption)', marginTop: 32 }}>
        시행일: {EFFECTIVE_DATE}
      </p>
    </main>
  )
}

const ulStyle: React.CSSProperties = {
  margin: '12px 0 0',
  paddingLeft: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const linkStyle: React.CSSProperties = {
  color: 'var(--color-primary-base)',
}

const noteStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: 'var(--color-text-caption)',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
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
