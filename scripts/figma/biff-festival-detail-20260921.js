// 부산국제영화제 상세 시안 (Scripter용) — 2026-09-21
//
// 2026-09-24 코드 구현에 맞춤: 포스터 흰 패널 · 극장 지도 · 날짜 탭(DetailDateTabs) · 모바일 극장 탭 ·
//   극장별 테두리 바둑판 · 옅은 러닝타임 안내. 화면 용어는 '상영관' 대신 '극장'(writing.ts 규범).
// 순서: 포스터 패널(설명 포함) → 극장 지도(지도 + 핀 + 선택 카드) → 상영 시간표(날짜 탭 · 관심 필터 ·
//       ‹ › 스크롤 · 극장/관 바둑판 · 회차 선택 카드). 라인업 섹션은 뺐다.
// 데이터: biff.kr 날짜별 시간표 10/10(토) 실제 101회차 + 작품 페이지 러닝타임(종료 시각).
// 지도: CARTO voyager 타일을 합성한 정적 이미지 — assets/biff-map-*.png (수신 서버 /asset 경유).
//
// 디자인 시스템 인스턴스: 2.0/DetailTopBar · Badge · Button · SectionHeader · DateCell · Chip ·
//   ScrollNavButton · FavoriteButton · BookingCTA · IconButton. 세트에 없는 것 두 개는 새로 그렸다:
//   · 2.0/FestivalScreeningCard (초안 세트) — 코드가 위, 제목이 크게. 기존 ShowtimeCell은 시각이 주인공이라 안 맞는다
//   · 2.0/TheaterPin — MapPin.tsx를 옮겨 디자인 시스템(08 · 지도 핀)에 정식 세트로 등록한다.
//     원래 있어야 했는데 포스터·GV 핀만 있었다. 시안의 지도 핀은 이 세트의 인스턴스다
// 색은 2.0 컬렉션 변수, 글자는 2.0 텍스트 스타일에 바인딩한다(_pin-common.md 규칙).
//
// idempotent — 같은 이름 섹션과 초안 세트를 지우고 다시 그린다. 되돌리기: ⌘Z.

const PAGE = 'Design System - work'
const DS_PAGE = 'Design System fixed'
const SECTION_NAME = '부산국제영화제 상세 시안 (2026-09-21)'
const CARD_SET = '2.0/FestivalScreeningCard (초안)'
const ASSET = 'http://127.0.0.1:8766/asset/'   // 8765는 portfolio-figma 수신 서버가 쓴다

