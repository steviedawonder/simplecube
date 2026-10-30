# 심플큐브 성능 · Core Web Vitals · 모바일 렌더링 감사

- 작성: 성능 담당 · 2026-10-30
- 대상: https://simplecube.net (라이브 = repo HEAD `2559567`, 즉 저장소 코드와 같음)
- 증거 폴더: `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/performance/`
  (이하 `perf/`로 줄여 씀. 예: `perf/lh/home.r1.json`)
- 검증된 수정 diff: `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/performance/perf-fixes.diff`
- 표기: **[관측]** 직접 측정·재현한 사실, **[추정]** 근거 있는 가설(검증 못 함), **[코드]** 소스 읽기로 확인한 사실

---

## 0. 요약 (우선순위)

| # | 발견 | 영향 | 공수 | 근거 |
|---|---|---|---|---|
| **P1** | 홈 이벤트 팝업(누이 쿠폰 이미지)이 진입 3초 뒤 뜨면서 **모바일 LCP 요소가 됨**. 팝업 있음 LCP 5.5초, 없음 1.2초 | **High** | S | [관측] |
| **P2** | Turso 일시 오류가 나면 **공개 SSR 페이지 14개 + 블로그가 500**을 냄 (try/catch 없음). 10/25 `/pricing` 500과 같은 유형 | **High** (크롤링·색인) | S | [관측] 로컬 재현 |
| **P3** | 홈 히어로가 화면에 보이지 않는 이미지 13장(1920px, 약 3.1MB)을 첫 로드에 한꺼번에 받음. 홈 첫 로드 4.6~5.4MB | **High** (모바일 속도·데이터) | S | [관측] |
| P4 | `/popup/`의 LCP 이미지(모델 사진)에 `loading="lazy"`가 붙어 있음 | Med-High | S | [관측] |
| P5 | `/wedding/` 패키지 이미지 6장이 Cloudinary 원본 그대로 나감 (PNG 1.76MB 포함 총 2.85MB) | Med | S | [관측] |
| P6 | 홈 히어로에만 쓰는 Google Fonts CSS가 **모든 페이지에서 렌더링을 막음** (한 번은 4.1초 지연 관측) | Med | S | [관측] |
| P7 | 블로그 대표 이미지(LCP)가 원본 URL로 나가고 `fetchpriority`가 없음 | Med | S | [관측] |
| P8 | 함수 콜드 스타트마다 미들웨어가 DB 마이그레이션·시드를 21번 순차 실행 (쓰기 9번 포함) | Med | S | [코드] / ms 영향은 [추정] |
| P9 | Pretendard 4개 굵기 다이내믹 서브셋 때문에 페이지마다 폰트 파일 32~45개, 370~520KB | Med | M | [관측] |
| P10 | 서드파티 JS 약 370KB/페이지 (GTM→GA4, 네이버 wcs 2종, foresys clickPrev + sweetalert2, 네이버 광고 synchronizer). TBT의 대부분 | Med | S (GTM 설정) | [관측] |
| P11 | GSAP + ScrollTrigger(113KB)가 `.gs-*` 요소가 없는 20여 개 페이지에서도 로드됨 | Low-Med | S | [관측] |
| P12 | 고객사 로고 PNG 원본(1600~2000px, 개당 최대 95KB)을 높이 40~64px로 표시 | Low-Med | S | [관측] |
| P13 | `/popup/` 모델 카드를 탭할 때 상호작용 지연 296ms (랩, CPU 4배 감속) → INP 위험 | Low-Med | S | [관측·랩] |
| P14 | 모바일 탭 타깃: 히어로 점 6×6px, 웨딩 갤러리 점 1~2px, 햄버거 24×18px | Low | S | [관측] |
| P15 | `public/images`에 300KB 넘는 원본 65개(145.6MB). 페이지에서는 쓰지 않음 (배포 용량만 차지) | Low | S | [관측] |

정상인 항목: viewport 메타, 360px 가로 넘침 없음, 정적 자원 캐시 헤더, 공개 페이지에 React 미포함, 함수(hnd1)와 DB(도쿄)가 같은 지역.

---

## 1. 측정 환경과 한계

- **위치**: 감사 컨테이너는 미국 오하이오(Google Cloud)에 있어 Vercel 엣지 `iad1`을 거침 (`x-vercel-id: iad1::hnd1::…`). 한국 사용자는 `icn1`(서울) 엣지를 쓰므로 **TTFB 절대값은 한국 실사용과 다름** (상대 비교로만 사용). 아웃바운드 프록시 지연도 포함됨.
- **Lighthouse 12.8.2**: 모바일 기본값(Moto G Power 에뮬레이션, slow 4G·CPU 4배 감속 시뮬레이션), 페이지당 2회. 텍스트 페이지는 회차 간 변동이 큼 (예: rental 성능 점수 80 ↔ 49). 그래서 두 회차 값을 모두 적고, **두 회차 모두에서 재현된 것만 결론에 씀**.
- **보완 측정 (Playwright)**: 360×800 @3x, Android Chrome UA, CDP 스로틀 "LTE"(12Mbps, RTT 40ms, CPU 4배). 실제 Chrome의 `largest-contentful-paint` 엔트리를 직접 수집함 → 랩 시뮬레이션보다 실사용에 가까움.
- **사이트 부하**: HTML 문서 요청 약 57회 (Lighthouse 14, Playwright 16, curl 약 27). 서브리소스는 대부분 CDN에 캐시된 정적 파일 (약 2,000건, Lighthouse 실행 특성상 불가피). SSR 함수를 직접 부른 요청은 캐시 우회 8회. POST나 폼 제출은 없음.
- **⚠ 분석 데이터 오염 (분석 담당 전달용)**: Lighthouse와 Playwright LCP·INP 측정 21회에서 GTM과 네이버 스크립트가 실행됨. 2026-10-30 16:00~16:45 UTC (10/31 01:00~01:45 KST)에 미국 오하이오 IP의 합성 방문 약 21건이 GA4(`G-1ZLPBMQXNH`)와 네이버 애널리틱스에 잡혔을 수 있으니 분석에서 제외 필요. (모바일 UX 점검 8회는 서드파티를 차단함)

---

## 2. 필드 데이터 (CrUX): 이 환경에서는 확인 불가

- PageSpeed Insights API (키 없이 호출): `HTTP 429 Quota exceeded … 'Queries per day' … quota_limit_value: "0"` **[관측]**. 키 없는 공용 쿼터가 0이라 재시도해도 소용없음 (`perf/psi/home.json`, `perf/psi/home_retry.json`).
- CrUX API: `HTTP 403 Method doesn't allow unregistered callers` (API 키 필요) **[관측]** (`perf/psi/crux_retry.json`).
- 결론: **필드 데이터(LCP·INP·CLS·TTFB)는 확인하지 못함.** 방문자가 적은 사이트라 URL 단위 CrUX는 "데이터 부족"일 가능성이 높고, 오리진 단위 데이터는 있을 수도 있음 **[추정]**.
- 오너 확인 방법은 9장 1번 참고.

