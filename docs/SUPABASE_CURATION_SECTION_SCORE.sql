-- 상영작 탭 섹션 점수 — scripts/curation/compute-section-scores.ts가 하루 한 번 채운다.
-- 위치 영향을 걷어낸 클릭 비율(1 = 그 자리 평균). 섹션 단위 집계값만 담는다.
create table if not exists public.curation_section_score (
  list_id text primary key,
  score real not null,
  impressions integer not null,
  clicks integer not null,
  expected_clicks real not null,
  computed_at timestamptz not null
);

-- 브라우저(anon)가 읽어 섹션 순서를 정한다. 쓰기는 service_role만.
alter table public.curation_section_score enable row level security;
revoke all on public.curation_section_score from anon, authenticated;
grant select on public.curation_section_score to anon, authenticated;
drop policy if exists curation_section_score_read on public.curation_section_score;
create policy curation_section_score_read on public.curation_section_score for select to anon, authenticated using (true);
