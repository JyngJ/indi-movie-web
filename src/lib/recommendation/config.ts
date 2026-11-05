/**
 * 운영 추천 설정 — scripts/recommendation/evaluate.ts 결과로 고른 값(2026-11-05, 평가 357명·6구간).
 * recall@10 0.282 vs 인기순 0.247, 차이 +0.035 [0.006, 0.058]. 행동 이웃만으로는 인기순을 못 이겼고
 * 콘텐츠·인기를 섞어야 앞섰다. 함께 본 사람 하한을 3명으로 올리면 +0.009 [-0.016, 0.032]로 이득이 사라진다.
 * 값을 바꾸면 평가를 다시 돌려 이 주석을 고친다.
 */
export const RECOMMENDATION_MODEL = {
  version: 'ease-v1',
  lambda: 200,
  minUsersPerItem: 2,
  /** 함께 본 사람이 이보다 적은 이웃은 저장하지 않는다(우연 한 명짜리 쌍 제거) */
  minCoUsers: 2,
  neighborsPerMovie: 50,
  trainingDays: 120,
  contentWeight: 0.05,
  priorWeight: 0.05,
} as const
