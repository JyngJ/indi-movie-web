-- 홍콩 예술영화 큐레이션 리스트
-- 감독: 왕가위, 관금붕, 허안화, 진가상, 진과
-- 실행 순서: films_tab_curation_list.sql → add_curation_pending_titles.sql → 이 파일
--
-- 0편 매칭 / 17편 pending

INSERT INTO curation_list (list_id, name_ko, type, member_ids, pending_titles, priority_tier, min_n)
VALUES
  (
    'movement_hk_art_cinema',
    '홍콩 예술영화',
    'static',
    '[]'::jsonb,
    '["연지구","열혈남아","아비정전","객도추한","완령옥","중경삼림","동사서독","홍장미 백장미","타락천사","여인사십","첨밀밀","해피 투게더","메이드 인 홍콩","리틀 청","화양연화","두리안 두리안","2046"]'::jsonb,
    2,
    NULL
  )
ON CONFLICT (list_id) DO UPDATE
  SET name_ko        = EXCLUDED.name_ko,
      member_ids     = EXCLUDED.member_ids,
      pending_titles = EXCLUDED.pending_titles;
