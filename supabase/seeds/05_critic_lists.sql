-- 평론가 큐레이션 리스트 — 최초 1회 Supabase SQL 에디터에서 실행
-- films_tab_curation_list.sql 이후에 실행 (curation_list 테이블 필요)
-- member_ids: 우리 DB movies.id (UUID) 배열
-- DB에 없는 영화는 제외됨 (향후 영화 추가 시 UPDATE로 보완)

INSERT INTO curation_list (list_id, name_ko, type, member_ids, priority_tier, min_n)
VALUES
  (
    'critic_park_pyeong_sik',
    '박평식 평론가가 호평한 영화',
    'static',
    -- 박평식 8점 이상 (DB 보유 11편) / 제외: DB 미보유 다수 (대부, 로마, 괴물 등)
    '["91607d50-6a98-45d3-aad5-6e5bc8170d30","334469b0-29f2-406e-9c22-4cf7a40a40d7","d6fc983a-9ce4-4195-b6f1-0c177a549147","eb727482-16c4-46f8-9aba-279b29a1a231","8b4e0b96-efdd-4d58-a2b1-ff17d05da420","f5d26cad-e204-4afc-b0c1-0a0ff54f913c","7eee0531-e0ce-4027-bf58-b9269b18f495","94ecc0e7-edae-4af3-8425-620f0edd5028","6bcc1331-1ce6-4a06-adbb-bfeb50a0ff7e","e0124415-2459-4f82-a82d-3e0446c9ae6c","ec90be21-96cc-4640-81d3-32fa8df93886"]'::jsonb,
    2,
    NULL
  ),
  (
    'critic_lee_dong_jin',
    '이동진 평론가가 만점 준 영화',
    'static',
    -- 이동진 만점작 (DB 보유 22편) / 제외: DB 미보유 다수 (살인의 추억, 홀리모터스, 곡성 등)
    '["91607d50-6a98-45d3-aad5-6e5bc8170d30","334469b0-29f2-406e-9c22-4cf7a40a40d7","d6fc983a-9ce4-4195-b6f1-0c177a549147","eb727482-16c4-46f8-9aba-279b29a1a231","ec90be21-96cc-4640-81d3-32fa8df93886","3af099ee-dc56-49d8-87ea-55db80547f1a","6a887b0f-4a73-4c6c-986b-f23963e571a0","54fe0415-950f-44af-a74f-98e3657958d1","70e64ca5-31cc-425b-ab16-68c35673825f","b2b020df-5145-4459-a9e2-719a7955ee04","0595e455-200c-4ee3-864f-250271389a54","ed603eec-73fb-4c01-a9fe-cdf8147cead2","b6abf59d-a465-45a2-884d-20de7e4e57e3","098e2973-043e-4734-b7ff-fc0d78931b82","63b2f831-1509-4656-964c-063f9c4d8582","5f81b33a-332f-475b-984d-97e021ab33ff","6560a8a8-78bc-40e8-b63c-1e64def8f468","ef44a15c-63bf-4f63-ba36-f2d2e8195126","32513e9a-c36d-4866-ac1b-13f453267f0a","b1a18b54-7c83-410f-afe1-7e6eec0a42ba","9d1b7e60-2957-49b2-95f8-8a0ffa08ba9e","78a37a59-3f42-4e41-82fd-f960ab5293e4"]'::jsonb,
    2,
    NULL
  )
ON CONFLICT (list_id) DO UPDATE
  SET member_ids = EXCLUDED.member_ids,
      name_ko    = EXCLUDED.name_ko;
