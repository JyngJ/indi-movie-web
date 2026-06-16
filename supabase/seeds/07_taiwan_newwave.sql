-- 대만 뉴웨이브 큐레이션 리스트
-- 실행 순서: films_tab_curation_list.sql → add_curation_pending_titles.sql → 이 파일
--
-- 1편 매칭 (하나 그리고 둘) / 31편 pending

INSERT INTO curation_list (list_id, name_ko, type, member_ids, pending_titles, priority_tier, min_n)
VALUES
  (
    'movement_taiwan_new_wave',
    '대만 뉴웨이브',
    'static',
    '["54fe0415-950f-44af-a74f-98e3657958d1"]'::jsonb,
    '["광음적고사","아들의 큰 인형","펑쿠이에서 온 소년","해탄적일천","동동의 여름방학","동년왕사(유년시절)","타이페이 스토리","연연풍진","공포분자","나일의 딸","비정성시","고령가 소년 살인사건","청소년 나타","희몽인생","애정만세","독립시대","호남호녀","슈퍼 시티즌","남국재견","마작","하류","해상화","구멍","밀레니엄 맘보","거기는 지금 몇시니","카페 뤼미에르","안녕 용문객잔","쓰리 타임즈","흔들리는 구름","떠돌이 개","자객 섭은낭"]'::jsonb,
    2,
    NULL
  )
ON CONFLICT (list_id) DO UPDATE
  SET name_ko        = EXCLUDED.name_ko,
      member_ids     = EXCLUDED.member_ids,
      pending_titles = EXCLUDED.pending_titles;
