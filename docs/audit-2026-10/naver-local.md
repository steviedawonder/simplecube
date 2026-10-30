# 네이버·다음·Bing·로컬 SEO 감사 — simplecube.net (2026-10-30)

담당: 한국 검색엔진·로컬 SEO 스페셜리스트 · 작업 폴더: `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/naver-local/`
표기: **[관찰]** = 직접 요청·파일로 확인 / **[가설]** = 근거는 있으나 직접 확인 못 함 / 우선순위 = 영향(High/Med/Low) × 노력(S/M/L)
라이브 사이트 요청 51회(순차, 0.3초 간격). 저장소는 읽기만 했고(`git status` 변경 0), 코드 검증은 복사본(`naver-local/sandbox/`)에서만 했다.

---

## 0. 핵심 요약 (우선순위 순)

| # | 발견 | 우선순위 | 근거 |
|---|---|---|---|
| 1 | **사이트 블로그 글이 네이버 블로그 글을 같은 날 그대로 옮긴 것.** 사이트 글 12개 중 4개는 제목이 완전히 같고(유사도 1.00), 2개는 거의 같으며(0.85~0.91), 다른 3개는 같은 날 같은 주제. 본문 첫 문장들도 글자 그대로 같다. 네이버는 이런 글을 유사문서로 보고 하나만 노출하므로 사이트 사본은 노출될 가능성이 낮다. IndexNow로도 해결되지 않는다. | **High × M** (콘텐츠 담당에게 넘김) | [관찰] §1-7 |
| 2 | **NAP(상호·주소·전화) 불일치가 여전함 — 10/04에 정한 할 일이 대부분 아직 반영되지 않았다.** 네이버 플레이스(서울)는 상호 `심플큐브`, 업종 `이벤트,파티`, 전화 `0507-1359-3060`(스마트콜), 영업 `매일 10:00–18:30`, 홈페이지 `https://www.simplecube.net`(www), 소개글 오타 `Basic Hapniness`가 그대로다. 사이트는 `Mo-Fr 10:00-18:00`, 카카오맵은 `매일 24시간`(10/04 문서)이라 **영업시간이 4종류**다. 사이트에는 **주소가 어디에도 없다.** 표준 업체명도 문서마다 다르다(`서울본점` vs `서울 성수점`). | **High × S(코드)/M(사장님)** | [관찰] §5 |
| 3 | **IndexNow — 네이버가 공식 지원한다.** 서치어드바이저 가이드 문서, indexnow.org `searchengines.json`, 네이버 `meta.json`(`unsubscribe:false`)으로 확인했다. Bing도 지원하고, Google은 지원하지 않는다. 구현은 복사본에서 테스트까지 끝냈다(패치 7개 파일: 발행·수정·슬러그 변경·비공개·삭제·복원·리비전 복원·예약발행 크론·관리자 페이지 수정). 엔드포인트가 6초 늦거나 500을 돌려줘도 저장 응답은 0.01~0.06초 안에 나간다. | **High × S** | [관찰] §2 |
| 4 | 구조화 데이터의 NAP 충돌. 홈 JSON-LD `openingHours: 'Mo-Fr 10:00-18:00'`이 플레이스(매일)와 맞지 않는다. 부산·대전 등 지역 페이지의 `Service.provider`에는 **서울 전화 02-338-9180·서울 주소**가 들어 있는데, 화면에는 지점 번호가 나온다. 연관채널 마크업(Organization name·url·sameAs)은 형식상 맞다. 다만 `m.place.naver.com`은 네이버 연관채널 지원 도메인이 아니고, 브랜드 검색에 연관채널이 표시되지 않는다(상호 `심플큐브`가 큐브 장난감·쿠팡 상품과 겹침). | **Med × S** | [관찰] §1-5, §5 |
| 5 | 네이버 검색: `심플큐브`로 검색하면 웹사이트 결과(사이트링크 6개)와 AI 브리핑 인용은 정상이다. 그런데 **파워링크는 쿠팡(심플멀티탭) 1개뿐이고 자사 브랜드 광고가 없다.** `포토부스 대여`에서는 자사가 광고(문구 **"14,000건"** — 사이트는 16,000건)와 AI 관련질문 인용으로만 나오고, 웹사이트 영역은 picky-pic.com과 vuephoto.co.kr이 차지했다. | **Med × S** (사장님) | [관찰] §1-6 |
| 6 | 플레이스 전환 장치가 없다. `talktalkUrl:null`, `naverBookingUrl:null`, `menus:[]`, 대표키워드에 `포토부스대여`가 빠져 있다. | **Med × S** (사장님) | [관찰] §5-3 |
| 7 | 크롤 접근은 정상이다. Yeti(2종 UA)·Daum·Bing 모두 핵심 11개 페이지에 **200, 브라우저와 바이트 단위로 같은 HTML**을 받는다. robots.txt는 text/plain 200이고 Yeti를 막지 않는다. 사이트맵 인덱스와 RSS(12개 항목에 title/link/description/pubDate/guid 모두 있음)도 유효하다. | 정보 | [관찰] §1-1~1-4 |
| 8 | 작은 개선 거리: RSS 본문이 요약만 들어 있다(네이버 가이드는 본문 전체 권장). 파비콘이 상대경로다(가이드는 절대경로 요구, 다만 지금도 검색결과에 표시됨). og:image 하나를 12페이지가 같이 쓴다. | **Low × S** | [관찰] §1-3, §1-4 |
| 9 | 다음 웹마스터도구, Bing 웹마스터, 구글 비즈니스 프로필이 모두 미등록(GBP는 웹검색으로 확인되지 않음). | **Med × S** (사장님) | §3, §4, §6 |

---

## 1. 네이버 서치어드바이저 준수 점검

### 1-1. Yeti 접근성 [관찰]
아래 세 UA로 핵심 11개 페이지를 받아 비교했다(`naver-local/live/ua_results.tsv`, `*.body` 해시 비교).
- 브라우저: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) … Chrome/130 …`
- Yeti 단축형: `Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)`
- Yeti 크롬형: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko; compatible; Yeti/1.1; +https://naver.me/spd) Chrome/… Safari/537.36` (네이버 가이드 `seo-basic-firewall`에 나온 두 UA 그대로)

| 경로 | 상태(브라우저/Yeti1/Yeti2) | 크기 | SHA-256 앞 12자리(3종 동일 여부) |
|---|---|---|---|
| `/` | 200/200/200 | 98,172 | a535071c2423 ✔ 동일 |
| `/rental/` | 200×3 | 129,971 | 42fb02e18325 ✔ |
| `/wedding/` | 200×3 | 146,034 | 807f9aa6e4a4 ✔ |
| `/popup/` | 200×3 | 180,138 | 4a28a078096d ✔ |
| `/seoul/` | 200×3 | 120,702 | 635273676579 ✔ |
| `/busan/` | 200×3 | 121,300 | 708c54f2536e ✔ |
| `/contact/` | 200×3 | 61,700 | 088e073d6c54 ✔ |
| `/brand/` | 200×3 | 71,128 | 959ead69d794 ✔ |
| `/blog/` | 200×3 | 124,505 | 6f1933047a6c ✔ |
| `/pricing/` | 200×3 | 112,844 | ee67c07a2249 ✔ |
| `/blog/수원-웨딩-포토부스-추천-…/` | 200×3 | 93,331 | 371256663e5e ✔ |

추가로 Daum(`Mozilla/5.0 (compatible; Daum/4.1; …)`)과 bingbot에 대해 `/`, `/rental/`도 확인했다. 모두 200이고 HTML이 동일하다. `X-Robots-Tag`는 없다. `<meta charset>`는 471바이트 위치(1024바이트 이내)에 있어 SSR 응답 헤더에 charset이 빠진 것은 문제되지 않는다. `https://www.simplecube.net`은 301로 apex로, `http://`는 308로 https로 넘어간다.

### 1-2. robots.txt [관찰]
`https://simplecube.net/robots.txt`는 Yeti UA로 200, `content-type: text/plain; charset=utf-8`이다. `User-agent: *` 그룹에 `Allow: /`가 있고, `/admin/`·`/blog-preview`·`/api/`(단 `/api/portfolio`는 허용)만 막는다. Yeti 전용 그룹이 없으므로 `*` 규칙을 따른다. 사이트맵은 3줄이다(`sitemap.xml`, `sitemap-blog.xml`, `image-sitemap.xml`). 네이버 가이드(`seo-basic-robots`)의 요구(루트 위치, text/plain, 2xx, 파비콘·JS·CSS 수집 허용)를 모두 만족한다.

### 1-3. title·description·OG — 네이버 스니펫 요건 대비 [관찰]
네이버 가이드(`markup-content`)의 요건은 다음과 같다. 메인 title은 브랜드명 중심일 것, 페이지마다 고유한 title/description, **같은 키워드 2회 이상 반복·키워드 나열 지양**, OG(type/title/description/image/url) 함께 기입, og:image는 150×150 이상·5,000바이트 이상·비율 3:1 이하이고 **페이지 고유 이미지여야 함**(여러 페이지에 반복되는 이미지는 사용되지 않을 수 있음).

