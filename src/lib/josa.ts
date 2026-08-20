/**
 * 한국어 조사 선택 — 앞말의 받침 유무로 고른다.
 * 영화 제목이 그대로 문장에 들어가는 토스트·안내 문구에서 "경멸는" 같은 게 나오지 않게 한다.
 *
 * 판정은 한글 음절(가~힣)만 본다. 숫자·라틴 문자로 끝나는 제목(예: "인터스텔라 2", "Her")은
 * 발음 기준이라 규칙이 갈리는데, 흔한 경우만 표로 처리하고 나머지는 받침 없음으로 본다.
 */

/** 숫자 읽기의 마지막 소리에 받침이 있는가 — 0(영) 1(일) 3(삼) 6(육) 7(칠) 8(팔) */
const DIGIT_HAS_FINAL: Record<string, boolean> = {
  '0': true, '1': true, '2': false, '3': true, '4': false,
  '5': false, '6': true, '7': true, '8': true, '9': false,
}

/** 마지막 글자에 받침이 있는지.
 *  「경멸」처럼 따옴표·괄호로 감싼 말이 그대로 들어오므로 꼬리의 문장부호는 걷어내고 본다 —
 *  안 그러면 '」'을 보고 판정해 "「경멸」는"이 나온다. */
export function hasFinalConsonant(word: string): boolean {
  const stripped = word.trim().replace(/[」』〉》"'”’)\]}\s.!?…]+$/u, '')
  const last = stripped.slice(-1)
  if (!last) return false

  const code = last.charCodeAt(0)
  // 한글 음절 영역 — (코드 - 0xAC00) % 28 이 0이면 받침 없음
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  if (last >= '0' && last <= '9') return DIGIT_HAS_FINAL[last]
  return false
}

/**
 * 조사를 붙인다. `withJosa('경멸', '은/는')` → "경멸은"
 * @param pair "은/는" "이/가" "을/를" "과/와" "으로/로" 처럼 [받침 있을 때]/[없을 때]
 */
export function withJosa(word: string, pair: string): string {
  const [withFinal, withoutFinal] = pair.split('/')
  return word + (hasFinalConsonant(word) ? withFinal : withoutFinal)
}
