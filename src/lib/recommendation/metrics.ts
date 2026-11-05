/** 오프라인 평가 지표. ranked는 추천 순서, relevant는 실제로 본 영화. */
export function recallAt(ranked: string[], relevant: Set<string>, k: number): number {
  if (!relevant.size) return 0
  return ranked.slice(0, k).filter(id => relevant.has(id)).length / Math.min(k, relevant.size)
}
export function ndcgAt(ranked: string[], relevant: Set<string>, k: number): number {
  let dcg = 0
  ranked.slice(0, k).forEach((id, i) => { if (relevant.has(id)) dcg += 1 / Math.log2(i + 2) })
  let idcg = 0
  for (let i = 0; i < Math.min(k, relevant.size); i++) idcg += 1 / Math.log2(i + 2)
  return idcg ? dcg / idcg : 0
}