| 항목 | 상태 |
|---|---|
| 메인 title `심플큐브 \| 프리미엄 포토부스 대여 — 웨딩·팝업·기업행사` | ✔ 브랜드가 맨 앞 |
| 11개 페이지 title·description 고유, og:title/og:description = title/description, og:url = canonical | ✔ |
| title 안 키워드 반복 | 없음 ✔ |
| description 반복 | 경미. `/busan/` desc에 `부산`×3·`포토부스`×2·`설치`×2, `/seoul/`에 `서울`·`포토부스`·`설치` 각 ×2, `/`·`/wedding/`·`/blog/`에 `포토부스`×2 → **Low** |
| og:image | 기술 요건은 충족(`og-image.jpg` 1200×630·136KB, `photobooth-rental-simplecube.jpg` 1200×1200·225KB). 다만 **`photobooth-rental-simplecube.jpg` 하나를 12페이지**(rental, pricing, 지역 10개)가, `og-image.jpg`를 나머지가 같이 쓴다. 가이드상 썸네일로 쓰이지 않을 수 있다 → **Low × M** (페이지별 실사 1장씩) |
| 파비콘 | `BaseLayout.astro`의 `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`가 상대경로다. 가이드(`markup-favicon`)는 "상대 경로가 아닌 절대 경로를 사용해야" 한다고 적는다. 다만 지금 검색결과(`심플큐브`)에 `simplecube.net/favicon.svg`가 이미 쓰이고 있다 → **Low × S** |

### 1-4. 사이트맵·RSS [관찰]
- `/sitemap.xml`: sitemapindex(200, application/xml)로 `sitemap-0.xml`(정적·SSR 20개), `sitemap-blog.xml`(12개, lastmod 최신값 2026-08-07), `image-sitemap.xml`을 묶는다. 네이버 가이드(`request-feed`)가 지원하는 "사이트맵 인덱스" 형식이고 10MB·5만 URL 제한 이내다. 옛 `sitemap-index.xml`(Astro 기본 출력, sitemap-0만 포함)도 200으로 살아 있지만 해는 없다.
- `/rss.xml`(200, 0.66초): item 12개 모두 `title/link/guid/description/pubDate`를 갖췄고 모든 URL이 simplecube.net이다. 네이버 검증 조건(동일 도메인, item 1개 이상, 10MB 미만)을 충족한다.
  - **미흡(Low × S):** 가이드는 "피드에 포함되는 각 item의 본문은 일부가 아닌 모든 내용(본문 전체 공개)이 포함될 수 있도록"을 요구한다. 지금 description은 요약 88~141자다. `@astrojs/rss` 4.0.15는 `content` 필드를 넣으면 `<content:encoded>`와 네임스페이스를 자동으로 만들어 준다(§7 코드 7).
  - DB 오류가 나면 sitemap-blog·rss가 **빈 목록을 200으로** 돌려준다(`sitemap-blog.xml.ts:62-67`, `rss.xml.ts:22-24`) → [가설] Turso 장애 때 네이버가 일시적으로 "글 0개"로 볼 수 있다. Low.

### 1-5. 구조화 데이터 — 사이트 연관채널 [관찰]
네이버 가이드(`structured-data-channel`, 2026 현재)의 요건은 이렇다. **사이트 루트 페이지**에 schema.org `Person` 또는 `Organization`이 있고 `name`·`url`·`sameAs`가 필수다. 인식하는 채널 도메인은 **네이버 블로그·스마트스토어·지식iN·치지직·클립 / 당근·스레드·인스타그램·유튜브·카카오스토리·카카오톡 채널·티스토리·틱톡·페이스북·X**다. 노출은 보장되지 않으며 "중의성이 없이 고유한 이름의 사이트"에 주로 표시된다.

현재 상태는 `src/components/seo/OrganizationSchema.astro`가 `/`에서만 `@graph[Organization, LocalBusiness, WebSite]`를 출력하는 구조다.
- ✔ `Organization.name='심플큐브'`, `url='https://simplecube.net'`, `sameAs` 5개
- `sameAs` 점검:
  - `instagram.com/simplecube_photobooth` ✔
  - `instagram.com/simplecube_wedding` ✔ 지원 도메인. 계정 실존은 인스타그램이 로그인 벽(없는 핸들도 똑같이 302)이라 직접 확인할 수 없었다. 다만 네이버 블로그 글 본문에 "인스타그램: instagram.com/simplecube_wedding/ 홈페이지: https://simplecube.net/"로 쓰이고 있다(검색결과 HTML에서 확인).
  - `pf.kakao.com/_vxhEfj` ✔
  - `blog.naver.com/simple_cube` ✔
  - `m.place.naver.com/place/1454645046` ✘ 네이버 연관채널 지원 도메인이 아니어서 무시된다. 구글용으로는 HQ `LocalBusiness.hasMap`으로 옮기는 편이 의미상 맞다.
- 누락: 당근 비즈프로필(대전 운영 중이라는 문서 기록 있음, URL 미확인)과 유튜브(있다면)는 지원 도메인이므로 추가할 수 있다.
- `심플큐브` 검색결과에 연관채널 표시는 없다(HTML에 연관채널 블록 문자열 없음). [가설] `심플큐브` 큐브 장난감·쿠팡 상품과 이름이 겹쳐 "고유한 이름" 조건에서 불리한 것으로 보인다.
- [가설] 네이버 예시는 최상위 단일 객체인데 우리 마크업은 `@graph` 안에 있다. 네이버가 `@graph`를 읽는지는 확인할 수 없었다. 걱정되면 같은 `@id`로 최상위 Organization 블록을 하나 더 내보낼 수 있다(Low).

### 1-6. 네이버 검색결과 1회 조회 (2026-10-30, 한국 외 IP·비로그인, 개인화 없음) [관찰]
`search.naver.com`은 두 질의 모두 200(차단 없음)이었다. 원본은 `naver-local/dl/nsearch_*.html`에 있다.
- **`심플큐브`**
  - 파워링크: **쿠팡 `심플멀티탭` 광고 1개뿐**이고 자사 브랜드 광고가 없다(2026-05 문서에서 권고한 브랜드 방어광고가 이 조회에서는 보이지 않음).
  - AI 브리핑: `simplecube.net`과 branditmag.co.kr을 인용한다.
  - 웹사이트: `simplecube.net` 결과에 title·description과 사이트링크 6개(웨딩 포토부스/가격안내/행사 포토부스/기업행사 포토부스/포토부스 대여/블로그)가 붙는다.
  - 그 외: 쇼핑(큐브 장난감), 클립(simplecube busan), 블로그 후기 다수, 카카오톡채널, 인크루트.
  - 플레이스 블록은 이 HTML에 없다(플레이스 ID는 이미지 `sid`로만 등장). [가설] 위치 기반이거나 JS로 불러오는 블록일 수 있어 판정 불가.
- **`포토부스 대여`**
  - 자사는 **파워링크 광고(10번째 전후, 문구 "웨딩 행사 14,000건 이상의 노하우")**와 **AI 관련질문 인용 2건**("모든 패키지에 … 전문 운영 스태프 … 공통 포함 — 심플큐브", "지역(서울·수도권 기본 출장비 포함, 부산·대전 등 거점별 차이) — 심플큐브")으로만 나온다.
  - 웹사이트 영역은 picky-pic.com과 vuephoto.co.kr이다. 그 위로 네이버 가격비교·스마트스토어의 "포토부스 대여" 상품(경쟁사 다수)이 크게 자리 잡고 있다.
  - 참고: 광고 문구 14,000건은 사이트(16,000건)와 다르다. AI가 인용한 "전문 운영 스태프 공통 포함"은 현재 `/pricing/`에 실제로 공존하는 모순 문구다("모든 패키지 공통 포함 ✓ 전문 운영 스태프"와 "전문 스태프 운영 (옵션)"이 같은 페이지에 있음, 라이브 HTML 확인). 콘텐츠 담당에게 넘긴다.

### 1-7. 네이버 블로그 ↔ 사이트 블로그 중복 [관찰]
`https://rss.blog.naver.com/simple_cube.xml`(최근 50개)과 사이트 `rss.xml`(12개)의 제목을 비교했다.

