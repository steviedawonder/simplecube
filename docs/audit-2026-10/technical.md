# 기술 SEO · 크롤링/렌더링/색인 진단 보고서 — simplecube.net

- 작성: 기술 SEO 담당 · 2026-10-30 · 대상: 라이브 `https://simplecube.net` (배포 커밋 `2559567` = 저장소 HEAD)
- 범위: 크롤링·렌더링·색인 가능성, 상태 코드, 중복 호스트, 내부 링크 구조, 지역 페이지 유사도, 블로그 URL/구조, SEO와 겹치는 접근성
- 범위 밖(다른 담당): 구조화 데이터 상세 검증, Core Web Vitals, 콘텐츠 전략, 네이버 전용 규칙, AI 크롤러, 분석 도구
- 표기: **[관찰]** = 직접 확인한 사실(URL·응답·코드 위치) / **[가설]** = 근거 있는 추정(검증 불가 부분 명시)
- 우선순위 = 영향(검색 노출·문의 전환: 상/중/하) × 난이도(S/M/L)

---

## 0. 한눈에 보기

### 핵심 발견 (우선순위 순)

| # | 발견 | 영향 | 난이도 | 근거 |
|---|---|---|---|---|
| 1 | **스크롤 전에는 본문이 투명(opacity:0)**: GSAP 등장 애니메이션 때문에 홈 본문 텍스트의 **83%**, `/brand/` 66~76%, `/contact/` 최대 90%, `/wedding/` 45%가 로드 직후 보이지 않음. 홈은 히어로가 `100vh`라서 **세로로 긴 뷰포트(구글 렌더러 방식)에서도 83%가 끝까지 숨겨짐**. 수정안을 로컬에서 검증함: 83% → 1% | 중 | S | [관찰] Playwright 측정·스크린샷 / 순위 영향은 [가설] |
| 2 | **DB 순간 장애 = 핵심 랜딩 500 오류**: `/rental/`·`/corporate/`·`/graduation/`·`/pricing/`·지역 10개 페이지와 블로그가 DB 쿼리 실패를 처리하지 않음(`/wedding/`·`/popup/`만 처리). 10/25 `/pricing` 500 사고와 같은 원인 | 중 | S | [관찰] 코드 + 10/25 런타임 오류 |
| 3 | **블로그 내부 링크 고립**: 12개 글 중 7개는 `/blog/` 목록 단 1곳에서만 링크됨. 서비스 페이지→블로그 링크 0개, 글 본문→서비스 페이지 링크는 12개 글 통틀어 1개(그마저 301). 반면 9/12 글이 blog.naver.com으로 외부 링크. `/blog/` 목록 카드 41개 중 29개가 외부(네이버 후기) | 중상 | S~M | [관찰] |
| 4 | **포트폴리오/웨딩 갤러리는 JS로만 생성**: 원본 HTML에는 "불러오는 중..."만 있음. 웨딩홀 이름 태그(크레스트72, L65웨딩컨벤션 등)와 이미지 98~806장이 렌더링 후에만 존재. 이미지 사이트맵 제목 531개 중 71개가 `IMG_3432`, `5` 같은 파일명 | 중 | M | [관찰] |
| 5 | **블로그 목차(TOC) 링크 오작동**: 5/12 글에서 목차 59개 중 49개가 엉뚱한 제목으로 이동. 붙여넣기 잔재로 빈 `<h2>` 28개. 수정안을 12개 글로 검증함: 불일치 0 | 중하 | S | [관찰] |
| 6 | **중복 호스트** `determined-goldstine-iota.vercel.app`이 전 페이지를 200으로 응답(robots.txt 크롤링 허용). canonical만으로 방어 중 | 중하 | S | [관찰] |
| 7 | **지역 페이지 10개 유사도**: 도시명을 지운 비교에서 평균 25%, 최대 34%(천안·청주·충주 묶음). 텍스트 기준으로는 near-duplicate 아님. doorway 위험은 문구보다 "지점 없는 6개 도시 페이지"라는 의도 쪽 | 중하 | M(콘텐츠) | [관찰]+해석 |
| 8 | 기타 위생: `/inquiry/popup/` 색인 가능(얇은 폼, 기본 description), `/index.html` 200 중복, slug `blog기업행사-…`, 인코딩 URL 161~350자, SSR 응답 charset 누락, 블로그 JSON-LD url 비인코딩, 제목 20/32·설명 13/32 잘림 가능 | 하 | S | [관찰] |

### 정상 확인된 항목 (다시 손댈 필요 없음)

- 사이트맵 체인 정상: `/sitemap.xml` → `sitemap-0.xml`(20) + `sitemap-blog.xml`(12) + `image-sitemap.xml`(15페이지·531이미지). **사이트맵 URL 32개 전부 200, 리다이렉트·noindex 없음**
- 32개 전부 **canonical = 최종 URL**(블로그 인코딩까지 바이트 단위로 일치), `og:url` = canonical, `<html lang="ko">`, **H1 정확히 1개**, title·description **중복 0건**, 고아 페이지 0, 홈에서 **최대 클릭 깊이 2**
- 404 위생 양호: 없는 경로·없는 블로그 slug → 진짜 404 + `X-Robots-Tag: noindex` + `<meta robots noindex>`(soft 404 없음). `/tag/*` → 410. 잘못된 인코딩 → 400
- 정규화 양호: `http→https` 308, `www→apex` 301, `//` → 308, 슬래시 없는 경로 → 301, `?utm_source=` 붙어도 canonical은 깨끗함, 블로그 소문자 hex 인코딩 요청도 canonical은 대문자 표준형
- Vercel 팀 별칭·프리뷰 배포(`*-steviedawonders-projects.vercel.app`)는 Vercel 인증(302 + `X-Robots-Tag: noindex`)으로 보호됨. GitHub Pages 복제본은 404(10/04 조치 유지)
- FAQ 답변·가격 문구·내부 링크는 원본 HTML에 모두 있음(아코디언은 접혀 있을 뿐 DOM에 존재)

---

## 1. 방법 · 증거 파일

- Node 스크립트(plain `fetch`, 수동 리다이렉트 추적, 디스크 캐시, 요청 사이 300ms, 순차 실행) + Playwright(렌더링 비교. 페이지 HTML은 캐시에서 공급하고 이미지·폰트·외부 스크립트는 차단해 라이브 부하를 최소화)
- 라이브 요청 총 **약 92건**(simplecube.net 79, www 3, vercel.app 8, 기타 2). 모든 요청은 `technical/requests.log`에 기록. 문의 폼 제출·POST 없음
- 증거 파일(모두 `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/technical/` 아래)
  - `crawl.json`(사이트맵·페이지별 응답), `html/`(원본 HTML), `analysis.json`·`urls.csv`(URL별 지표), `hygiene.json`(상태 코드 테스트), `hosts2.json`
  - `render.json`·`render2.json`(원본 vs 렌더링, opacity 측정), `shots/`(스크린샷), `dup.json`(지역 페이지 유사도)
  - 스크립트: `lib.mjs`, `crawl.mjs`, `analyze.mjs`, `hygiene.mjs`, `render.mjs`, `render2.mjs`, `dup.mjs`, `dup2.mjs`
  - 수정안 사전 검증: `repo-copy/`(저장소 사본, GSAP 수정 적용본), `gsap-local.mjs`(로컬 dev 서버 측정), `test-toc.mjs`(TOC 수정 검증). 원본 저장소 `git status` 변경 0건 확인. 로컬 dev 서버(4399)는 종료함