const DATA = {"columns": [{"venue": "영화의전당", "screen": "하늘연극장"}, {"venue": "영화의전당", "screen": "중극장"}, {"venue": "영화의전당", "screen": "소극장"}, {"venue": "영화의전당", "screen": "시네마테크"}, {"venue": "영화의전당", "screen": "루프씨어터"}, {"venue": "CGV 센텀시티", "screen": "1관"}, {"venue": "CGV 센텀시티", "screen": "2관"}, {"venue": "CGV 센텀시티", "screen": "3관"}, {"venue": "CGV 센텀시티", "screen": "4관"}, {"venue": "CGV 센텀시티", "screen": "5관"}, {"venue": "CGV 센텀시티", "screen": "6관"}, {"venue": "CGV 센텀시티", "screen": "IMAX관"}, {"venue": "롯데시네마 센텀시티", "screen": "2관"}, {"venue": "롯데시네마 센텀시티", "screen": "3관"}, {"venue": "롯데시네마 센텀시티", "screen": "4관"}, {"venue": "롯데시네마 센텀시티", "screen": "5관"}, {"venue": "롯데시네마 센텀시티", "screen": "6관"}, {"venue": "롯데시네마 센텀시티", "screen": "7관"}, {"venue": "롯데시네마 센텀시티", "screen": "8관"}, {"venue": "롯데시네마 센텀시티", "screen": "9관"}, {"venue": "롯데시네마 센텀시티", "screen": "10관"}, {"venue": "영화진흥위원회 표준시사실", "screen": "표준시사실"}, {"venue": "동서대학교 소향씨어터", "screen": "우리은행홀"}, {"venue": "부산시청자미디어센터", "screen": "공개홀"}, {"venue": "신세계백화점 센텀시티점", "screen": "9층 문화홀"}, {"venue": "동서대학교 센텀캠퍼스", "screen": "4층 북카페 라운지"}], "venues": [{"name": "영화의전당", "address": "부산광역시 해운대구 수영강변대로 120 더블콘 4층 라이브러리", "screens": 5, "count": 20}, {"name": "CGV 센텀시티", "address": "부산광역시 해운대구 센텀남대로 35 7, 8층", "screens": 7, "count": 32}, {"name": "롯데시네마 센텀시티", "address": "부산광역시 해운대구 센텀남대로 59 롯데백화점", "screens": 9, "count": 38}, {"name": "영화진흥위원회 표준시사실", "address": "부산광역시 해운대구 수영강변대로 130", "screens": 1, "count": 1}, {"name": "동서대학교 소향씨어터", "address": "부산광역시 해운대구 센텀중앙로 55 소향씨어터 우리은행홀", "screens": 1, "count": 4}, {"name": "부산시청자미디어센터", "address": "부산광역시 해운대구 센텀중앙로 42 부산시청자미디어센터", "screens": 1, "count": 2}, {"name": "신세계백화점 센텀시티점", "address": "부산광역시 해운대구 센텀남대로 35", "screens": 1, "count": 3}, {"name": "동서대학교 센텀캠퍼스", "address": "부산광역시 해운대구 센텀중앙로 55", "screens": 1, "count": 1}], "screenings": [{"code": "325", "title": "바이올리니스트", "start": "20:00", "end": "21:54", "endMin": 1314, "venue": "영화의전당", "screen": "루프씨어터", "section": "오픈 시네마", "gv": true}, {"code": "265", "title": "재혼 황후", "start": "08:20", "end": "10:51", "endMin": 651, "venue": "영화의전당", "screen": "하늘연극장", "section": "온 스크린", "gv": true}, {"code": "266", "title": "힐롤", "start": "12:30", "end": "13:57", "endMin": 837, "venue": "영화의전당", "screen": "하늘연극장", "section": "경쟁", "gv": true}, {"code": "267", "title": "그날의 태주", "start": "16:00", "end": "18:24", "endMin": 1104, "venue": "영화의전당", "screen": "하늘연극장", "section": "경쟁", "gv": true}, {"code": "268", "title": "실버 익스프레스", "start": "20:30", "end": "22:07", "endMin": 1327, "venue": "영화의전당", "screen": "하늘연극장", "section": "경쟁", "gv": true}, {"code": "269", "title": "미드나잇 패션 3", "start": "23:59", "end": "01:25", "endMin": 1525, "venue": "영화의전당", "screen": "하늘연극장", "section": "월드 시네마", "gv": true}, {"code": "273", "title": "메리 크리스마스, 엄마", "start": "10:00", "end": "11:33", "endMin": 693, "venue": "영화의전당", "screen": "중극장", "section": "월드 시네마", "gv": true}, {"code": "271", "title": "백 투 부에노스아이레스", "start": "13:10", "end": "14:55", "endMin": 895, "venue": "영화의전당", "screen": "중극장", "section": "아이콘", "gv": true}, {"code": "270", "title": "그 소녀의 기억", "start": "16:30", "end": "18:27", "endMin": 1107, "venue": "영화의전당", "screen": "중극장", "section": "갈라 프레젠테이션", "gv": true}, {"code": "272", "title": "메트로폴리스", "start": "20:20", "end": "22:07", "endMin": 1327, "venue": "영화의전당", "screen": "중극장", "section": "특별기획 프로그램", "gv": true}, {"code": "296", "title": "조의 하루: 페드라 챕터", "start": "09:30", "end": "10:57", "endMin": 657, "venue": "영화의전당", "screen": "소극장", "section": "플래시 포워드", "gv": true}, {"code": "274", "title": "데드 엔드", "start": "12:30", "end": "13:58", "endMin": 838, "venue": "영화의전당", "screen": "소극장", "section": "비전", "gv": true}, {"code": "275", "title": "환상의 불빛", "start": "15:30", "end": "17:22", "endMin": 1042, "venue": "영화의전당", "screen": "소극장", "section": "비전", "gv": true}, {"code": "276", "title": "리아", "start": "19:00", "end": "20:35", "endMin": 1235, "venue": "영화의전당", "screen": "소극장", "section": "비전", "gv": true}, {"code": "277", "title": "라두 주데의 어느 하녀의 일기", "start": "22:20", "end": "23:54", "endMin": 1434, "venue": "영화의전당", "screen": "소극장", "section": "아이콘", "gv": false}, {"code": "739", "title": "실낙원", "start": "09:00", "end": "10:41", "endMin": 641, "venue": "영화의전당", "screen": "시네마테크", "section": "갈라 프레젠테이션", "gv": true}, {"code": "279", "title": "빵과 책", "start": "12:20", "end": "14:33", "endMin": 873, "venue": "영화의전당", "screen": "시네마테크", "section": "경쟁", "gv": true}, {"code": "280", "title": "더스트", "start": "16:00", "end": "17:20", "endMin": 1040, "venue": "영화의전당", "screen": "시네마테크", "section": "아이콘", "gv": true}, {"code": "281", "title": "검우강호", "start": "18:50", "end": "20:50", "endMin": 1250, "venue": "영화의전당", "screen": "시네마테크", "section": "특별기획 프로그램", "gv": false}, {"code": "282", "title": "내가 사랑한 빌 에반스", "start": "21:40", "end": "23:22", "endMin": 1402, "venue": "영화의전당", "screen": "시네마테크", "section": "월드 시네마", "gv": false}, {"code": "283", "title": "콜드 워 1994", "start": "09:00", "end": "10:57", "endMin": 657, "venue": "CGV 센텀시티", "screen": "IMAX관", "section": "특별상영", "gv": false}, {"code": "284", "title": "로마 엘라스티카", "start": "13:00", "end": "14:47", "endMin": 887, "venue": "CGV 센텀시티", "screen": "IMAX관", "section": "아이콘", "gv": true}, {"code": "285", "title": "에밀리아, 사랑을 기억하다", "start": "16:20", "end": "18:35", "endMin": 1115, "venue": "CGV 센텀시티", "screen": "IMAX관", "section": "아이콘", "gv": false}, {"code": "286", "title": "에코 체임버", "start": "19:30", "end": "21:33", "endMin": 1293, "venue": "CGV 센텀시티", "screen": "IMAX관", "section": "아이콘", "gv": true}, {"code": "287", "title": "파더랜드", "start": "23:00", "end": "00:22", "endMin": 1462, "venue": "CGV 센텀시티", "screen": "IMAX관", "section": "아이콘", "gv": false}, {"code": "289", "title": "화이트 록의 색깔", "start": "15:40", "end": "17:01", "endMin": 1021, "venue": "CGV 센텀시티", "screen": "1관", "section": "와이드 앵글", "gv": true}, {"code": "290", "title": "사적인 일에 관하여", "start": "18:40", "end": "20:15", "endMin": 1215, "venue": "CGV 센텀시티", "screen": "1관", "section": "아시아영화의 창", "gv": true}, {"code": "291", "title": "마이 마더", "start": "22:00", "end": "23:36", "endMin": 1416, "venue": "CGV 센텀시티", "screen": "1관", "section": "경쟁", "gv": false}, {"code": "292", "title": "야생 참나무의 꿈", "start": "09:40", "end": "10:59", "endMin": 659, "venue": "CGV 센텀시티", "screen": "2관", "section": "와이드 앵글", "gv": false}, {"code": "293", "title": "베이비 잭프루츠 베이비 구아바", "start": "12:40", "end": "14:23", "endMin": 863, "venue": "CGV 센텀시티", "screen": "2관", "section": "와이드 앵글", "gv": true}, {"code": "294", "title": "홈시크: 바다의 끝에서", "start": "16:00", "end": "17:23", "endMin": 1043, "venue": "CGV 센텀시티", "screen": "2관", "section": "와이드 앵글", "gv": true}, {"code": "295", "title": "청춘길일", "start": "19:00", "end": "20:52", "endMin": 1252, "venue": "CGV 센텀시티", "screen": "2관", "section": "와이드 앵글", "gv": true}, {"code": "288", "title": "오렌지 맛 웨딩", "start": "09:00", "end": "10:55", "endMin": 655, "venue": "CGV 센텀시티", "screen": "3관", "section": "아이콘", "gv": false}, {"code": "297", "title": "어둠 속의 새들", "start": "12:00", "end": "14:21", "endMin": 861, "venue": "CGV 센텀시티", "screen": "3관", "section": "비전", "gv": true}, {"code": "298", "title": "미몽", "start": "16:00", "end": "17:46", "endMin": 1066, "venue": "CGV 센텀시티", "screen": "3관", "section": "비전", "gv": true}, {"code": "299", "title": "부아", "start": "19:20", "end": "21:29", "endMin": 1289, "venue": "CGV 센텀시티", "screen": "3관", "section": "비전", "gv": true}, {"code": "300", "title": "한국 단편 경쟁 2", "start": "23:00", "end": "23:11", "endMin": 1391, "venue": "CGV 센텀시티", "screen": "3관", "section": "와이드 앵글", "gv": false}, {"code": "301", "title": "리커버리", "start": "09:20", "end": "10:37", "endMin": 637, "venue": "CGV 센텀시티", "screen": "4관", "section": "와이드 앵글", "gv": true}, {"code": "302", "title": "771일 후", "start": "12:10", "end": "13:21", "endMin": 801, "venue": "CGV 센텀시티", "screen": "4관", "section": "와이드 앵글", "gv": true}, {"code": "303", "title": "온 더 로드: 압바스 키아로스타미", "start": "15:20", "end": "16:48", "endMin": 1008, "venue": "CGV 센텀시티", "screen": "4관", "section": "와이드 앵글", "gv": true}, {"code": "304", "title": "어크로스: 전쟁은 어떻게 잊혀지는가", "start": "18:20", "end": "19:50", "endMin": 1190, "venue": "CGV 센텀시티", "screen": "4관", "section": "와이드 앵글", "gv": true}, {"code": "305", "title": "그날 밤, 클라리사에게", "start": "21:20", "end": "23:34", "endMin": 1414, "venue": "CGV 센텀시티", "screen": "4관", "section": "월드 시네마", "gv": false}, {"code": "306", "title": "멜트다운", "start": "09:00", "end": "10:50", "endMin": 650, "venue": "CGV 센텀시티", "screen": "5관", "section": "플래시 포워드", "gv": true}, {"code": "307", "title": "새", "start": "12:30", "end": "14:49", "endMin": 889, "venue": "CGV 센텀시티", "screen": "5관", "section": "비전", "gv": true}, {"code": "308", "title": "풀문", "start": "16:20", "end": "17:56", "endMin": 1076, "venue": "CGV 센텀시티", "screen": "5관", "section": "비전", "gv": true}, {"code": "309", "title": "우주의 흔적", "start": "19:30", "end": "21:16", "endMin": 1276, "venue": "CGV 센텀시티", "screen": "5관", "section": "비전", "gv": true}, {"code": "310", "title": "와줘서 고맙다는 거장의 인사", "start": "22:50", "end": "00:15", "endMin": 1455, "venue": "CGV 센텀시티", "screen": "5관", "section": "아이콘", "gv": false}, {"code": "311", "title": "블랙 볼", "start": "09:00", "end": "11:39", "endMin": 699, "venue": "CGV 센텀시티", "screen": "6관", "section": "플래시 포워드", "gv": false}, {"code": "312", "title": "오아시스", "start": "12:30", "end": "14:28", "endMin": 868, "venue": "CGV 센텀시티", "screen": "6관", "section": "플래시 포워드", "gv": true}, {"code": "313", "title": "블랙 처치 베이", "start": "16:00", "end": "17:47", "endMin": 1067, "venue": "CGV 센텀시티", "screen": "6관", "section": "플래시 포워드", "gv": true}, {"code": "314", "title": "이클립스", "start": "19:20", "end": "20:51", "endMin": 1251, "venue": "CGV 센텀시티", "screen": "6관", "section": "플래시 포워드", "gv": true}, {"code": "315", "title": "15/18", "start": "22:30", "end": "00:14", "endMin": 1454, "venue": "CGV 센텀시티", "screen": "6관", "section": "월드 시네마", "gv": false}, {"code": "316", "title": "수호전사: 황제의 마지막 비밀", "start": "09:20", "end": "11:35", "endMin": 695, "venue": "롯데시네마 센텀시티", "screen": "2관", "section": "아시아영화의 창", "gv": true}, {"code": "317", "title": "내 친구로 남아줄래?", "start": "13:30", "end": "15:11", "endMin": 911, "venue": "롯데시네마 센텀시티", "screen": "2관", "section": "아시아영화의 창", "gv": true}, {"code": "318", "title": "빙판 위의 새들", "start": "16:50", "end": "18:16", "endMin": 1096, "venue": "롯데시네마 센텀시티", "screen": "2관", "section": "아시아영화의 창", "gv": true}, {"code": "319", "title": "소울 위스퍼러", "start": "20:00", "end": "21:35", "endMin": 1295, "venue": "롯데시네마 센텀시티", "screen": "2관", "section": "아시아영화의 창", "gv": true}, {"code": "320", "title": "스페이스", "start": "09:00", "end": "11:20", "endMin": 680, "venue": "롯데시네마 센텀시티", "screen": "3관", "section": "비전", "gv": true}, {"code": "321", "title": "베일러", "start": "12:50", "end": "14:25", "endMin": 865, "venue": "롯데시네마 센텀시티", "screen": "3관", "section": "비전", "gv": true}, {"code": "322", "title": "극장에 두고 온 것들", "start": "16:00", "end": "17:57", "endMin": 1077, "venue": "롯데시네마 센텀시티", "screen": "3관", "section": "비전", "gv": true}, {"code": "323", "title": "사랑의 지평선 너머로", "start": "19:30", "end": "21:06", "endMin": 1266, "venue": "롯데시네마 센텀시티", "screen": "3관", "section": "비전", "gv": true}, {"code": "324", "title": "낮과 밤은 서로에게", "start": "22:40", "end": "00:00", "endMin": 1440, "venue": "롯데시네마 센텀시티", "screen": "3관", "section": "개·폐막작", "gv": false}, {"code": "347", "title": "장 물랭", "start": "09:20", "end": "11:33", "endMin": 693, "venue": "롯데시네마 센텀시티", "screen": "4관", "section": "아이콘", "gv": false}, {"code": "326", "title": "아시아 단편 경쟁 1", "start": "12:30", "end": "12:41", "endMin": 761, "venue": "롯데시네마 센텀시티", "screen": "4관", "section": "와이드 앵글", "gv": true}, {"code": "327", "title": "아시아 단편 경쟁 2", "start": "15:40", "end": "15:54", "endMin": 954, "venue": "롯데시네마 센텀시티", "screen": "4관", "section": "와이드 앵글", "gv": true}, {"code": "328", "title": "블루 나이트의 연인들", "start": "18:40", "end": "20:27", "endMin": 1227, "venue": "롯데시네마 센텀시티", "screen": "4관", "section": "아시아영화의 창", "gv": true}, {"code": "329", "title": "초대받지 않은 손님", "start": "22:10", "end": "23:49", "endMin": 1429, "venue": "롯데시네마 센텀시티", "screen": "4관", "section": "월드 시네마", "gv": false}, {"code": "330", "title": "흐르는 세월", "start": "09:00", "end": "10:39", "endMin": 639, "venue": "롯데시네마 센텀시티", "screen": "5관", "section": "와이드 앵글", "gv": true}, {"code": "331", "title": "58번째", "start": "12:20", "end": "13:45", "endMin": 825, "venue": "롯데시네마 센텀시티", "screen": "5관", "section": "와이드 앵글", "gv": true}, {"code": "332", "title": "김윤신은 미술관에 없다", "start": "15:30", "end": "17:00", "endMin": 1020, "venue": "롯데시네마 센텀시티", "screen": "5관", "section": "와이드 앵글", "gv": true}, {"code": "333", "title": "안녕, 스텔라", "start": "18:50", "end": "20:30", "endMin": 1230, "venue": "롯데시네마 센텀시티", "screen": "5관", "section": "와이드 앵글", "gv": true}, {"code": "334", "title": "시골 소년 가벵과 함께한 10년", "start": "22:10", "end": "23:55", "endMin": 1435, "venue": "롯데시네마 센텀시티", "screen": "5관", "section": "와이드 앵글", "gv": false}, {"code": "335", "title": "한국 단편 경쟁 1", "start": "09:20", "end": "09:40", "endMin": 580, "venue": "롯데시네마 센텀시티", "screen": "6관", "section": "와이드 앵글", "gv": true}, {"code": "336", "title": "한국 단편 경쟁 3", "start": "13:40", "end": "13:55", "endMin": 835, "venue": "롯데시네마 센텀시티", "screen": "6관", "section": "와이드 앵글", "gv": true}, {"code": "337", "title": "파리스 그린이 밝는 날에", "start": "16:40", "end": "17:55", "endMin": 1075, "venue": "롯데시네마 센텀시티", "screen": "6관", "section": "특별기획 프로그램", "gv": true}, {"code": "338", "title": "안개 속의 코끼리", "start": "19:30", "end": "21:18", "endMin": 1278, "venue": "롯데시네마 센텀시티", "screen": "6관", "section": "아시아영화의 창", "gv": true}, {"code": "339", "title": "여전히 찬란하게", "start": "09:40", "end": "11:38", "endMin": 698, "venue": "롯데시네마 센텀시티", "screen": "7관", "section": "한국영화의 오늘", "gv": false}, {"code": "340", "title": "파도 위에서 춤추는 여자", "start": "12:40", "end": "14:20", "endMin": 860, "venue": "롯데시네마 센텀시티", "screen": "7관", "section": "와이드 앵글", "gv": true}, {"code": "341", "title": "초원의 아가르", "start": "16:00", "end": "17:58", "endMin": 1078, "venue": "롯데시네마 센텀시티", "screen": "7관", "section": "와이드 앵글", "gv": false}, {"code": "342", "title": "불타는 거인들", "start": "19:40", "end": "21:38", "endMin": 1298, "venue": "롯데시네마 센텀시티", "screen": "7관", "section": "아시아영화의 창", "gv": true}, {"code": "343", "title": "라 페라", "start": "10:30", "end": "12:23", "endMin": 743, "venue": "롯데시네마 센텀시티", "screen": "8관", "section": "월드 시네마", "gv": false}, {"code": "344", "title": "노래가 끝난 후", "start": "13:30", "end": "15:03", "endMin": 903, "venue": "롯데시네마 센텀시티", "screen": "8관", "section": "비전", "gv": false}, {"code": "345", "title": "영웅은 아니지만", "start": "16:00", "end": "17:38", "endMin": 1058, "venue": "롯데시네마 센텀시티", "screen": "8관", "section": "아시아영화의 창", "gv": false}, {"code": "346", "title": "마키키란 포", "start": "19:00", "end": "21:31", "endMin": 1291, "venue": "롯데시네마 센텀시티", "screen": "8관", "section": "아이콘", "gv": false}, {"code": "348", "title": "로즈", "start": "13:20", "end": "14:54", "endMin": 894, "venue": "롯데시네마 센텀시티", "screen": "9관", "section": "월드 시네마", "gv": false}, {"code": "349", "title": "갑자기 병세가 악화되다", "start": "16:00", "end": "19:16", "endMin": 1156, "venue": "롯데시네마 센텀시티", "screen": "9관", "section": "아이콘", "gv": false}, {"code": "350", "title": "필리피냐나", "start": "20:20", "end": "22:00", "endMin": 1320, "venue": "롯데시네마 센텀시티", "screen": "9관", "section": "아시아영화의 창", "gv": false}, {"code": "351", "title": "전쟁의 새들", "start": "11:00", "end": "12:25", "endMin": 745, "venue": "롯데시네마 센텀시티", "screen": "10관", "section": "와이드 앵글", "gv": false}, {"code": "352", "title": "첫세계", "start": "14:00", "end": "15:55", "endMin": 955, "venue": "롯데시네마 센텀시티", "screen": "10관", "section": "한국영화의 오늘", "gv": false}, {"code": "353", "title": "바람의 빛깔", "start": "17:00", "end": "18:29", "endMin": 1109, "venue": "롯데시네마 센텀시티", "screen": "10관", "section": "와이드 앵글", "gv": false}, {"code": "354", "title": "나무는 태어난 곳에서 죽는다", "start": "19:30", "end": "21:23", "endMin": 1283, "venue": "롯데시네마 센텀시티", "screen": "10관", "section": "와이드 앵글", "gv": false}, {"code": "355", "title": "마리가 뭐 어때서", "start": "19:00", "end": "21:06", "endMin": 1266, "venue": "영화진흥위원회 표준시사실", "screen": "표준시사실", "section": "월드 시네마", "gv": true}, {"code": "814", "title": "[마스터 클래스] 베르트랑 만디코, 와일드 시네마의 마술사", "start": "11:00", "end": null, "endMin": null, "venue": "신세계백화점 센텀시티점", "screen": "9층 문화홀", "section": "행사", "gv": false}, {"code": "813", "title": "[마스터 클래스] 린타로, 일본 애니메이션의 살아 있는 역사", "start": "14:00", "end": null, "endMin": null, "venue": "신세계백화점 센텀시티점", "screen": "9층 문화홀", "section": "행사", "gv": false}, {"code": "806", "title": "액터스 하우스: 신민아", "start": "17:00", "end": null, "endMin": null, "venue": "신세계백화점 센텀시티점", "screen": "9층 문화홀", "section": "행사", "gv": false}, {"code": "356", "title": "에브리타임", "start": "10:00", "end": "12:04", "endMin": 724, "venue": "동서대학교 소향씨어터", "screen": "우리은행홀", "section": "월드 시네마", "gv": false}, {"code": "357", "title": "텐더 러빙 케어", "start": "13:10", "end": "14:57", "endMin": 897, "venue": "동서대학교 소향씨어터", "screen": "우리은행홀", "section": "아이콘", "gv": false}, {"code": "358", "title": "와일드 호스 나인", "start": "16:20", "end": "18:16", "endMin": 1096, "venue": "동서대학교 소향씨어터", "screen": "우리은행홀", "section": "아이콘", "gv": false}, {"code": "359", "title": "슬픔의 벨라돈나", "start": "19:20", "end": "20:47", "endMin": 1247, "venue": "동서대학교 소향씨어터", "screen": "우리은행홀", "section": "특별기획 프로그램", "gv": false}, {"code": "360", "title": "약속된 공간", "start": "10:00", "end": "11:18", "endMin": 678, "venue": "부산시청자미디어센터", "screen": "공개홀", "section": "아시아영화의 창", "gv": true}, {"code": "361", "title": "우리, 파도처럼", "start": "20:30", "end": "22:01", "endMin": 1321, "venue": "부산시청자미디어센터", "screen": "공개홀", "section": "월드 시네마", "gv": false}, {"code": "822", "title": "[씨네 클래스] 세이폴라 사마디안, 압바스 키아로스타미의 촬영감독이자 친구로 함께한 30년", "start": "19:00", "end": null, "endMin": null, "venue": "동서대학교 센텀캠퍼스", "screen": "4층 북카페 라운지", "section": "행사", "gv": false}], "likedCodes": ["289", "271"], "selectedCode": "266", "selectedDate": "2026-10-10", "days": [{"date": "2026-10-06", "day": 6, "dow": "화", "top": "개막", "red": false}, {"date": "2026-10-07", "day": 7, "dow": "수", "top": "수", "red": false}, {"date": "2026-10-08", "day": 8, "dow": "목", "top": "목", "red": false}, {"date": "2026-10-09", "day": 9, "dow": "금", "top": "금", "red": true}, {"date": "2026-10-10", "day": 10, "dow": "토", "top": "토", "red": false}, {"date": "2026-10-11", "day": 11, "dow": "일", "top": "일", "red": true}, {"date": "2026-10-12", "day": 12, "dow": "월", "top": "월", "red": false}, {"date": "2026-10-13", "day": 13, "dow": "화", "top": "화", "red": false}, {"date": "2026-10-14", "day": 14, "dow": "수", "top": "수", "red": false}, {"date": "2026-10-15", "day": 15, "dow": "목", "top": "폐막", "red": false}], "pins": {"desktop": [{"name": "영화의전당", "x": 373.0, "y": 322.2}, {"name": "CGV 센텀시티", "x": 558.6, "y": 579.8}, {"name": "롯데시네마 센텀시티", "x": 743.3, "y": 468.4}, {"name": "영화진흥위원회 표준시사실", "x": 256.7, "y": 222.6}, {"name": "동서대학교 소향씨어터", "x": 417.4, "y": 101.8}, {"name": "부산시청자미디어센터", "x": 661.4, "y": 160.5}, {"name": "신세계백화점 센텀시티점", "x": 614.4, "y": 581.6}, {"name": "동서대학교 센텀캠퍼스", "x": 440.6, "y": 74.4}], "mobile": [{"name": "영화의전당", "x": 115.5, "y": 185.1}, {"name": "CGV 센텀시티", "x": 208.3, "y": 313.9}, {"name": "롯데시네마 센텀시티", "x": 300.7, "y": 258.2}, {"name": "영화진흥위원회 표준시사실", "x": 57.3, "y": 135.3}, {"name": "동서대학교 소향씨어터", "x": 137.7, "y": 74.9}, {"name": "부산시청자미디어센터", "x": 259.7, "y": 104.3}, {"name": "신세계백화점 센텀시티점", "x": 236.2, "y": 314.8}, {"name": "동서대학교 센텀캠퍼스", "x": 149.3, "y": 61.2}]}, "notes": ["잔여석은 표시하지 않았어요 — biff.kr 시간표엔 좌석 정보가 없고, 예매는 ticket.biff.kr(로그인 필요한 예매 시스템)이라 수집 대상이 아니에요", "10월 9일(금)은 한글날이라 일요일 색(공휴일)으로 칠했어요. 개막·폐막 날은 요일 대신 개막/폐막을 써요", "회차 코드는 primary/700로 칠했어요. 참고 이미지처럼 빨강으로 가면 에러·매진 색과 겹쳐요", "종료 시각은 biff.kr 작품 페이지 러닝타임으로 계산해요(10/10 기준 97/101). 행사(마스터 클래스 등)는 러닝타임이 없어 시작 시각만", "카드 세로 위치 = 시작 시각(분당 1px). 같은 관에서 앞 카드와 겹치면 아래로 민다 — 같은 가로줄이 같은 시각", "관심 표시: 극장(지도 핀·바둑판 극장 줄 하트)과 회차(카드 우상단 하트) 두 종류. \"관심 표시한 것만 보기\"는 둘 다 걸러요", "신세계 문화홀·동서대 센텀캠퍼스는 각각 CGV·소향씨어터와 같은 건물이라 라벨을 숨겼어요. 코드에선 labelOffset으로 비켜요", "CGV·롯데는 극장 상세로 가면 평소 회차가 비어 있어요 — 선택 카드의 \"이 극장 시간표 보기\"는 바둑판을 그 극장으로 스크롤하는 동작으로 제안해요", "2.0/TheaterPin을 08 · 지도 핀에 새로 등록했어요(MapPin.tsx 실측). 코드의 하드코딩 색(오라 옛 파랑·흐린 점 #6B7280·라벨 #111·선택 그림자)은 토큰으로 바꿔 옮겼어요 — 구현 때 MapPin.tsx도 같은 토큰으로 맞춰요"]}