| 사이트 글(발행일) | 네이버 블로그 글(발행일) | 제목 유사도 |
|---|---|---|
| 기업행사 포토부스 추천, 대학생 프로그램에 필요한 5가지 가이드 (08-05) | 동일 제목 (08-05) | 1.00 |
| 부평 웨딩 포토부스 추천, 빌라드마리 하객 참여 높이는 꿀팁 3가지 (08-05) | 동일 (08-05) | 1.00 |
| 학교 행사 포토부스 추천, 하반기 준비 전 확인할 5가지 가이드 (08-04) | 동일 (08-04) | 1.00 |
| 기업행사 포토부스 활용 방법 5가지, 로레알코리아 행사 가이드 (08-03) | 동일 (08-03) | 1.00 |
| 호텔파크하비오 웨딩포토부스 │ … 무제한 포토부스 추천(2026) (07-31) | 호텔파크하비오 웨딩포토부스│… (07-31) | 0.91 |
| 와인 행사 포토부스 대여 후기, JW메리어트 … (07-31) | 와인 행사 포토부스 대여 후기, JW메리어트 … 야간 현장 (07-29) | 0.85 |
| 서울대 교수회관 웨딩포토부스 후기 … (08-06) / 수원 더아리엘 … (08-07) / 크레스트72 보타닉 글라스홀 … (07-31) | 같은 주제, 같은 날(또는 하루 전) 다른 제목 | — |

본문도 확인했다. 사이트 글 `/blog/기업행사-포토부스-추천-대학생-프로그램에-필요한-5가지-가이드/`의 본문 29~39행("기업행사 포토부스는 대학생 서포터즈, 홍보대사, 인턴십, 해커톤처럼 …", "신한은행의 대학생 홍보대사 43기·44기 행사 …", "원목 Edge 포토부스와 DSLR 카메라")이 네이버 블로그 RSS 요약문과 **글자 그대로 같다.**

영향은 이렇다. 네이버는 같은 문서가 여러 곳에 있으면 원본(여기서는 같은 날 먼저 올라가고 권위도 높은 네이버 블로그)만 노출하는 경향이 있다. 그러면 사이트 블로그 사본은 네이버 웹문서 노출을 기대하기 어렵다(구글 "발견됨-색인 안 됨"과도 관련 가능 — [가설]). 10/04 문서의 "사이트용으로 따로 작성" 방침이 기존 12개 글에는 적용되지 않았다. 네이버 블로그는 10/18까지 계속 발행 중인데 사이트 블로그는 08/07에 멈춰 있다.

권고(콘텐츠 담당과 협의):
- (a) 사이트 글은 네이버 글의 요약·재구성이 아니라 **다른 각도의 사이트 전용 글**로 쓴다(예: 행사장별 설치 체크리스트·가격표·FAQ 묶음).
- (b) 기존 사본 12개는 서비스 페이지로 링크를 몰아주는 짧은 사례 요약으로 줄이거나 그대로 두되, 네이버 유입은 기대하지 않는다.
- IndexNow로 사본을 제출해도 이 문제는 풀리지 않는다.

---

## 2. IndexNow

### 2-1. 공식 확인 [관찰]
- **네이버 공식 가이드**(`searchadvisor.naver.com/guide/indexnow-request`, `/guide/indexnow-api-key`)
  - 단일 URL: `GET https://searchadvisor.naver.com/indexnow?url=…&key=…&[keyLocation=…]`
  - 여러 URL: `POST /indexnow`, `Host: searchadvisor.naver.com`, `Content-Type: application/json; charset=utf-8`, 본문 `{"host","key","keyLocation"(선택),"urlList"}`, **1회 최대 10,000개**
  - 응답: 200 성공 / 202 수신·key 확인 중 / 400 형식 오류 / 403 key 무효 / 422 URL과 key 불일치 / 429 과다 요청 / 500 서버 에러
  - **key 규칙: UTF-8, "16진수에 사용되는 문자, 숫자, - 만"(a-f, A-F, 0-9, -), 8~128자.** 파일은 `<key>.txt`로 루트에 두는 것을 추천하고, 하위 디렉터리에 두면 그 디렉터리 URL에만 유효하다. 도메인마다 별도 key를 쓴다.
- **indexnow.org `searchengines.json`**(오늘 받음, `naver-local/dl/searchengines.json`): bing, yandex, seznam, **naver**, yep, internetarchive, amazonbot이 참여한다. 네이버 `meta.json`은 `"api":"https://searchadvisor.naver.com/indexnow"`, `"unsubscribe": false`, Bing `meta.json`은 `"api":"https://www.bing.com/indexnow"`다.
- indexnow.org 문서: "submitted URLs will be automatically shared with all other participating search engines"(제출한 URL은 다른 참여 엔진과 공유됨). 200은 "수신"만 뜻한다.
- 엔드포인트 생존 확인(빈 GET, 제출 없음): 네이버는 302(→ indexnow.org), Bing은 200, api.indexnow.org는 400(파라미터 없음)이다.
- **Google은 IndexNow 미참여**(목록에 없음).

### 2-2. 설계 (이 코드베이스 기준)
- **key**: `node -e "console.log(require('crypto').randomUUID().replace(/-/g,''))"`로 만드는 32자 소문자 hex(네이버 규칙 충족). 파일은 **`public/<key>.txt`**(내용 = key 한 줄, 개행 없음)이고 Vercel이 `/<key>.txt`로 정적 서빙한다. robots.txt에도 vercel.json 리다이렉트에도 걸리지 않는다.
- **환경변수**: `INDEXNOW_KEY`(Vercel **Production**에만 등록). 등록하지 않으면 아무 동작도 하지 않는다(사실상 꺼짐 스위치). 전송은 `VERCEL_ENV === 'production'`일 때만 한다. 테스트할 때만 런타임에 `INDEXNOW_FORCE=1`, `INDEXNOW_ENDPOINTS`를 쓴다.
  - ⚠ 복사본에서 빌드해 보니 Astro 5는 `import.meta.env.*`를 **빌드 때 결과물에 그대로 박아 넣는다**. 그래서 테스트 스위치는 `process.env`로만 읽게 했다(빌드 결과물에 key만 들어가는 것 확인. key는 원래 공개값이다).
- **엔드포인트**: 네이버(직접) + Bing(→ 참여 엔진에 공유). 네이버를 직접 부르는 이유는 공유 경로가 늦거나 빠지는 위험을 없애기 위해서다.
- **실패 처리**: 저장 API에서는 `notifyIndexNow()`를 쓴다. `@vercel/functions`의 `waitUntil`로 응답을 먼저 보내고 뒤에서 전송하며, 요청마다 `AbortSignal.timeout(5000)`, 모든 예외를 삼키고 `console.warn`만 남긴다. 크론에서는 `await submitToIndexNow()`를 쓰되 try/catch로 감싸 발행 결과에 영향을 주지 않는다. `@vercel/functions@2.2.13`은 이미 `@astrojs/vercel@9.0.4`의 하위 의존성으로 설치돼 있지만 **직접 의존성으로 추가**를 권장한다(`npm i @vercel/functions@^2.2.13`).
- **어느 코드 경로에서 보내나** (공개 판정은 `/blog/[slug]`·sitemap·rss와 같은 기준: `draft=0`, 삭제 안 됨, 외부링크 아님, 예약 시각 지남)

| 경로 | 언제 보내나 | 보내는 URL |
|---|---|---|
| `POST /api/posts` (`src/pages/api/posts/index.ts`) | 만들자마자 공개될 때 | 글, `/blog/` |
| `PUT /api/posts/[id]` (`[id].ts`) | 공개 글 수정 / 초안→공개 / 공개→비공개 / 공개 글 슬러그 변경 | 새 URL(공개 시), 옛 URL(비공개·슬러그 변경 시), 목록이 바뀌면 `/blog/` |
| `DELETE /api/posts/[id]` (휴지통) | 공개 글이었을 때 | 글(이제 404), `/blog/` |
| `POST /api/posts/[id]/restore` | 복원된 글이 공개 상태일 때 | 글, `/blog/` |
| `POST /api/posts/[id]/revisions` (리비전 복원) | 공개 글일 때 | 글 |
| `GET /api/cron/publish-scheduled` | 예약 글 발행 + **최근 25시간 안에 관리자에서 고친 FAQ·page_contents·package_items** | 글·`/blog/` + 해당 SSR 페이지(묶어서 하루 1회) |
| 영구삭제·복제 | 보내지 않음(이미 휴지통 단계에서 보냄 / 복제본은 초안) | — |

관리자 페이지 수정의 매핑은 이렇다. FAQ `popup`은 `/popup/`·`/corporate/`·`/graduation/`·`/rental/`에, `rental`은 `/rental/`·`/pricing/`에, 지역 키는 `/<city>/`에, page_contents·package_items `wedding`은 `/wedding/`에, `popup`은 `/popup/`에 대응한다. 수정할 때마다 보내면 연속 편집 때 429 위험이 있어서 크론에서 하루 1회 묶어 보내도록 했다. 에디터 자동저장은 localStorage에만 저장하므로(`PostEditor.tsx:126-139`) 서버 저장 때만 전송된다.

### 2-3. 코드 (그대로 적용 가능)
**전체 패치: `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/naver-local/indexnow.patch`**(7개 파일, 400줄, 저장소에서 `git apply --check` 통과). 적용 순서는 아래와 같다.
```bash
cd /home/user/simplecube
git apply /tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/naver-local/indexnow.patch
npm i @vercel/functions@^2.2.13
KEY=$(node -e "console.log(require('crypto').randomUUID().replace(/-/g,''))")
printf '%s' "$KEY" > "public/$KEY.txt"     # 키 파일 (커밋 대상)
vercel env add INDEXNOW_KEY production      # 값으로 $KEY 입력
```

