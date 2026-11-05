-- 영화 추천 이웃 표 — scripts/recommendation/build.ts가 하루 한 번 채운다.
-- 영화끼리의 점수만 담는다. 사람별 기록은 저장하지 않는다.
create table if not exists public.movie_recommendation_neighbors (
  model text not null,
  movie_id uuid not null references public.movies(id) on delete cascade,
  neighbor_id uuid not null references public.movies(id) on delete cascade,
  score real not null,
  rank smallint not null,
  built_at timestamptz not null,
  primary key (model, movie_id, neighbor_id)
);
create index if not exists movie_recommendation_neighbors_lookup
  on public.movie_recommendation_neighbors (model, movie_id, rank);

-- 서버(service_role)만 읽고 쓴다. 브라우저에서 직접 읽지 않는다.
alter table public.movie_recommendation_neighbors enable row level security;
revoke all on public.movie_recommendation_neighbors from anon, authenticated;
