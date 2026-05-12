import 'dotenv/config'
import { fetchMessages, sendMessage } from './discord.ts'

// 1) 메시지 가져오기
console.log('=== fetchMessages 테스트 ===')
const msgs = await fetchMessages()
console.log(`최근 ${msgs.length}개 메시지:`)
msgs.slice(0, 5).forEach(m => {
  const attach = m.attachments.length ? ` [첨부 ${m.attachments.length}개]` : ''
  console.log(`  [${m.author.username}] ${m.content.slice(0, 60)}${attach}`)
})

// 2) 메시지 보내기
console.log('\n=== sendMessage 테스트 ===')
const sent = await sendMessage('🤖 파이프라인 봇 연결 테스트')
console.log(`전송 완료 — 메시지 ID: ${sent.id}`)