---

## 2. URL 인벤토리 (사이트맵 32개 + 내부 링크로 발견 3개)

글자 = 문자 수, 폭 = 표시 폭 근사(한글·전각 2, 그 외 1). **한글은 라틴 문자보다 약 2배 넓게 표시**되므로 구글 PC 제목 약 600px ≈ 60 폭(한글 30자 안팎), 설명 약 920px ≈ 160 폭으로 잡았다(근사치이며 모바일은 더 길게 보임).

| URL | 상태 | 깊이 | 내부유입 | title 글자/폭 | desc 글자/폭 | H1 | canonical=최종 | JSON-LD | 본문 글자(main) | 내부링크 | alt 없음/빈 alt |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 0 | 34 | 32/54 | 85/139 | 1 | ✅ | Organization, LocalBusiness, WebSite | 1010 | 22 | 0/10 |
| `/blog/` | 200 | 1 | 34 | 28/47 | 48/84 | 1 | ✅ | — | 2638 | 34 | 0/0 |
| `/brand/` | 200 | 1 | 34 | 12/16 | 44/62 | 1 | ✅ | — | 886 | 22 | 0/0 |
| `/busan/` | 200 | 1 | 34 | 36/60 | 97/161 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2547 | 22 | 0/2 |
| `/cheonan/` | 200 | 1 | 34 | 38/64 | 83/138 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2425 | 22 | 0/2 |
| `/cheongju/` | 200 | 1 | 34 | 35/58 | 88/148 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2411 | 22 | 0/2 |
| `/chungju/` | 200 | 1 | 34 | 37/62 | 87/146 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2396 | 22 | 0/2 |
| `/contact/` | 200 | 1 | 34 | 37/62 | 68/116 | 1 | ✅ | — | 397 | 22 | 0/0 |
| `/corporate/` | 200 | 1 | 34 | 38/65 | 91/153 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2503 | 22 | 0/3 |
| `/daegu/` | 200 | 1 | 34 | 37/62 | 83/138 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2494 | 22 | 0/2 |
| `/daejeon/` | 200 | 1 | 34 | 36/57 | 108/178 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2613 | 22 | 0/2 |
| `/graduation/` | 200 | 1 | 34 | 33/56 | 80/138 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 1867 | 22 | 0/2 |
| `/gwangju/` | 200 | 1 | 34 | 41/70 | 89/150 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2577 | 22 | 0/2 |
| `/jeonju/` | 200 | 1 | 34 | 38/64 | 100/167 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2507 | 22 | 0/2 |
| `/popup/` | 200 | 1 | 34 | 39/67 | 105/175 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 3069 | 22 | 0/5 |
| `/pricing/` | 200 | 1 | 34 | 34/55 | 103/165 | 1 | ✅ | BreadcrumbList, Service | 1231 | 22 | 0/2 |
| `/rental/` | 200 | 1 | 34 | 35/57 | 99/165 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2924 | 22 | 0/2 |
| `/seoul/` | 200 | 1 | 34 | 34/56 | 80/131 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2469 | 22 | 0/2 |
| `/ulsan/` | 200 | 1 | 34 | 34/56 | 83/138 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2419 | 22 | 0/2 |
| `/wedding/` | 200 | 1 | 34 | 39/61 | 89/148 | 1 | ✅ | BreadcrumbList, Service, FAQPage | 2874 | 22 | 0/0 |
| `/blog/수원-웨딩-포토부스-추천-더아리엘-설치-전-확인…` | 200 | 2 | 11 | 43/72 | 93/160 | 1 | ✅ | BlogPosting, BreadcrumbList | 4466 | 26 | 0/0 |
| `/blog/서울대-교수회관-웨딩포토부스-후기-설치-전-알아…` | 200 | 2 | 9 | 43/73 | 107/184 | 1 | ✅ | BlogPosting, BreadcrumbList | 4396 | 26 | 0/0 |
| `/blog/부평-웨딩-포토부스-추천-빌라드마리-하객-참여-…` | 200 | 2 | 8 | 44/74 | 101/175 | 1 | ✅ | BlogPosting, BreadcrumbList | 5278 | 26 | 0/0 |
| `/blog/기업행사-포토부스-추천-대학생-프로그램에-필요한…` | 200 | 2 | 9 | 42/72 | 89/153 | 1 | ✅ | BlogPosting, BreadcrumbList | 5386 | 26 | 0/0 |
| `/blog/어린이날행사-포토부스-대여-아이들도-편하게-찍는…` | 200 | 2 | **1** | 58/99 | 112/192 | 1 | ✅ | BlogPosting, BreadcrumbList | 4195 | 26 | 0/0 |
| `/blog/논현2동성당-웨딩포토부스대여-후기-성당-결혼식을…` | 200 | 2 | **1** | 25/44 | 89/156 | 1 | ✅ | BlogPosting, BreadcrumbList | 2881 | 26 | 0/0 |
| `/blog/크레스트72-웨딩-포토부스-추천-보타닉-글라스홀…` | 200 | 2 | **1** | 42/70 | 140/242 | 1 | ✅ | BlogPosting, BreadcrumbList | 4050 | 27 | 0/0 |
| `/blog/학교-행사-포토부스-추천-하반기-준비-전-확인할…` | 200 | 2 | 4 | 42/70 | 125/216 | 1 | ✅ | BlogPosting, BreadcrumbList | 7204 | 26 | 0/0 |
| `/blog/와인-행사-포토부스-대여-후기-jw메리어트-와인…` | 200 | 2 | **1** | 53/85 | 91/154 | 1 | ✅ | BlogPosting, BreadcrumbList | 3319 | 26 | 0/0 |
| `/blog/호텔파크하비오-웨딩포토부스-하객-모두가-함께-즐…` | 200 | 2 | **1** | 54/89 | 141/250 | 1 | ✅ | BlogPosting, BreadcrumbList | 3468 | 26 | 0/0 |
| `/blog/blog기업행사-포토부스-로레알코리아/` | 200 | 2 | **1** | 41/70 | 110/190 | 1 | ✅ | BlogPosting, BreadcrumbList | 4934 | 26 | 0/0 |
| `/blog/심플큐브-웨딩포토부스-대여-서비스-완벽-가이드-…` | 200 | 2 | **1** | 39/63 | 88/147 | 1 | ✅ | BlogPosting, BreadcrumbList | 3660 | 26 | 0/0 |

내부 링크로 추가 발견(사이트맵 밖) 3개 [관찰]:
- `/contact/?type=wedding` — 전 페이지(메뉴)에서 링크. 200, canonical → `/contact/` (정상)
- `/inquiry/popup/` — 전 페이지(플로팅 문의 버튼 `src/components/common/FloatingContactButton.astro:19`)에서 링크. 200, **noindex 없음**, 사이트맵에서는 제외(`astro.config.mjs` filter) → 신호 불일치(§8)
- `/popup` (슬래시 없음) — 블로그 글 1개 본문의 `https://simplecube.net/popup#portfolio`. 301 → `/popup/`(§7)

