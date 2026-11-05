import { expect, it } from 'vitest'
import { pickRotatingThemes, recordShownThemes, ROTATION_COOLDOWN_MS } from './themeRotation'

const theme = (listId: string, ids: string[]) => ({ listId, movies: ids.map((id) => ({ id })) })
const now = Date.parse('2026-11-05T00:00:00Z')
const all = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => theme(id, [`${i}1`, `${i}2`, `${i}3`]))

it('같은 seed면 같은 테마를 같은 순서로 고른다', () => {
  expect(pickRotatingThemes(all, {}, 's1', now)).toEqual(pickRotatingThemes(all, {}, 's1', now))
  expect(pickRotatingThemes(all, {}, 's1', now)).toHaveLength(4)
})
it('방금 본 테마는 아직 안 본 테마보다 뒤로 밀린다', () => {
  const first = pickRotatingThemes(all, {}, 's1', now).map((t) => t.listId)
  const history = recordShownThemes({}, first, now)
  const next = pickRotatingThemes(all, history, 's2', now + 60_000).map((t) => t.listId)
  const unseen = all.map((t) => t.listId).filter((id) => !first.includes(id))
  expect(next.slice(0, unseen.length).sort()).toEqual(unseen.sort())
})
it('쿨다운이 지나면 다시 처음 본 것처럼 다룬다', () => {
  const history = { a: now - ROTATION_COOLDOWN_MS * 2 }
  const picks = pickRotatingThemes([theme('a', ['1', '2', '3'])], history, 's', now)
  expect(picks.map((t) => t.listId)).toEqual(['a'])
})
it('영화가 절반 넘게 겹치는 테마는 같이 고르지 않는다', () => {
  const picks = pickRotatingThemes([theme('x', ['1', '2', '3']), theme('y', ['1', '2', '9'])], {}, 's', now, 2)
  expect(picks).toHaveLength(1)
})
it('노출 기록은 오래된 항목을 지운다', () => {
  expect(recordShownThemes({ old: now - ROTATION_COOLDOWN_MS * 11 }, ['n'], now)).toEqual({ n: now })
})