---

## 3. 랩 데이터

### 3.1 Lighthouse 모바일 (2회: r1 / r2)

| 페이지 | 성능 | 접근성 | 권장사항 | SEO | FCP (초) | LCP (초) | TBT (ms) | CLS | SI (초) | LCP 요소 |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 30 / 27 | 89 | 79 | 100 | 5.0 / 4.8 | **30.1 / 22.7** | 2,133 / **5,043** | 0 | 7.7 / 10.3 | `img` noui-event.webp (**이벤트 팝업**) |
| `/wedding/` | 50 / 59 | 84 | 79 | 100 | 3.4 / 2.5 | 5.3 / 3.7 | 824 / 1,024 | **0.056 / 0.058** | 5.4 | `img` /images/wedding/hero.webp |
| `/popup/` | 52 / 51 | 89 | 79 | 100 | 2.1 | **8.7 / 6.0** | 869 / 1,218 | 0 | 3.4 / 3.9 | `img` 모델 사진 (**lazy**) |
| `/rental/` | 80 / 49 | 95 | 79 | 100 | 2.1 / 4.6 | 2.1 / 9.3 | 624 / 491 | 0 | 3.1 / 5.9 | H2 "포토부스 대여 서비스란?" |
| `/pricing/` | 85 / 66 | 95 | 79 / 96 | 100 | 2.1 / 4.3 | 2.1 / 4.6 | 477 / 0* | 0 | 2.9 / 11.1 | H2 "포토부스 대여 가격" |
| `/busan/` | 42 / 48 | 96 | 79 | 100 | 4.7 | 9.3 / 9.0 | 780 / 537 | 0 | 5.9 / 5.7 | 본문 p |
| 블로그 글 (수원 더아리엘) | 45 / 38 | 95 | 79 | 100 | 4.3 | 9.5 / 9.4 | 727 / 1,268 | 0 | 5.5 / 5.9 | `img` 대표 이미지 (Cloudinary 원본) |

\* pricing r2: GTM이 로드되지 않았고, Google Fonts CSS 응답이 4.1초 걸려 FCP가 밀린 회차.
전체 수치는 `perf/lh_summary.csv`, 요약은 `perf/lh_summary_full.txt`, 원본은 `perf/lh/*.json`.

공통 실패 항목:
- 접근성: `color-contrast` (전 페이지), `target-size` (홈·웨딩), `button-name` (웨딩·팝업), `label-content-name-mismatch` (홈)
- 권장사항: `third-party-cookies`, `inspector-issues` (둘 다 서드파티 원인)
- SEO: 전 페이지 100

### 3.2 실제 Chrome LCP (Playwright, LTE 프로필) [관측]

| 페이지 | TTFB | FCP | **LCP** | LCP 요소 | CLS | 첫 로드 전송량 |
|---|---|---|---|---|---|---|
| 홈 (팝업 노출, 기본) | 384 | 1,756 | **5,532** | IMG `noui-event.webp` (팝업) | 0 | 4,585KB / 68건 |
| 홈 (팝업 숨김: 오늘 하루 보지 않기) | 116 | 1,228 | **1,228** | SPAN "웨딩" (히어로 문구) | 0 | 4,584KB |
| `/contact/` | 363 | 2,076 | 2,076 | H2 (gs-fade-up 블록 안) | 0 | 819KB |
| `/popup/` | 175 | 1,080 | 1,744 | IMG 모델 사진 (lazy) | 0 | 1,566KB |
| `/wedding/` | 128 | 1,436 | 1,496 | IMG wedding/hero.webp | 0.028 | 3,214KB |

단위는 ms. 원본은 `perf/lcp/lcp_*.json`, 스크린샷은 `perf/lcp/*.png`.
좋은 네트워크에서는 대부분 2.5초 안쪽이지만, **홈만 팝업 때문에 5.5초("나쁨")**.

### 3.3 랩 상호작용 지연 (INP 대용) [관측·랩]

CPU 4배 감속에서 탭한 뒤 Event Timing의 최대 지연을 측정함 (`perf/scripts/inp_probe.js`).
- 홈: 메뉴 열기·히어로 점 = 최대 112ms → 양호
- `/popup/`: 모델 카드 탭(모달 열림) = **296ms** → "개선 필요" 구간 (200~500ms)

---

## 4. 원인 분석

### 4.1 [P1] 홈: 이벤트 팝업이 LCP를 3초 이상 늦춤

- **[관측]** Lighthouse 2회 모두 LCP 요소는 `<img src="/images/popup/noui-event.webp">` (EventPopup). Playwright에서도 팝업이 뜨면 LCP 5,532ms (팝업 이미지), 숨기면 1,228ms (텍스트 "웨딩").
- **원인**
  1. 히어로 배경 사진은 화면 전체를 덮어서 Chrome이 "배경"으로 보고 LCP 후보에서 뺌 (측정 결과 히어로 이미지 LCP 엔트리가 없음). 그래서 원래 LCP는 히어로 문구 "웨딩"이고 1.2초로 좋음.
  2. `src/components/common/EventPopup.astro:45,64`가 DOMContentLoaded 후 3초에 팝업 이미지(모바일에서 약 158×281px)를 띄움. 화면에서 가장 큰 콘텐츠라 LCP가 이 시점으로 갱신됨.
  3. LCP는 사용자가 스크롤하거나 탭하기 전까지 계속 갱신됨. 히어로 키워드가 돌아가는 걸 3초 넘게 보는 방문자는 LCP가 "DCL + 3초" 이상이 되고, 모바일에서는 4초를 넘는 "나쁨"이 되기 쉬움 **[추정: 필드 분포는 미확인]**.
- 덤 1: 팝업 이미지는 숨겨진 상태에서도 첫 로드 때 다운로드됨 (49KB, Medium 우선순위).
- 덤 2 (모바일 UX): 카드가 화면의 17% (158×316px, 좌하단)를 차지하고 플로팅 문의 버튼이 5%를 더 차지해서 **첫 화면 H1("2019년부터 … 심플큐브")을 가림** (`perf/mobile/home_t_plus4500.png`). 전면 광고는 아니지만, 랜딩 직후 본문을 가리는 제휴 광고라 구글 "방해되는 전면 광고" 가이드의 경계선에 있음. 또 쿠폰 링크가 누이 사이트로 이탈시킴.
- **수정 (프로토타입 검증 완료)**: 첫 스크롤 뒤에 팝업을 띄우고 이미지는 `loading="lazy"`로 바꿈 (8장 스니펫 E).
  - 검증 결과: 5초 동안 입력이 없으면 LCP 엔트리는 "웨딩" 텍스트 하나뿐. 스크롤하면 팝업이 뜨고 LCP 엔트리는 늘지 않음. `noui-event.webp`는 스크롤한 뒤에야 요청됨.