/* ── 폰트 ───────────────────────────────────────────────────── */
for (const st of ['Regular', 'Medium', 'SemiBold', 'Bold']) {
  try { await figma.loadFontAsync({ family: 'Pretendard', style: st }) } catch (e) { console.log('폰트 없음:', st) }
}
await figma.loadAllPagesAsync()

/* ── 변수 · 스타일 ──────────────────────────────────────────── */
const hex = h => { const n = parseInt(h.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 } }
const VARS = {}
try {
  const cols = await figma.variables.getLocalVariableCollectionsAsync()
  const col = cols.find(c => c.name === '영화볼지도 색상 - 2.0')
  for (const v of await figma.variables.getLocalVariablesAsync('COLOR')) {
    if (col && v.variableCollectionId === col.id) VARS[v.name] = v
  }
  console.log('완료: 색 변수', Object.keys(VARS).length)
} catch (e) { console.log('실패: 색 변수 —', e.message) }

// 변수 이름 → 대체 hex (변수를 못 찾아도 색은 맞게 나오도록)
const HEX = {
  'white': '#FFFFFF', 'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/700': '#58524B', 'neutral/800': '#2B2622', 'neutral/900': '#0C0A08',
  'primary/100': '#ECEFF9', 'primary/500': '#6D7CB0', 'primary/700': '#404E81', 'neutral/400': '#A7A19A', 'error/700': '#BD4E4C', 'error/900': '#9B3331', 'gv/900': '#3E1782',
}
function paint(name, opacity = 1) {
  const p = { type: 'SOLID', color: hex(HEX[name] || '#FF00FF'), opacity }
  const v = VARS[name]
  return v ? figma.variables.setBoundVariableForPaint(p, 'color', v) : p
}
const fillV = (n, name, o) => { n.fills = [paint(name, o)] }
const strokeV = (n, name, w = 1) => { n.strokes = [paint(name)]; n.strokeWeight = w; n.strokeAlign = 'INSIDE' }

