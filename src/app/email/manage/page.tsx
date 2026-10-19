import type { Metadata } from 'next'
import { EmailManagement } from '@/components/auth/EmailManagement'
export const metadata: Metadata = { title: '이메일 소식 설정 | 영화볼지도', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default function Page() { return <EmailManagement /> }