- **예상 효과**: 홈 모바일 LCP 약 5.5초 → 약 1.2~2.0초 (에뮬레이션 [관측]).

### 4.2 [P3] 홈: 보이지 않는 히어로 이미지 13장을 동시에 다운로드

- **[코드]** `src/components/home/HeroSection.astro:7-33`: 배경 레이어 5개와 "모든 순간" 슬라이드 10장이 있음. 비활성 레이어는 `opacity:0`이지만 뷰포트 안에 겹쳐 있어서 `loading="lazy"`가 효과가 없음 (lazy는 "보이는지"가 아니라 "뷰포트와의 거리"로 판단함). `moment-1`에는 lazy도 없음.
- **[관측]** Lighthouse 홈: 101건 5,400KB 중 로컬 이미지가 4,524KB. 1.5초 시점에 숨겨진 히어로 이미지 13장(전송 약 3.1MB)이 High 우선순위로 한꺼번에 요청됨. Playwright LTE에서도 4,585KB.
- 원본 크기도 1920px (moment-*, honda·shinsegae는 1920×2560)인데 화면 폭은 360~412px임.
  - sharp로 시험 변환 **[관측]**: 히어로 배경 4장 + 모먼트 10장(총 14장) 3.2MB → 828~1080px, q55 WebP로 0.9MB (`perf/resized/`). 70% 검은 오버레이 아래라 화질 차이는 거의 느껴지지 않음.
- **수정 (검증 완료)**: 비활성 이미지는 `data-src`로 두고 회전 순서보다 한 단계 앞서 로드 (스니펫 F).
  - 검증 결과: load 이벤트까지 요청된 히어로 이미지는 활성 1장 + 다음 1장뿐. 나머지는 회전 직전(2.9초, 4.6초, 6.3초)에 요청됨.
- **추가 권장 (미검증)**
  - 모바일용 리사이즈본 + `<picture>` / `srcset` (스니펫 L)
  - 히어로가 화면 밖이면 회전을 멈춤 (IntersectionObserver). 스크롤해 내려간 사용자는 모먼트 10장을 받지 않게 됨.
  - `ServicesSection.astro:23`의 첫 이미지(1920×2880, 54KB)는 모바일에서 첫 화면 밖이므로 lazy로 바꾸고 리사이즈.
- **예상 효과**: 첫 로드 전송량 약 −3.1MB (4.6MB → 약 1.5MB), 리사이즈까지 하면 더 줄어듦. 느린 회선에서 폰트·CSS와 대역폭 경쟁이 줄어 FCP 개선 (약 −0.3~1초, slow 4G 기준) **[추정]**. LCP 요소가 텍스트라 LCP에 대한 직접 효과는 제한적.

### 4.3 [P4] `/popup/`: LCP 이미지가 lazy

- **[관측]** Lighthouse 2회 모두 LCP 요소는 MachineShowcase 모델 사진. `loading="lazy"` (`src/components/popup/MachineShowcase.astro:181`) 때문에 `lcp-lazy-loaded` 실패. LCP 8.7초 / 6.0초, 로드 지연 4.2초.
- **수정 (검증 완료)**: `priority` prop을 추가해서 `/popup/`에서만 첫 2장은 eager, 첫 장은 `fetchpriority="high"`로 설정 (스니펫 G). rental·pricing·지역 페이지에서는 이 섹션이 아래쪽이라 lazy 유지.
- **예상 효과**: Lighthouse LCP 최소 −1.3초 (lcp-lazy-loaded 절감 추정치). 실제 4G에서도 LCP 이미지 발견 지연이 사라짐.

### 4.4 [P5] `/wedding/`: Cloudinary 원본과 큰 LCP 이미지

- **[관측]** Cloudinary 이미지 131장 중 125장은 `f_auto,q_auto,w_…`로 정상. 원본 6장이 2,847KB로, 웨딩 Cloudinary 전송량의 85%를 차지함.
  - 예: "포토부스 안내 카드" PNG 1,760KB를 100×75px 썸네일로 표시.
  - 원인 **[코드]**: `src/components/wedding/PackageDetails.astro:108,132,165`가 `item.image_url`을 그대로 출력함.
  - 라이브 HTML에서 확인: `<img src="https://res.cloudinary.com/dynkoikr6/image/upload/v1774513556/simplecube/ozkp0jbrfrimdc38u2kb.png" alt="포토부스 안내 카드" …>`
- **LCP 이미지**: `/images/wedding/hero.webp` (1920×2006, 235KB)를 모바일에서 312×260px로 표시함. 960w q70으로 변환하면 61KB (−74%) **[관측]**. `fetchpriority="high"`는 이미 있고 gs-* 애니메이션도 없음 (좋음).
- **CLS 0.056 / 0.058** (Lighthouse), 0.028 (Playwright): 웹폰트(Pretendard·Audrey)로 바뀌면서 위 문단 높이가 변하고 히어로 이미지가 밀림 (Lighthouse 원인: "Web font loaded"). 기준 0.1 안쪽이지만 폰트 개선(P9)으로 줄어듦.
- DB에 들어 있는 `/images/wedding/photo-strips.jpg`(188KB)는 같은 폴더에 `.webp`(93KB)가 있음 → 관리자에서 교체 (9장).
- **수정 (코드 적용·렌더 확인)**: `cdnImage(url, 480/800)` (스니펫 H). `cdnImage`는 Cloudinary URL이 아니면 그대로 돌려주므로 로컬 이미지에는 영향 없음.

### 4.5 텍스트 페이지 (rental, pricing, 지역, 블로그): 렌더 차단, 폰트, 서드파티

LCP는 H2나 본문 텍스트. 관측 FCP≈LCP는 1.0~2.5초, 시뮬레이션은 2.1~9.3초 (변동 큼).

