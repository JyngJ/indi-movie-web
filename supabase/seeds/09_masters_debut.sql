-- 거장의 데뷔작 큐레이션 리스트
-- 실행 순서: films_tab_curation_list.sql → add_curation_pending_titles.sql → 이 파일
--
-- 3편 매칭 (400번의 구타, 축제일, 환상의 빛) / 33편 pending

INSERT INTO curation_list (list_id, name_ko, type, member_ids, pending_titles, priority_tier, min_n)
VALUES
  (
    'collection_masters_debut',
    '거장의 데뷔작',
    'static',
    '["7ce43527-51fd-45e4-b002-c1de735c9bee","3a1051f5-ddc9-497b-b8bc-50e313bad1ef","27a6ec62-29eb-4e4d-a8f0-83de23f81390"]'::jsonb,
    '["초록물고기","돼지가 우물에 빠진 날","플란다스의 개","악어","죽거나 혹은 나쁘거나","추격자","조용한 가족","개그맨","시민 케인","네 멋대로 해라","길의 노래","이반의 어린 시절","히로시마 내 사랑","강박관념","백인 추장","일곱 번째 대륙","붉은 수수밭","소무","청소년 나타","해탄적일천","열혈남아","그 남자 흉포하다","저수지의 개들","블러드 심플","황무지","이레이저헤드","하드 에이트","천국보다 낯선","그녀는 그것을 가져야 해","바틀 로켓","레이디 버드","슬래커","약속"]'::jsonb,
    2,
    NULL
  )
ON CONFLICT (list_id) DO UPDATE
  SET name_ko        = EXCLUDED.name_ko,
      member_ids     = EXCLUDED.member_ids,
      pending_titles = EXCLUDED.pending_titles;
