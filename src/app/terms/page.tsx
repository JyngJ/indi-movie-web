import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocument, LegalSection, legalLinkStyle, legalListStyle, legalNoteStyle } from '@/components/legal/LegalDocument'

export const metadata: Metadata = {
  title: '이용약관 | 영화볼지도',
  description: '영화볼지도 이용약관 — 서비스 내용, 회원 가입·탈퇴, 상영 정보의 정확성, 이용자 의무, 광고, 책임 제한 안내.',
  alternates: { canonical: '/terms' },
}

// 최종 개정일 — 내용 변경 시 함께 갱신
const EFFECTIVE_DATE = '2026년 10월 30일'
const CONTACT_EMAIL = 'indi.movie.map@gmail.com'

export default function TermsPage() {
  return (
    <LegalDocument title="이용약관" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection title="제1조 (목적)">
        <p>이 약관은 영화볼지도(이하 &lsquo;서비스&rsquo;)를 운영하는 운영자와 서비스를 이용하는
          이용자 사이의 권리·의무와 책임, 이용 조건과 절차를 정합니다.</p>
      </LegalSection>

      <LegalSection title="제2조 (정의)">
        <ul style={legalListStyle}>
          <li><b>서비스</b>: 전국 독립·예술영화관의 상영 정보를 지도·목록으로 보여 주고, 관심 목록과
            상영 소식 이메일 등 관련 기능을 제공하는 웹 서비스.</li>
          <li><b>이용자</b>: 이 약관에 따라 서비스를 이용하는 모든 사람(회원과 비회원).</li>
          <li><b>회원</b>: 카카오 또는 Google 계정으로 로그인해 계정을 만든 이용자.</li>
          <li><b>상영 정보</b>: 영화관 홈페이지·예매 사이트·공공데이터 등에서 모은 상영작, 회차,
            잔여석, 영화 정보.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제3조 (약관의 게시와 개정)">
        <ul style={legalListStyle}>
          <li>운영자는 이 약관을 이용자가 쉽게 볼 수 있도록 서비스 화면에 게시합니다.</li>
          <li>운영자는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있습니다. 개정할 때는
            시행일과 개정 내용을 시행일 7일 전부터 서비스 화면에 공지하며, 이용자에게 불리한
            변경은 30일 전부터 공지하고 이메일을 등록한 회원에게는 이메일로도 알립니다.</li>
          <li>회원이 개정 약관에 동의하지 않으면 회원 탈퇴로 이용 계약을 해지할 수 있습니다.
            공지한 시행일까지 거부 의사를 밝히지 않고 서비스를 계속 이용하면 개정 약관에 동의한
            것으로 봅니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제4조 (서비스 내용과 이용 요금)">
        <ul style={legalListStyle}>
          <li>서비스는 상영 정보 검색·지도 보기, 관심 영화·감독·영화관 저장, 상영 소식 이메일,
            영화관 예매 페이지 연결 등을 제공합니다.</li>
          <li>서비스는 무료입니다. 서비스 안에서 영화표를 판매하거나 결제를 받지 않으며, 예매와
            결제는 각 영화관·예매 사이트에서 이루어집니다.</li>
          <li>운영자는 서비스 운영을 위해 서비스 화면과 이메일에 광고를 게재할 수 있습니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제5조 (회원 가입)">
        <ul style={legalListStyle}>
          <li>회원 가입은 카카오 또는 Google 계정 로그인으로 합니다. 로그인하지 않아도 상영 정보는
            모두 이용할 수 있습니다.</li>
          <li><b>만 14세 미만은 회원으로 가입할 수 없습니다.</b> 만 14세 미만이 가입한 사실을 알게
            되면 운영자는 해당 계정과 정보를 삭제할 수 있습니다.</li>
          <li>가입 과정에서 수집하는 정보와 그 처리는{' '}
            <Link href="/privacy" style={legalLinkStyle}>개인정보 처리방침</Link>을 따릅니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제6조 (회원 탈퇴와 이용 제한)">
        <ul style={legalListStyle}>
          <li>회원은 MY &gt; 프로필 · 계정 관리에서 언제든지 탈퇴할 수 있습니다. 탈퇴하면 계정과
            관심 목록·알림 설정 등 저장된 정보가 삭제되며 되돌릴 수 없습니다.</li>
          <li>운영자는 이용자가 제8조를 위반한 경우 사전 통지 후 서비스 이용을 제한하거나 계정을
            삭제할 수 있습니다. 서비스 운영에 심각한 지장을 주는 경우에는 먼저 제한하고 나중에
            알릴 수 있습니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제7조 (상영 정보의 정확성)">
        <ul style={legalListStyle}>
          <li>상영 정보는 영화관과 예매 사이트 등에 공개된 정보를 자동으로 모아 보여 주는 것이며,
            수집 시점과 실제 상영 사이에 시차가 있습니다.</li>
          <li>상영 시간, 회차, 잔여석, 상영 종료일, 가격 등은 영화관 사정으로 바뀌거나 실제와 다를
            수 있습니다. <b>예매 전에는 반드시 해당 영화관·예매 사이트에서 최종 정보를 확인해
            주시기 바랍니다.</b></li>
          <li>운영자는 정확한 정보를 제공하려고 노력하며, 잘못된 정보를 알게 되면 바로 고칩니다.
            이용자는 서비스의 제보 기능이나 아래 연락처로 오류를 알릴 수 있습니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제8조 (이용자의 의무)">
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul style={legalListStyle}>
          <li>자동화된 수단(크롤러·스크립트 등)으로 서비스의 정보를 대량으로 수집하거나, 서버에
            과도한 부하를 주는 행위</li>
          <li>서비스의 정보를 운영자의 허락 없이 복제·재배포하거나 상업적으로 이용하는 행위</li>
          <li>다른 사람의 계정을 도용하거나 거짓 정보를 제보하는 행위</li>
          <li>광고를 부정하게 클릭하거나 노출을 조작하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하거나 법령·공공질서에 어긋나는 행위</li>
        </ul>
      </LegalSection>

      <LegalSection title="제9조 (상영 소식 이메일)">
        <p>상영 소식 이메일은 회원이 주소를 인증하고 수신에 동의한 경우에만 보냅니다. 회원은 MY &gt;
          알림 설정이나 메일 하단의 링크로 언제든지 수신을 중단할 수 있습니다.</p>
      </LegalSection>

      <LegalSection title="제10조 (저작권)">
        <ul style={legalListStyle}>
          <li>서비스의 화면 구성, 디자인, 소프트웨어와 운영자가 작성한 글의 저작권은 운영자에게
            있습니다.</li>
          <li>영화 포스터·스틸 이미지 등 제3자의 저작물은 각 권리자에게 권리가 있으며, 서비스는
            이용 조건이 허락하는 범위에서 출처를 표시해 사용합니다. 출처는 설정 &gt; 출처 표기
            정보에서 확인할 수 있습니다.</li>
          <li>권리자가 자신의 저작물 사용에 이의를 제기하면 운영자는 확인 후 지체 없이 해당 저작물을
            내리거나 고칩니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제11조 (서비스의 변경과 중단)">
        <ul style={legalListStyle}>
          <li>운영자는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 바꿀 수 있으며, 중요한
            변경은 미리 서비스 화면에 공지합니다.</li>
          <li>설비 점검·장애, 영화관·외부 제공처의 정보 제공 중단, 천재지변 등 불가피한 사유가
            있으면 서비스를 일시 중단할 수 있습니다.</li>
          <li>운영자가 서비스를 종료할 때는 종료일 30일 전부터 서비스 화면에 공지합니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제12조 (책임의 제한)">
        <ul style={legalListStyle}>
          <li>서비스는 무료로 제공되며, 운영자는 고의 또는 중대한 과실이 없는 한 서비스 이용과
            관련해 이용자에게 생긴 손해를 책임지지 않습니다.</li>
          <li>운영자는 상영 정보가 실제와 달라 생긴 손해(예매 실패, 상영 취소, 이동 비용 등)를
            고의 또는 중대한 과실이 없는 한 책임지지 않습니다.</li>
          <li>서비스에서 연결한 영화관·예매 사이트·광고주의 상품과 서비스, 그곳에서 이루어진
            거래에 대한 책임은 각 사업자에게 있습니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제13조 (분쟁 해결과 준거법)">
        <ul style={legalListStyle}>
          <li>서비스 이용에 관한 문의와 불만은{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={legalLinkStyle}>{CONTACT_EMAIL}</a>
            으로 접수하며, 운영자는 성실히 답변합니다.</li>
          <li>이 약관과 서비스 이용에 관한 분쟁에는 대한민국 법을 적용하며, 소송은 민사소송법에
            따른 관할 법원에 제기합니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="부칙">
        <p>이 약관은 {EFFECTIVE_DATE}부터 시행합니다.</p>
        <p style={legalNoteStyle}>개인정보의 수집·이용·보관에 관한 사항은{' '}
          <Link href="/privacy" style={legalLinkStyle}>개인정보 처리방침</Link>에서 따로 안내합니다.</p>
      </LegalSection>
    </LegalDocument>
  )
}