메타 길이 [관찰]: 제목 60폭 초과 **20/32**(핵심 9, 블로그 11), 설명 160폭 초과 **13/32**(핵심 6, 블로그 7). 대부분 넘치는 부분은 뒤쪽 "— 심플큐브"나 부가 문구라서 영향은 **하**. 키워드를 앞에 두는 현재 패턴은 유지하면 된다. `/brand/` 제목 "BRAND | 심플큐브"(12자)·설명 44자는 너무 약함(하, S).

URL별 전체 지표(og:image, 단어 수, 링크 목록 등)는 `technical/urls.csv`(엑셀에서 바로 열림)와 `analysis.json`에 있음.

---

## 3. 상태 코드 위생 [관찰]

| 테스트 | 요청 | 결과 | 판정 |
|---|---|---|---|
| 없는 경로 | `/this-does-not-exist-123/` | **404**, `X-Robots-Tag: noindex`, meta noindex | ✅ soft 404 아님 |
| 없는 경로(슬래시 없음) | `/this-does-not-exist-123` | 404 (리다이렉트 없이) | ✅ |
| 없는 블로그 slug | `/blog/this-post-does-not-exist-xyz/` | **404** + noindex (canonical이 `/404/`로 찍힘, noindex라 무해) | ✅ |
| 대문자 slug | `/blog/This-Post-Does-Not-Exist/` | 301 → 소문자 → 404 | ✅ |
| 잘못된 % 인코딩 | `/blog/%E0%A4%A/` | 400 (Vercel 단계) | ✅ 5xx 아님 |
| 대문자 경로 | `/WEDDING/`, `/Wedding` | 404 + noindex | ✅ (대소문자 구분. 301은 선택사항) |
| 슬래시 없음 | `/wedding`, `/blog`, `/inquiry/popup` | 301 → 슬래시 버전 | ✅ |
| 블로그 글 슬래시 없음 | `/blog/%EC%88%98…가이드` | 301 → `/…/` | ✅ |
| UTM | `/wedding/?utm_source=x`, `/?utm_source=x`, 블로그 글 `?utm_source=x` | 200, **canonical은 파라미터 없는 URL** | ✅ |
| 카테고리 파라미터 | `/blog/?category=x` | 200, canonical `/blog/` | ✅ |
| `/index.html` | `/index.html` | **200**, canonical `/` | ⚠️ 하: 중복이지만 canonical로 방어. 301 권장 |
| `/wedding/index.html` | | 404 | ✅ |
| 이중 슬래시 | `/wedding//` | 308 → `/wedding/` | ✅ |
| http | `http://simplecube.net/` | 308 → https | ✅ |
| http + www | `http://www.simplecube.net/wedding/` | 308 → `https://www` → 301 → apex (2단계) | ✅ (경미) |
| https + www | `https://www.simplecube.net/wedding/?a=1` | 301 → apex, 쿼리 유지 | ✅ |
| 옛 WP | `/faq` → `/wedding/#qna` 301, `/tag/foo/` → **410** | ✅ |
| 옛 사이트맵 | `/sitemap-index.xml` | 200 (sitemap-0만 포함하는 Astro 기본 인덱스) | 하: 서치콘솔·서치어드바이저에 아직 등록돼 있으면 제거 |

**DB 장애 시 5xx (영향 중 · S) [관찰: 코드 / 사고 기록]**
- 브리프: 10/25 Turso "socket hang up" → `/pricing` 500.
- 원인 코드: DB 실패를 처리하지 않는 페이지 →
  - `src/pages/pricing.astro:15`, `src/pages/rental.astro:15`, `src/pages/corporate.astro:15`, `src/pages/graduation.astro:14` — `Promise.all([...db.execute...])`. 하나만 실패해도 페이지 전체 500
  - 지역 10개 `src/pages/{seoul,busan,daegu,daejeon,gwangju,ulsan,jeonju,cheonan,cheongju,chungju}.astro:14` — try/catch 없는 `await db.execute(...)`
  - `src/pages/blog/index.astro:9`, `src/pages/blog/[slug].astro:20` — 처리 없음
  - 반면 `src/pages/wedding.astro:17`, `src/pages/popup.astro:18`은 `Promise.allSettled`로 안전. 컴포넌트(MachineShowcase·PackageDetails·CustomOptions·TemplateGallery)도 try/catch 있음
- 영향 [가설]: 구글봇·네이버 Yeti가 5xx를 반복해서 받으면 크롤링 빈도를 줄이고, 오래가면 색인에서 뺄 수 있다. CDN 캐시(`s-maxage=60, stale-while-revalidate=86400`, `src/middleware.ts:136`)가 상당 부분 흡수하지만, 캐시 미스(다른 엣지, 첫 요청)는 그대로 노출된다.
- 수정: §9-B.

---

## 4. 중복 호스트 [관찰]

| 호스트 | 결과 | 위험 |
|---|---|---|
| `determined-goldstine-iota.vercel.app` (프로젝트 도메인 목록에 등록) | `/` 200, `/wedding/` 200, `/robots.txt` 200(**운영과 동일: `Allow: /`**, Sitemap은 simplecube.net), `X-Robots-Tag` 없음, canonical → `https://simplecube.net/…` | **중하**: canonical이 있어 구글은 대체로 운영 도메인으로 통합한다. 하지만 이 주소로 공유·백링크가 생기면 신호가 갈라지고, canonical은 '힌트'일 뿐이다 |
| `determined-goldstine-steviedawonders-projects.vercel.app`, `…-git-main-…`, 프리뷰 `…-git-claude-…` | **302 → vercel.com/sso-api**, `X-Robots-Tag: noindex` | 없음 (보호 설정 `ssoProtection: all_except_custom_domains`) |
| `determined-goldstine.vercel.app` | 404 NOT_FOUND | 없음 |
| `simplecube.vercel.app` | 200 "R3F + Webxr" — **관련 없는 다른 사이트** | 없음 |
| `steviedawonder.github.io/simplecube/` | 404 | 없음 (10/04 조치 유지) |
| `www.simplecube.net` | 301 → apex | 없음 |

- 근거: Vercel 프로젝트 `determined-goldstine`(prj_No0aMoe1woI6pa38CK5L4SW3Qn5D)의 도메인 목록은 `simplecube.net`, `www.simplecube.net`, `determined-goldstine-iota.vercel.app` 3개이고, 별칭 14개 중 공개로 응답하는 vercel.app 주소는 `-iota` 1개뿐(Vercel API 조회 + 각 1회 요청).
- 이 호스트가 실제로 색인됐는지는 **확인 못 함**(검색 `site:` 조회 결과가 무관한 vercel.com 페이지뿐이었음. 서치콘솔 확인 필요).
- 수정: `vercel.json`에 호스트 기반 301을 추가하되 **`/api/`는 제외**(Vercel 크론은 리다이렉트를 따라가지 않으므로 `/api/cron/publish-scheduled`가 끊기지 않게) → §9-C.

---

## 5. 렌더링: 원본 HTML vs Playwright 렌더링

### 5-1. 콘텐츠 차이 (원본 HTML → 렌더링 DOM) [관찰]

