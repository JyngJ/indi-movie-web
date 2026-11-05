-- 상영작 탭 발견 테마 12종 — 방문마다 4개씩 돌려 보여 준다(src/lib/curation/themeRotation.ts).
-- 2026-11-05. member_ids: 그날 상영작 169편의 줄거리를 읽고 고른 것. pending_titles: DB 미보유 또는 미확인 — resolve-curation-pending이
-- 정규화 제목 완전일치로 편입한다. 동명이작 위험 제목은 넣지 않는다. discover_taiwan은 제작국 동적 조회.
-- min_n 3: 상영작 3편 미만이면 숨긴다(로테이션 후보에서도 빠진다).

INSERT INTO curation_list (list_id, name_ko, type, query, member_ids, pending_titles, priority_tier, season_trigger, min_n)
VALUES
  -- discover_fresh_start: 씽씽 · 착지연습 · 흐르는 여정 · 친숙한 손길 · 리틀 드리머즈
  ('discover_fresh_start', '다시 시작하는 사람들', 'static', NULL, '["f3197908-2bee-47f3-b8a5-f2025958e667", "cffe9aec-b2aa-42d6-ba33-12c5386ff62b", "43e87729-372f-4e7d-803f-c77db333eb25", "e3a0f3af-4da9-402d-b7b5-0d1942ad3259", "578b0038-e911-411a-8f3f-28e3cc29d29c"]'::jsonb, '["프란시스 하", "미나리", "쇼생크 탈출", "패터슨", "아메리칸 셰프"]'::jsonb, 2, NULL, 3),
  -- discover_family: 어떻게 해야 했을까? · 가족여행 · 철들 무렵 · 인생세탁소 · 눈 둘 데가 없네 · 로스트 도터 · 래빗 홀 · 로코와 그의 형제들 · 나는보리 · 어머니의 가계부 · 본심 · 아이 엠 러브 · 처녀 자살 소동
  ('discover_family', '가족이라 더 어려운', 'static', NULL, '["63db5742-bc6b-40f9-988f-32cdc4a2559f", "744071d3-d1b6-4a63-8ecc-3090fd725db7", "7901e6ca-f7ec-4a43-b77c-ac3e379c7e91", "c1e1dc64-dc78-4254-841f-a697b506b767", "a3351a26-0c15-48e7-941e-94411e472748", "27faf410-d7e7-4347-99b1-be7095a876c8", "2f3d627b-27c9-41a8-a552-3665f229bb5c", "73c27036-95d9-4605-b1c2-83710690d6a2", "2896d7ff-1745-4371-b163-d76203226dba", "aa912322-227b-420e-add7-be372ec0e02e", "fe31c0d8-fcb8-450a-b168-2d497acbe67c", "63b2f831-1509-4656-964c-063f9c4d8582", "44886339-671b-42d7-bb33-5acc6162f378"]'::jsonb, '["어느 가족", "바닷마을 다이어리", "걸어도 걸어도", "애프터썬", "가버나움", "페어웰"]'::jsonb, 2, NULL, 3),
  -- discover_friend_lover: 첨밀밀 · 소년, 소년을 만나다 · 레위기 · 여전히 찬란하게 · 룩백 · 우리들의 교복시절
  ('discover_friend_lover', '친구와 연인 사이', 'static', NULL, '["972f135b-da55-40b0-8c2a-653d2f72b7fb", "1cbbfb1a-b7d2-497c-9d38-8ed707a373de", "8ffb5b28-091e-4a96-bd88-261efc3356d8", "0199a0e4-b361-421f-8198-fd8b51c8727f", "6c2b8f54-b547-4ccb-bff9-784761f238eb", "8ca01c4a-35a8-4955-a42c-8ad8454e8cd6"]'::jsonb, '["해리가 샐리를 만났을 때", "비포 선라이즈", "패스트 라이브즈", "콜 미 바이 유어 네임", "원 데이"]'::jsonb, 2, NULL, 3),
  -- discover_leaving_home: 오디세이 · 꿈꾸던 모험 · 저개발의 기억 · 로코와 그의 형제들 · 첨밀밀 · 무산일기 · 호루몽 · 왼손잡이 소녀 · 수색자
  ('discover_leaving_home', '집을 떠나는 이야기', 'static', NULL, '["331ceaab-a681-438b-9b08-8b9626f7faa3", "f70ad88a-3730-4c83-9f3d-dff955e8853d", "258c1c19-e32e-43cc-92f7-08445b8d6dee", "73c27036-95d9-4605-b1c2-83710690d6a2", "972f135b-da55-40b0-8c2a-653d2f72b7fb", "5ed33c15-9049-4a1c-80d3-dbe02e4c1440", "732cc31a-5a8d-4631-bcbd-876bdf45c7e8", "88593550-5a53-403e-a02b-dec526ca090e", "cafbe592-da89-4e5b-9430-c6d455f8ef5d"]'::jsonb, '["브루클린", "패스트 라이브즈", "노매드랜드", "페어웰", "미나리"]'::jsonb, 2, NULL, 3),
  -- discover_hotel: 더 랍스터 · 지난 해 마리앙바드에서
  ('discover_hotel', '영화 속 호텔', 'static', NULL, '["28d4e848-fd46-4deb-85db-de5ec560e1bd", "470606b4-9bba-4516-96f6-60c62cb05462"]'::jsonb, '["그랜드 부다페스트 호텔", "로스트 인 트랜슬레이션", "샤이닝", "플로리다 프로젝트", "미스테리 트레인", "호텔 르완다"]'::jsonb, 2, NULL, 3),
  -- discover_by_the_sea: 나는보리 · 이방인 · 파르테노페 · 인생세탁소 · 아가미 · 극장판 치이카와: 인어 섬의 비밀
  ('discover_by_the_sea', '바다 곁의 이야기', 'static', NULL, '["2896d7ff-1745-4371-b163-d76203226dba", "6bcb5990-0ddc-427d-8bd9-02aec6dd0189", "80a0128c-669b-4d39-bfc4-88abdac6b91d", "c1e1dc64-dc78-4254-841f-a697b506b767", "7310c008-0363-4850-9e5b-121cdc72e560", "6b3fb21c-b472-4d79-86ff-ddb6498cdace"]'::jsonb, '["바닷마을 다이어리", "그랑 블루", "맨체스터 바이 더 씨", "애프터썬", "그 여름 가장 조용한 바다"]'::jsonb, 2, NULL, 3),
  -- discover_one_day: 굿타임 · 12인의 성난 사람들 · 지금은맞고그때는틀리다 · 콰이어트 시티 · 최종면접
  ('discover_one_day', '하루 사이에 벌어진 일', 'static', NULL, '["6563a76f-26c8-4327-8e52-8b4826bfac77", "ee9a331d-6d74-490a-8ecc-9711028ab0f9", "d408a323-8c57-4e83-9333-202a3a7adc7c", "b8c503bc-fd9a-4071-9628-d620b5eb98ee", "f5f097a2-5b14-438f-831b-f5b6873bedd8"]'::jsonb, '["비포 선라이즈", "5시부터 7시까지의 클레오", "아메리칸 그래피티", "로프"]'::jsonb, 2, NULL, 3),
  -- discover_working_people: 변이 · 후광 · 부에노스 아이레스여 안녕 · 나의 사적인 예술가 · 영 스트레인저스 · 포르테 · 에디 앨리스: 테이크
  ('discover_working_people', '일하는 사람들의 얼굴', 'static', NULL, '["5c048b9f-756e-44b1-9329-bfa75815441e", "fa20d046-0cec-46a1-abf2-61bd2cae0be5", "4c72d689-0acf-4ebc-804f-8f7317437255", "a38afb1c-3f01-49c8-9195-4cd79f46323e", "5a0937fc-613b-4c00-9af5-71abd8bffc6b", "e24993f5-c8d2-47fb-8a52-e7a0c601321f", "03366d1f-dc81-4c12-8e58-75ca9ea5145a"]'::jsonb, '["나, 다니엘 블레이크", "미안해요, 리키", "다음 소희", "카트", "패터슨"]'::jsonb, 2, NULL, 3),
  -- discover_food: 욕쟁이 할머니 · 사람과 고기 · 호루몽 · 왼손잡이 소녀
  ('discover_food', '밥상에서 시작된 이야기', 'static', NULL, '["4600f438-b0c1-402c-b518-550ab48e09b2", "4e8a90cc-0fed-4441-a9f9-21cd2f172001", "732cc31a-5a8d-4631-bcbd-876bdf45c7e8", "88593550-5a53-403e-a02b-dec526ca090e"]'::jsonb, '["리틀 포레스트", "카모메 식당", "앙: 단팥 인생 이야기", "바베트의 만찬", "아메리칸 셰프", "담뽀뽀"]'::jsonb, 2, NULL, 3),
  -- discover_music: 라라랜드 · 원스 · 코리안 블랙 아이즈 · 크레센도 · 마린 알솝 · 7데이즈 7피플 · 삼춘, 어디 감수광? · 어네스트와 셀레스틴: 멜로디 소동 · 아네트 · 마더 메리 · 송해 1927
  ('discover_music', '음악이 이야기가 될 때', 'static', NULL, '["ef0ed4ed-b434-4bf5-96a5-a544fca37ad3", "2e4e35d7-332c-409d-95bb-dd5ffed98864", "14cca353-fc45-44b5-a43e-08cd2bea4d6f", "6db127bd-7425-4807-96d7-bf1711ee27d4", "b2445f6b-6f2f-4ada-bff7-882662e1a2ea", "c31dcc01-4de5-4777-923a-3d44823af9f7", "f0a8fe4a-99b4-447f-a6ed-e247641c4687", "eb80b3c1-3b97-4125-ae5f-6603009065ae", "4d4811e7-7ef1-46ff-af23-ed20315f9870", "d5f2c675-8923-48ca-9dde-3d4747882ce2", "804eda31-cd85-4f68-9ee3-6c4a9118388e"]'::jsonb, '["위플래쉬", "비긴 어게인", "인사이드 르윈", "싱 스트리트", "스쿨 오브 락"]'::jsonb, 2, NULL, 3),
  -- discover_cinema: 안녕, 용문객잔 · 어느 여배우의 고백 · 나쁜 교육 · 에디 앨리스: 테이크 · 지금은맞고그때는틀리다
  ('discover_cinema', '영화에 관한 영화', 'static', NULL, '["3e06034a-5692-44e0-a7a5-541aa9af7340", "10729538-d5f7-4c47-b724-fef80d6ea06f", "335868d4-7ccf-4e5e-a6d3-2dd8f7606c98", "03366d1f-dc81-4c12-8e58-75ca9ea5145a", "d408a323-8c57-4e83-9333-202a3a7adc7c"]'::jsonb, '["시네마 천국", "8과 1/2", "파벨만스", "홀리 모터스", "아메리카의 밤"]'::jsonb, 2, NULL, 3),
  -- discover_taiwan: 제작국에 대만이 들어간 상영작
  ('discover_taiwan', '대만 영화 한 걸음', 'dynamic', '{"nation": ["대만"]}'::jsonb, NULL, '[]'::jsonb, 2, NULL, 3)
ON CONFLICT (list_id) DO NOTHING;