**(1) 새 파일 `src/lib/indexnow.ts`** — 전문:
```ts
/**
 * IndexNow — 글 발행·수정·삭제를 네이버(서치어드바이저)와 Bing 에 바로 알린다.
 *
 * - 네이버 공식 가이드: https://searchadvisor.naver.com/guide/indexnow-request
 * - 키 규칙(네이버): 16진수 문자(a-f, A-F, 0-9)와 '-' 만, 8~128자, UTF-8.
 *   키 파일 = public/<INDEXNOW_KEY>.txt (내용은 키 한 줄). 사이트 루트에 있어야 사이트 전체 URL 에 유효.
 * - Bing 으로 보낸 URL 은 IndexNow 참여 엔진(Yandex·Seznam·Yep 등)에 공유된다. Google 은 미참여.
 * - 운영(Vercel Production)에서만 전송한다. 로컬·Preview 에서는 건너뜀(테스트할 때만 INDEXNOW_FORCE=1).
 * - 실패해도 저장·발행은 절대 막지 않는다: 예외를 던지지 않고 로그만 남기며, 요청마다 5초 타임아웃.
 */
import { waitUntil } from '@vercel/functions';
import type { Client } from '@libsql/client';

export const SITE = 'https://simplecube.net';
const HOST = 'simplecube.net';
const TIMEOUT_MS = 5000;

const DEFAULT_ENDPOINTS = [
  'https://searchadvisor.naver.com/indexnow', // 네이버 서치어드바이저 (공식 엔드포인트)
  'https://www.bing.com/indexnow', // Bing → 다른 IndexNow 참여 엔진에도 공유
];

// 키: Vercel 런타임 process.env 우선, 없으면 빌드 때 값(import.meta.env — Astro 5 는 빌드 시 인라인).
// 테스트용 스위치(INDEXNOW_FORCE·INDEXNOW_ENDPOINTS)와 VERCEL_ENV 는 런타임 process.env 로만 읽는다
// — import.meta.env 로 읽으면 로컬 .env 값이 빌드 결과물에 박혀 버린다.
function config() {
  const key = (process.env.INDEXNOW_KEY || import.meta.env.INDEXNOW_KEY || '').trim();
  const force = process.env.INDEXNOW_FORCE === '1';
  const isProd = process.env.VERCEL_ENV === 'production';
  const endpointsRaw = (process.env.INDEXNOW_ENDPOINTS || '').trim();
  const endpoints = endpointsRaw ? endpointsRaw.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_ENDPOINTS;
  const validKey = /^[a-fA-F0-9-]{8,128}$/.test(key);
  if (key && !validKey) console.warn('[IndexNow] INDEXNOW_KEY 형식 오류 — 16진수(a-f, 0-9)와 - 만, 8~128자');
  return { key, endpoints, enabled: validKey && (isProd || force) };
}

/** 블로그 글 URL 경로 — sitemap-blog.xml·canonical 과 같은 형식 (/blog/<인코딩된 슬러그>/) */
export function blogPath(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}/`;
}

/** 공개 상태 판정 — /blog/[slug]·sitemap-blog.xml·rss.xml 과 같은 기준 */
export function isLivePost(p: { draft?: unknown; deleted_at?: unknown; scheduled_at?: unknown; external_url?: unknown }): boolean {
  if (Number(p.draft) !== 0) return false;
  if (p.deleted_at) return false;
  if (p.external_url) return false; // 외부(네이버 블로그) 연동 글은 /blog/{slug} 가 외부로 302 → 제출 대상 아님
  if (p.scheduled_at && new Date(String(p.scheduled_at)) > new Date()) return false;
  return true;
}

export type IndexNowResult = { endpoint: string; status: number | 'error'; detail?: string };

/** 실제 전송. 비활성·빈 목록이면 아무것도 하지 않는다. 절대 throw 하지 않는다. */
export async function submitToIndexNow(paths: string[]): Promise<IndexNowResult[]> {
  const { key, endpoints, enabled } = config();
  if (!enabled) return [];

  const urlList = [...new Set(paths.map((p) => (p.startsWith('http') ? p : `${SITE}${p}`)))].filter((u) =>
    u.startsWith(`${SITE}/`)
  );
  if (urlList.length === 0) return [];

  const body = JSON.stringify({ host: HOST, key, keyLocation: `${SITE}/${key}.txt`, urlList });

  const results = await Promise.all(
    endpoints.map(async (endpoint): Promise<IndexNowResult> => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return { endpoint, status: res.status };
      } catch (e) {
        return { endpoint, status: 'error', detail: e instanceof Error ? e.message : String(e) };
      }
    })
  );

  // 200 = 접수, 202 = 접수(키 확인 중). 403 = 키 파일 문제, 422 = URL·키 불일치, 429 = 너무 잦은 전송
  const failed = results.filter((r) => r.status !== 200 && r.status !== 202);
  if (failed.length > 0) console.warn('[IndexNow] 전송 실패', JSON.stringify(failed), urlList);
  else console.log(`[IndexNow] ${urlList.length}건 전송`, urlList);
  return results;
}

/** 저장 API 용: 응답을 기다리게 하지 않고 백그라운드로 전송(Vercel waitUntil). 절대 throw 하지 않는다. */
export function notifyIndexNow(paths: string[]): void {
  try {
    const task = submitToIndexNow(paths).catch((e) => console.warn('[IndexNow] 예외', e));
    waitUntil(task); // 로컬 dev 에서는 no-op — 프로세스가 살아 있으니 그대로 완료된다
  } catch (e) {
    console.warn('[IndexNow] 예약 실패', e);
  }
}

// ── 관리자 화면에서 고치는 SSR 페이지(FAQ·패키지·페이지 문구) → 공개 URL ─────────────────
// FAQ 'popup' 은 popup·corporate·graduation·rental 에, 'rental' 은 rental·pricing 에 함께 노출된다.
const FAQ_PAGE_PATHS: Record<string, string[]> = {
  wedding: ['/wedding/'],
  popup: ['/popup/', '/corporate/', '/graduation/', '/rental/'],
  rental: ['/rental/', '/pricing/'],
  corporate: ['/corporate/'],
  pricing: ['/pricing/'],
  graduation: ['/graduation/'],
  seoul: ['/seoul/'],
  busan: ['/busan/'],
  daegu: ['/daegu/'],
  daejeon: ['/daejeon/'],
  gwangju: ['/gwangju/'],
  ulsan: ['/ulsan/'],
  jeonju: ['/jeonju/'],
  cheonan: ['/cheonan/'],
  cheongju: ['/cheongju/'],
  chungju: ['/chungju/'],
};
const CONTENT_PAGE_PATHS: Record<string, string[]> = {
  popup: ['/popup/'], // page_contents(custom) → CustomOptions
  wedding: ['/wedding/'], // page_contents(specs)·package_items → PackageDetails
};

/** 최근 25시간 안에 관리자 수정이 있었던 SSR 페이지 경로 (하루 1회 크론에서 묶어서 전송) */
export async function recentlyEditedPagePaths(db: Client): Promise<string[]> {
  const rs = await db.execute(`
    SELECT 'faq' AS src, page FROM faqs WHERE updated_at >= datetime('now', '-25 hours')
    UNION SELECT 'content', page FROM page_contents WHERE updated_at >= datetime('now', '-25 hours')
    UNION SELECT 'content', page FROM package_items WHERE updated_at >= datetime('now', '-25 hours')`);
  const paths = new Set<string>();
  for (const row of rs.rows as unknown as { src: string; page: string }[]) {
    const map = row.src === 'faq' ? FAQ_PAGE_PATHS : CONTENT_PAGE_PATHS;
    for (const p of map[String(row.page)] ?? []) paths.add(p);
  }
  return [...paths];
}
```

**(2) 훅 삽입 요지** (정확한 diff는 패치 파일에 있음)
```ts
// src/pages/api/posts/index.ts — POST, tags INSERT 뒤 return 직전
if (isLivePost({ draft, scheduled_at, external_url })) {
  notifyIndexNow([blogPath(cleanSlug), '/blog/']);
}

// src/pages/api/posts/[id].ts — PUT: 존재 확인 SELECT 를 확장
//   'SELECT id, slug, draft, scheduled_at, external_url, deleted_at FROM posts WHERE id = ?'
// ... UPDATE·태그 처리 뒤 return 직전
const before = existing.rows[0] as any;
const wasLive = isLivePost(before);
const nowLive = isLivePost({ draft, scheduled_at, external_url, deleted_at: before.deleted_at });
const slugChanged = String(before.slug) !== cleanSlug;
const paths: string[] = [];
if (nowLive) paths.push(blogPath(cleanSlug));
if (wasLive && (!nowLive || slugChanged)) paths.push(blogPath(String(before.slug)));
if (wasLive !== nowLive || (wasLive && slugChanged)) paths.push('/blog/');
if (paths.length > 0) notifyIndexNow(paths);

