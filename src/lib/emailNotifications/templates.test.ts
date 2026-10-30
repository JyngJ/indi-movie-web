import { expect, it } from 'vitest'
import { emailPosterUrl, renderDigestEmail, renderVerificationEmail } from './templates'
it('허용한 포스터 출처만 HTTPS로 메일에 넣는다', () => {
  expect(emailPosterUrl('http://file.koreafilm.or.kr/poster.jpg')).toBe('https://file.koreafilm.or.kr/poster.jpg')
  expect(emailPosterUrl('https://file.koreafilm.or.kr.evil.test/poster.jpg')).toBeNull()
  expect(emailPosterUrl('javascript:alert(1)')).toBeNull()
  expect(emailPosterUrl()).toBeNull()
})
it('메일의 제목과 링크를 이스케이프하고 포스터가 없어도 시간표 링크를 남긴다', () => {
  const html = renderDigestEmail({ origin: 'https://example.com', unsubscribeUrl: 'https://example.com/manage?a=1&b=2', frequency: [], items: [{ title: '<script>영화</script>', description: '새 상영', path: '/movie/1', posterUrl: 'https://unlicensed.test/poster.jpg' }] })
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('unlicensed.test')
  expect(html).toContain('예매하러 가기')
  expect(html).toContain('a=1&amp;b=2')
  expect(renderVerificationEmail('https://example.com', 'https://example.com/verify')).toContain('alt="영화볼지도 로고"')
})
it('포스터가 없는 영화도 그리드 칸에 같은 비율의 빈 포스터를 넣는다', () => {
  const html = renderDigestEmail({ origin: 'https://example.com', unsubscribeUrl: 'https://example.com/manage', frequency: [], items: [{
    groupType: 'theater', groupName: '시네마테크KOFA', title: '시네마테크KOFA의 상영 소식', description: '새 상영', path: '/films/theater/kofa',
    films: [
      { title: '넘버 원', directors: ['Les Blair'], description: '', path: '/movie/1' },
      { title: '만종', directors: ['신상옥'], posterUrl: 'http://file.koreafilm.or.kr/poster.jpg', description: '', path: '/movie/2' },
    ],
  }] })
  expect(html).toContain('src="https://example.com/email/poster-placeholder-v1.png" width="256" alt="넘버 원 포스터"')
  expect(html).toContain('src="https://file.koreafilm.or.kr/poster.jpg"')
})