| 페이지 | 본문 글자 원본→렌더 | 렌더링 후에만 있는 것 | FAQ 항목(원본/렌더) | 내부 링크(원본/렌더) |
|---|---|---|---|---|
| `/` | 1010 → 1010 | 없음 | 0/0 | 2/2 |
| `/wedding/` | 2874 → 2978 | 웨딩 갤러리 이미지 98장 + **웨딩홀 이름 태그 14개**(크레스트72, L65웨딩컨벤션, 서원아트리움, 더채플대치, 웨스틴조선, 파크하비오 등) | 5/5 | 5/5 |
| `/popup/` | 3069 → 3107 | 포트폴리오 이미지 806장(무한 스크롤용 복제 포함) + 태그(팝업부스, 우드Edge, 서울어텀페스타, 와인앤버스커…) | 6/6 | 5/5 |
| `/corporate/` | 2503 → 2543 | 포트폴리오 이미지 792장 + 동일 태그 | 6/6 | 3/3 |
| `/rental/` | 2924 → 2924 | 없음 (가격 문구 3개 원본에 있음) | 6/6 | 6/6 |
| `/busan/` | 2547 → 2547 | 없음 | 4/4 | 8/8 |
| 블로그(학교 행사 글) | 7204 → 7204 | 없음 | — | 7/7 |

- **결론**: 텍스트·FAQ 답변·가격·내부 링크는 모두 원본 HTML에 있다(SSR 잘 되어 있음). **예외는 포트폴리오/갤러리 영역**: `src/components/popup/PortfolioGallery.astro:44`·`src/pages/wedding.astro:97`의 원본 HTML은 "불러오는 중..."뿐이고, 내용은 `fetch('/api/portfolio…')`(`PortfolioGallery.astro:129`, `wedding.astro:337`)로만 채워진다.
  - 구글은 렌더링하므로 이미지를 볼 수 있다(robots.txt `Allow: /api/portfolio` 덕분). 하지만 [가설] 네이버는 중요한 콘텐츠를 정적 HTML로 제공하라고 권장하므로, 웨딩홀 이름(지역·웨딩홀 롱테일 키워드)과 현장 사진이 네이버 수집에서 빠질 가능성이 높다.
  - 이미지 사이트맵은 `/wedding/`에 335장, `/popup/`에 183장을 제출한다. 그런데 이 이미지들은 원본 HTML에 없고, 웨딩 갤러리는 한 번에 6~9장만 그린다(`wedding.astro:351` perPage) → 사이트맵의 이미지가 그 페이지에 실제로 보이지 않는 상태 [관찰].
  - 이미지 제목·alt 품질 [관찰]: 이미지 사이트맵 `<image:title>` 531개 중 **71개가 파일명이나 숫자**(`IMG_3432`, `KakaoTalk_Image_2026-07-24-…`, `5`, `10`). `/api/portfolio?page_tag=popup` 183개 중 48개 제목이 `IMG_…`. 렌더링된 alt에 `28029626-1780968570055`, 오타 `ㅏ로레알코리아 포토부스 행사 _ 베너`도 있음. 원인: `src/pages/image-sitemap.xml.ts:167`와 `PortfolioGallery.astro:240-241`이 DB의 `title`을 그대로 씀.

### 5-2. GSAP `.gs-*` 등장 애니메이션 — 투명한 본문 [관찰]

측정 방법: 각 시나리오마다 새 페이지를 열고, `<main>` 텍스트 중 "자신 또는 조상의 opacity가 0인" 글자 비율을 셌다.

| 페이지 | 모바일 412×915, 스크롤 없음 | **세로 12,000px 뷰포트**, 스크롤 없음 | 데스크톱 1366×768, 스크롤 없음 | 데스크톱, 끝까지 스크롤 후 |
|---|---|---|---|---|
| `/` (홈) | **83%** (842/1010자) | **83%** (838자) | **83%** | 1% (히어로 회전 문구, 의도된 것) |
| `/brand/` | 66% | 0% | **76%** | 0% |
| `/contact/` | 16% | 0% | **90%** | 0% |
| `/wedding/` | 45% | 21% | 45% | 21%* |
| `/popup/`·`/rental/`·`/corporate/`·`/busan/`·블로그 | gs 요소 없음(0~1%) | — | — | — |

\* `/wedding/`에서 스크롤 후에도 남는 21%는 GSAP가 아니라 **마우스를 올려야 보이는 문구**(패키지 사양 팝오버 `src/components/wedding/PackageDetails.astro:163`의 `opacity-0 group-hover:opacity-100`, 데스크톱 제휴 웨딩홀 이름 `PartnerHalls.astro:51`). 원래 그렇게 설계된 것이다.

- 홈에서 숨겨지는 블록: WHY SIMPLE CUBE(251자), OUR STORY/브랜드 스토리(577자). 스크린샷 비교: `technical/shots/home_compare_thumb.png`(왼쪽 = 스크롤 없이 전체 캡처: 해당 섹션이 하얗게 비어 있음 / 오른쪽 = 스크롤 후). 원본 크기는 `home_fullpage_noscroll.png`, `home_fullpage_afterscroll.png`.
- 원인 코드: `src/layouts/BaseLayout.astro:151-266`
  - `DOMContentLoaded` 시점에 모든 `.gs-*` 요소를 `gsap.fromTo(el, {opacity: 0, …}, {…, scrollTrigger: {start: 'top 85%'}})`로 즉시 투명 처리한다(fromTo의 immediateRender 기본값).
  - 요소가 화면 85% 선까지 스크롤돼야 보인다. 그래서 **스크롤하지 않는 렌더러와 전체 페이지 캡처에서는 끝까지 투명**하다.
- 홈만 세로로 긴 뷰포트에서도 숨겨지는 이유: `src/components/home/HeroSection.astro:4`(`h-screen min-h-screen`)와 `src/components/home/ServicesSection.astro:12,43`(`h-[50vh] md:h-screen`)이 뷰포트 높이에 비례한다. 뷰포트를 늘리면 히어로도 같이 늘어나(12,000px 뷰포트 → 문서 높이 29,553px) 본문이 항상 트리거 선 아래에 남는다.
- 영향 판단:
  - [관찰] 텍스트는 DOM에 있으므로 "색인 불가"는 아니다.
  - [가설] 구글 렌더러는 스크롤 대신 긴 뷰포트로 렌더링하는 것으로 알려져 있다. 홈의 핵심 소개 문단이 "사용자에게 보이지 않는 텍스트"로 평가돼 가중치가 낮아지거나, 서치콘솔 '실제 URL 테스트' 스크린샷이 비어 보일 수 있다.
  - 네이버는 원본 HTML 기준이며, 원본 CSS에는 투명 처리가 없으므로 영향이 없다.
  - 영향 **중**, 수정 **S**(코드 1곳) → §9-A.

---

## 6. 지역 페이지 10개 유사도 (doorway 위험 정량화) [관찰]

방법: 원본 HTML의 `<main>` 보이는 텍스트를 쓰고, 5단어 shingle 자카드 유사도를 쌍마다 계산했다. "도시명 정규화"는 서울/부산 등과 SEOUL/BUSAN 등을 같은 토큰으로 바꾼 뒤 비교한 것(= 도시 이름만 바꾼 템플릿 문장을 같은 문장으로 취급).

