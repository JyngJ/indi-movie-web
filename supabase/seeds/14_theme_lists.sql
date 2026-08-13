-- 테마 큐레이션 리스트 6종 — Supabase SQL 에디터에서 실행
-- 커뮤니티(더쿠 등) 영화 추천글 수요 조사 기반: 상황·감정 문법의 static 리스트
-- member_ids: 2026-08 기준 DB 보유작 (제목+연도+감독 검증 완료)
-- pending_titles: DB 미보유 — resolve-curation-pending 스크립트가 크롤 후 자동 편입
--   주의: resolve는 정규화 제목 완전일치라, 동명이작 위험 제목(큐어·원더·스틸 라이프 등)은 넣지 않는다

INSERT INTO curation_list (list_id, name_ko, type, member_ids, pending_titles, priority_tier, season_trigger, min_n)
VALUES
  (
    'theme_tearjerker',
    '펑펑 울게 만드는 영화',
    'static',
    '["cab69f9b-8300-4b90-8eaa-db270e3b62d5","c299bffd-6e38-4bfb-b97a-df0fe8b3ddee","70e64ca5-31cc-425b-ab16-68c35673825f","763774e5-114e-4620-a864-d22eed31f07d","4553a89a-1822-495d-8f38-95218872d9a6"]'::jsonb,
    '["코코","미 비포 유","씨 인사이드","그린 마일","맨체스터 바이 더 씨","토리와 로키타","페르시아어 수업","세상에서 가장 아름다운 이별","엔딩 노트","아무르","스틸 앨리스","마이 걸","굿바이 마이 프렌드"]'::jsonb,
    2,
    NULL,
    NULL
  ),
  (
    'theme_healing',
    '우울할 때 위로가 되는 잔잔한 영화',
    'static',
    '["4696cb13-af3a-4da5-800d-7cf83a6dcf51","bcfc94a7-2a9c-465f-bb81-1fad207e4f6c","2bd94c87-1ccc-4128-9d2f-b99dab644b28","7457918c-6d7c-4835-9309-84bcdcf5bd63","787c3511-45cc-4ab9-8651-6dd3b858b580"]'::jsonb,
    '["리틀 포레스트","카모메 식당","앙: 단팥 인생 이야기","패터슨","퍼펙트 데이즈","월터의 상상은 현실이 된다","프란시스 하","윤희에게","벌새","미나리","브루클린","컴온 컴온","너의 새는 노래할 수 있어","그린 북"]'::jsonb,
    2,
    NULL,
    NULL
  ),
  (
    'theme_no_brainer',
    '웃고 싶은 날에 보는 영화',
    'static',
    '["ac30e5dc-0063-45ce-b2ad-454a66be826c","51776b63-dca4-4d9c-b76c-7b392b9c4208","393e8d49-8373-4945-be18-5ac22cd073ac"]'::jsonb,
    '["극한직업","나이스 가이즈","핫 퍼즈","스쿨 오브 락","갤럭시 퀘스트","미드나잇 런","스내치","헌트 포 와일더피플","조조 래빗","킹스맨: 시크릿 에이전트","존 윅"]'::jsonb,
    2,
    NULL,
    4
  ),
  (
    'theme_summer_night',
    '여름밤 보기 좋은 영화',
    'static',
    '["86c175f9-4177-40ec-b84a-e22a57634841","38f8aeac-3087-4e93-b08d-f95f33d5b52a","baab8263-ac27-4583-9605-243e8cf417a2","6c91f24e-ef4c-4e47-92de-76407396f606","7b0b297d-cd94-4084-9f36-95f0b1ffc287","88e5d47e-ddfc-4d36-b623-a9ab1f31190a","d45b3f45-e662-45a3-aa6e-7325e312b922","535891de-901d-4627-8461-2b7263aa6e49","f74d70f9-e209-40ea-a099-8cbb06e83846","d0028171-0f0c-48e9-945b-23a7f4279120"]'::jsonb,
    '["무드 인디고","미드소마","바다가 들린다","오직 사랑하는 이들만이 살아남는다","비포 미드나잇","아메리칸 그래피티","여름날 우리","우리들","키리에의 노래"]'::jsonb,
    2,
    '{"start": "06-01", "end": "08-31"}'::jsonb,
    NULL
  ),
  (
    'theme_visual_feast',
    '눈이 즐거운 영화',
    'static',
    '["ea48506a-86c3-42ff-8f65-bc9ed5d0b9f8","22591bbb-f7ce-4054-bd6b-bcc2d2167a31","bababd73-1944-43bd-ac6a-d34175341f3f","2c1d6b8e-102f-4db9-aa38-8b753a564e57","81dbd343-dae5-4a4e-b614-6af4f9c6b78f","bfdb76eb-c8bc-437e-9f2d-faf1d6255390","813ab0ce-6dc7-4759-a499-d6225ea09d16","ef0ed4ed-b434-4bf5-96a5-a544fca37ad3","d4517ea5-4d1d-44a7-8076-28447d9fd859","e0572f6b-d752-4eb2-9f4c-64811be063a4","216f77e7-b903-4d5c-bb09-c4b6ee1c9af2","4a808d29-a324-4f37-be2c-4d242bca51f9","54a3cf1c-07e3-4ac4-9932-bc262c191993","0cf74d47-9b2e-485f-b989-c199d5e6da40","c4b60f0e-35f7-494a-bda2-2aee587f80c5"]'::jsonb,
    '["문라이트","서스페리아","홀리 마운틴","네온 데몬","붉은 수수밭","러브레터","스프링 브레이커스","경계선","더 폴","가여운 것들"]'::jsonb,
    2,
    NULL,
    NULL
  ),
  (
    'theme_no_spoiler',
    '아무 정보 없이 보러 가세요',
    'static',
    '["133e0db6-84bd-4613-828a-e569ae9370ba","ff61351d-7b07-4c22-a7b1-3ee51ab2aa9c","ddb49697-d3fd-4fa9-b0fa-334343dff610","8b4e0b96-efdd-4d58-a2b1-ff17d05da420","c4b60f0e-35f7-494a-bda2-2aee587f80c5","7025d3f7-e1f9-4d1b-a7aa-fb078011a9f8","930f510b-a775-48eb-ab14-d8b63b9af2e5","f7fb5f72-6ad5-4c17-b282-9568a7aa342b","620e54e7-2b8a-4414-90f0-43a10adf1810"]'::jsonb,
    '["유주얼 서스펙트","겟 아웃","더 파더","서치","디 아더스","배니싱","돈 룩 나우","언컷 젬스","컨버세이션","램"]'::jsonb,
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
