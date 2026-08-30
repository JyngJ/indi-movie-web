/**
 * 시놉시스 문장 경계 복원.
 *
 * KMDB 오픈 API(`plots.plot[].plotText`)는 원본 줄바꿈을 공백 없이 지운 채 내려준다.
 * 그래서 "시작은 호기심이었다그곳은 대체 무엇인가?낯설지만…"처럼 문장이 붙어버린 값이
 * 그대로 저장됐고, meta description·본문에 붙은 문장으로 노출됐다. 검색 스니펫에서
 * 그대로 보이는 문제라 저장 시점에 경계를 복원한다.
 *
 * 잘못 띄우는 쪽이 더 나쁘기 때문에 규칙은 보수적으로 둔다.
 * - 마침표·물음표·느낌표·말줄임표 뒤에 한글이 바로 붙은 경우만 띄운다.
 *   앞 글자가 한글이거나 닫는 따옴표·괄호일 때만 — 그래야 "E.T.는", "Mr.폭스",
 *   "C.K.는" 같은 약어와 "10초 07."의 숫자 표기를 건드리지 않는다.
 *   앞뒤로 점이 한 번 더 붙는 "동.상.이.몽" 같은 표기도 제외한다.
 * - 문장부호가 아예 없는 경계는 평서형 종결어미(-었다/-았다/-였다/-겠다/-없다/-있다,
 *   한다/된다/온다/간다/난다, -니다) 뒤에 연결어미가 아닌 한글이 올 때만 띄운다.
 *   "-다는/-다고/-다며/-다가" 같은 연결형은 문장이 이어지는 자리라 제외한다.
 *   "다시·다른·다큐"처럼 종결어미가 아닌 -다 어휘를 건드리지 않으려고 어미를 열거한다.
 *
 * 그 외의 경계(명사 나열 등)는 복원할 근거가 없어 그대로 둔다.
 */

/** 문장 끝으로 인정할 부호. 가운뎃점은 "···!"처럼 말줄임 대용으로 쓰인 앞자리만 허용. */
const SENTENCE_PUNCTUATION = /([가-힣’”」』)\]])([·.]*[.!?…]+)(?=[가-힣])/g

/**
 * "동.상.이.몽", "똑..똑..똑"처럼 점으로 음절을 나눈 표기인지 판별한다.
 * 점만으로 끊긴 자리에서, 앞 음절 또는 뒤 음절 바깥에 점이 한 번 더 있으면 문장 끝이 아니다.
 */
function isDotSeparatedLabel(source: string, punctuation: string, punctuationStart: number) {
  if (!/^\.+$/.test(punctuation)) return false
  const beforeSyllable = source[punctuationStart - 2]
  const afterSyllable = source[punctuationStart + punctuation.length + 1]
  return beforeSyllable === '.' || afterSyllable === '.'
}

/** 종결어미 뒤에 오면 문장이 계속되는 연결형 첫 글자. */
const CLAUSE_CONNECTIVES = '는고며가던면도만지니라시들'
const SENTENCE_ENDINGS = '[었았였겠없있]다|[한된온간난]다|니다'
const SENTENCE_ENDING = new RegExp(
  `(${SENTENCE_ENDINGS})(?=[가-힣])(?![${CLAUSE_CONNECTIVES}])`,
  'g',
)

export function normalizeSynopsis(text: string): string
export function normalizeSynopsis(text: null | undefined): null
export function normalizeSynopsis(text: string | null | undefined): string | null
export function normalizeSynopsis(text: string | null | undefined): string | null {
  if (text == null) return null
  const restored = text
    .replace(SENTENCE_PUNCTUATION, (match, before: string, punctuation: string, offset: number) => {
      if (isDotSeparatedLabel(text, punctuation, offset + before.length)) return match
      return `${before}${punctuation} `
    })
    .replace(SENTENCE_ENDING, '$1 ')
  return restored.replace(/\s+/g, ' ').trim()
}
