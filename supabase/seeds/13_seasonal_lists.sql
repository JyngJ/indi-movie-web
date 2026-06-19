-- 시즌 큐레이션 리스트: 크리스마스 / 연말 — Supabase SQL 에디터에서 실행
-- season_trigger: MM-DD 형식, 연도 교차 구간 지원 (12-20 ~ 01-10)
-- pending_titles: DB 미보유 영화 제목 — resolve-curation-pending 스크립트로 자동 편입

INSERT INTO curation_list (list_id, name_ko, type, member_ids, pending_titles, priority_tier, season_trigger, min_n)
VALUES
  (
    'seasonal_christmas',
    '크리스마스 영화',
    'static',
    '[]'::jsonb,
    '["모퉁이의 가게","세인트루이스에서 만나요","멋진 인생","34번가의 기적","크리스마스 캐럴","화이트 크리스마스","크리스마스 이야기","그렘린","바베트의 만찬","스크루지드","나 홀로 집에","러브 액츄얼리","엘프","홀리데이","클라우스"]'::jsonb,
    2,
    '{"start": "12-10", "end": "12-31"}'::jsonb,
    NULL
  ),
  (
    'seasonal_yearend',
    '연말에 보는 위대한 영화',
    'static',
    '[]'::jsonb,
    '["8과 2분의 1","2001 스페이스 오디세이","배리 린든","지옥의 묵시록","원스 어폰 어 타임 인 아메리카","고령가 소년 살인사건","하나 그리고 둘","희생","멜랑콜리아","쉰들러 리스트","영원과 하루","피아니스트","데어 윌 비 블러드","아이리시맨","전쟁과 평화"]'::jsonb,
    2,
    '{"start": "12-20", "end": "01-10"}'::jsonb,
    NULL
  )
ON CONFLICT (list_id) DO UPDATE
  SET pending_titles  = EXCLUDED.pending_titles,
      name_ko         = EXCLUDED.name_ko,
      season_trigger  = EXCLUDED.season_trigger;