// src/pages/api/posts/[id].ts — DELETE: SELECT 확장 후, soft delete 뒤
const removed = existing.rows[0] as any;
if (isLivePost(removed)) notifyIndexNow([blogPath(String(removed.slug)), '/blog/']);

// src/pages/api/posts/[id]/restore.ts — SELECT 에 slug, draft, scheduled_at, external_url 추가 후 복원 뒤
const restored = existing.rows[0] as any;
if (isLivePost(restored)) notifyIndexNow([blogPath(String(restored.slug)), '/blog/']);

// src/pages/api/posts/[id]/revisions.ts — POST(리비전 복원) UPDATE 뒤
const cur = await db.execute({ sql: 'SELECT slug, draft, scheduled_at, external_url, deleted_at FROM posts WHERE id = ?', args: [id] });
const post = cur.rows[0] as any;
if (post && isLivePost(post)) notifyIndexNow([blogPath(String(post.slug))]);

// src/pages/api/cron/publish-scheduled.ts — SELECT 에 external_url 추가, 루프 뒤
let indexnow: unknown = null;
try {
  const postPaths = publishedPosts.filter((p) => !p.external_url).map((p) => blogPath(String(p.slug)));
  const pagePaths = await recentlyEditedPagePaths(db);
  const paths = [...postPaths, ...(postPaths.length > 0 ? ['/blog/'] : []), ...pagePaths];
  if (paths.length > 0) indexnow = await submitToIndexNow(paths);
} catch (e) {
  console.warn('[IndexNow] 크론 전송 건너뜀', e);
}
// 응답 JSON 에 indexnow 결과 포함
```

**(3) 1회용 전체 제출 스크립트 `scripts/indexnow-submit-all.mjs`**(패치에 포함). 순서는 ① key 파일 `https://simplecube.net/<key>.txt` 200 확인 → ② `sitemap.xml` 인덱스에서 이미지 사이트맵을 뺀 하위 사이트맵의 `<loc>` 수집 → ③ 네이버·Bing에 POST하고 상태코드 출력. 실행은 아래와 같다. `--dry-run`으로 먼저 목록을 확인하며, 매일 돌리지 않는다.
```bash
INDEXNOW_KEY=<키> node scripts/indexnow-submit-all.mjs --dry-run
INDEXNOW_KEY=<키> node scripts/indexnow-submit-all.mjs
```

### 2-4. 검증 결과 (복사본 `naver-local/sandbox/` + 로컬 모의 엔드포인트, 실제 제출 없음) [관찰]
| 시나리오 | 결과 |
|---|---|
| key 파일 `/c42aeb….txt` | 200 `text/plain`, 본문 = key |
| T1 공개 글 생성 (모의 엔드포인트 6초 지연) | **201을 0.059초에 반환**, 네이버·Bing 모의 엔드포인트가 `{"host":"simplecube.net","key":…,"keyLocation":"https://simplecube.net/<key>.txt","urlList":["…/blog/%ED%85%8C…/","…/blog/"]}` 수신, `Content-Type: application/json; charset=utf-8` |
| T2 초안 생성 / T3 초안 수정 | 전송 없음 ✔ |
| T4 초안→공개 | `/blog/test-draft/`, `/blog/` ✔ |
| T5 공개 글 본문 수정 | 글 URL만 ✔ |
| T6 공개 글 슬러그 변경 | 새 URL + 옛 URL + `/blog/` ✔ |
| T7 공개→비공개 / T8 휴지통 / T9 복원 | 옛 URL+`/blog/` / URL+`/blog/` / URL+`/blog/` ✔ |
| T10 외부링크 글 / T11 미래 예약 글 | 전송 없음 ✔ |
| T12 엔드포인트 500 / 7초 무응답 | 저장 200을 0.012초에 반환, 로그 `[IndexNow] 전송 실패 [{"status":500}…]` / `"The operation was aborted due to timeout"` ✔ |
| 크론: 지난 예약 글 + FAQ(wedding) 수정 | `{"published":1,…,"indexnow":[{…"status":200},…]}`, 수신 `['/blog/cron-published-post/','/blog/','/wedding/']` ✔ |
| 리비전 복원(공개 글) | 글 URL ✔ |
| 운영 아님 + FORCE 없음 | 공개 글을 만들어도 전송 0건 ✔ |
| 스크립트 | dry-run(라이브 사이트맵) **32개 URL 수집**(정적 20 + 블로그 12). 잘못된 key 형식·없는 key 파일이면 제출을 거부 ✔ |
| `astro build`(Vercel 어댑터) | 성공. 번들에 key만 인라인되고 테스트 스위치는 `process.env` 참조로 남음 ✔ |
| `tsc --noEmit` | 전체 16건 = 원본 저장소 기준선 16건(손대지 않은 파일들). **수정 파일 오류 0** ✔ |

남은 주의점:
- **CRON_SECRET**: 운영에서 없으면 크론이 500을 낸다(`publish-scheduled.ts:14-19`). Hobby 플랜 로그 보존이 1시간이라 운영 상태는 확인하지 못했다([가설]). Vercel 환경변수에 있는지 확인이 필요하다.
- `vercel.json` 크론은 `"0 0 * * *"`(매일 09:00 KST)인데 코드 주석은 "5분마다"라고 적혀 있다. 예약 글은 최대 하루 늦게 공개되고, 그때 전송된다.
- SSR 캐시가 `s-maxage=60, stale-while-revalidate=86400`(`middleware.ts:136`)라서, 수정 직후 크롤러가 첫 요청에서 수정 전 HTML을 받을 수 있다([가설], Low).
- 공개 글의 슬러그를 바꾸면 옛 URL이 404가 된다(리다이렉트 없음 — 크롤 담당에게 넘김). IndexNow는 옛 URL도 알리도록 했다.

### 2-5. Google은? (IndexNow 미지원)
1. 사이트맵 `lastmod`를 정확하게 유지한다. Google은 lastmod를 크롤 일정 신호로 쓴다("last significant modification"). 블로그는 이미 `updated_at`으로 넣고 있다.
2. 새 글과 중요한 수정은 **Search Console → URL 검사 → 색인 생성 요청**으로 수동 요청한다(하루 할당 소량).
3. `/blog/`와 서비스 페이지에서 새 글로 가는 내부 링크를 둔다.
4. **하지 말 것**:
   - Google sitemap ping(`google.com/ping?sitemap=`) — 2023-06 공지 후 종료돼 404를 낸다.
   - Indexing API — JobPosting·BroadcastEvent 전용이라 블로그에 쓰면 정책 위반이다.

---

## 3. 다음(Daum) · 카카오

**다음 웹마스터도구**: 2020-08 베타로 시작했다(카카오 공식 발표: "검색최적화·정보분석·문서분석·수집요청"). 공식 페이지(webmaster.daum.net)는 이 환경에서 TLS 오류·503으로 열 수 없었고, 절차는 여러 2차 자료가 일치하는 내용이다.
- 인증 방식: **웹마스터도구에서 PIN(영문+숫자 8~12자) 발급 → robots.txt에 주석 한 줄(`#DaumWebMasterTool:…`, 도구가 주는 값 그대로) 추가 → 인증 → 사이트맵·RSS 제출, 수집 요청.**
- 코드로 지금 준비할 것: 없음. PIN을 받으면 `public/robots.txt` 맨 아래에 한 줄을 넣고 배포한다(§7 코드 8). Daum 크롤러 UA 접근은 정상이다(§1-1). Daum은 IndexNow 미참여라 수집 요청은 수동이다.

**카카오맵**: 2025-12-08부터 **카카오비즈니스 파트너센터**(business.kakao.com)로 관리 도구가 통합됐다(채널·카카오맵 매장관리·예약). 10/04 문서 기준 현황은 서울 매장의 상세주소·태그만 고쳤고 **영업시간을 `매일 24시간`으로 넣었으며**, 대전·부산 채널은 지도 매장과 연결돼 있지 않다. 카카오맵 장소 데이터는 API key와 JS가 필요해 이 환경에서 확인할 수 없었다.
- 카카오톡 채널 4개는 실존한다 [관찰]. 채널명은 `심플큐브`, `심플큐브-부산`, `심플큐브-대전`, `심플큐브-전주`(사이트 /brand/ 표기는 `심플큐브 부산`처럼 띄어쓰기 — 사소함). 부산 채널 소개는 "보다 간결한 즐거움 심플큐브 부산점 입니다."이고 나머지 3개는 소개가 비어 있다.
- 코드로 할 일: 카카오맵 장소 URL(`place.map.kakao.com/<id>`)이 정해지면 /contact/ 지점 카드에 "카카오맵에서 보기" 링크와 JSON-LD `sameAs`(지점 노드)를 추가한다. 나머지는 사장님 계정 작업이다(§8).

