/**
 * 제한 시간이 있는 fetch. react-query의 signal(언마운트·취소)과 제한 시간 중 먼저 오는 쪽으로 끊는다.
 *
 * 브라우저 fetch에는 기본 제한 시간이 없다. 2026-11-25 인기 랭킹 요청이 서버 쪽 PostHog 대기로
 * 1분 넘게 끝나지 않았고, 그동안 섹션은 스켈레톤으로 남았다. 끊기면 TimeoutError로 거부되어
 * 쿼리가 error가 되고, 화면은 섹션을 숨긴다.
 *
 * AbortSignal.any·AbortSignal.timeout이 없는 브라우저(Safari 17.4 미만)를 위해 직접 엮는다.
 */
export async function fetchWithTimeout(
  input: string,
  { timeoutMs, signal, ...init }: RequestInit & { timeoutMs: number },
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort(new DOMException(`요청이 ${timeoutMs}ms 안에 끝나지 않았어요`, 'TimeoutError'))
  }, timeoutMs)
  const forwardAbort = () => controller.abort(signal?.reason)
  if (signal) {
    if (signal.aborted) forwardAbort()
    else signal.addEventListener('abort', forwardAbort, { once: true })
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}
