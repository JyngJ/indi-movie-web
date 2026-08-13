-- 테마 큐레이션 리스트 2차 4종 — Supabase SQL 에디터에서 실행
-- 비 오는 날 / 새벽에 혼자 / 흑백 / 원작 소설. 1차(14_theme_lists.sql)와 같은 규칙:
-- member_ids는 제목+연도+감독 검증 완료, pending_titles는 재상영 크롤 시 자동 편입.
-- 비 오는 날은 우선 연중 노출(시즌 트리거 없음) — 날씨 API 트리거는 추후.

INSERT INTO curation_list (list_id, name_ko, type, member_ids, pending_titles, priority_tier, season_trigger, min_n)
VALUES
  (
    'theme_rainy_day',
    '비 오는 날 보는 영화',
    'static',
    '["be067eb1-a10f-48f5-bc43-a0115f7d04e8","d433b81d-4e01-40e4-a94a-a9a260eeccb5","fdc1534e-de81-4a21-936a-5046506a18d9","d0dd0f0b-280d-4140-898b-4f50eaba9d17","819cae2a-815c-4c44-85da-0520cbba58ed","f378b4a1-a080-469f-8237-cc0bfceabeef","d5fb3153-de2c-4bc5-987a-fa4e3820f7b3","f5986fab-f9c9-4d4e-8fc8-2d2b6712b999","535891de-901d-4627-8461-2b7263aa6e49","3c2d940e-08e6-4c41-b1c9-2b7ecbb5efe5"]'::jsonb,
    '["조제, 호랑이 그리고 물고기들","클래식","싱글 맨","레인 맨","어톤먼트"]'::jsonb,
    2,
    NULL,
    NULL
  ),
  (
    'theme_late_night_alone',
    '새벽에 혼자 보는 영화',
    'static',
    '["cba7d67f-2fe5-41d4-a792-3fbb2ab18b67","2c1d6b8e-102f-4db9-aa38-8b753a564e57","81dbd343-dae5-4a4e-b614-6af4f9c6b78f","4696cb13-af3a-4da5-800d-7cf83a6dcf51","7b0b297d-cd94-4084-9f36-95f0b1ffc287","ddad543f-f8fa-4759-b763-e3099bf14d54","fa26c364-f9f9-4193-bdc5-4206175e047d","13988b3b-48ea-494d-a991-293d802a3f62"]'::jsonb,
    '["로스트 인 트랜스레이션","비포 선셋","패터슨","퍼펙트 데이즈","프란시스 하","밤은 짧아 걸어 아가씨야","스모크","립반윙클의 신부"]'::jsonb,
    2,
    NULL,
    NULL
  ),
  (
    'theme_black_white',
    '흑백 영화',
    'static',
    '["52a023a7-b84c-4ead-b317-f8edd2529b94","30ae5cb2-9b83-4610-a72c-36fb100a6c49","fa26c364-f9f9-4193-bdc5-4206175e047d","5bd58f76-2331-477b-879d-d70ffcc71ccb","1f36d443-55cd-45a1-82dd-dba1a459a420","ac67ef1d-dab3-410b-bd5f-383c95102142","72ee4e96-9be0-48bf-a512-6dc426db5e17","17f9b428-0e73-4c06-b9d1-622e4cae9537","e2590681-11e6-4126-a92c-8ded4b5b7d7f","f74d70f9-e209-40ea-a099-8cbb06e83846","47ccfc2d-1cf3-4e9b-95c3-edf69e94e496","45e92cdb-05b9-4cfe-9433-3c8f00528893","726ae582-c574-4b0f-b5bb-9bd60a679830","e976d40e-201e-446b-96da-75134e2a4036","e38990f2-881d-455f-ab0a-899c215f7e87","c05d8178-5121-4e44-8ed3-41ee36e54664","c7a0e312-4fb4-4997-a6bd-d185f9a5930e","6747f616-1142-4f13-b8ea-08aa54eecfc5","7ce43527-51fd-45e4-b002-c1de735c9bee","ce7b813b-f2d7-4338-99ef-9254e9a12ccc","7e4bd2a8-63e6-4e88-80ed-569e9fc5c2c6"]'::jsonb,
    '["이다","벨파스트","아티스트"]'::jsonb,
    2,
    NULL,
    NULL
  ),
  (
    'theme_based_on_novel',
    '원작 소설 있는 영화',
    'static',
    '["787c3511-45cc-4ab9-8651-6dd3b858b580","86c175f9-4177-40ec-b84a-e22a57634841","c5ff1f16-531c-4a4a-a14f-14925b3b559e","1a434ba4-618d-4a9d-a0dc-faa828897a5a","54a3cf1c-07e3-4ac4-9932-bc262c191993","4fb9295a-c89e-4be7-b47c-028e18db0ddf","2892902d-1bc4-4d1e-891b-04fd20a55372","876216b0-5e3a-41b1-b6f4-b3de07aecf09"]'::jsonb,
    '["토니 타키타니","노르웨이의 숲","파워 오브 도그","캐롤","남아있는 나날","향수: 어느 살인자의 이야기","레볼루셔너리 로드","은교","살인자의 기억법","완득이"]'::jsonb,
    2,
    NULL,
    NULL
  )
ON CONFLICT (list_id) DO UPDATE
  SET name_ko        = EXCLUDED.name_ko,
      member_ids     = EXCLUDED.member_ids,
      pending_titles = EXCLUDED.pending_titles,
      priority_tier  = EXCLUDED.priority_tier,
      season_trigger = EXCLUDED.season_trigger,
      min_n          = EXCLUDED.min_n;