## 4. Bing 웹마스터 도구 — Google Search Console 가져오기
Bing 공식 블로그·가이드 기준(가이드 최종 갱신 2025-06):
1. https://www.bing.com/webmasters 에 접속해 GSC 소유자 계정(simplecube2019@gmail.com)과 같은 Google 계정으로 로그인한다.
2. 첫 화면 **"Import your sites from GSC"** 또는 **My Sites → Import**를 누른다.
3. Google 로그인 → 권한 **허용(Allow)**.
4. 목록에서 `https://simplecube.net/`을 선택하고 **Import**한다. GSC의 사이트맵도 같이 들어온다(분석 데이터는 넘어가지 않음).
5. **Sitemaps** 메뉴에 `https://simplecube.net/sitemap.xml` 하나만 남아 있는지 확인한다.
6. IndexNow 배포 뒤 **IndexNow** 메뉴에서 수신 내역을 확인한다.
- 참고: GSC 권한을 회수하면 Bing 소유 확인도 풀린다. 그때는 메타태그(`msvalidate.01`)나 DNS로 다시 인증한다.

---

## 5. 로컬 SEO / NAP

### 5-1. 사이트 안의 NAP 표기 전수 목록 [관찰, file:line]
| 위치 | 상호/지점명 | 전화 | 주소 | 영업시간 | 채널 링크 |
|---|---|---|---|---|---|
| `src/components/common/Footer.astro:2-27, 34-41` (전 페이지) | "SIMPLE CUBE PHOTO BOOTH", "서울 본점·부산 지점·대전 지점·전주 지점" | tel:02-338-9180 / 010-3122-4746 / 010-8838-8122 / 010-5743-8122 | 없음 | 없음 | 카카오 `/_vxhEfj/chat` `/_RxgxkPb/chat` `/_xgqgyb/chat` `/_TPxjxoG/chat`, 인스타 `instagram.com/…`(www 없음), 메일 simple_cube@naver.com |
| `src/pages/contact.astro:5-50` | 지역명(서울·경기·강원 등) + "본점" 배지 | 위와 같은 4개 | **없음** | **"CS 운영시간 10:00 ~ 18:00 / *주말, 공휴일 휴무"**(4지점 공통) | 카카오 chat 4개, 인스타 www |
| `src/components/brand/BranchOffices.astro:6-11` (/brand/) | "서울 본점 … 전주 지점" | 같음 | 없음 | 없음 | 카카오 이름만 텍스트("심플큐브 부산"), 인스타 링크 |
| 지역 페이지 `seoul.astro:169,172,176,224-226`, 나머지 9개 `:168,171,175,224/225` | "심플큐브 서울 본점 / 심플큐브 부산 지점 / …"(branchOrigin) | 담당 지점 번호(울산·대구→부산, 천안·청주·충주→대전, 광주→전주) | 없음 | "평일 일과시간 내 30분 내 견적 회신" | — |
| `rental.astro:327-329`, `pricing.astro:362-364`, `corporate.astro:324-326`, `graduation.astro:199-201` | — | 02-338-9180 | — | — | 카카오 `_vxhEfj/chat` |
| `src/components/seo/OrganizationSchema.astro:9-15, 23, 33, 56-71` (홈 JSON-LD) | Organization·LocalBusiness 모두 "심플큐브" | +82-2-338-9180 | **`addressLocality: '서울'`만** | **`openingHours: 'Mo-Fr 10:00-18:00'`** | sameAs 5개(§1-5) |
| `src/components/seo/ServiceSchema.astro:26-43` (16개 페이지) | provider "심플큐브" | **02-338-9180(지역 페이지에서도)** | "서울" | — | areaServed = 서울·부산·대전·전주 고정(울산·대구 페이지 포함) |
| `public/llms.txt:49-56` | — | +82-2-338-9180 | 없음 | 없음 | 카카오 HQ, 인스타 HQ, 네이버 블로그. **지점 정보 없음** |
| `src/lib/db.ts:486-509` (page_contents 'branch' 시드) | "서울 본점…" | 같음 | — | — | 렌더링에 쓰이지 않음(BranchOffices는 props 없이 기본값 사용) |

### 5-2. 외부 채널 실측값 [관찰]
| 채널 | 실측 |
|---|---|
| **네이버 플레이스 1454645046**(서울, `m.place.naver.com` 200) | 상호 **`심플큐브`**, 업종 **`이벤트,파티`**, 도로명 **`서울 성동구 성수이로18길 31 풍림테크원 205,206호`**(지번 성수동2가 273-10), 전화 **`0507-1359-3060`**(virtualPhone = 스마트콜), 영업 **`매일 10:00–18:30`**, 홈페이지 **`https://www.simplecube.net`**(www) + 블로그 + 인스타 photobooth, 대표키워드 `결혼식방명록·포토박스·웨딩포토부스·포토방명록·포토부스`, **톡톡 null·예약 null·메뉴 []**, 방문자리뷰 6·블로그리뷰 81, 소개글에 **`[Basic Hapniness]` 오타 그대로**, 좌표 37.5419858, 127.0606467 |
| 부산·대전·전주 플레이스 | 사이트에서 링크하지 않아 ID를 모름. 검색결과에도 나오지 않아 **확인 불가** |
| 카카오맵 | 확인 불가(API key·JS 필요). 문서 기록: 서울 "심플큐브 즉석사진"(07-28) → 10/04 상세주소 "풍림테크원 205, 206호"·**매일 24시간**. 대전 "심플큐브 대전 즉석사진", 0502-5553-8235 |
| 카카오톡 채널 4개 | 200, 실존(§3) |
| 인스타그램 5개 핸들 | **확인 불가** — 없는 핸들도 똑같이 로그인 페이지로 302 |
| 네이버 블로그 `blog.naver.com/simple_cube` | 200, 제목 "심플큐브 포토부스 : 네이버 블로그" |

### 5-3. 불일치 목록 (표준 = `docs/NAVER_PLACE_BRAND_UNIFICATION.md` §1-3)
1. **표준 업체명이 문서끼리 다르다**: UNIFICATION 문서는 `심플큐브 포토부스 서울본점`, SEO_RECOVERY 10/04는 `심플큐브 포토부스 서울 성수점`. 먼저 하나로 정해야 한다. 실측 플레이스는 `심플큐브`, 사이트는 `서울 본점`·`심플큐브 서울 본점`·JSON-LD `심플큐브`로 넷이 다 다르다. 지점은 표준이 "부산점", 사이트는 "부산 지점", 카카오 부산 채널 소개는 "부산점"이다.
2. **영업시간 4종**: 사이트 JSON-LD `Mo-Fr 10:00-18:00`(`OrganizationSchema.astro:71`), /contact/ "10:00~18:00, 주말·공휴일 휴무"(`contact.astro:13-14` 외 3곳), 네이버 `매일 10:00–18:30`, 카카오 `매일 24시간`. NAVER_LOCAL_SEO 문서 예시는 또 `평일 10:00–19:00`이다.
3. **전화**: 사이트 HQ `02-338-9180` vs 네이버 `0507-1359-3060`(스마트콜) vs 카카오 대전 `0502-5553-8235`(가상번호). 스마트콜은 네이버 자체 번호라 네이버 쪽 혼선은 적을 것으로 본다([가설]). 대신 사이트·카카오·구글은 실번호로 맞춘다.
4. **주소**: 플레이스·카카오에는 있지만 **사이트 어디에도 없다**(JSON-LD도 "서울"뿐). 카카오에 예전에 있던 "6층 602호"는 10/04에 205·206호로 맞췄다는 기록이 있다.
5. **홈페이지 링크**: 플레이스가 `https://www.simplecube.net`이다(301로 동작은 함). 10/04 할 일 "www 없이"가 아직 안 됐다.
6. **업종**: 플레이스 `이벤트,파티`, 카카오 `즉석사진`(07-28), 문서 표준 `포토부스`. [가설] 네이버의 `포토부스` 업종은 셀프 사진관(인생네컷류)과 묶일 수 있어 브랜드 문서가 피하려는 "즉석사진" 정체성과 겹칠 위험이 있다. 1차 업종은 경쟁사 플레이스 업종을 보고 정하되, 대표키워드에 `포토부스대여`를 넣는 것은 확정 권장한다.
7. **브랜드 수치**: 사이트 16,000건 vs 네이버 파워링크 문구 14,000건.
8. **인스타 HQ 계정**: 사이트 표기는 @simplecube_photobooth인데, 네이버 블로그 글 본문은 @simplecube_wedding을 공식 인스타로 안내한다. JSON-LD에는 둘 다 있다. 용도(웨딩/행사)를 정해 사이트·플레이스에 같은 방식으로 표기한다.
9. **지역 페이지 JSON-LD 전화 충돌**: /busan/ 등에서 화면은 지점 번호인데 `Service.provider.telephone`은 서울 번호다(`ServiceSchema.astro:31`).
10. **플레이스 소개글 오타** `Basic Hapniness`(10/04 할 일, 아직 그대로).
11. 사이트에서 **네이버 플레이스·지도로 가는 링크가 화면에 하나도 없다**(JSON-LD sameAs에만 있음). /contact/에 "네이버 지도에서 보기"를 넣으면 사용자 전환에도 좋고, 사이트와 플레이스의 연결 신호도 강해진다.