**[P6] Google Fonts CSS가 모든 페이지에서 렌더링을 막음**
- `src/layouts/BaseLayout.astro:107-110`의 `<link rel="stylesheet">`는 렌더링을 막음. 주석에는 "렌더 차단 없음"이라고 되어 있지만 사실과 다름. Playwright `renderBlockingStatus: "blocking"` **[관측]**.
- 실제로 쓰는 곳은 홈 히어로 키워드(`.hero-keyword`)뿐인데 모든 페이지에 들어 있음.
- Lighthouse 렌더 차단 추정치: 전 페이지 0.76~0.86초.
- pricing 2차 측정에서는 이 CSS 응답이 4.1초 걸려 FCP가 6.4초로 밀림 **[관측, 프록시 환경]**. 외부 도메인 하나가 모든 페이지의 첫 화면을 붙잡는 단일 장애점임.
- **수정 (검증 완료)**: 홈에서만 넣고 `media="print" onload` 방식으로 비차단 처리 (스니펫 I).
- 더 좋은 방법: `text=` 서브셋 woff2(약 2.3KB)를 `/fonts`에 직접 호스팅하고 `@font-face`(`font-display: swap`) + 홈에서만 preload. 외부 도메인 2개가 사라짐.

**[P9] Pretendard 폰트**
- `src/styles/global.css:2` → `pretendard-subset.css`에 `@font-face`가 368개 (400·500·600·700 × 92개 유니코드 범위).
- **[관측]** 페이지마다 폰트 파일 32~45개, 373~517KB. 텍스트 페이지 전체 전송량의 36~50%이고 모두 VeryHigh 우선순위.
- 권장: Pretendard **Variable** 다이내믹 서브셋으로 교체 (굵기 4개를 파일 하나로). 요청 수 약 75% 감소, 바이트 약 1/3 감소 **[추정]**, 폰트 교체로 인한 CLS 감소. 또는 500·600 굵기를 없앰 (디자인 확인 필요).
- `Audrey-Normal.otf` 49KB (전송 32KB): 로고 "SIMPLE CUBE" 11글자용인데 OTF 전체 글리프를 받음. woff2로 바꾸고 서브셋하면 약 2~3KB, 또는 SVG 로고로 교체.

**[P7] 블로그 대표 이미지**
- **[관측]** `src/pages/blog/[slug].astro:251`의 `src={post.image}`가 원본을 내보냄 (88KB JPG, Medium 우선순위). Lighthouse modern-image-formats 54KB, image-delivery 183KB 절감 가능.
- **수정**: `cdnImage` + `srcset` + `fetchpriority="high"` (스니펫 diff에 포함). 코드 적용과 dev 컴파일까지 확인함. 로컬 DB에 글이 없어 화면 렌더 검증은 못 함.
- 관련 글 썸네일(`:340`)도 `cdnImage(rp.image, 480)` 권장.

### 4.6 [P10] 서드파티 스크립트

- **[관측]** 페이지마다 약 370KB:
  - GTM 133KB, GA4 gtag 178KB (디코드 532KB)
  - 네이버 `wcslog.js` 2개 (`wcs.pstatic.net`, `wcs.naver.net`)
  - 네이버 광고 `gfp-nac-module/synchronizer.js` 18KB
  - `mkt.foresys.co.kr/looker/js/common/clickPrev.js` 6KB
  - `cdn.jsdelivr.net/npm/sweetalert2@9` 16KB (메이저 버전만 지정, 정확한 버전 미고정)
- GTM 컨테이너(공개 `gtm.js` 확인)의 사용자 정의 HTML 태그:
  - `wcs.naver.net/wcslog.js` + `wcs_add.wa="s_858dcaea9be"`
  - `clickPrev.js data-userid="wbstation"`
  - 전환 태그 `wcs.trans({type:"lead"})`
- 비용 (Lighthouse third-party-summary): GTM 계열이 메인 스레드를 0.6~1.9초 막음 (CPU 4배 시뮬레이션). TBT 0.5~5.0초의 대부분이 여기서 나옴. INP 위험 요인.
- (분석 담당 전달, **[추정]**) BaseLayout의 네이버 애널리틱스(`wa=2403ec27630898`, `BaseLayout.astro:115-125`)와 GTM 태그가 같은 전역 변수 `wcs_add.wa`를 덮어써서 한쪽 계정 집계가 꼬일 수 있음. 성능 범위 밖이라 확인하지 않음.
- **권장**: 전환 측정에 필요 없는 태그는 GTM 트리거를 "Window Loaded"로 바꾸거나 제거 (9장). 예상 효과: TBT·INP 개선. LCP 영향은 작음.

### 4.7 [P11] GSAP `.gs-*` 등장 애니메이션

- **동작 [코드]**: `BaseLayout.astro:143-268`의 모듈 스크립트가 DOMContentLoaded에서 `gsap.fromTo`로 `opacity:0, y:60`을 바로 적용함. ScrollTrigger(`top 85%`)는 생성 즉시 refresh 하므로 화면 안 요소는 바로 1초 동안 페이드인 됨 (load를 기다리지 않음, gsap 3.14.2 소스 확인).
- **첫 화면에 적용되는지 [관측, 360×800]**
  - 홈: 없음
  - `/wedding/`: ServiceIntro 문구 (top 352px)
  - `/contact/`: TextHero H1을 포함한 4개 블록
  - 나머지 페이지: 없음
- **LCP·CLS 영향 [관측]**: `/contact/`의 LCP 2,076ms = FCP. JS가 실행되기 전에 먼저 그려졌으므로 측정상 지연은 없음. CLS도 없음 (transform·opacity만 변함).
- **남은 위험**: 첫 화면 문구가 "보였다 → 사라졌다 → 페이드인" 하며 깜빡임. JS가 캐시되어 첫 페인트 전에 실행되면 LCP가 페이드 시작 이후로 밀릴 수 있음 **[추정]**. `prefers-reduced-motion` 설정도 무시함.
- **비용 [관측]**: 공통 번들 113KB (br 46.5KB) 대부분이 GSAP + ScrollTrigger임. `.gs-*`가 하나도 없는 rental, pricing, corporate, graduation, 지역 10개, 블로그에도 로드됨. Lighthouse bootup에서 이 번들이 1.3~5.8초 (시뮬레이션, JS 실행은 0.2~0.9초이고 나머지는 스타일·레이아웃 작업).
- **권장 (미검증)**: `.gs-*`가 있을 때만 dynamic import, 첫 화면 요소는 애니메이션에서 제외, reduced-motion 존중 (스니펫 K).

### 4.8 JS 번들과 React

- **[관측]** 공개 페이지의 `/_astro/` JS: 공통 `BaseLayout…CZn2a1f1.js` 113KB (br 46.5KB) + 페이지별 4~11KB (wedding, MachineShowcase, PortfolioGallery, CustomOptions).
- **React와 TipTap은 공개 페이지에 없음** (관리자 전용) ✔.
- CSS는 1개 (`accounts.DY8xLke8.css`, 276KB, br 30KB). 이 중 약 200KB가 Pretendard `@font-face` 368개. 렌더링을 막지만 한 번만 받고 1년 immutable 캐시라 문제는 작음.