| 측정 | 최소 | 평균 | 최대 | 페이지당 템플릿 비중(10개 중 8개 이상 페이지에 공통) |
|---|---|---|---|---|
| main 텍스트, 5단어 shingle | 13% | 16% | 21% | 23~27% |
| main 텍스트, 8글자 shingle | 18% | 21% | 27% | 31~34% |
| 전체 body(메뉴·푸터 포함), 5단어 | 18% | 21% | 27% | 31~34% |
| **도시명 정규화**, main, 5단어 | 21% | **25%** | **34%** | **35~40%** |
| 도시명 정규화, main, 3단어 | 27% | 31% | 38% | 42~46% |

유사도 행렬(main, 5단어 shingle, 정규화 전, %):

```
          seoul  busan  daegu daejeo gwangj  ulsan jeonju cheona cheong chungj
seoul      100%    15%    14%    14%    13%    13%    14%    14%    14%    14%
busan       15%   100%    16%    16%    15%    16%    16%    15%    15%    14%
daegu       14%    16%   100%    15%    15%    18%    15%    16%    16%    16%
daejeon     14%    16%    15%   100%    15%    15%    16%    17%    18%    17%
gwangju     13%    15%    15%    15%   100%    16%    17%    17%    17%    16%
ulsan       13%    16%    18%    15%    16%   100%    15%    17%    16%    16%
jeonju      14%    16%    15%    16%    17%    15%   100%    15%    16%    16%
cheonan     14%    15%    16%    17%    17%    17%    15%   100%    21%    21%
cheongju    14%    15%    16%    18%    17%    16%    16%    21%   100%    21%
chungju     14%    14%    16%    17%    16%    16%    16%    21%    21%   100%
```

- 해석:
  - 보통 near-duplicate로 보는 기준(50~60% 이상)과는 거리가 멀다. 2026-05 차별화 작업(`RegionUniqueInfo.astro`, 도시별 이야기·행사장·출장비)이 텍스트상으로는 효과가 있었다.
  - 다만 **같은 구조의 템플릿 문장이 35~40%**다. 정규화 후 233개 5단어 구가 10개 페이지 전부에 똑같이 들어 있다(예: "전 지역에 포토부스 출장 설치를 제공하는", "원목 소재의 프리미엄 포토부스 브랜딩이 가능한 커스텀 부스", 자동 생성 FAQ 4문항).
  - 가장 비슷한 묶음은 **천안·청주·충주(33~34%)**.
- doorway 위험의 핵심은 문구 유사도보다 **실제 지점이 없는 6개 도시(대구·광주·울산·천안·청주·충주)가 모두 같은 문의 흐름으로 이어지는 구조**다 [가설: 구글의 doorway 정의에 해당할 여지]. 서치콘솔 10/04 기준 일부 지역 페이지가 '발견됨-색인 안 됨'인 것과도 맞는다.
- 권고(콘텐츠 담당과 협의):
  - (a) 각 도시에 실제 진행 사례(사진·행사장·후기) 2~3건을 추가한다.
  - (b) 천안·청주·충주는 "충청권" 1개 페이지로 합치는 것을 검토한다(합치면 옛 URL은 301).
  - (c) 자동 생성 FAQ 4문항(`RegionUniqueInfo.astro:55-72`)은 도시마다 같은 질문 틀이므로 실제 지역 질문으로 바꾼다.

---

## 7. 블로그 [관찰]

1. **인코딩 / canonical**:
   - 12개 글 모두 사이트맵 `<loc>`(대문자 hex 퍼센트 인코딩) = 요청 URL = canonical = og:url로 **바이트 단위까지 일치**. 소문자 hex로 요청해도 canonical은 대문자 표준형으로 나온다.
   - 예외(하): JSON-LD `BlogPosting.url`, `mainEntityOfPage.@id`, Breadcrumb `item`은 **인코딩하지 않은 한글**이다(`src/pages/blog/[slug].astro:138`). 같은 IRI라 문제 될 가능성은 낮지만 통일을 권장한다.
2. **slug 이상**:
   - `/blog/blog기업행사-포토부스-로레알코리아/` — slug가 `blog`로 시작해 URL에 "blog"가 두 번 들어감.
   - 인코딩된 URL 길이가 161~350자(최장: 논현2동성당 글). 한글 1자가 9바이트(`%XX%XX%XX`)가 되기 때문이다. 공유·카톡 미리보기·일부 도구에서 불리하므로 새 글은 5~6단어 이하 slug를 권장(하).
   - slug를 바꾸면 옛 URL이 404가 된다. 저장소에 slug 변경 시 301을 거는 장치가 없다(`migrateBadSlugs`는 DB만 바꿈, `src/lib/db.ts:534`) → §9-H.
3. **목록 / 카테고리 / 페이지네이션**:
   - `/blog/`는 페이지네이션 없이 카드 41개를 한 페이지에 보여준다(내부 글 12 + **외부 네이버 후기 29**).
   - 카테고리(전체/웨딩/팝업)는 JS 버튼이다(`src/pages/blog/index.astro:59-64`). 크롤링할 수 있는 카테고리 URL은 없지만, `?category=` 파라미터는 canonical `/blog/`로 정리되므로 기술적 결함은 아니다.
4. **내부 링크 고립 (중상)**:
   - 유입 링크가 1개(`/blog/` 목록만)인 글이 **7/12**다. 서비스·지역 페이지에서 블로그 글로 가는 링크는 **0**이다.
   - 글 본문 → 사이트 내부 링크는 12개 글 합계 **1개**(크레스트72 글의 `https://simplecube.net/popup#portfolio` → 301)뿐이다. 반대로 9/12 글이 `blog.naver.com/simple_cube/…`로 외부 링크하고 있다.
   - '관련 글'은 같은 카테고리·태그 글이 있을 때만 나와서(`[slug].astro:50-69`) 7개 글은 다른 글에서 링크를 받지 못한다.
   - [가설] 서치콘솔의 "블로그 대부분 '발견됨-현재 색인 안 됨'"과 직접 관련이 있다. 구글이 크롤링 우선순위를 낮게 판단하는 대표 신호다.
   - 수정: §9-E.
5. **목차(TOC) 앵커 오작동 (중하)**:
   - 5개 글에서 목차 링크 59개 중 **49개가 다른 제목으로 이동**한다(서울대 15/16, 수원 19/22, 심플큐브 가이드 9/12, 크레스트72 5/5, 논현2동 1/4).
   - 원인:
     - `normalizeContent()`의 빈 헤딩 제거 정규식(`[slug].astro:115`)이 `<h2><span class="s1"><b><br></b></span></h2>`처럼 태그로 감싼 빈 헤딩은 지우지 못한다.
     - `extractToC()`(`:82-92`)는 빈 헤딩을 건너뛰지만, `injectIds()`(`:94-99`)는 빈 헤딩에도 순서대로 id를 붙인다. 그래서 id가 하나씩 밀린다.
   - 결과: 빈 `<h2>` 28개가 문서 구조에 남는다. 구글의 "바로가기(jump to)" 링크와 사용자 이동이 엉뚱한 곳을 가리킨다. 수정: §9-D.
