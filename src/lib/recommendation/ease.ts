import type { Interaction, Neighbor, NeighborTable } from './types'

/**
 * EASE (Steck 2019, "Embarrassingly Shallow Autoencoders for Sparse Data").
 * 사람×영화 행렬 X로 G = XᵀX + λI를 만들고 P = G⁻¹에서 B_ij = -P_ij / P_jj (대각 0)을 얻는다.
 * 학습이 역행렬 한 번이라 영화 수백 편이면 1초 안에 끝난다.
 */
export interface EaseOptions {
  /** 정규화 세기. 데이터가 희소할수록 크게 */
  lambda: number
  /** 이 인원 미만이 본 영화는 행렬에서 뺀다 */
  minUsersPerItem?: number
  /** 신호 무게를 행렬 값으로 바꾸는 방식. binary는 본 적 있으면 1 */
  value?: 'binary' | 'log'
}

export interface EaseModel {
  items: string[]
  /** items.length² 행 우선 행렬. B[i*n+j] = 영화 i를 본 사람이 j를 볼 점수 기여 */
  B: Float64Array
}

export function trainEase(interactions: Interaction[], { lambda, minUsersPerItem = 2, value = 'binary' }: EaseOptions): EaseModel {
  const usersPerItem = new Map<string, Set<string>>()
  for (const r of interactions) {
    let s = usersPerItem.get(r.movieId)
    if (!s) usersPerItem.set(r.movieId, s = new Set())
    s.add(r.user)
  }
  const items = [...usersPerItem].filter(([, s]) => s.size >= minUsersPerItem).map(([id]) => id).sort()
  const index = new Map(items.map((id, i) => [id, i]))
  const n = items.length
  const rows = new Map<string, Array<[number, number]>>()
  for (const r of interactions) {
    const i = index.get(r.movieId)
    if (i === undefined) continue
    const v = value === 'binary' ? 1 : Math.log1p(r.weight)
    let row = rows.get(r.user)
    if (!row) rows.set(r.user, row = [])
    row.push([i, v])
  }
  // G = XᵀX — 사람마다 본 영화 쌍만 더한다(희소).
  const G = new Float64Array(n * n)
  for (const row of rows.values()) {
    for (const [a, va] of row) for (const [b, vb] of row) G[a * n + b] += va * vb
  }
  for (let i = 0; i < n; i++) G[i * n + i] += lambda
  const P = invertSpd(G, n)
  const B = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) if (i !== j) B[i * n + j] = -P[i * n + j] / P[j * n + j]
  }
  return { items, B }
}

/** 대칭 양의 정부호 행렬 역행렬 — 촐레스키 분해 후 L⁻¹ᵀL⁻¹. */
export function invertSpd(A: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n)
  for (let j = 0; j < n; j++) {
    let d = A[j * n + j]
    for (let k = 0; k < j; k++) d -= L[j * n + k] ** 2
    if (d <= 0) throw new Error('Matrix is not positive definite')
    const ljj = Math.sqrt(d)
    L[j * n + j] = ljj
    for (let i = j + 1; i < n; i++) {
      let s = A[i * n + j]
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k]
      L[i * n + j] = s / ljj
    }
  }
  // Linv: 하삼각 L의 역행렬
  const Linv = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    Linv[i * n + i] = 1 / L[i * n + i]
    for (let j = 0; j < i; j++) {
      let s = 0
      for (let k = j; k < i; k++) s += L[i * n + k] * Linv[k * n + j]
      Linv[i * n + j] = -s / L[i * n + i]
    }
  }
  // A⁻¹ = Linvᵀ Linv
  const inv = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0
      for (let k = i; k < n; k++) s += Linv[k * n + i] * Linv[k * n + j]
      inv[i * n + j] = s
      inv[j * n + i] = s
    }
  }
  return inv
}

/** 영화마다 점수가 양수인 이웃 상위 k개. 저장·서빙용. */
export function easeNeighbors({ items, B }: EaseModel, k: number): NeighborTable {
  const n = items.length
  const table: NeighborTable = new Map()
  for (let i = 0; i < n; i++) {
    const list: Neighbor[] = []
    for (let j = 0; j < n; j++) {
      const score = B[i * n + j]
      if (score > 0) list.push({ movieId: items[j], score })
    }
    list.sort((a, b) => b.score - a.score || a.movieId.localeCompare(b.movieId))
    if (list.length) table.set(items[i], list.slice(0, k))
  }
  return table
}

/**
 * 함께 본 사람이 minUsers 미만인 이웃을 뺀다. 우연한 쌍을 거르고, 몇 사람의 취향이
 * 그대로 드러나는 추천을 막는다.
 */
export function filterBySupport(table: NeighborTable, interactions: Interaction[], minUsers: number): NeighborTable {
  const users = new Map<string, Set<string>>()
  for (const r of interactions) (users.get(r.movieId) ?? users.set(r.movieId, new Set()).get(r.movieId)!).add(r.user)
  const out: NeighborTable = new Map()
  for (const [movieId, list] of table) {
    const a = users.get(movieId)
    if (!a) continue
    const kept = list.filter(n => {
      const b = users.get(n.movieId)
      if (!b) return false
      let co = 0
      const [small, large] = a.size < b.size ? [a, b] : [b, a]
      for (const u of small) if (large.has(u) && ++co >= minUsers) return true
      return false
    })
    if (kept.length) out.set(movieId, kept)
  }
  return out
}