### 4.9 캐시 헤더: 조치 불필요 [관측]

- `/_astro/*`: `max-age=31536000, immutable` ✔
- `/images/*`: 7일 + SWR ✔
- `/fonts/*`: 30일 ✔
- SSR HTML: 미들웨어가 `s-maxage=60, stale-while-revalidate=86400` 설정 (브라우저에는 `public`) ✔
- 정적 홈: HIT (age 69,962초) ✔
- Lighthouse 캐시 경고는 서드파티(wcslog TTL 0 등)에서만 나옴.

### 4.10 [P15] `public/images` 대용량 원본

- **[관측]** 300KB 넘는 파일이 65개, 145.6MB. 예: `모듈포토부스_웨이브.png`와 `simplecube-module-photobooth-wave.png`가 같은 13.9MB 파일이 중복으로 있음.
- 감사한 7개 페이지에서 실제로 로드된 300KB 초과 파일은 히어로 WebP 5장뿐 → **페이지 속도에는 영향 없음**.
- 영향은 배포 용량·업로드 시간이 늘고, URL을 알면 누구나 원본을 받을 수 있다는 점.
- 권장: 원본은 `public/` 밖(예: 별도 폴더나 클라우드)으로 옮김.

### 4.11 [P12] 로고 PNG

- ClientShowcase(홈, popup, rental, pricing, 지역 페이지)의 로고가 1600~2000px PNG로 최대 95KB인데, 표시 높이는 40~64px.
- sharp 시험 변환 **[관측]**: LG 75→6KB, 삼성 93→8KB, CJ 75→4KB.
- `loading="lazy"`는 정상. `width/height`가 없어 Lighthouse `unsized-images` 41건이 나옴.

---

## 5. SSR TTFB와 Turso 장애 대응력

### 5.1 TTFB 측정 [관측] (iad1 엣지 → hnd1 함수, `perf/ttfb_run1.txt`)

"서버 구간"은 TTFB에서 TLS 연결 완료 시각을 뺀 값.

| 경로 | 일반 요청 (캐시) | 캐시 우회 1회차 (MISS) | 캐시 우회 2회차 (MISS) | 다시 일반 요청 |
|---|---|---|---|---|
| `/pricing/` | STALE, 84ms | 234ms | 220ms | HIT, 74ms |
| `/wedding/` | HIT, 65ms | 250ms | 236ms | HIT, 47ms |
| `/busan/` | STALE, 146ms | 229ms | 244ms | HIT, 65ms |
| `/popup/` | HIT, 63ms | 270ms | 269ms | HIT, 57ms |

- 엣지 캐시(HIT·STALE)는 47~146ms. 캐시를 우회한 함수 호출(따뜻한 인스턴스)은 220~270ms인데, 여기에 iad1↔hnd1 왕복 약 150ms가 포함되어 있음 → **함수 + DB는 약 70~120ms로 빠름**.
- 한국 사용자(icn1↔hnd1 약 30ms)는 MISS라도 약 100~200ms로 예상 **[추정]**.
- **콜드 스타트는 강제로 만들 수 없어 측정하지 못함.**
- **리전**: 함수 `hnd1`(도쿄, `vercel.json`)과 Turso `aws-ap-northeast-1`(도쿄)이 같은 도시에 있어 적절함. 한 페이지가 쿼리를 순차로 여러 번 보내므로 (MachineShowcase는 1 + 4회 순차) DB 근접성이 중요함 → **리전 변경 불필요**.
- `s-maxage=60` + SWR 1일 덕분에 대부분 요청은 엣지에서 바로 응답됨. MISS는 배포 직후나 트래픽이 적은 엣지(크롤러가 오는 미국 엣지 등)에서 주로 생김 **[추정]**.

### 5.2 [P8] 콜드 스타트 초기화 체인

- **[코드]** `src/middleware.ts:69-89`: `/`, `/popup`, `/wedding`, `/rental`, `/corporate`, `/pricing`, `/blog*`, `/inquiry*`, `/admin`, `/api` 경로에서는 인스턴스마다 첫 요청 때 `initDB` → … → `migrateBadSlugs`까지 함수 12개를 순차 실행함.
  - 정상 상태(테이블·시드가 이미 있음)에서도 **DB 왕복 21회**이고, 그중 **쓰기가 9회**: `seedCustomContents`의 INSERT OR IGNORE 7회, `migrateFaqsPageConstraint`가 테스트 행을 INSERT한 뒤 DELETE.
- 실패하면 `dbInitialized`가 계속 false라서 **요청마다 다시 시도함**. 로컬 재현 로그에서 요청마다 `DB init error`가 찍히는 것을 확인함 **[관측]**.
- 영향 **[추정]**: 콜드 MISS TTFB +100~300ms (도쿄 안 왕복 5~15ms × 21회). DB가 느릴 때 TTFB 악화가 커지고, Turso 쓰기 사용량도 불필요하게 늘어남.
- 권장: 공개 경로에서는 초기화를 빼고 `/admin`, `/api/`(그리고 개발 모드)로 한정함. 마이그레이션은 배포 스크립트나 관리자 화면에서 1회 실행 (스니펫 J).

### 5.3 [P2] Turso 오류 시 500

- **[코드]** try/catch 없이 DB를 직접 await 하는 공개 SSR 페이지:
  - `Promise.all` 2쿼리: `src/pages/pricing.astro:15`, `rental.astro:15`, `corporate.astro:15`, `graduation.astro:14`
  - 단일 쿼리: 지역 10개 (`seoul`, `busan`, `daegu`, `daejeon`, `gwangju`, `ulsan`, `jeonju`, `cheonan`, `cheongju`, `chungju` `.astro:14`)
  - 블로그: `src/pages/blog/index.astro:9`, `src/pages/blog/[slug].astro:20,43,50`
  - 안전한 곳: popup·wedding (`Promise.allSettled`), MachineShowcase·CustomOptions·TemplateGallery·PackageDetails (try/catch), 미들웨어 초기화 (try/catch)
- **재현 [관측]**: 저장소를 스크래치에 복사하고 존재하지 않는 DB 주소(`libsql://db-unreachable.invalid`)로 dev 서버를 띄움.

  | 경로 | 원본 코드 | 수정 코드 |
  |---|---|---|
  | `/pricing/` | **500** | **200** (H1 "포토부스 대여 가격 안내", FAQ만 생략), `Cache-Control: no-store` |
  | `/busan/` | **500** | **200** (H1 "부산 포토부스 대여", RegionUniqueInfo의 FAQPage JSON-LD 유지), `no-store` |
  | `/wedding/`, `/popup/` | 200 (allSettled) | 200 |

  단, wedding·popup은 DB가 일부 실패한 응답도 60초 캐시됨. 일관성을 위해 같은 no-store 처리를 권장.
