import { describe, expect, it } from 'vitest'
import { buildDispatchRequest, describeDispatchFailure } from './dispatch'

describe('buildDispatchRequest', () => {
  it('main에서 소식 메일 워크플로를 실행하는 요청을 만든다', () => {
    const { url, init } = buildDispatchRequest('tok')
    expect(url).toBe('https://api.github.com/repos/JyngJ/indi-movie-web/actions/workflows/email-notifications.yml/dispatches')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ ref: 'main' })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })
})

describe('describeDispatchFailure', () => {
  it('권한 문제를 상태 코드별로 구분한다', () => {
    expect(describeDispatchFailure(401)).toContain('만료')
    expect(describeDispatchFailure(403)).toContain('권한')
    expect(describeDispatchFailure(422)).toContain('workflow_dispatch')
    expect(describeDispatchFailure(500)).toContain('500')
  })
})