6. **붙여넣기 잔재 → 콘텐츠 담당 전달 사항** [관찰 + 가설]:
   - 6/12 글에 네이버 스마트에디터 클래스 `se-*`가 463~1,034개, 인라인 style이 최대 1,201개 있다.
   - 부평 글에는 텍스트 없는 링크 10개(`se-oglink-info`, villademr.com)가 있다.
   - 같은 6개 글에 중복 `id` 속성(`SE-…`)이 26~62개 있다(HTML 규칙 위반. 앵커·접근성 도구가 오작동할 수 있음). 붙여넣기 단계에서 `se-*` 클래스·`id`·인라인 style을 제거하는 정리 로직을 `normalizeContent()`에 추가할 것을 권장한다.
   - [가설] 네이버 블로그 원문을 그대로 옮긴 **도메인 간 중복**일 가능성이 높다. 그렇다면 구글이 네이버 원문을 대표 URL로 보고 사이트 글을 색인하지 않을 수 있다. 원문 대조는 하지 않았다(콘텐츠 담당 확인 필요).

---

## 8. SEO와 겹치는 접근성 [관찰]

- `lang="ko"`: 전 페이지 ✅. H1: 전 페이지 1개 ✅. 제목 단계 건너뜀: 블로그 1개 글에서 h2→h4 1건(하)
- 빈 제목: 블로그 5개 글 28개(§7-5)
- 텍스트 없는 링크: 부평 글 10개(붙여넣은 OG 카드). 카드형 링크는 텍스트를 포함해 "자세히 보기" 같은 일반 문구만 있는 링크는 없음 ✅
- 이름 없는 버튼: `/popup/`의 `#bg-prev`·`#bg-next`, `/wedding/`의 `#ps-prev`·`#ps-next`(아이콘만 있음 → `aria-label="이전"/"다음"` 추가, 하·S)
- 라벨 없는 입력: `/blog/` 검색창(`index.astro:57`, placeholder만 있음), `/inquiry/popup/` 입력 3개 → `<label>` 또는 `aria-label` 추가(하·S)
- 이미지 alt:
  - `alt` 속성이 아예 없는 이미지는 0개 ✅
  - 홈의 `alt=""` 10개는 히어로 배경 슬라이드(`HeroSection.astro:22-31`)라 장식용으로 허용 가능
  - 지역·서비스 페이지의 `alt=""` 2~5개는 라이트박스 자리표시자 `<img src="" alt="">`(무해)
  - 실제 문제는 JS 갤러리의 파일명 alt(§5-1)
- 아코디언 버튼에 `aria-controls` 없음(하)

---

## 9. 코드 수정안 (파일 · 정확한 변경)

### A. GSAP: 본문을 기본적으로 '보이게' 두기 — `src/layouts/BaseLayout.astro:143-268` (영향 중 · S)

원칙: 처음 로드에서는 아무것도 숨기지 않는다. 실제 방문자가 처음 스크롤·터치·키 입력을 했을 때, **그 시점에 화면 아래에 있는 요소에만** 등장 애니메이션을 건다. 스크롤하지 않는 렌더러·캡처에는 투명 상태가 생기지 않고, 사용자 경험은 그대로다.

```astro
<!-- GSAP Initialization (교체본) -->
<script>
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  gsap.registerPlugin(ScrollTrigger);

  let armed = false;
  function arm() {
    if (armed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    armed = true;
    const fold = window.innerHeight;
    const off = window.innerWidth < 768 ? 40 : 80;
    const below = (el: Element) => el.getBoundingClientRect().top > fold; // 이미 보이는 요소는 건드리지 않음
    const st = (trigger: Element) => ({ trigger, start: 'top 90%', once: true });
    const anim: [string, gsap.TweenVars, number][] = [
      ['.gs-fade-up',     { opacity: 0, y: 60 },    1],
      ['.gs-fade-in',     { opacity: 0 },           1.2],
      ['.gs-slide-left',  { opacity: 0, x: -off },  1],
      ['.gs-slide-right', { opacity: 0, x: off },   1],
      ['.gs-scale-in',    { opacity: 0, scale: 0.9 }, 1.2],
    ];
    for (const [sel, from, duration] of anim) {
      gsap.utils.toArray<HTMLElement>(sel).filter(below).forEach((el) =>
        gsap.fromTo(el, from, { opacity: 1, x: 0, y: 0, scale: 1, duration, ease: 'power3.out', scrollTrigger: st(el) }));
    }
    gsap.utils.toArray<HTMLElement>('.gs-stagger').filter(below).forEach((box) =>
      gsap.fromTo(box.children, { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, scrollTrigger: st(box) }));
  }
  // 렌더러·크롤러는 이런 사용자 입력을 발생시키지 않으므로 본문이 숨겨지지 않는다
  ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) =>
    window.addEventListener(evt, arm, { once: true, passive: true }));
</script>
```

선택(디자인 확인 후): 홈 섹션 높이에 상한을 둬 긴 뷰포트 캡처를 정상화.
- `HeroSection.astro:4` `h-screen min-h-screen` → `h-[100svh] min-h-[560px] max-h-[1100px]`
- `ServicesSection.astro:12,43` `h-[50vh] md:h-screen` → `h-[50svh] max-h-[560px] md:h-screen md:max-h-[1000px]`

**사전 검증 완료 [관찰]**: 저장소 사본(스크래치 폴더, 원본 저장소는 수정하지 않음)에 위 코드를 적용하고 로컬 dev 서버(포트 4399)에서 측정했다. 수정 전 로컬 수치는 라이브와 똑같이 재현됐다(`technical/gsap-local.mjs`).

| 페이지 | 수정 전: 숨김 비율(모바일 / 긴 뷰포트 / 데스크톱, 스크롤 없음) | 수정 후 | 스크롤 시 애니메이션 동작 |
|---|---|---|---|
| `/` | 83% / 83% / 83% | **1% / 1% / 1%** (남은 1% = 히어로 회전 문구, 의도된 것) | ✅ 동작 |
| `/brand/` | 66% / 0% / 76% | **0% / 0% / 0%** | ✅ |
| `/contact/` | 16% / 0% / 90% | **0% / 0% / 0%** | ✅ |
| `/wedding/`(로컬 DB) | 32% / 6% / 32% | **6% / 6% / 6%** (6% = hover 팝오버) | ✅ |

`npx astro build`(사본) 정상 완료. 배포 후 서치콘솔 → URL 검사 → `https://simplecube.net/` → "실제 URL 테스트" → "테스트된 페이지 보기 → 스크린샷"에서 WHY SIMPLE CUBE·브랜드 스토리가 보이는지 한 번 더 확인.

### B. DB 장애에도 200으로 렌더링 (영향 중 · S)

`src/pages/rental.astro:15-20` (corporate `:15-20`, graduation `:14-19`, pricing `:15-19`도 같은 패턴, 변수명만 다름):