const TS = {}
for (const s of await figma.getLocalTextStylesAsync()) TS[s.name] = s
const ES = {}
for (const s of await figma.getLocalEffectStylesAsync()) ES[s.name] = s

async function T(chars, style, color = 'neutral/900', width, opts = {}) {
  const t = figma.createText()
  t.fontName = { family: 'Pretendard', style: 'Regular' }
  t.characters = chars
  if (TS[style]) await t.setTextStyleIdAsync(TS[style].id)
  else console.log('텍스트 스타일 없음:', style)
  if (opts.weight) t.fontName = { family: 'Pretendard', style: opts.weight }
  if (opts.size) t.fontSize = opts.size
  fillV(t, color)
  if (width) { t.textAutoResize = 'HEIGHT'; t.resize(width, t.height) } else t.textAutoResize = 'WIDTH_AND_HEIGHT'
  if (opts.lines) { t.textTruncation = 'ENDING'; t.maxLines = opts.lines }
  return t
}
async function shadow(n, name) { if (ES[name]) await n.setEffectStyleIdAsync(ES[name].id) }

/* ── 오토레이아웃 헬퍼 ──────────────────────────────────────── */
function A(name, dir, gap = 0, pad = [0, 0, 0, 0], opts = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = dir
  f.itemSpacing = gap
  ;[f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = pad
  f.fills = []
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.counterAxisAlignItems = opts.cross || 'MIN'
  f.primaryAxisAlignItems = opts.main || 'MIN'
  f.clipsContent = false
  if (opts.w) { f.resize(opts.w, Math.max(1, f.height)); if (dir === 'HORIZONTAL') f.primaryAxisSizingMode = 'FIXED'; else f.counterAxisSizingMode = 'FIXED' }
  return f
}
function box(name, w, h) {   // 좌표 배치용 일반 프레임
  const f = figma.createFrame()
  f.name = name
  f.resize(w, h)
  f.fills = []
  f.clipsContent = true
  return f
}
function put(parent, child, x, y) { parent.appendChild(child); child.x = x; child.y = y; return child }
function absolute(parent, child, x, y) { parent.appendChild(child); child.layoutPositioning = 'ABSOLUTE'; child.x = x; child.y = y; return child }

/* ── 디자인 시스템 인스턴스 ─────────────────────────────────── */
const dsPage = figma.root.children.find(p => p.name === DS_PAGE)
const SETS = {}
const COMPS = {}
{
  const stack = [...dsPage.children]
  while (stack.length) {
    const n = stack.pop()
    if (n.type === 'COMPONENT_SET') { SETS[n.name] = n; continue }
    if (n.type === 'COMPONENT') COMPS[n.name] = n
    if ('children' in n) stack.push(...n.children)
  }
}
function inst(setName, props = {}) {
  const set = SETS[setName]
  if (!set) {
    const c = COMPS[setName]
    if (c) return c.createInstance()
    throw new Error('세트 없음: ' + setName)
  }
  const want = Object.entries(props)
  const v = set.children.find(c => want.every(([k, val]) => c.name.split(', ').includes(`${k}=${val}`)))
  if (!v) throw new Error(`배리언트 없음: ${setName} ${JSON.stringify(props)}`)
  return v.createInstance()
}
/** 인스턴스 안 텍스트를 순서(0,1,…) 또는 기존 글자로 찾아 바꾼다 */
async function setTexts(node, pairs) {
  const texts = node.findAll(n => n.type === 'TEXT')
  for (const [key, val] of pairs) {
    const t = typeof key === 'number' ? texts[key] : texts.find(x => x.characters === key)
    if (!t) { console.log('텍스트 못 찾음:', node.name, key); continue }
    for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f)
    t.characters = val
  }
}
/** 인스턴스 안 아이콘을 다른 2.0/icon 으로 바꾼다 */
function swapIcon(node, iconName) {
  const icon = node.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('2.0/icon/'))
  const comp = COMPS['2.0/icon/' + iconName]
  if (icon && comp) icon.swapComponent(comp)
  else console.log('아이콘 교체 못 함:', iconName)
}

/* ── 이미지 ─────────────────────────────────────────────────── */
async function assetFill(name) {
  const res = await fetch(ASSET + name)
  const img = figma.createImage(new Uint8Array(await res.arrayBuffer()))
  return [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }]
}

/* ── 데이터 가공 ────────────────────────────────────────────── */
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
const fmt = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const COLUMNS = DATA.columns            // [{ venue, screen }]
const VENUES = DATA.venues              // 극장 순서 + 좌표 + 주소
const SCREENINGS = DATA.screenings
const LIKED_VENUES = new Set(['영화의전당', '롯데시네마 센텀시티'])
const LIKED_CODES = new Set(DATA.likedCodes)
const SELECTED_CODE = DATA.selectedCode