### 5-4. 표준값 확정용 표 (사장님 기입 → 개발 반영)
| 항목 | 권장(기본값) | 비고 |
|---|---|---|
| 서울 업체명 | `심플큐브 포토부스 서울본점` **또는** `… 서울 성수점` 중 1개 | 사업자등록증·간판과 일치하는 쪽 |
| 지점명 | `심플큐브 포토부스 부산점/대전점/전주점` | 실주소가 있는 지점만 플레이스 운영 |
| 영업시간 | **상담 평일 10:00–18:00 / 행사 운영 주말·공휴일 포함(예약제)** — 실제로 매일 전화를 받는다면 `매일 10:00–18:30`으로 전 채널 통일 | 카카오 `24시간`은 반드시 수정 |
| 대표전화 | 사이트·카카오·구글 = 실번호. 네이버는 스마트콜 유지 가능 | |
| 서울 주소 | `서울 성동구 성수이로18길 31 풍림테크원 205,206호` | 플레이스 실측값 |

---

## 6. 구글 비즈니스 프로필(GBP)
- **존재 여부**: 웹검색 3회(한/영, 주소 포함)로 심플큐브 GBP나 구글 지도 리스팅을 찾지 못했다 → **없음으로 추정**([가설], 구글 지도 직접 확인은 하지 않음). 사장님이 business.google.com에서 "심플큐브"를 검색해 기존 리스팅이 있는지 먼저 확인한다.
- **구글 가이드라인 요지**(support.google.com/business/answer/3038177, 이번에 확인):
  - "If you're a service-area business, you should hide your business address from customers."(출장형은 주소 숨김)
  - 출장형은 "one profile for the central office or location with a designated service area"(본사 1개 프로필)이다. 단 "different locations … with separate service areas and separate staff at each location"이면 지점별로 1개씩 가능하다.
  - 서비스 지역은 기지에서 "farther than about 2 hours of driving time"을 넘기지 않는다 → "대한민국 전체" 대신 권역 도시를 넣는다.
  - 이름은 "real-world name", 마케팅 문구·서비스 정보를 덧붙이지 않는다.
  - 영업시간은 "regular customer-facing hours", 시간이 일정치 않은 업종은 생략할 수 있다.

## 7. 권장 코드 변경 (우선순위 순)

**코드 1 — IndexNow [High × S]**: §2-3 패치 + `public/<key>.txt` + `INDEXNOW_KEY`(Production) + `npm i @vercel/functions@^2.2.13`. 배포 뒤 `scripts/indexnow-submit-all.mjs`를 1회 실행한다.

**코드 2 — `src/components/seo/OrganizationSchema.astro` NAP 정리 [High × S, 업체명·시간은 §5-4 확정 후]**
```diff
 const SAME_AS = [
   'https://www.instagram.com/simplecube_photobooth',
   'https://www.instagram.com/simplecube_wedding',
   'https://pf.kakao.com/_vxhEfj',
   'https://blog.naver.com/simple_cube',
-  'https://m.place.naver.com/place/1454645046',
 ];
@@ LocalBusiness (#hq)
-      name: '심플큐브',
+      name: '심플큐브 포토부스 서울본점', // ← 네이버 플레이스·카카오맵 업체명과 글자까지 동일하게(§5-4 확정값)
       alternateName: 'SIMPLE CUBE',
       url: siteUrl,
       telephone: '+82-2-338-9180',
       address: {
         '@type': 'PostalAddress',
-        addressLocality: '서울',
-        addressRegion: 'Seoul',
+        streetAddress: '성수이로18길 31 풍림테크원 205,206호',
+        addressLocality: '성동구',
+        addressRegion: '서울특별시',
         addressCountry: 'KR',
       },
+      geo: { '@type': 'GeoCoordinates', latitude: 37.5419858, longitude: 127.0606467 },
+      hasMap: 'https://m.place.naver.com/place/1454645046',
       sameAs: SAME_AS,
@@
-      openingHours: 'Mo-Fr 10:00-18:00',
+      // 네이버·카카오와 통일한 값만 (예: 상담 평일 10–18시). 확정 전이면 이 속성을 아예 빼 둔다.
+      openingHoursSpecification: [{
+        '@type': 'OpeningHoursSpecification',
+        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
+        opens: '10:00',
+        closes: '18:00',
+      }],
```
지점 주소가 확정되면 같은 `@graph`에 부산·대전·전주 `LocalBusiness`(name=플레이스 업체명, telephone, address, `parentOrganization: {'@id': '#org'}`, `sameAs`=지점 인스타·카카오)를 추가한다. 파일 4번째 줄 주석이 원래 요구하던 작업이다.

