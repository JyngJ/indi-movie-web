import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildEmailReportEmbed, reportEmailDelivery } from './report'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

const AT = new Date('2026-10-23T01:56:00Z') // 10월 23일 (금) 10:56 KST

describe('buildEmailReportEmbed', () => {
  it('재실행이라 새로 보낸 사람도 실패도 없으면 알리지 않는다', () => {
    expect(buildEmailReportEmbed({ considered: 4, ready: 2, sent: 0, failed: 0, unknown: 0 })).toBeNull()
  })

  it('수신 중·소식 있음·보냄을 나란히 두고, 건너뛴 사람 수를 적는다', () => {
    const embed = buildEmailReportEmbed({ considered: 4, ready: 2, sent: 2, failed: 0, unknown: 0 }, AT)!
    expect(embed.title).toBe('📬 소식 메일을 보냈어요')
    expect(embed.description).toContain('**2명**에게 보냈어요')
    expect(embed.description).toContain('새 소식이 없는 2명은 건너뛰었어요')
    expect(embed.fields.map((f) => `${f.name} ${f.value}`)).toEqual(['수신 중 4명', '소식 있음 2명', '보냄 2명'])
    expect(embed.footer.text).toBe('10월 23일 (금) 10:56')
    expect(embed.color).toBe(0x2ECC71)
  })

  it('일부 실패·결과 불명은 주황 카드에 따로 적는다', () => {
    const embed = buildEmailReportEmbed({ considered: 12, ready: 11, sent: 8, failed: 1, unknown: 2 }, AT)!
    expect(embed.title).toBe('📬 소식 메일을 일부만 보냈어요')
    expect(embed.color).toBe(0xF39C12)
    expect(embed.description).toContain('결과를 알 수 없는 2명은 다시 보내지 않아요')
    expect(embed.fields.map((f) => f.name)).toEqual(['수신 중', '소식 있음', '보냄', '실패', '확인 필요'])
  })

  it('한 명도 못 보냈어도 실패가 있으면 빨간 카드로 알린다', () => {
    const embed = buildEmailReportEmbed({ considered: 3, ready: 3, sent: 0, failed: 3, unknown: 0 }, AT)!
    expect(embed.title).toBe('⚠️ 소식 메일을 보내지 못했어요')
    expect(embed.color).toBe(0xE74C3C)
  })
})

describe('reportEmailDelivery', () => {
  it('알릴 게 없으면 웹훅을 부르지 않는다', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    await reportEmailDelivery({ sent: 0, failed: 0, unknown: 0 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('카드 형식으로 report 채널에 보내고 멘션은 막는다', async () => {
    vi.stubEnv('DISCORD_REPORT_WEBHOOK_URL', 'https://example.test/webhook')
    const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher)
    await reportEmailDelivery({ considered: 4, ready: 2, sent: 2, failed: 0, unknown: 0 }, AT)
    const body = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(body.embeds).toHaveLength(1)
    expect(body.embeds[0].title).toBe('📬 소식 메일을 보냈어요')
    expect(body.allowed_mentions).toEqual({ parse: [] })
  })
})