- **원인 [추정]**: `@libsql/client` 0.17은 Node에서 `libsql://`을 HTTP로 접속함 (`expandConfig(config, true)`, preferHttp). keep-alive 소켓을 재사용하다 끊기는 "socket hang up"은 서버리스에서 흔한 일시 오류라 **1회 재시도로 대부분 해결됨**.
- **크롤러 관점**: 구글은 5xx가 반복되면 크롤링 속도를 낮추고, 오래 지속되면 URL을 색인에서 뺌. 캐시가 비어 있는 엣지(미국 크롤러)일수록 MISS → 500에 노출되기 쉬움 **[추정]**.
- **수정**: `safeRows` 헬퍼 (재시도 1회 + 대체값 + `no-store`)를 14개 페이지에 적용 (스니펫 A~C). 블로그 상세는 DB 실패 시 404가 아니라 **503 + Retry-After**로 응답 (스니펫 D).
- 선택 (공수 M): Vercel ISR(`vercel({ isr: { expiration: 60, exclude: [...] } })`)로 바꾸면 재생성에 실패해도 마지막 정상 페이지를 계속 제공함.

---

## 6. 모바일 UX (페이지 경험) [관측, 360×800, `perf/mobile/mobile_ux.json`]

- **viewport**: `width=device-width, initial-scale=1.0` ✔ (확대 허용)
- **가로 넘침 없음**: 8개 페이지 모두 `scrollWidth = clientWidth = 360`. 모바일 메뉴(off-canvas)는 `html/body overflow-x:hidden`으로 잘려서 보이지 않음.
- **탭 타깃 (24px 미만)**
  - 홈 히어로 진행 점: 6×6px × 5개 (`HeroSection.astro:78-82`, Lighthouse target-size 실패)
  - 웨딩 갤러리 페이지 점: 1~2×8px (Lighthouse target-size 실패)
  - 햄버거 버튼: 24×18px (모든 페이지)
  - 빵부스러기 "홈": 10×22px
  - 푸터 링크: 높이 16px
  - 권장: 점의 보이는 크기는 유지하고 padding이나 `::before`로 히트 영역을 최소 24×24 (가능하면 44×44)로 확장.
- **글자 크기**: 본문은 14~16px. 9~11px 라벨이 많음 (영문 eyebrow 11px, "추천" 배지 9px, 웨딩 파트너 홀 이름 9px, "Scroll" 9px). 대부분 장식용이지만 **웨딩 파트너 홀 이름(9px)은 정보성이라 12px 이상 권장** (Low).
- **팝업**
  - 홈에서는 EventPopup만 노출됨.
  - `PromoPopup.astro`와 `SitePopup.astro`는 어디에서도 import 되지 않는 죽은 코드 **[코드]**. 특히 PromoPopup은 스크롤 잠금이 있는 전면형이므로 다시 쓰지 말 것 권장.
  - EventPopup은 비차단형(pointer-events:none, 스크롤 잠금 없음)이지만 3초 뒤 첫 화면 H1을 가림 (4.1). 수정안(첫 스크롤 후 표시)으로 해결됨.
- **플로팅 문의 버튼**: 150×105px, 우하단, 화면의 5% → 문제 없음.

---

## 7. 수정 목록 (우선순위, 파일, 예상 효과)

| # | 파일 | 변경 | 예상 효과 | 검증 |
|---|---|---|---|---|
| P1 | `src/components/common/EventPopup.astro` | 첫 스크롤 뒤 표시 + 이미지 lazy | 홈 LCP 약 5.5초 → 약 1.2~2초, 첫 화면 가림 해소 | ✅ 프로토타입 |
| P2 | `src/lib/db.ts` + pricing, rental, corporate, graduation, 지역 10개, `blog/*` | `safeRows`, `no-store`, 블로그 503 | 크롤러·사용자 500 제거 | ✅ pricing·busan 재현·수정 확인 |
| P3 | `src/components/home/HeroSection.astro` (+ 리사이즈 파일) | data-src 선행 로드, 모바일 리사이즈본, 화면 밖이면 회전 정지 | 첫 로드 −3.1MB, 리사이즈까지 하면 히어로 14장 3.2MB → 0.9MB | ✅ data-src / 리사이즈는 크기만 측정 |
| P4 | `src/components/popup/MachineShowcase.astro`, `src/pages/popup.astro` | `priority` prop (eager + fetchpriority) | `/popup/` 랩 LCP 최소 −1.3초 | ✅ |
| P5 | `src/components/wedding/PackageDetails.astro` (+ `wedding/hero.webp` 960w) | `cdnImage()` 적용, LCP srcset | `/wedding/` −2.7MB, 랩 LCP −0.4~0.9초 (slow 4G) | ✅ 코드 / 크기 측정 |
| P6 | `src/layouts/BaseLayout.astro:107-110` | 홈에서만, 비차단 (또는 자체 호스팅) | 전 페이지 FCP 약 −0.1~0.3초 (필드), 단일 장애점 제거 | ✅ |
| P7 | `src/pages/blog/[slug].astro:249-256, 340` | `cdnImage` + srcset + fetchpriority | 블로그 LCP 약 −0.2~0.5초 (느린 회선) | ⚠ 컴파일만 확인 |
| P8 | `src/middleware.ts:69` | 공개 경로에서 초기화 제외 | 콜드 TTFB 약 −100~300ms **[추정]**, 쓰기 9회 제거 | ✖ 미검증 |
| P9 | `src/styles/pretendard-subset.css`, `public/fonts/pretendard/` | Variable 다이내믹 서브셋 | 폰트 요청 약 −75%, 약 −120~170KB/페이지, CLS 감소 | ✖ |
| P10 | GTM 콘솔 (코드 아님) | 비필수 태그는 Window Loaded 또는 제거 | TBT·INP 개선 | ✖ (오너 결정) |
| P11 | `src/layouts/BaseLayout.astro:143-268` | GSAP 조건부 dynamic import, 첫 화면 제외, reduced-motion | 20여 개 페이지에서 JS −46KB(br), 메인 스레드 감소 | ✖ |
| P12 | `public/images/logos/*`, `ClientShowcase.astro` | 높이 128px WebP + width/height | 로고 약 −0.7MB (홈 기준 843KB → 약 0.1MB) | 크기만 측정 |
| P13 | `MachineShowcase.astro` `openModal()` | 모달 껍데기를 먼저 그리고 내용은 다음 프레임에 | `/popup/` 탭 지연 296ms → 200ms 미만 목표 | ✖ |
| P14 | `HeroSection.astro:78-82`, `wedding.astro` 갤러리 점, `Navbar.astro` 햄버거 | 히트 영역 24px 이상 (가능하면 44px) | 접근성·오탭 감소 | ✖ |
| P15 | `public/images/**` 원본 | `public/` 밖으로 이동 | 배포 용량 −145MB | ✖ |