```ts
const [rentalFaqResult, popupFaqResult] = await Promise.allSettled([
  db.execute({ sql: 'SELECT question, answer FROM faqs WHERE page = ? AND active = 1 ORDER BY sort_order ASC, id ASC', args: ['rental'] }),
  db.execute({ sql: 'SELECT question, answer FROM faqs WHERE page = ? AND active = 1 ORDER BY sort_order ASC, id ASC', args: ['popup'] }),
]);
const rowsOf = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value.rows : []);
const faqItems = (rowsOf(rentalFaqResult).length > 0 ? rowsOf(rentalFaqResult) : rowsOf(popupFaqResult)) as { question: string; answer: string }[];
```

지역 10개 `src/pages/<city>.astro:14-15`:

```ts
let cityFaqs: { question: string; answer: string }[] = [];
try {
  const r = await db.execute({ sql: 'SELECT question, answer FROM faqs WHERE page = ? AND active = 1 ORDER BY sort_order ASC, id ASC', args: ['seoul'] });
  cityFaqs = r.rows as unknown as { question: string; answer: string }[];
} catch (e) {
  console.error('city faq query failed', e); // FAQ 없이도 페이지는 200
}
```

블로그(`blog/index.astro:9`, `blog/[slug].astro:20`): 쿼리를 try/catch로 감싸고, 실패하면 500 대신 **503 + `Retry-After`** 반환(일시 장애 신호 → 검색엔진이 나중에 다시 옴):

```ts
} catch (e) {
  console.error(e);
  return new Response('일시적인 오류입니다. 잠시 후 다시 시도해 주세요.', { status: 503, headers: { 'Retry-After': '120', 'Content-Type': 'text/plain; charset=utf-8' } });
}
```

### C. 중복 호스트 301 — `vercel.json` `redirects` 배열 **맨 앞**에 추가 (영향 중하 · S)

```json
{
  "source": "/((?!api/).*)",
  "has": [{ "type": "host", "value": "determined-goldstine-iota.vercel.app" }],
  "destination": "https://simplecube.net/$1",
  "statusCode": 301
},
{ "source": "/index.html", "destination": "/", "statusCode": 301 },
```

- `/api/`를 제외하는 이유: Vercel 크론(`/api/cron/publish-scheduled`, `vercel.json` crons)은 운영 배포의 `*.vercel.app` 주소를 호출할 수 있고, 리다이렉트를 따라가지 않는다. 그래서 301이 걸리면 예약 발행이 멈춘다.
- 기존 www 규칙과 같은 `$1` 문법이다. 쿼리 문자열은 Vercel이 자동으로 유지한다.
- 대안: 도메인 자체를 삭제하는 방법도 있지만, 크론이 그 주소를 쓰는지 확인하기 전에는 권하지 않는다.

### D. 블로그 TOC·빈 제목 수정 — `src/pages/blog/[slug].astro:80-99, 131-136` (영향 중하 · S)

`extractToC` + `injectIds`를 아래 한 번의 처리로 교체(빈 제목 제거, id는 실제 제목에만 순서대로 부여):