/* ═══ 1. 회차 카드 초안 세트 ═════════════════════════════════════ */
const CARD_W = 152
async function screeningCard(s, state) {
  const card = A('FestivalScreeningCard', 'VERTICAL', 4, [12, 12, 12, 12], { w: CARD_W })
  card.cornerRadius = 12
  fillV(card, 'white')
  if (state === 'selected') { strokeV(card, 'primary/700', 2); await shadow(card, '2.0/shadow/md') }
  else strokeV(card, 'neutral/200', 1)

  const code = await T(s.code, '2.0/meta', 'primary/700', undefined, { weight: 'Bold' })
  code.name = 'code'
  card.appendChild(code)

  const title = await T(s.title, '2.0/body-strong', 'neutral/900', CARD_W - 24 - (state === 'liked' ? 20 : 0), { lines: 2 })
  title.name = 'title'
  card.appendChild(title)

  const time = A('time', 'HORIZONTAL', 4, [2, 0, 0, 0], { cross: 'BASELINE' })
  time.appendChild(await T(s.start, '2.0/num/time', 'neutral/800'))
  if (s.end) time.appendChild(await T('–' + s.end, '2.0/meta', 'neutral/500'))
  card.appendChild(time)

  const meta = A('meta', 'HORIZONTAL', 4, [0, 0, 0, 0], { cross: 'CENTER' })
  if (s.gv) {
    const gv = A('GvBadge', 'HORIZONTAL', 0, [0, 4, 0, 4], { cross: 'CENTER' })
    gv.cornerRadius = 4
    fillV(gv, 'gv/900')
    gv.appendChild(await T('GV', '2.0/label', 'white', undefined, { weight: 'Bold' }))
    meta.appendChild(gv)
  }
  if (s.section) meta.appendChild(await T(s.section, '2.0/label', 'neutral/500'))
  if (meta.children.length) card.appendChild(meta)

  if (state === 'liked') {
    const fav = inst('2.0/FavoriteButton', { Variant: 'ghost', State: 'on', Size: '32' })
    absolute(card, fav, CARD_W - 32 - 2, 2)
  }
  return card
}

try {
  // 기존 초안 세트 정리
  for (const p of figma.root.children) {
    for (const n of p.findAll(n => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === CARD_SET)) n.remove()
  }
  console.log('완료: 기존 카드 초안 정리')
} catch (e) { console.log('실패: 카드 초안 정리 —', e.message) }

/* ═══ 섹션 · 루트 ══════════════════════════════════════════════ */
const page = figma.root.children.find(p => p.name === PAGE)
await figma.setCurrentPageAsync(page)
const oldSec = page.children.find(n => n.type === 'SECTION' && n.name === SECTION_NAME)
let sx = 0, sy = 0
if (oldSec) { sx = oldSec.x; sy = oldSec.y; oldSec.remove() }
else {
  const others = page.children.filter(n => n.type === 'SECTION')
  sy = others.length ? Math.max(...others.map(s => s.y + s.height)) + 400 : 0
}
const section = figma.createSection()
section.name = SECTION_NAME
page.appendChild(section)
section.x = sx; section.y = sy

const root = A('root', 'HORIZONTAL', 120, [120, 120, 120, 120])
fillV(root, 'neutral/200')
section.appendChild(root)
root.x = sx; root.y = sy

async function label(parent, text, sub) {
  const col = A('label', 'VERTICAL', 4)
  col.appendChild(await T(text, '2.0/title', 'neutral/900', undefined, { size: 24 }))
  if (sub) col.appendChild(await T(sub, '2.0/meta', 'neutral/600', 900))
  parent.appendChild(col)
}

/* 카드 세트 */
let cardSet = null
try {
  const col = A('카드 초안', 'VERTICAL', 24)
  await label(col, '2.0/FestivalScreeningCard (초안)', '코드 → 제목(2줄) → 시작–종료 → GV·섹션. 관심 표시는 우상단 하트, 선택은 primary 2px + shadow md')
  root.appendChild(col)
  const sample = SCREENINGS.find(s => s.gv && s.end) || SCREENINGS[0]
  const nodes = []
  for (const st of ['default', 'liked', 'selected']) {
    const c = await screeningCard(sample, st)
    c.name = `State=${st}`
    col.appendChild(c)
    nodes.push(c)
  }
  const comps = nodes.map(n => figma.createComponentFromNode(n))
  cardSet = figma.combineAsVariants(comps, col)
  cardSet.name = CARD_SET
  cardSet.layoutMode = 'HORIZONTAL'
  cardSet.itemSpacing = 24
  cardSet.paddingTop = cardSet.paddingBottom = cardSet.paddingLeft = cardSet.paddingRight = 24
  cardSet.primaryAxisSizingMode = 'AUTO'; cardSet.counterAxisSizingMode = 'AUTO'
  cardSet.counterAxisAlignItems = 'MIN'
  fillV(cardSet, 'neutral/100')
  console.log('완료: 카드 초안 세트')
} catch (e) { console.log('실패: 카드 초안 세트 —', e.message) }

/** 카드 인스턴스 — 세트에서 배리언트를 골라 글자만 바꾼다 */
async function cardInstance(s) {
  const state = s.code === SELECTED_CODE ? 'selected' : LIKED_CODES.has(s.code) ? 'liked' : 'default'
  if (!cardSet) return screeningCard(s, state)
  const v = cardSet.children.find(c => c.name === `State=${state}`)
  const i = v.createInstance()
  await setTexts(i, [[0, s.code], [1, s.title], [2, s.start]])
  const texts = i.findAll(n => n.type === 'TEXT')
  const endT = texts.find(t => t.characters.startsWith('–'))
  if (endT) { if (s.end) await setTexts(i, [[endT.characters, '–' + s.end]]); else endT.visible = false }
  const gv = i.findOne(n => n.name === 'GvBadge')
  if (gv) gv.visible = !!s.gv
  const sec = texts[texts.length - 1]
  if (sec && sec.characters !== 'GV' && !sec.characters.startsWith('–')) {
    if (s.section) await setTexts(i, [[sec.characters, s.section]]); else sec.visible = false
  }
  return i
}

/* ═══ 2. 극장 핀 — 2.0/TheaterPin 세트를 디자인 시스템에 등록 ══════════ */
// 원본: src/components/domain/MapPin.tsx (2026-09-21 기준) — 하드코딩 값은 토큰으로 바꿔 옮긴다(2026-09-21 결정).
//   · 라벨 KIMM Bold 13 neutral/900 (코드 #111) + 흰 외곽선 + 2.0/shadow/pin (코드 0 2 6 rgba(0,0,0,.25)), 라벨–점 간격 2
//   · 점 22 · primary/700 · 테두리 2 neutral/100 · 2.0/shadow/pin
//   · 선택: 테두리 2.5 white + 바깥 링 2.5 primary/700 + 2.0/shadow/pin + 오라 44 primary/700 25%
//     (코드 오라는 옛 파랑 rgba(74,99,128,.25), 그림자 0 2 8 rgba(0,0,0,.28))
//   · 관심 극장: 원 neutral/100(선택 시 white) 안에 error/700 원(반지름 9, 선택 8.5) + 흰 하트 11 (y +0.5)
//   · 흐림: 점 neutral/500 (코드 #6B7280), 하트 숨김
// 코드(MapPin.tsx)도 같은 토큰으로 맞춰야 한다 — 구현 단계에서 같이 바꾼다.
// MapView는 favorite를 'movie'→'none', 'both'→'theater'로 바꿔 넘긴다 — 지도에선 관심 영화 뱃지가 안 나와서 축에서 뺐다.
const PIN_SET = '2.0/TheaterPin'
const HEART_PATH = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
let pinSet = null
let PIN_LABEL_KEY = null
let pinFont = { family: 'Pretendard', style: 'Bold' }
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }); pinFont = { family: 'KIMM_Bold', style: 'B' } }
catch (e) { console.log('KIMM_Bold 없음 — Pretendard Bold로 대체') }

/** 선택 링 — 번짐 없는 spread 그림자. 색은 primary/700 변수에 바인딩 */
function ringFx() {
  const fx = { type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL', showShadowBehindNode: false,
    offset: { x: 0, y: 0 }, radius: 0, spread: 2.5, color: { ...hex(HEX['primary/700']), a: 1 } }
  const v = VARS['primary/700']
  return v ? figma.variables.setBoundVariableForEffect(fx, 'color', v) : fx
}
/** 2.0/shadow/pin 효과 목록 — 링과 합쳐야 해서 스타일 대신 값을 복사한다 */
const PIN_SHADOW = ES['2.0/shadow/pin'] ? [...ES['2.0/shadow/pin'].effects] : []
async function pinShadow(n, withRing) {
  if (withRing) n.effects = [...PIN_SHADOW, ringFx()]
  else await shadow(n, '2.0/shadow/pin')
}

async function pinVariant({ selected, favorite, dimmed }) {
  const DOT = 22
  const f = A(`Selected=${selected}, Favorite=${favorite}, Dimmed=${dimmed}`, 'VERTICAL', 2, [0, 0, 0, 0], { cross: 'CENTER' })

  const t = figma.createText()
  t.fontName = pinFont
  t.characters = '영화의전당'
  t.fontSize = 13
  t.lineHeight = { unit: 'PERCENT', value: 120 }
  fillV(t, 'neutral/900')
  t.strokes = [paint('white')]; t.strokeWeight = 3; t.strokeAlign = 'OUTSIDE'; t.strokeJoin = 'ROUND'
  await shadow(t, '2.0/shadow/pin')
  t.name = 'label'
  f.appendChild(t)

  const dotBox = box('dot', DOT, DOT)
  dotBox.clipsContent = false
  const favTheater = favorite === 'theater' && !dimmed
  if (selected) {
    const aura = figma.createEllipse(); aura.resize(44, 44); aura.name = 'aura'
    fillV(aura, 'primary/700', 0.25)
    put(dotBox, aura, -11, -11)
  }
  if (favTheater) {
    if (selected) { const ring = figma.createEllipse(); ring.resize(DOT + 3, DOT + 3); fillV(ring, 'primary/700'); ring.name = 'ring'; put(dotBox, ring, -1.5, -1.5) }
    const outer = figma.createEllipse(); outer.resize(DOT, DOT); fillV(outer, selected ? 'white' : 'neutral/100'); outer.name = 'rim'
    await pinShadow(outer, false)
    put(dotBox, outer, 0, 0)
    const r = DOT / 2 - (selected ? 2.5 : 2)
    const inner = figma.createEllipse(); inner.resize(r * 2, r * 2); fillV(inner, 'error/700'); inner.name = 'fill'
    put(dotBox, inner, DOT / 2 - r, DOT / 2 - r)
    const heart = figma.createNodeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#FFFFFF" d="${HEART_PATH}"/></svg>`)
    heart.resize(11, 11); heart.name = 'heart'
    put(dotBox, heart, DOT / 2 - 5.5, DOT / 2 - 5.5 + 0.5)
  } else {
    const dot = figma.createEllipse(); dot.resize(DOT, DOT); dot.name = 'fill'
    fillV(dot, dimmed ? 'neutral/500' : 'primary/700')
    strokeV(dot, selected ? 'white' : 'neutral/100', selected ? 2.5 : 2)
    await pinShadow(dot, selected)
    put(dotBox, dot, 0, 0)
  }
  f.appendChild(dotBox)
  return f
}