---

## 8. 코드

**검증된 diff**: `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/performance/perf-fixes.diff`
- 대상 10개 파일: `db.ts`, `pricing.astro`, `busan.astro`, `EventPopup.astro`, `HeroSection.astro`, `MachineShowcase.astro`, `popup.astro`, `PackageDetails.astro`, `blog/[slug].astro`, `BaseLayout.astro`
- 저장소 루트에서 `git apply <diff 경로>`로 적용.
- 검증 방법: 스크래치 복사본에서 dev 서버 렌더 확인 + Playwright 확인 + DB 장애 재현 (저장소는 수정하지 않음).
- 나머지 페이지(지역 9개, rental, corporate, graduation, blog)는 아래 스니펫과 같은 패턴으로 적용하면 됨.

### A. `src/lib/db.ts`: 공개 페이지용 안전 조회 (`export default db;` 바로 아래) ✅

```ts
type Stmt = string | { sql: string; args: any[] };

/** 공개(SSR) 페이지 전용: Turso 일시 오류(socket hang up 등)에 1회 재시도, 실패하면 fallback + ok=false */
export async function safeRows<T = Record<string, unknown>>(stmt: Stmt, fallback: T[] = []): Promise<{ rows: T[]; ok: boolean }> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await db.execute(stmt as any);
      return { rows: r.rows as unknown as T[], ok: true };
    } catch (e) {
      if (attempt === 2) {
        console.error('[db] public query failed, rendering fallback:', e);
        return { rows: fallback, ok: false };
      }
    }
  }
  return { rows: fallback, ok: false };
}
```

### B. pricing, rental, corporate, graduation: `Promise.all` 부분 교체 ✅ (pricing 검증)

rental 예시. `import db from '@lib/db'`를 `import { safeRows } from '@lib/db'`로 바꿈.

```ts
type Faq = { question: string; answer: string };
const FAQ_SQL = 'SELECT question, answer FROM faqs WHERE page = ? AND active = 1 ORDER BY sort_order ASC, id ASC';
const [pageFaq, popupFaq] = await Promise.all([
  safeRows<Faq>({ sql: FAQ_SQL, args: ['rental'] }),   // corporate / graduation / pricing('pricing', 'rental')
  safeRows<Faq>({ sql: FAQ_SQL, args: ['popup'] }),
]);
const faqItems = pageFaq.rows.length > 0 ? pageFaq.rows : popupFaq.rows;
// DB 장애로 일부가 빠진 응답은 CDN에 캐시하지 않음 (미들웨어는 Cache-Control이 이미 있으면 덮어쓰지 않음)
if (!pageFaq.ok || !popupFaq.ok) Astro.response.headers.set('Cache-Control', 'no-store');
```

### C. 지역 10개 페이지 (`:14-15`) ✅ (busan 검증)

```ts
import { safeRows } from '@lib/db';
const cityFaq = await safeRows<{ question: string; answer: string }>({ sql: 'SELECT question, answer FROM faqs WHERE page = ? AND active = 1 ORDER BY sort_order ASC, id ASC', args: ['seoul'] });
const cityFaqs = cityFaq.rows;
if (!cityFaq.ok) Astro.response.headers.set('Cache-Control', 'no-store');
```

### D. `src/pages/blog/[slug].astro:20`: 본문을 못 읽으면 503 (일시 오류 신호) ⚠ 미검증

```ts
let result;
try {
  result = await db.execute({ sql: `SELECT p.*, c.name as category_name, c.slug as category_slug FROM posts p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.deleted_at IS NULL`, args: [decodedSlug] });
} catch (e) {
  console.error('[blog] DB error', e);
  return new Response('일시적인 오류입니다. 잠시 후 다시 시도해 주세요.', { status: 503, headers: { 'Retry-After': '120', 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });
}
// tags / related 쿼리(:43, :50)는 safeRows로 바꿔 실패하면 빈 배열
```

`blog/index.astro:9`도 같은 방식 (503 또는 빈 목록 + `no-store`).

### E. `src/components/common/EventPopup.astro` ✅

```astro
<img src="/images/popup/noui-event.webp" … class="w-full h-auto block" loading="lazy" decoding="async" />
…
<script>
  const SHOW_DELAY_MS = 600;
  …
  document.addEventListener('DOMContentLoaded', () => {
    // 타이머로 띄우면 팝업 이미지가 LCP로 잡혀 모바일 LCP가 3초 넘게 늦어짐.
    // LCP는 첫 입력(스크롤·탭) 이후에는 갱신되지 않으므로 첫 스크롤 뒤에 띄움 (첫 화면 H1도 가리지 않음).
    if (shouldShowPopup()) {
      window.addEventListener('scroll', () => setTimeout(() => setPopup(true), SHOW_DELAY_MS), { once: true, passive: true });
    }
    …
```

### F. `src/components/home/HeroSection.astro` ✅

- 활성 레이어(wedding)를 뺀 `<img src=…>` 13개를 `<img data-src=… decoding="async">`로 바꿈.
- 스크립트에 아래를 추가함.

```ts
function loadLayer(index: number) {
  const layer = document.querySelector(`[data-bg="${keywords[index % keywords.length]}"]`);
  layer?.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => {
    img.src = img.dataset.src!;
    img.removeAttribute('data-src');
  });
}
// switchTo() 안, bgLayers.forEach(...) 바로 위
loadLayer(currentIndex);
loadLayer(currentIndex + 1);
```

참고: `src`가 없는 `<img>`는 HTML 검증기 경고 대상. 대안은 비활성 레이어를 `display:none` + `loading="lazy"`로 두는 방식 (크로스페이드 처리 필요).

### G. MachineShowcase `priority` ✅

```astro
---
interface Props { priority?: boolean }
const { priority = false } = Astro.props;   // /popup/ 처럼 첫 화면에 올 때만 true
---
{models.map((model, i) => ( …
  <img src={cdnImage(model.image, 600)} alt={model.name} class="…"
       loading={priority && i < 2 ? 'eager' : 'lazy'}
       fetchpriority={priority && i === 0 ? 'high' : undefined}
       decoding="async" />
```

`src/pages/popup.astro`에서는 `<MachineShowcase priority />`로 사용.

### H. PackageDetails ✅

```astro
import { cdnImage } from '@utils/image';
<img src={cdnImage(item.image_url, 480)} …>        <!-- :108 썸네일 -->
<img src={cdnImage(item.image_url, 800)} …>        <!-- :132 상세 -->
<img src={cdnImage(spec.image_url, 800)} …>        <!-- :165 팝오버 -->
```