```ts
const plain = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/[​-‍﻿]/g, '').trim();

function buildToc(html: string): { html: string; toc: ToCItem[] } {
  const toc: ToCItem[] = [];
  const out = html.replace(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (_m, lvl: string, attrs = '', inner: string) => {
    const text = plain(inner);
    if (!text) return /<img\b/i.test(inner) ? `<p>${inner}</p>` : '';   // 빈 제목 제거(이미지만 있으면 문단으로 보존)
    if (lvl !== '2' && lvl !== '3') return `<h${lvl}${attrs}>${inner}</h${lvl}>`;
    const id = `h-${toc.length}`;
    toc.push({ id, level: Number(lvl), text });
    return `<h${lvl} id="${id}"${attrs.replace(/\sid=(["'])[^"']*\1/i, '')}>${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

// 131-136행 교체
const content = normalizeContent(String(post.content || ''), String(post.title));
const { html: processedContent, toc } = buildToc(content);
const hasToc = toc.length >= 3;
```

**사전 검증 완료 [관찰]**: 라이브 12개 글의 본문 HTML에 `buildToc()`를 그대로 적용했다(`technical/test-toc.mjs`). 결과: 빈 제목 **0개**, 목차↔제목 불일치 **0건**, 이미지 수 변화 없음.

같은 파일 `:138` JSON-LD URL을 canonical과 같은 형식으로: `` const pageUrl = `https://simplecube.net/blog/${encodeURIComponent(post.slug)}/`; ``

### E. 블로그 ↔ 서비스 페이지 내부 링크 (영향 중상 · S~M)

1. `src/pages/blog/[slug].astro` — 본문 아래(태그 위)에 "관련 서비스" 블록 추가:

```ts
const SERVICE_LINKS = [
  { re: /웨딩|결혼|예식|하객|성당|웨딩홀/, href: '/wedding/', label: '웨딩 포토부스 대여 안내' },
  { re: /기업|컨퍼런스|임직원|브랜드 행사|로레알/, href: '/corporate/', label: '기업행사 포토부스' },
  { re: /팝업|페스티벌|축제|와인/, href: '/popup/', label: '팝업·행사 포토부스' },
  { re: /졸업|학교|대학생|어린이/, href: '/graduation/', label: '졸업식·학교 행사 포토부스' },
];
const hay = `${post.title} ${post.category_name ?? ''} ${tags.join(' ')}`;
const serviceLinks = [...SERVICE_LINKS.filter((s) => s.re.test(hay)).slice(0, 2), { href: '/pricing/', label: '포토부스 대여 가격 안내' }];
```
```astro
<nav aria-label="관련 서비스" class="mt-12 rounded-xl border border-border-light p-5">
  <p class="text-sm font-semibold text-primary">관련 서비스</p>
  <ul class="mt-2 space-y-1">{serviceLinks.map((s) => <li><a href={s.href} class="text-sm text-olive underline">{s.label}</a></li>)}</ul>
</nav>
```

2. 같은 파일의 관련 글 쿼리(`:50-69`) — 결과가 3개 미만이면 최신 글로 채워서 **모든 글이 서로 링크되게** 한다:

```ts
let relatedPosts = relatedResult.rows as any[];
if (relatedPosts.length < 3) {
  const fill = await db.execute({
    sql: `SELECT id, title, slug, description, image, created_at FROM posts
          WHERE draft = 0 AND deleted_at IS NULL AND id != ? AND (external_url IS NULL OR external_url = '')
            AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
          ORDER BY created_at DESC LIMIT 6`, args: [post.id] });
  const seen = new Set(relatedPosts.map((p) => p.id));
  relatedPosts = [...relatedPosts, ...(fill.rows as any[]).filter((p) => !seen.has(p.id))].slice(0, 3);
}
```

3. 서비스 페이지(`wedding`·`popup`·`corporate`·`rental`·`graduation`) FAQ 위에 "관련 가이드·후기" 3개 블록 추가. 이미 SSR이므로 DB 조회(try/catch) 후 카테고리·키워드로 최신 3개를 고르면 된다(예: 웨딩 = `category_name = '웨딩'`).
4. `src/pages/blog/index.astro:21` — 내부 글을 먼저 보여주고, 외부 네이버 후기(`external_url`)는 아래 "고객 후기" 섹션으로 분리(목록 첫 화면에서 내부 글 비중을 높임).
5. 본문 내 슬래시 없는 내부 링크 자동 보정 — `normalizeContent()`(`:113` 체인)에 추가:

```ts
.replace(/href=(["'])(?:https?:\/\/(?:www\.)?simplecube\.net)?\/(popup|wedding|rental|corporate|pricing|graduation|brand|contact|seoul|busan|daegu|daejeon|gwangju|ulsan|jeonju|cheonan|cheongju|chungju)(#[^"']*)?\1/gi,
  (_m, q, p, h = '') => `href=${q}/${p}/${h}${q}`)
```

### F. 포트폴리오/갤러리 서버 렌더링 + alt 정리 (영향 중 · M)

- `src/components/popup/PortfolioGallery.astro` 머리말에서 최신 12~24개를 DB로 조회(try/catch)한다.
  - `#pf-loading` 자리에 `<ul id="pf-ssr">` 정적 목록(`<img src={cdnImage(url,400)} alt={…} width height loading="lazy">` + 태그명)을 서버에서 그린다.
  - 기존 스크립트는 마퀴가 준비되면 `#pf-ssr`을 숨기기만 하면 된다.
  - `/wedding/` 갤러리(`wedding.astro:90-100`)도 첫 페이지(9개)를 서버에서 그린다.
  - 효과: 원본 HTML에 현장 사진·웨딩홀 이름이 생기고, 이미지 사이트맵과 페이지 내용이 맞춰진다.
- 파일명 같은 제목 걸러내기(이미지 사이트맵 `src/pages/image-sitemap.xml.ts:167`, 갤러리 alt `PortfolioGallery.astro:240-241`):

```ts
const isJunkTitle = (t: string) => !t || /^(IMG|DSC|KakaoTalk|Screenshot)[_\-\s]|^[\d_\-\s.]+$|\.(jpe?g|png|webp|heic)$/i.test(t.trim());
const title = isJunkTitle(String(row.title || '')) ? `심플큐브 ${label}${row.tags ? ` — ${String(row.tags)}` : ''}` : String(row.title).trim();
```

(관리자에서 `IMG_…` 제목 48개를 실제 설명으로 고치는 것이 가장 좋다.)

### G. `/inquiry/popup/` 신호 정리 — `src/pages/inquiry/popup.astro:33` (하 · S)

```astro
<BaseLayout title="행사 포토부스 견적 문의 | 심플큐브" description="팝업·기업행사 포토부스 견적 문의 양식입니다. 일정과 장소를 남겨주시면 맞춤 견적을 안내해드립니다." noindex>
```

(사이트맵에서 이미 빼 둔 의도와 맞춤. 링크는 따라가도록 `noindex, follow`가 기본으로 출력됨, `BaseLayout.astro:57`)

### H. slug 변경용 301 맵 + HTML charset — `src/middleware.ts` (하 · S)

```ts
// 블로그 slug 변경 시 옛 주소 → 새 주소 (관리자에서 slug 수정 후 여기에 한 줄 추가)
const blogSlugRedirects: Record<string, string> = {
  'blog기업행사-포토부스-로레알코리아': '기업행사-포토부스-로레알코리아',
};
// onRequest 안, 블로그 슬래시 리다이렉트(63행) 바로 앞:
const bm = pathname.match(/^\/blog\/([^/]+)\/?$/);
if (bm) {
  let s = bm[1]; try { s = decodeURIComponent(s); } catch {}
  if (blogSlugRedirects[s]) return context.redirect(`/blog/${encodeURIComponent(blogSlugRedirects[s])}/`, 301);
}
```

```ts
// 137행 근처, 캐시 헤더 설정 옆: SSR HTML 응답에 charset 명시(현재 'text/html'만 옴)
if (isHtml && !/charset/i.test(response.headers.get('Content-Type') || '')) {
  response.headers.set('Content-Type', 'text/html; charset=utf-8');
}
```

(현재도 `<meta charset>`이 471바이트 위치에 있어 실제 깨짐은 없음. 방어적 조치)

---

## 10. 비개발자 수동 작업 (순서대로)

1. **배포 후 홈 렌더링 확인(A 적용 후)**: search.google.com/search-console 접속 → 상단 검색창에 `https://simplecube.net/` 입력 → "실제 URL 테스트" → "테스트된 페이지 보기" → "스크린샷" 탭에서 'WHY SIMPLE CUBE'·'OUR STORY' 문단이 보이는지 확인 → 보이면 "색인 생성 요청".
2. **중복 호스트 확인(C 적용 후)**: 브라우저 주소창에 `https://determined-goldstine-iota.vercel.app/wedding/` 입력 → `https://simplecube.net/wedding/`으로 바뀌면 정상. 이어서 Vercel 대시보드 → 프로젝트 determined-goldstine → Settings → Cron Jobs → `/api/cron/publish-scheduled` 옆 "Run" → Logs에서 200 확인(예약 발행이 살아 있는지).
3. **사이트맵 정리**: 서치콘솔 → 색인 → Sitemaps, 네이버 서치어드바이저 → 요청 → 사이트맵 제출. `sitemap-index.xml`이 남아 있으면 삭제하고 `https://simplecube.net/sitemap.xml` 하나만 유지.
4. **관리자 작업**:
   - (a) 블로그 "기업행사 포토부스 활용 방법 5가지, 로레알코리아" 글의 slug를 `기업행사-포토부스-로레알코리아`로 변경(H의 301과 **같은 배포**로)
   - (b) 크레스트72 글 본문의 링크 `https://simplecube.net/popup#portfolio` → `/popup/#portfolio`
   - (c) 갤러리 이미지 제목 `IMG_…`, 숫자, 오타 `ㅏ로레알코리아…`를 "행사명 + 장소 + 포토부스" 형식으로 수정
5. **블로그 색인 요청(E 적용 후)**: 서치콘솔 URL 검사로 유입 링크 1개뿐이던 7개 글(어린이날·논현2동성당·크레스트72·와인앤버스커·호텔파크하비오·로레알코리아·완벽 가이드)을 하루 몇 개씩 "색인 생성 요청". 네이버 서치어드바이저 → 요청 → 웹페이지 수집에도 같은 URL 제출.

---

## 11. 확인하지 못한 것 / 한계

- `determined-goldstine-iota.vercel.app`의 실제 색인 여부(검색 `site:` 조회는 무관한 vercel.com 결과만 반환. 예: https://vercel.com/iota/iota-names/ATgZxoP7hGjCy5Rz9tbXGMuPsU9a/og ) → 서치콘솔에서 확인 필요.
- 구글 렌더러의 정확한 뷰포트·스크롤 동작은 비공개다. "긴 뷰포트" 시나리오는 알려진 동작을 흉내 낸 것이다([가설]). 서치콘솔 스크린샷으로 최종 확인할 것.
- 네이버 Yeti의 JS 렌더링 범위는 검증하지 않았다(네이버 담당 영역).
- Vercel 크론이 호출하는 정확한 호스트명은 문서에서 확인하지 못했다. 그래서 `/api/` 제외로 안전하게 설계했다.
- 블로그 글과 네이버 원문의 실제 중복도는 원문을 가져와 대조하지 않았다(콘텐츠 담당).
- 렌더링 테스트는 이미지·폰트·외부 스크립트를 막은 상태다(텍스트·링크·opacity 측정에는 영향 없음. 이미지 크기에 따른 레이아웃 차이는 있을 수 있음).
