/**
 * Discord 슬래시 커맨드 등록
 * 실행: npx tsx --env-file=.env.local scripts/register-discord-commands.ts
 */

const APP_ID = '1501298684158283906'
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!

const commands = [
  {
    name: 'schedule',
    description: '상영시간표 이미지를 OCR로 파싱해서 어드민 검수 대기열에 등록합니다',
    options: [
      {
        name: 'image',
        description: '상영시간표 이미지 파일',
        type: 11, // ATTACHMENT
        required: true,
      },
      {
        name: 'theater',
        description: '극장명 힌트 (이미지에서 못 읽을 경우)',
        type: 3, // STRING
        required: false,
      },
    ],
  },
]

async function register() {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${APP_ID}/commands`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    },
  )

  const data = await res.json()

  if (!res.ok) {
    console.error('❌ 등록 실패:', JSON.stringify(data, null, 2))
    process.exit(1)
  }

  console.log('✅ 커맨드 등록 완료:')
  for (const cmd of data as Array<{ name: string; id: string }>) {
    console.log(`  /${cmd.name} (id: ${cmd.id})`)
  }
}

register().catch(console.error)
