# 영화 추천 (EASE + 콘텐츠 + 인기)

## 구성
- `src/lib/recommendation/ease.ts` — EASE 학습(촐레스키 역행렬), 이웃 추출, 함께 본 사람 하한 필터. 순수 함수.
- `src/lib/recommendation/content.ts` — 감독·장르·국가·연대 유사도. 행동 기록이 없는 신작용.
- `src/lib/recommendation/recommend.ts` — 본 영화 이웃 점수 × 신호 무게 × 최근성 + 콘텐츠 + 인기 사전점수. 상영 중인 영화만, 본 영화 제외.
- `src/lib/recommendation/sources.ts` — PostHog(행동)·Supabase(영화 정보·상영 일정) 어댑터.
- `src/lib/recommendation/neighborRepository.ts` — `movie_recommendation_neighbors` 읽기·쓰기.
- `src/lib/recommendation/config.ts` — 운영 설정값과 근거.

신호 무게: 상세 조회 1 · 시간표 선택 2 · 예매 클릭 3 · 관심 등록 5. 운영 도메인만, 내부 사용자 제외.

## 실행
- `npm run reco:evaluate -- --splits 6 --test-days 14` — 14일 단위 6구간 오프라인 평가. 기준일 이전으로 학습, 이후 처음 본 영화를 맞히는지(recall@10·ndcg@10). 후보는 그 구간 상영작.
- `npm run reco:build` — 미리 보기. `-- --write`로 저장. 운영 DB에 `docs/SUPABASE_RECOMMENDATION.sql` 적용 후.
- Node 22 필요(supabase-js).

## 평가 (2026-11-05, 120일 기록, 평가 357명)
| 모델 | recall@10 | ndcg@10 | 인기순 대비 recall (95% 구간) |
|---|---|---|---|
| 인기순 | 0.247 | 0.169 | — |
| 콘텐츠만 (현재 "이런 작품은 어때요"와 같은 방식) | 0.171 | 0.113 | -0.076 [-0.124, -0.031] |
| 함께 본 횟수 cosine | 0.235 | 0.132 | -0.011 |
| EASE λ=200 | 0.235 | 0.139 | -0.012 |
| **EASE λ=200 + 콘텐츠 0.05 + 인기 0.05, 함께 본 2명 이상** | **0.282** | **0.185** | **+0.035 [0.006, 0.058]** |
| 같은 설정, 함께 본 3명 이상 | 0.256 | 0.174 | +0.009 [-0.016, 0.032] |

- 행동 이웃만으로는 인기순을 못 이긴다. 대부분 방문자가 한두 편만 보기 때문이다. 인기 사전점수를 섞어야 앞선다.
- 콘텐츠만 쓰는 규칙 방식은 인기순보다 유의하게 낮다.
- EASE 학습은 영화 700편 기준 0.2초. 데이터 수집 포함 8초.