**코드 3 — `src/components/seo/ServiceSchema.astro` provider [Med × S]** (지역 페이지에 서울 번호가 들어가지 않도록. 구조화 데이터 담당과 협의)
```diff
-      provider: {
-        '@type': 'LocalBusiness',
-        name: '심플큐브',
-        alternateName: 'SIMPLE CUBE',
-        url: siteUrl,
-        telephone: '02-338-9180',
-        address: { '@type': 'PostalAddress', addressLocality: '서울', addressCountry: 'KR' },
-      },
+      // 전화·주소 없이 브랜드만 가리킨다 — 지점 페이지에서 서울 NAP 와 충돌하지 않도록
+      provider: { '@type': 'Organization', '@id': `${siteUrl}/#org`, name: '심플큐브', url: siteUrl },
```

**코드 4 — `src/pages/contact.astro` 지점 카드에 공식 상호·주소·지도 링크 [Med × S]**
```diff
   {
     name: '서울 본점',
+    placeName: '심플큐브 포토부스 서울본점',          // §5-4 확정값
+    address: '서울 성동구 성수이로18길 31 풍림테크원 205,206호',
+    naverMap: 'https://m.place.naver.com/place/1454645046',
     region: '서울 · 경기 · 강원',
@@ (부산·대전·전주도 같은 필드 — 플레이스 ID 확인 후 채움, 없으면 생략)
@@ 카드 헤더 <h3>{branch.region}</h3> 아래
+                <p class="mt-1 text-xs text-secondary">{branch.placeName}</p>
@@ 전화 블록 아래
+              {branch.address && (
+                <div>
+                  <span class="text-xs text-secondary-light">주소</span>
+                  <p class="text-sm text-primary">{branch.address}</p>
+                </div>
+              )}
+              {branch.naverMap && (
+                <a href={branch.naverMap} target="_blank" rel="noopener noreferrer" class="text-xs text-olive underline">네이버 지도에서 보기</a>
+              )}
```
`csHours`·`csNote`(13-14, 24-25, 35-36, 46-47행)는 §5-4 확정 문구로 바꾼다. 예: `csHours: '상담 평일 10:00 ~ 18:00'`, `csNote: '*행사 운영은 주말·공휴일 포함(예약제)'`.

**코드 5 — `src/components/common/Footer.astro` 사업자 정보 줄 [Med × S, 값은 사장님]**: 이메일 아래에 `상호 · 대표 · 사업자등록번호 · 주소(서울 성동구 성수이로18길 31 풍림테크원 205,206호) · 대표전화 02-338-9180` 한 줄을 넣는다. 한국 사이트에서 흔한 신뢰·NAP 신호이고, 온라인 결제를 받는다면 전자상거래법상 의무 표기다.

**코드 6 — `public/llms.txt` [Low × S]**: `## Contact` 아래에 다음을 추가한다.
```
## Locations (official names — same as Naver Place / Kakao Map)
- 심플큐브 포토부스 서울본점 (HQ): 서울 성동구 성수이로18길 31 풍림테크원 205,206호 · 02-338-9180 · Naver Place https://m.place.naver.com/place/1454645046
- 심플큐브 포토부스 부산점: 010-3122-4746 (Busan·Ulsan·Daegu·Gyeongnam)
- 심플큐브 포토부스 대전점: 010-8838-8122 (Daejeon·Sejong·Chungcheong)
- 심플큐브 포토부스 전주점: 010-5743-8122 (Jeonbuk·Gwangju·Honam)
- Hours: <§5-4 확정값>
```

**코드 7 — `src/pages/rss.xml.ts` 본문 전체 [Low × S]**(네이버 RSS 가이드)
```diff
+import sanitizeHtml from 'sanitize-html';
@@
-      sql: `SELECT title, slug, description, seo_description, created_at
+      sql: `SELECT title, slug, description, seo_description, content, created_at
@@
-            ORDER BY created_at DESC`,
+            ORDER BY created_at DESC LIMIT 30`,
@@
     description: cleanText(String(post.seo_description || post.description || '')),
+    // 네이버: "각 item의 본문은 … 모든 내용(본문 전체 공개)이 포함될 수 있도록" → <content:encoded>
+    content: sanitizeHtml(String(post.content || ''), {
+      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h2', 'h3']),
+      allowedAttributes: { a: ['href'], img: ['src', 'alt'] },
+    }),
```

**코드 8 — `public/robots.txt` [Med × S, PIN 받은 뒤]**: 맨 아래에 다음 한 줄을 추가한다.
```
#DaumWebMasterTool:<다음 웹마스터도구가 발급한 값 그대로>
```

**코드 9 — `src/layouts/BaseLayout.astro:92` 파비콘 절대경로 [Low × S]**
```diff
-    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
+    <link rel="icon" type="image/svg+xml" href="https://simplecube.net/favicon.svg" />
+    <link rel="shortcut icon" href="https://simplecube.net/favicon.ico" />
```

(참고: `publish-scheduled.ts:7`의 "Runs every 5 minutes" 주석은 실제 스케줄 `0 0 * * *`과 맞지 않는다 — 주석 수정 또는 스케줄 조정.)

---

## 8. 사장님 할 일 (순서대로)

**① 표준값 정하기 (10분)** — §5-4 표를 채운다. 서울 업체명(서울본점/서울 성수점 중 하나), 영업시간 문구, 대표전화 원칙을 정해 개발자에게 전달한다.

**② 네이버 스마트플레이스 정비** — smartplace.naver.com → 업체 선택(심플큐브, ID 1454645046)
1. **업체정보 → 업체명**: `심플큐브` → ①에서 정한 이름(예: `심플큐브 포토부스 서울본점`)으로 바꾼다.
2. **업체정보 → 홈페이지**: `https://www.simplecube.net` → **`https://simplecube.net`**
3. **업체정보 → 소개**: `Basic Hapniness` → `Basic Happiness`로 고치고, 첫 문장에 "2019년부터 16,000건, 1세대 프리미엄 포토부스 대여 · 서울·수도권 출장"을 넣는다.
4. **업체정보 → 영업시간**: ①에서 정한 값(사이트와 동일). 주말 행사 운영은 "영업시간 설명"에 적는다.
5. **대표키워드**: `포토부스대여`, `팝업포토부스`, `기업행사포토부스`를 추가한다(현재 결혼식방명록·포토박스·웨딩포토부스·포토방명록·포토부스).
6. **메뉴 → 상품 등록**: 웨딩 / 행사·팝업 / 기업행사 / 졸업 패키지 + 가격(또는 "문의"). 지금은 0개다.
7. **톡톡 연결, 예약(상담 예약) 켜기**: 지금은 둘 다 꺼져 있다.
8. 부산·대전·전주 플레이스도 1~7을 똑같이 하고, 각 플레이스 주소(URL)를 개발자에게 보낸다(사이트 /contact/에 연결).

**③ 카카오맵 정비** — business.kakao.com(카카오비즈니스 파트너센터) → 카카오맵 매장관리
1. 서울 매장: **영업시간 `매일 24시간` → ①의 값**, 업체명 `심플큐브 즉석사진` → ①의 이름, 업종을 행사·이벤트 계열로 바꾼다.
2. 대전 매장: 업체명·업종을 같은 방식으로 고치고, 전화 0502-5553-8235 → 010-8838-8122(또는 사용 원칙에 맞게).
3. 부산·전주: 실주소가 있으면 "매장 등록", 기존 장소가 있으면 "매장주 인증"으로 가져온다.
4. 각 매장에 해당 지점 카카오톡 채널을 연결한다.
5. 서울·대전·전주 채널 "소개"에 표준 태그라인을 넣는다(지금 비어 있음).

**④ 네이버 서치어드바이저** — searchadvisor.naver.com → 웹마스터 도구 → simplecube.net
1. **요청 → 사이트맵 제출**: `https://simplecube.net/sitemap.xml`이 있는지 확인한다(옛 sitemap-index.xml은 지워도 됨).
2. **요청 → RSS 제출**: `https://simplecube.net/rss.xml`
3. IndexNow 배포 뒤 1~2주 안에 **리포트 → 수집 현황**에서 새 글 수집을 확인한다.
4. 급한 페이지는 **요청 → 웹페이지 수집**으로 요청한다.

**⑤ 다음 웹마스터도구** — 다음에서 "다음 웹마스터도구" 검색 → 접속
1. 사이트 등록에 `https://simplecube.net` 입력 → **PIN 코드 발급**(영문+숫자 8~12자, 로그인 비밀번호로도 쓰임)
2. 화면에 나온 `#DaumWebMasterTool:…` 한 줄을 개발자에게 보낸다 → robots.txt 반영·배포
3. 웹마스터도구에서 **인증** → **사이트맵**(`sitemap.xml`)·**RSS** 제출 → 주요 페이지 **수집 요청**

**⑥ Bing 웹마스터 도구** — §4 순서대로(GSC 가져오기, 5분).

**⑦ 구글 비즈니스 프로필 만들기** — business.google.com → simplecube2019@gmail.com 로그인
1. 기존 리스팅을 검색한다("심플큐브", "SIMPLE CUBE"). 있으면 **소유권 요청**, 없으면 **비즈니스 추가**.
2. 이름: 실제 상호 그대로(①의 이름, 키워드 덧붙이지 않기).
3. 카테고리: 검색창에 "photo booth"/"포토부스"를 쳐서 포토부스 서비스 계열을 1차로 고르고, 2차로 이벤트 기획·웨딩 서비스 계열을 고른다(정확한 명칭은 선택 화면에서 확인).
4. "고객이 방문할 수 있는 위치를 추가하시겠습니까?" → **아니요(주소 숨김)**. 인증용 주소에는 서울 사무실 주소를 입력한다(공개되지 않음).
5. **서비스 지역**: 서울본점 = 서울, 경기, 인천(+ 2시간 이내 도시). "대한민국 전체"는 넣지 않는다.
6. 전화 02-338-9180, 웹사이트 `https://simplecube.net/`, 영업시간 = ①의 값.
7. 인증(영상 인증 등 안내에 따름) → 사진 10장 이상, 서비스·상품 등록.
8. 부산·대전·전주에 **별도 상주 인력**이 있으면 지점별 프로필을 각 권역 서비스 지역으로 만든다. 없으면 만들지 않는다.

**⑧ 네이버 검색광고** — searchad.naver.com
1. 브랜드 키워드 `심플큐브`, `심플큐브 포토부스`, `simplecube`에 자사 파워링크를 집행한다(오늘 조회에서 쿠팡 광고만 노출).
2. "포토부스 대여" 광고 문구의 **14,000건 → 16,000건**(사이트와 동일)으로 고친다.

**⑨ 개발자 전달 사항** — Vercel → 프로젝트 determined-goldstine → Settings → Environment Variables
1. `INDEXNOW_KEY` 추가(Production)
2. **`CRON_SECRET`이 있는지 확인**(없으면 예약 발행 크론이 운영에서 500)

**⑩ 블로그 운영 원칙** — 사이트 블로그에는 네이버 블로그 글을 옮기지 않고 사이트 전용 글만 올린다(§1-7).

---

## 부록 — 증거·산출물
- 라이브 응답·헤더·본문: `naver-local/live/` (`ua_results.tsv`, `*.BROWSER|YETI1|YETI2|DAUM|BING.body/.h`, `robots.txt`, `sitemap*.xml`, `rss.xml`, `post_daehaksaeng.html`)
- 네이버 가이드·검색결과·플레이스·블로그 RSS 원본: `naver-local/dl/`(`sa_guide_*.html`, `nsearch_*.html`, `naverblog_rss.xml`, `searchengines.json`), `naver-local/ext/`(`m_place_naver_com_place_1454645046.html`, `kakao_*.html`)
- IndexNow 패치·복사본·테스트 로그: `naver-local/indexnow.patch`, `naver-local/sandbox/`, `naver-local/live/{mock.log,astro_dev*.log,build*.log,tsc*.log}`
- 출처:
  - 네이버 서치어드바이저 가이드 — https://searchadvisor.naver.com/guide/indexnow-request , /guide/indexnow-api-key , /guide/request-feed , /guide/seo-basic-robots , /guide/seo-basic-firewall , /guide/markup-content , /guide/markup-favicon , /guide/structured-data-channel
  - IndexNow — https://www.indexnow.org/documentation , https://www.indexnow.org/searchengines.json
  - Bing GSC 가져오기 — https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools
  - Google — https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping , https://support.google.com/business/answer/3038177
  - 카카오 — https://www.kakaocorp.com/page/detail/8807 (다음 웹마스터도구 발표)
  - 다음 PIN 절차(2차 자료) — https://iter.kr/다음-웹마스터도구-등록
  - 카카오비즈니스 파트너센터 통합(2차 자료) — https://blog.bizgo.io/howto/create-kakaotalk-business-channel-guide-2026/
- 확인하지 못한 것: 인스타그램 계정 실존(로그인 벽), 카카오맵 장소 데이터, 부산·대전·전주 네이버 플레이스, 구글 지도 직접 검색, 다음 웹마스터도구 공식 페이지(TLS/503), 운영 CRON_SECRET 존재 여부(로그 보존 1시간).