### I. BaseLayout Google Fonts ✅

```astro
{Astro.url.pathname === '/' && (
  <>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap&text=…(기존과 같음)" rel="stylesheet" media="print" onload="this.media='all'" />
  </>
)}
```

### J. `src/middleware.ts:69` ✖ 미검증

공개 페이지는 읽기만 하므로 시드·마이그레이션이 필요 없음.

```ts
// 프로덕션 공개 페이지는 읽기 전용이라 초기화 불필요. 로컬 개발(local.db 시드)은 그대로 유지
const needsDB = pathname.startsWith('/admin') || pathname.startsWith('/api/') || import.meta.env.DEV;
```

주의: 새(빈) Turso DB로 옮기는 경우에는 `/admin`을 한 번 열어 초기화해야 함. 그 전까지 공개 페이지는 `safeRows` 덕분에 FAQ 없이 200으로 렌더됨.

### K. GSAP 조건부 로드 (`BaseLayout.astro:143-268` 대체 방향) ✖ 미검증

```ts
const targets = document.querySelectorAll<HTMLElement>('.gs-fade-up,.gs-fade-in,.gs-slide-left,.gs-slide-right,.gs-scale-in,.gs-stagger');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (targets.length && !reduce) {
  Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
    gsap.registerPlugin(ScrollTrigger);
    targets.forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight) return; // 첫 화면 요소는 애니메이션 안 함 (깜빡임·LCP 위험 제거)
      // 기존 fromTo 로직 (클래스별 from 값) 그대로
    });
  });
}
// 주의: DOMContentLoaded 래퍼는 제거 (dynamic import가 끝나기 전에 이미 발생했을 수 있음. 모듈 스크립트는 파싱 이후 실행됨)
```

### L. 모바일 리사이즈본 생성 (1회 실행 후 결과 파일 커밋) ⚠ 크기만 측정

```js
// scripts/make-mobile-images.mjs   (node scripts/make-mobile-images.mjs)
import sharp from 'sharp';
const jobs = [['public/images/wedding/hero.webp', 960, 70], ['public/images/hero/wedding.webp', 1080, 55], ['public/images/hero/festival.webp', 1080, 55],
  ['public/images/popup/simplecube-module-photobooth-honda.webp', 1080, 55], ['public/images/popup/simplecube-module-photobooth-shinsegae.webp', 1080, 55],
  ...Array.from({ length: 10 }, (_, i) => [`public/images/moments/simplecube-photobooth-moment-${i + 1}.webp`, 828, 55])];
for (const [src, w, q] of jobs) await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: q }).toFile(src.replace(/\.webp$/, `-${w}.webp`));
```

사용 예 (웨딩 LCP):

```html
<img src="/images/wedding/hero.webp" srcset="/images/wedding/hero-960.webp 960w, /images/wedding/hero.webp 1920w" sizes="(min-width: 1280px) 1216px, 100vw" …>
```

---

## 9. 오너가 직접 할 일 (비개발자용)

1. **실제 사용자 속도 확인 (5분)**
   1. 크롬에서 https://pagespeed.web.dev 접속 → `https://simplecube.net/` 입력 → 분석.
   2. "모바일" 탭 맨 위 "실제 사용자 환경 평가" 상자를 확인. "데이터 부족"이면 상자 오른쪽의 "출처"(사이트 전체)로 전환.
   3. Google Search Console → 왼쪽 메뉴 "경험" → "코어 웹 바이탈" → 모바일 보고서 열기.
   4. (선택) Vercel 대시보드 → 프로젝트 → Speed Insights → Enable. 한국 실사용 LCP·INP를 계속 볼 수 있음 (요금제 확인 필요).
2. **GTM 태그 정리 (마케팅 담당과 함께)**
   1. https://tagmanager.google.com → 컨테이너 `GTM-5JG6SWNF` → 태그.
   2. "네이버 공통 스크립트 + clickPrev(foresys)" 태그가 지금도 쓰이는지 확인. 쓰지 않는 태그는 일시중지.
   3. 쓰는 태그 중 전환(문의 완료) 외의 태그는 트리거를 "Window Loaded"로 교체.
   4. "제출 → 게시".
3. **웨딩 패키지 이미지 교체 (관리자 화면)**
   - 관리자 → 웨딩 → 패키지 구성 → "포토부스 안내 카드"(PNG 1.7MB)와 "방명록 용지"(PNG 690KB)를 JPG나 WebP 300KB 이하로 다시 업로드.
   - "포토 방명록" 이미지 주소가 `/images/wedding/photo-strips.jpg`면 `.webp`로 변경.
   - 코드 수정(P5)을 적용하면 자동으로 압축되지만, 원본도 가볍게 두는 것이 좋음.
4. **이벤트 팝업 운영**: 누이 제휴 이벤트가 끝나면 `src/pages/index.astro`의 `<EventPopup />` 한 줄을 삭제해 달라고 개발 담당에게 요청.

---

## 10. 증거 파일 목록 (`/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/performance/`)

- `lh/*.r1.json`, `lh/*.r2.json`: Lighthouse 원본 / `lh_summary.csv`, `lh_summary_full.txt`: 요약
- `lcp/lcp_*.json`, `lcp/*.png`: Playwright LTE LCP·CLS 측정과 9초 시점 스크린샷
- `mobile/mobile_ux.json`, `mobile/*_t_load.png`, `mobile/*_t_plus4500.png`: 360px 점검 (넘침·탭 타깃·글자·오버레이·gs-*)
- `ttfb_run1.txt`: TTFB (HIT/STALE vs MISS)
- `trace/trace_busan.json`: busan 로드 트레이스 (FCP 736ms, 렌더 차단 CSS 2개 확인)
- `thirdparty/gtm.js`: 공개 GTM 컨테이너 사본 (태그 분석용)
- `html/home.html`, `html/wedding.html`: 라이브 HTML (raw Cloudinary 확인)
- `resized/`: sharp 리사이즈 시험 결과 (저장소 밖)
- `perf-fixes.diff`: 검증된 수정 diff / `proto/`: 검증용 복사본 (node_modules·public은 저장소 심볼릭 링크, 캐시는 스크래치로 설정)
- `psi/*.json`: PSI 429 / CrUX 403 응답
- `scripts/`: 측정 스크립트 (`lhsum.py`, `mobile_ux.js`, `lcp_home.js`, `inp_probe.js`, `trace_fcp.js`, `ttfb.sh`, `resize_test.cjs`)
- 실행했던 dev 서버(4399, 4417)는 모두 종료함. 저장소 `git status`는 깨끗함 (변경 없음).