try {
  // 기존 세트·그룹 정리
  for (const n of dsPage.findAll(n => (n.type === 'COMPONENT_SET' && n.name === PIN_SET) || (n.type === 'FRAME' && n.name === '극장 핀'))) n.remove()
  const sec08 = dsPage.children.find(n => n.type === 'SECTION' && n.name === '08 · 지도 핀')
  if (!sec08) throw new Error('08 · 지도 핀 섹션 없음')

  const group = A('극장 핀', 'VERTICAL', 16, [64, 64, 64, 64])
  fillV(group, 'white')
  const head = A('head', 'VERTICAL', 4)
  head.appendChild(await T('극장 핀 · 2.0/TheaterPin', '2.0/title', 'neutral/900', undefined, { size: 20 }))
  head.appendChild(await T('src/components/domain/MapPin.tsx 실측 · 축 = Selected × Favorite(none/theater) × Dimmed · 라벨은 텍스트 속성, 겹침은 코드가 labelOffset으로 비킨다', '2.0/meta', 'neutral/600', 720))
  group.appendChild(head)

  const variants = []
  for (const dimmed of [false, true]) for (const favorite of ['none', 'theater']) for (const selected of [false, true]) {
    if (dimmed && selected) continue   // 흐린 핀은 선택되지 않는다(필터 밖 극장)
    variants.push(await pinVariant({ selected, favorite, dimmed }))
  }
  for (const v of variants) group.appendChild(v)
  const comps = variants.map(v => figma.createComponentFromNode(v))
  pinSet = figma.combineAsVariants(comps, group)
  pinSet.name = PIN_SET
  pinSet.layoutMode = 'HORIZONTAL'
  pinSet.itemSpacing = 48
  pinSet.paddingTop = pinSet.paddingBottom = 40
  pinSet.paddingLeft = pinSet.paddingRight = 48
  pinSet.primaryAxisSizingMode = 'AUTO'; pinSet.counterAxisSizingMode = 'AUTO'
  pinSet.counterAxisAlignItems = 'MAX'
  pinSet.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: (await assetFill('biff-map-mobile.png'))[0].imageHash }]
  PIN_LABEL_KEY = pinSet.addComponentProperty('라벨', 'TEXT', '영화의전당')
  for (const c of pinSet.children) {
    const t = c.findOne(n => n.type === 'TEXT' && n.name === 'label')
    if (t) t.componentPropertyReferences = { characters: PIN_LABEL_KEY }
  }

  // 섹션 안 기존 그룹들 아래에 붙인다 — 섹션 자식 좌표는 페이지 절대 좌표
  const kids = sec08.children.filter(n => n !== group)
  const left = Math.min(...kids.map(n => n.x))
  const bottom = Math.max(...kids.map(n => n.y + n.height))
  sec08.appendChild(group)
  group.x = left
  group.y = bottom + 64
  const needW = Math.max(sec08.width, group.x - sec08.x + group.width + 64)
  const needH = Math.max(sec08.height, group.y - sec08.y + group.height + 64)
  sec08.resizeWithoutConstraints(needW, needH)
  console.log('완료: 2.0/TheaterPin 세트 등록 (08 · 지도 핀)')
} catch (e) { console.log('실패: 2.0/TheaterPin —', e.message) }

/** 지도 위 핀 — 점 중심이 (x, y)에 오도록 놓는다 */
function theaterPin(label, { selected, liked, showLabel = true }) {
  if (!pinSet) throw new Error('TheaterPin 세트 없음')
  const v = pinSet.children.find(c => c.name === `Selected=${!!selected}, Favorite=${liked ? 'theater' : 'none'}, Dimmed=false`)
  const i = v.createInstance()
  i.setProperties({ [PIN_LABEL_KEY]: label })
  if (!showLabel) { const t = i.findOne(n => n.name === 'label'); if (t) t.visible = false }
  return i
}

/* ═══ 3. 화면 조각 ═════════════════════════════════════════════ */
async function topBar(w) {
  const bar = inst('2.0/DetailTopBar')
  bar.resize(w, bar.height)
  const texts = bar.findAll(n => n.type === 'TEXT').map(t => t.characters)
  // 브레드크럼 앞칸 · 현재명만 바꾼다
  if (texts.length >= 3) await setTexts(bar, [[0, '영화제'], [2, '제31회 부산국제영화제']])
  return bar
}

/** 상단 — 영화 상세처럼 포스터 + 흰 패널(DetailKeyPanel). 모바일은 풀블리드, PC는 radius/sheet */
async function posterHero(w, isDesktop) {
  const panel = A('DetailKeyPanel (포스터)', 'HORIZONTAL', isDesktop ? 32 : 16, isDesktop ? [32, 32, 32, 32] : [24, 16, 24, 16], { w })
  fillV(panel, 'white')
  if (isDesktop) panel.cornerRadius = 20
  const pw = isDesktop ? 200 : 100, ph = isDesktop ? 300 : 150
  const poster = box('poster/부산국제영화제', pw, ph)
  poster.cornerRadius = 2
  poster.fills = await assetFill('biff31-poster.png')
  panel.appendChild(poster)
  panel.appendChild(await info(w - pw - (isDesktop ? 32 + 64 : 16 + 32), isDesktop, true))
  return panel
}

async function banner(w, h) {
  const b = A('Banner (이미지 없음 → 이름 띠)', 'HORIZONTAL', 0, [0, 0, 0, 0], { main: 'CENTER', cross: 'CENTER', w })
  b.counterAxisSizingMode = 'FIXED'; b.resize(w, h)
  fillV(b, 'neutral/200')
  b.appendChild(await T('제31회 부산국제영화제', '2.0/title', 'neutral/900', undefined, { size: h > 150 ? 32 : 24 }))
  return b
}

async function info(w, isDesktop, inPanel = false) {
  const col = A('설명', 'VERTICAL', 12, inPanel ? [0, 0, 0, 0] : [isDesktop ? 32 : 24, 16, 8, 16], { w })
  const row = A('status', 'HORIZONTAL', 8, [0, 0, 0, 0], { cross: 'CENTER' })
  const badge = inst('2.0/Badge', { Variant: 'warning' })
  await setTexts(badge, [[0, '예정']])
  row.appendChild(badge)
  row.appendChild(await T('10월 6일 시작', '2.0/meta', 'neutral/600'))
  col.appendChild(row)
  col.appendChild(await T('제31회 부산국제영화제', '2.0/title', 'neutral/900', inPanel ? w : undefined, { size: isDesktop ? 32 : 24 }))
  col.appendChild(await T('10월 6일 (화) ~ 10월 15일 (목) · 부산 · 영화의전당 · 센텀시티 일대', '2.0/meta', 'neutral/500', inPanel ? w : undefined))
  col.appendChild(await T('아시아 최대 규모의 국제영화제. 영화의전당을 중심으로 센텀시티 일대 극장에서 열려요.\n예매와 잔여석은 영화제 공식 예매처에서 확인해 주세요.', '2.0/body', 'neutral/700', inPanel ? w : w - 32))
  const btn = inst('2.0/Button', { Variant: 'Primary', Size: isDesktop ? 'md' : 'full', Icon: 'right', State: 'default' })
  await setTexts(btn, [[0, '공식 사이트']])
  swapIcon(btn, 'external-link')
  if (!isDesktop) btn.resize(w, btn.height)
  col.appendChild(btn)
  return col
}

async function sectionHeader(title, w) {
  const h = inst('2.0/SectionHeader', { Trailing: 'none' })
  await setTexts(h, [[0, title]])
  h.resize(w, h.height)
  return h
}

async function venueCard(v, w) {
  const c = A('선택한 극장', 'VERTICAL', 12, [16, 16, 16, 16], { w })
  c.cornerRadius = 16
  fillV(c, 'white')
  await shadow(c, '2.0/shadow/lg')
  const head = A('head', 'HORIZONTAL', 8, [0, 0, 0, 0], { w: w - 32, main: 'SPACE_BETWEEN', cross: 'MIN' })
  const tcol = A('title', 'VERTICAL', 4)
  tcol.appendChild(await T(v.name, '2.0/title', 'neutral/900'))
  tcol.appendChild(await T(v.address, '2.0/meta', 'neutral/600', w - 32 - 52))
  tcol.appendChild(await T(`영화제 ${v.count}회차`, '2.0/meta', 'neutral/500'))
  head.appendChild(tcol)
  head.appendChild(inst('2.0/FavoriteButton', { Variant: 'ghost', State: LIKED_VENUES.has(v.name) ? 'on' : 'off', Size: '44' }))
  c.appendChild(head)
  const actions = A('actions', 'HORIZONTAL', 8)
  const route = inst('2.0/Button', { Variant: 'Secondary', Size: 'md', Icon: 'left', State: 'default' })
  await setTexts(route, [[0, '길찾기']])
  swapIcon(route, 'map-pinned')
  actions.appendChild(route)
  const toTable = inst('2.0/Button', { Variant: 'Tertiary', Size: 'md', Icon: 'none', State: 'default' })
  await setTexts(toTable, [[0, '시간표 보기']])
  actions.appendChild(toTable)
  c.appendChild(actions)
  return c
}

