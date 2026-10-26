/**
 * 라즈베리파이 cron이 GitHub의 소식 메일 워크플로를 직접 실행한다.
 * GitHub 예약(schedule)이 몇 시간씩 늦거나 빠져서 발송 창을 놓쳤다(2026-10-23·10-26).
 * 발송 자체는 그대로 Actions에서 한다 — Gmail·서비스 키를 라즈베리파이에 더 두지 않으려고
 * 라즈베리파이엔 Actions 실행 권한만 있는 토큰 하나만 둔다.
 */
export const EMAIL_WORKFLOW = { owner: 'JyngJ', repo: 'indi-movie-web', file: 'email-notifications.yml', ref: 'main' } as const

export function buildDispatchRequest(token: string): { url: string; init: RequestInit } {
  const { owner, repo, file, ref } = EMAIL_WORKFLOW
  return {
    url: `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${file}/dispatches`,
    init: {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
    },
  }
}

/** 실패 사유 — 토큰·응답 본문은 남기지 않는다 */
export function describeDispatchFailure(status: number): string {
  if (status === 401) return '토큰이 만료됐거나 잘못됐어요'
  if (status === 403 || status === 404) return '토큰에 Actions 쓰기 권한이 없거나 저장소를 볼 수 없어요'
  if (status === 422) return '워크플로에 workflow_dispatch가 없거나 브랜치를 찾지 못했어요'
  return `GitHub가 ${status}로 응답했어요`
}
