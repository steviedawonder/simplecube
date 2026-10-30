# 2026-10 노출 감사 — 분야별 원본 보고서

**최신 요약·할 일·로드맵은 [`../SEO_AUDIT_2026-10.md`](../SEO_AUDIT_2026-10.md) 를 먼저 보세요.**

아래는 2026-10-30 에 분야별 전문가가 라이브 사이트(당시 커밋 `2559567`)와 코드를 감사한 **원본 기록**입니다.
"현재 상태"·"코드 수정안" 중 상당수는 같은 날 커밋으로 이미 반영됐습니다(반영 목록은 요약 보고서 §2).
본문에 나오는 `scratchpad/audit/...` 증거 파일 경로는 감사 세션의 임시 폴더라 저장소에는 없습니다.

| 파일 | 분야 | 지금도 쓸모 있는 부분 |
|---|---|---|
| [technical.md](./technical.md) | 크롤링·렌더링·색인 | URL 인벤토리, 지역 페이지 유사도, §10 수동 작업 |
| [naver-local.md](./naver-local.md) | 네이버·다음·Bing·로컬(NAP)·IndexNow | §5 NAP 불일치 목록, **§8 사장님 할 일(플레이스·카카오맵·서치어드바이저·다음·Bing·구글 비즈니스 프로필·검색광고 화면 경로)** |
| [schema.md](./schema.md) | 구조화 데이터 | 엔티티 설계, 지점 LocalBusiness 에 주소를 넣을 때의 기준 |
| [performance.md](./performance.md) | Core Web Vitals·모바일 | Lighthouse 기준선, 남은 과제(Pretendard 가변 서브셋, GTM 태그 지연 실행) |
| [content.md](./content.md) | 키워드·콘텐츠 | 키워드 소유권 표, 경쟁사 비교, **§7-c 블로그 12주 캘린더, §7-g 페이지별 FAQ 초안**, §4-5 마크다운 초안 처리 |
| [geo.md](./geo.md) | AI 검색(GEO) | §4-1 사실 충돌 14건, §3-4 FAQ 답변 문안, §5 외부 채널 전략, §6 geo 초안 발행 금지 이유 |
| [analytics.md](./analytics.md) | 측정 | **§4 GA4·GTM 관리 화면 작업, §5 UTM 규칙, §6 주간 KPI·Looker Studio 구성** |