// 같은 건물에 있는 곳 — 코드는 labelOffset으로 라벨을 비키지만 시안에선 한쪽 라벨을 숨긴다
const PIN_LABEL = {
  '영화의전당': '영화의전당', 'CGV 센텀시티': 'CGV 센텀시티', '롯데시네마 센텀시티': '롯데시네마 센텀시티',
  '영화진흥위원회 표준시사실': '영화진흥위원회', '동서대학교 소향씨어터': '소향씨어터', '부산시청자미디어센터': '시청자미디어센터',
  '신세계백화점 센텀시티점': '신세계 문화홀', '동서대학교 센텀캠퍼스': '동서대 센텀캠퍼스',
}
const PIN_HIDE_LABEL = new Set(['신세계백화점 센텀시티점', '동서대학교 센텀캠퍼스'])

async function mapBlock(w, h, pins, imageName, withCard) {
  const m = box('지도 (CARTO voyager 정적 합성)', w, h)
  m.cornerRadius = 12
  m.fills = await assetFill(imageName)
  for (const p of pins) {
    const pin = theaterPin(PIN_LABEL[p.name] || p.name, {
      selected: p.name === '영화의전당', liked: LIKED_VENUES.has(p.name), showLabel: !PIN_HIDE_LABEL.has(p.name),
    })
    m.appendChild(pin)
    // 점(22)의 중심이 좌표에 오게 — 인스턴스 아래쪽 22px가 점이다
    pin.x = Math.round(p.x - pin.width / 2)
    pin.y = Math.round(p.y - (pin.height - 11))
  }
  if (withCard) {
    const v = VENUES.find(x => x.name === '영화의전당')
    const card = await venueCard(v, 340)
    put(m, card, w - 340 - 16, 16)
  }
  return m
}

/** 날짜 탭 — 코드 DetailDateTabs(56×60 언더라인). 개막·폐막은 요일 대신, 토 primary/500 · 일·공휴일 error/900 */
async function dateStrip(w) {
  const row = A('DetailDateTabs', 'HORIZONTAL', 0, [0, 16, 0, 16])
  for (const d of DATA.days) {
    const sel = d.date === DATA.selectedDate
    const dowColor = sel ? 'primary/700' : d.red ? 'error/900' : d.dow === '토' ? 'primary/500' : 'neutral/500'
    const numColor = sel ? 'primary/700' : d.red ? 'error/900' : 'neutral/900'
    const cell = A(`date/${d.day}`, 'VERTICAL', 4, [0, 0, 0, 0], { main: 'CENTER', cross: 'CENTER' })
    cell.primaryAxisSizingMode = 'FIXED'; cell.counterAxisSizingMode = 'FIXED'; cell.resize(56, 60)
    cell.appendChild(await T(d.top, '2.0/label', dowColor, undefined, { weight: d.top === '개막' || d.top === '폐막' ? 'Bold' : 'Medium' }))
    cell.appendChild(await T(String(d.day), '2.0/title', numColor, undefined, { size: 18 }))
    if (sel) { cell.strokes = [paint('primary/700')]; cell.strokeAlign = 'INSIDE'; cell.strokeTopWeight = 0; cell.strokeLeftWeight = 0; cell.strokeRightWeight = 0; cell.strokeBottomWeight = 2 }
    row.appendChild(cell)
  }
  const clip = box('DetailDateTabs (가로 스크롤)', w, row.height)
  put(clip, row, 0, 0)
  return clip
}

/** 모바일 극장 탭 — Tabs underline · scrollable. 순서: 관심 → 영화제가 정한 극장 순서 */
async function venueTabs(w, active) {
  const row = A('Tabs (scrollable)', 'HORIZONTAL', 4, [0, 16, 0, 16])
  for (const name of ['관심', ...VENUES.map((v) => v.name)]) {
    const on = name === active
    const tab = A('tab/' + name, 'HORIZONTAL', 0, [0, 12, 0, 12], { main: 'CENTER', cross: 'CENTER' })
    tab.counterAxisSizingMode = 'FIXED'; tab.resize(tab.width, 42)
    tab.appendChild(await T(name, '2.0/meta', on ? 'primary/700' : 'neutral/500', undefined, { weight: on ? 'SemiBold' : 'Regular' }))
    if (on) { tab.strokes = [paint('primary/700')]; tab.strokeAlign = 'INSIDE'; tab.strokeTopWeight = 0; tab.strokeLeftWeight = 0; tab.strokeRightWeight = 0; tab.strokeBottomWeight = 2 }
    row.appendChild(tab)
  }
  const clip = box('Tabs (가로 스크롤)', w, 43)
  put(clip, row, 0, 0)
  const line = figma.createRectangle(); line.resize(w, 1); fillV(line, 'neutral/200')
  put(clip, line, 0, 42)
  return clip
}

async function controls(w, isDesktop) {
  const row = A('toolbar', 'HORIZONTAL', 8, [12, 16, 4, 16], { w, cross: 'CENTER' })
  if (isDesktop) {
    const chip = inst('2.0/Chip', { Variant: 'filter', State: 'off' })
    await setTexts(chip, [[0, '관심 표시한 것만 보기']])
    row.appendChild(chip)
  }
  // 옅은 안내 — 종료 시각은 biff.kr 작품 페이지 러닝타임으로 계산한 값이다
  const note = await T('종료 시각은 작품 러닝타임으로 계산해 실제와 다를 수 있어요', '2.0/meta', 'neutral/400', isDesktop ? w - 32 - 8 - 200 - 8 - 72 : w - 32 - 8 - 72)
  row.appendChild(note)
  const nav = A('nav', 'HORIZONTAL', 8)
  const left = inst('2.0/ScrollNavButton', { Direction: 'left' }); left.opacity = 0.35
  nav.appendChild(left)
  nav.appendChild(inst('2.0/ScrollNavButton', { Direction: 'right' }))
  row.appendChild(nav)
  return row
}

/* ═══ 4. 바둑판 ════════════════════════════════════════════════ */
const COL_W = 168
const GUTTER_W = 48
const HEAD1 = 44   // 극장 줄
const HEAD2 = 40   // 관 줄
const PX = 1.0     // 분당 px
const CARD_GAP = 8
const GROUP_GAP = 12   // 극장 사이 간격 — 극장마다 테두리를 두른다

async function grid(viewW, cols = COLUMNS) {
  const starts = SCREENINGS.map(s => toMin(s.start))
  const t0 = Math.floor(Math.min(...starts) / 60) * 60
  const lastEnd = Math.max(...SCREENINGS.map(s => (s.endMin ?? toMin(s.start) + 120)))
  const t1 = Math.ceil(lastEnd / 60) * 60
  const bodyH = (t1 - t0) * PX + 160
  // 열 x 좌표 — 극장이 바뀔 때마다 GROUP_GAP만큼 띄운다
  const colX = []
  let gi = -1, prevV = null
  for (const [i, c] of cols.entries()) { if (c.venue !== prevV) { gi++; prevV = c.venue } colX.push(GUTTER_W + i * COL_W + gi * GROUP_GAP) }
  const fullW = colX[colX.length - 1] + COL_W + 1
  const g = box('Grid', fullW, HEAD1 + HEAD2 + bodyH)
  fillV(g, 'neutral/100')

  // 관 컬럼 배경 — 극장 단위로 번갈아 칠해서 어느 관이 어느 극장인지 읽히게
  let prevVenue = null, shade = false
  for (const [i, c] of cols.entries()) {
    if (c.venue !== prevVenue) { shade = !shade; prevVenue = c.venue }
    const bg = figma.createRectangle()
    bg.resize(COL_W, HEAD2 + bodyH)
    fillV(bg, 'white')
    bg.name = 'col-bg'
    put(g, bg, colX[i], HEAD1)
    const line = figma.createRectangle(); line.resize(1, HEAD2 + bodyH); fillV(line, 'neutral/200')
    put(g, line, colX[i], HEAD1)
  }
  // 시간 가로줄 + 라벨
  for (let m = t0; m <= t1; m += 60) {
    const y = HEAD1 + HEAD2 + (m - t0) * PX + 12
    for (const [i] of cols.entries()) { const ln = figma.createRectangle(); ln.resize(COL_W, 1); fillV(ln, 'neutral/200'); put(g, ln, colX[i], y) }
    const lb = await T(fmt(m), '2.0/label', 'neutral/500')
    put(g, lb, 8, y - lb.height / 2)
  }
  // 극장 줄 — 극장 이름 + 하트(관심 극장)
  let i = 0
  while (i < cols.length) {
    const v = cols[i].venue
    let j = i
    while (j < cols.length && cols[j].venue === v) j++
    const span = (j - i) * COL_W
    const head = A('venue/' + v, 'HORIZONTAL', 4, [0, 8, 0, 8], { w: span, main: 'CENTER', cross: 'CENTER' })
    head.counterAxisSizingMode = 'FIXED'; head.resize(span, HEAD1)
    head.appendChild(inst('2.0/FavoriteButton', { Variant: 'ghost', State: LIKED_VENUES.has(v) ? 'on' : 'off', Size: '32' }))
    head.appendChild(await T(v, '2.0/title', 'neutral/900', undefined, { lines: 1 }))
    head.clipsContent = true
    put(g, head, colX[i], 0)
    // 극장 테두리 — radius/popover, neutral/200
    const frame = figma.createRectangle(); frame.name = 'venue-border/' + v
    frame.resize(span, HEAD1 + HEAD2 + bodyH); frame.cornerRadius = 16; frame.fills = []
    frame.strokes = [paint('neutral/200')]; frame.strokeWeight = 1; frame.strokeAlign = 'INSIDE'
    put(g, frame, colX[i], 0)
    i = j
  }
  // 관 줄
  for (const [k, c] of cols.entries()) {
    const cell = A('screen/' + c.screen, 'HORIZONTAL', 0, [0, 8, 0, 8], { w: COL_W, main: 'CENTER', cross: 'CENTER' })
    cell.counterAxisSizingMode = 'FIXED'; cell.resize(COL_W, HEAD2)
    cell.appendChild(await T(c.screen, '2.0/body-strong', 'neutral/700', undefined, { lines: 1 }))
    const bl = figma.createRectangle(); bl.resize(COL_W, 1); fillV(bl, 'neutral/200')
    put(g, cell, colX[k], HEAD1)
    put(g, bl, colX[k], HEAD1 + HEAD2 - 1)
  }
  // 회차 카드 — 시작 시각 위치에 놓고, 앞 카드와 겹치면 아래로 민다
  for (const [k, c] of cols.entries()) {
    const list = SCREENINGS.filter(s => s.venue === c.venue && s.screen === c.screen).sort((a, b) => toMin(a.start) - toMin(b.start))
    let bottom = -Infinity
    for (const s of list) {
      const card = await cardInstance(s)
      let y = HEAD1 + HEAD2 + (toMin(s.start) - t0) * PX + 12
      if (y < bottom + CARD_GAP) y = bottom + CARD_GAP
      put(g, card, colX[k] + (COL_W - CARD_W) / 2, y)
      bottom = y + card.height
    }
  }
  // 왼쪽 시간 열은 가로 스크롤해도 남는다 — 위에 한 번 더 덮는다
  const gutter = figma.createRectangle(); gutter.resize(GUTTER_W, g.height); fillV(gutter, 'neutral/100'); gutter.name = 'time-gutter (sticky)'
  put(g, gutter, 0, 0)
  for (let m = t0; m <= t1; m += 60) {
    const y = HEAD1 + HEAD2 + (m - t0) * PX + 12
    const lb = await T(fmt(m), '2.0/label', 'neutral/500')
    put(g, lb, 8, y - lb.height / 2)
  }

  if (!viewW) return g
  const view = box('Grid viewport (가로 스크롤 · 버튼/터치)', viewW, g.height)
  put(view, g, 0, 0)
  // 오른쪽 끝 페이드 — 더 있다는 신호
  const fade = figma.createRectangle(); fade.resize(40, g.height); fade.name = 'scroll-fade'
  fade.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [
    { position: 0, color: { ...hex('#FAF9F8'), a: 0 } }, { position: 1, color: { ...hex('#FAF9F8'), a: 1 } }] }]
  put(view, fade, viewW - 40, 0)
  return view
}

