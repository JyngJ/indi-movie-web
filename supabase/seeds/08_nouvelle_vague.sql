-- 누벨바그 큐레이션 리스트
-- 실행 순서: films_tab_curation_list.sql → add_curation_pending_titles.sql → 이 파일
--
-- 7편 매칭 / 25편 pending

INSERT INTO curation_list (list_id, name_ko, type, member_ids, pending_titles, priority_tier, min_n)
VALUES
  (
    'movement_nouvelle_vague',
    '누벨바그',
    'static',
    '["7ce43527-51fd-45e4-b002-c1de735c9bee","ac9c188e-4185-4a8f-bacb-cd1477add65c","602b51ec-9811-4f93-966c-dc37a7424ecc","d433b81d-4e01-40e4-a94a-a9a260eeccb5","550f537b-06f7-4f5e-8877-205389bf950c","2da69216-098f-4b1f-9196-0b1e31aa85d8","856a887d-d6be-4059-81c0-924e9b38d694"]'::jsonb,
    '["사형대의 엘리베이터","미남 세르주","히로시마 내 사랑","사촌들","사자자리","네 멋대로 해라","피아니스트를 쏴라","파리는 우리의 것","지난해 마리앙바드에서","롤라","쥘 앤 짐","비브르 사 비","라 제테","아듀 필리핀","경멸","미치광이 피에로","알파빌","행복","수집가","주말","훔친 키스","여자 사슴","부정한 여인","아메리카의 밤","셀린과 줄리 배 타러 가다"]'::jsonb,
    2,
    NULL
  )
ON CONFLICT (list_id) DO UPDATE
  SET name_ko        = EXCLUDED.name_ko,
      member_ids     = EXCLUDED.member_ids,
      pending_titles = EXCLUDED.pending_titles;