async function bookingCard(kind) {
  const s = SCREENINGS.find(x => x.code === SELECTED_CODE)
  const c = inst('2.0/BookingCTA', { Type: kind })
  // 주 버튼에 외부 링크 아이콘 — biff.kr 작품 페이지로 새 탭
  const btn = c.findOne(n => n.type === 'INSTANCE' && n.name === '2.0/Button')
  if (btn) { try { btn.setProperties({ Icon: 'right' }); swapIcon(btn, 'external-link') } catch (e) { console.log('버튼 아이콘 실패:', e.message) } }
  const when = `10월 10일 (토) ${s.start}${s.end ? ' → ' + s.end : ''} · ${s.venue} ${s.screen}`
  const texts = c.findAll(n => n.type === 'TEXT')
  if (kind === 'card') await setTexts(c, [[0, '회차 선택됨'], [1, s.title], [2, when], [3, '작품 정보 보기']])
  else await setTexts(c, [[0, s.title], [1, when], [2, '작품 정보 보기']])
  return c
}

/* ═══ 5. 데스크톱 ══════════════════════════════════════════════ */
try {
  const W = 1440, RAIL = 64, COL = 1000
  const screen = A('PC 1440 — 영화제 상세', 'VERTICAL', 0, [0, 0, 120, 0], { w: W })
  fillV(screen, 'neutral/100')
  screen.appendChild(await topBar(W - RAIL))
  const body = A('column 1000', 'VERTICAL', 0, [0, 0, 0, 0], { w: COL })
  const heroWrap = A('hero', 'VERTICAL', 0, [24, 0, 0, 0], { w: COL })
  heroWrap.appendChild(await posterHero(COL, true))
  body.appendChild(heroWrap)
  const s1 = A('극장 지도', 'VERTICAL', 12, [48, 0, 0, 0], { w: COL })
  s1.appendChild(await sectionHeader('극장 지도 (8곳)', COL))
  s1.appendChild(await mapBlock(COL, 640, DATA.pins.desktop, 'biff-map-desktop.png', true))
  body.appendChild(s1)
  const s2 = A('상영 시간표', 'VERTICAL', 8, [48, 0, 0, 0], { w: COL })
  s2.appendChild(await sectionHeader('상영 시간표', COL))
  s2.appendChild(await dateStrip(COL))
  s2.appendChild(await controls(COL, true))
  const gv = await grid(COL)
  s2.appendChild(gv)
  // 선택 카드 — 뷰포트 우하단에 떠 있다(세 번째 참고 이미지)
  const bc = await bookingCard('card')
  absolute(s2, bc, COL - bc.width - 24, s2.height - bc.height - 24)
  body.appendChild(s2)
  const wrap = A('content', 'HORIZONTAL', 0, [0, 0, 0, (W - RAIL - COL) / 2], { w: W - RAIL })
  wrap.appendChild(body)
  const frameRow = A('rail + content', 'HORIZONTAL', 0, [0, 0, 0, 0])
  const rail = box('rail (생략)', RAIL, 900); fillV(rail, 'neutral/200')
  screen.insertChild(0, rail)
  rail.layoutPositioning = 'ABSOLUTE'; rail.x = 0; rail.y = 0
  screen.paddingLeft = RAIL
  screen.appendChild(wrap)
  frameRow.remove()
  const col = A('PC', 'VERTICAL', 24)
  await label(col, 'PC 1440', '레일 64 + 본문 1000 중앙. 회차를 누르면 우하단에 선택 카드(BookingCTA card) — 버튼은 biff.kr 작품 페이지로 새 탭')
  col.appendChild(screen)
  root.appendChild(col)
  console.log('완료: PC 화면')
} catch (e) { console.log('실패: PC 화면 —', e.message) }

/* ═══ 6. 모바일 ════════════════════════════════════════════════ */
try {
  const W = 390
  const screen = A('Mobile 390 — 영화제 상세', 'VERTICAL', 0, [0, 0, 96, 0], { w: W })
  fillV(screen, 'neutral/100')
  screen.appendChild(await topBar(W))
  screen.appendChild(await posterHero(W, false))
  const s1 = A('극장 지도', 'VERTICAL', 12, [32, 16, 0, 16], { w: W })
  s1.appendChild(await sectionHeader('극장 지도 (8곳)', W - 32))
  s1.appendChild(await mapBlock(W - 32, 360, DATA.pins.mobile, 'biff-map-mobile.png', false))
  // 모바일은 지도를 가리지 않게 선택 카드를 지도 아래에 둔다
  s1.appendChild(await venueCard(VENUES.find(x => x.name === '영화의전당'), W - 32))
  screen.appendChild(s1)
  const s2 = A('상영 시간표', 'VERTICAL', 8, [32, 0, 0, 0], { w: W })
  const hdr = A('hdr', 'HORIZONTAL', 0, [0, 16, 0, 16]); hdr.appendChild(await sectionHeader('상영 시간표', W - 32)); s2.appendChild(hdr)
  s2.appendChild(await dateStrip(W))
  s2.appendChild(await venueTabs(W, '영화의전당'))
  s2.appendChild(await controls(W, false))
  // 모바일은 고른 극장 하나만 — 그 안의 관이 넘치면 가로 스와이프
  s2.appendChild(await grid(W, COLUMNS.filter((c) => c.venue === '영화의전당')))
  screen.appendChild(s2)
  const bar = await bookingCard('bar')
  absolute(screen, bar, 0, screen.height - bar.height)
  bar.resize(W, bar.height)
  const col = A('Mobile', 'VERTICAL', 24)
  await label(col, 'Mobile 390', '날짜 탭 아래 극장 탭(관심 → 나머지). 고른 극장의 관 바둑판만 보이고 넘치면 가로 스와이프(시간 열 고정). 회차를 누르면 하단 바(BookingCTA bar) — 하단 탭바 위에 붙는다')
  col.appendChild(screen)
  root.appendChild(col)
  console.log('완료: 모바일 화면')
} catch (e) { console.log('실패: 모바일 화면 —', e.message) }

/* ═══ 7. 바둑판 전체 (스크롤 영역 펼침) ═════════════════════════ */
try {
  const col = A('Grid 전체', 'VERTICAL', 24)
  await label(col, `바둑판 전체 — 10월 10일 (토) ${SCREENINGS.length}회차 · ${COLUMNS.length}개 관`, '뷰포트 밖까지 펼친 모습. 스크롤 영역에서 실제로 보이는 건 PC 약 5.6열 · 모바일 약 2열')
  col.appendChild(await grid(null))
  root.appendChild(col)
  console.log('완료: 바둑판 전체')
} catch (e) { console.log('실패: 바둑판 전체 —', e.message) }

/* ═══ 8. 메모 ═════════════════════════════════════════════════ */
try {
  const col = A('메모', 'VERTICAL', 12, [32, 32, 32, 32], { w: 560 })
  fillV(col, 'white'); col.cornerRadius = 16
  col.appendChild(await T('정할 것 · 메모', '2.0/title', 'neutral/900', undefined, { size: 20 }))
  for (const line of DATA.notes) col.appendChild(await T('· ' + line, '2.0/body', 'neutral/700', 496))
  root.appendChild(col)
  console.log('완료: 메모')
} catch (e) { console.log('실패: 메모 —', e.message) }

figma.viewport.scrollAndZoomIntoView([section])
console.log('완료: 전체 —', SECTION_NAME)
