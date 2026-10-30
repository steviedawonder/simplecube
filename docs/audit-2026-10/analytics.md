# 측정·분석(Analytics) 감사 — simplecube.net

- 작성일: 2026-10-30 · 담당: 측정/분석 스페셜리스트
- 범위: 페이지뷰 태그, 클릭 측정(카카오·전화·인스타·문의 버튼), 문의 전환, 검증 메타/파일, 코드 수정안, 주간 측정 계획
- 원칙: 저장소는 읽기만 했다(수정안은 별도 복사본에서 테스트). 라이브 사이트 요청은 약 79회. 문의 폼은 라이브에서 한 번도 제출하지 않았다. 모든 추적 전송(GA4·네이버·대행사 업체)은 브라우저에서 **기록만 하고 차단**해서 사장님 통계에 가짜 데이터가 들어가지 않았다.
- 표기: **[관찰]** = 직접 확인한 사실, **[가설]** = 근거는 있으나 직접 확인 못 한 것

---

## 0. 한눈에 보기

**"노출이 잘 되고 있나?"**
- **노출(검색 결과에 보인 횟수)과 검색 클릭**은 구글 서치콘솔과 네이버 서치어드바이저가 직접 센다. 그래서 사이트 코드 문제와 상관없이 **지금도 믿을 수 있다**.
- **그다음 단계(방문 → 문의)는 지금 숫자가 틀려 있다.**
  - 문의 전환은 부풀려져 있다.
  - 카카오톡·전화 문의 클릭은 거의 세지 않고 있다.
  - GA4 에는 '전환(핵심 이벤트)'이 하나도 지정돼 있지 않다.
  - 네이버 애널리틱스는 페이지뷰 일부를 놓친다.

| # | 발견 | 영향 | 노력 | 우선순위 |
|---|------|------|------|------|
| F1 | **문의 전환이 잘못 집계됨.** 실패한 제출 1회 = 전환 1건, 실제 문의 1건 = 전환 **2건**. GA4 와 네이버 광고 양쪽 모두 해당. 봇 제출도 2건으로 잡힘 | High (광고비 판단·CPA 왜곡) | S (코드) | **P0** |
| F2 | **GA4 핵심 이벤트(전환)가 기본값 3개뿐.** 실제 문의·카카오 이벤트는 하나도 지정 안 됨 | High | S (GA4 설정) | **P0** |
| F3 | **카카오·전화 클릭 측정 공백.** 대행사 트리거는 /contact/ 의 서울 TALK 버튼 1개뿐. 전화(tel:)는 어디서도 0건 | High | S (코드, 검증 완료) | **P1** |
| F4 | **네이버 애널리틱스(사장님 계정) 페이지뷰 유실.** 대행사 태그와 같은 전역 변수를 써서 생기는 경합. 실측 14회 중 4회 유실 | Med-High | S (코드, 검증 완료) | **P1** |
| F5 | 카카오 TALK 클릭이 네이버 광고 '문의(lead)' 전환에 섞여 들어감 | Med | S (GTM) | P2 |
| F6 | 대행사 GTM 의 부정클릭 감시 업체 스크립트(foresys)가 모든 페이지에서 실행됨. 쿠키 설정, 방문 정보를 외부로 전송, 서버가 정한 경고 팝업 표시 가능 | Med (개인정보·보안) | S (GTM) | P2 |
| F7 | 측정 도구 소유권: GTM 은 대행사만 접근 가능, GA4 는 접근 여부 미확인 | Med | S (요청) | P2 |
| F8 | 검증 메타 4개와 HTML 파일 1개: 모두 유지 | — | — | 유지 |

**코드 수정 2개 파일(복사본에서 브라우저 테스트 완료)로 F1·F3·F4 를 해결한다.** F2·F5·F6·F7 은 관리 화면 작업(아래 4장 단계별 안내)이다.

---

## 1. 페이지를 열 때 실행되는 태그 (실측)

**방법**
- Playwright 를 썼다. 모바일(Pixel 7)과 데스크톱(1440×900) 두 환경에서 `/`, `/wedding/`, `/popup/`, `/rental/`, `/contact/`, `/inquiry/popup/` 를 열었다.
- 모든 요청과 `window.dataLayer` 를 기록했다.
- 증거: `audit/analytics/live/summary.txt`, `network.json`, `datalayer.json`, `states.json`

**모든 페이지에서 동일하게 실행됨 [관찰]**

| 태그 | 요청 | 비고 |
|---|---|---|
| GTM 컨테이너 | `googletagmanager.com/gtm.js?id=GTM-5JG6SWNF` | 컨테이너 **버전 13**. 대행사 소유 |
| GA4 | `gtag/js?id=G-1ZLPBMQXNH` → `google-analytics.com/g/collect?tid=G-1ZLPBMQXNH&en=page_view` | **GA4 측정 ID 는 G-1ZLPBMQXNH 하나뿐**. 사이트 코드에는 gtag 가 없고 GTM 이 설치함 |
| 네이버 애널리틱스 (사이트 코드) | `wcs.pstatic.net/wcslog.js` → `wcs.naver.com/b` (`wa=2403ec27630898`) | `src/layouts/BaseLayout.astro:114-125` |
| 네이버 검색광고 공통 스크립트 (GTM) | `wcs.naver.net/wcslog.js` → `wcs.inflow()` + `wcs_do()` (`wa=s_858dcaea9be`) | 같은 wcslog.js 를 한 번 더 로드함 |
| 네이버 광고 쿠키 동기화 | `ssl.pstatic.net/melona/.../synchronizer.js` (2번) → `nam.veta.naver.com/nac/2` | wcslog 가 자동 로드 |
| 부정클릭 감시 (GTM, 대행사 업체) | `mkt.foresys.co.kr/looker/js/common/clickPrev.js` → `mkt.foresys.co.kr/looker/clickPrev?userId=wbstation&landingUrl=…&vReferrer=…` + `cdn.jsdelivr.net/npm/sweetalert2@9` | F6 참고 |

- **없는 것 [관찰]:** 구글 애즈(AW-), 메타 픽셀, 카카오 픽셀, Vercel Web Analytics, 사이트 코드 내 네이버 전환(`_nasa`/`wcs.cnv`/`wcs.trans`)
  - 마케팅 플레이북 1·3장의 메타 픽셀·구글애즈 전환은 아직 설치되지 않았다.
- **쿠키 [관찰]:** `_ga`, `_ga_1ZLPBMQXNH`, `_fwb`, `wcs_bt`, `fid`(foresys, 365일), `tid`(foresys)
- **페이지뷰 시 dataLayer [관찰]:** `gtm.js` → `gtm.dom` → `gtm.load` 뿐이다. 사이트 코드는 페이지뷰 때 아무것도 push 하지 않는다.
- **GTM 이 깔아 둔 자동 리스너 [관찰]:**
  - 링크 클릭(`gtm.linkClick`, 모든 링크): 데이터는 이미 들어오고 있고, 트리거 조건만 좁다
  - 스크롤(`gtm.scrollDepth` 90%)
  - 폼(`gtm.formInteract` / `gtm.formSubmit`): GA4 향상된 측정이 설치함

### 1-1. GTM 컨테이너 내용 (공개 gtm.js v13 해석) [관찰]

증거: `audit/analytics/raw/gtm_resource.json`, 파서 `scripts/parse_gtm.js`

| 태그 | 내용 | 트리거 |
|---|---|---|
| Google 태그 | G-1ZLPBMQXNH | 초기화(모든 페이지) |
| GA4 이벤트 `rental_inquiry_submit_kakao` (파라미터 없음) | 이름은 '제출'이지만 실제로는 카카오 클릭 | 아래 '카카오 트리거' |
| 맞춤 HTML: 네이버 `wcs.trans({type:"lead"})` | 네이버 광고 lead 전환 | 아래 '카카오 트리거' |
| GA4 이벤트 `rental_inquiry_submit_page` (파라미터 없음) | 문의 폼 전환 | 맞춤 이벤트 `form_submit` |
| 맞춤 HTML: 네이버 `wcs.trans({type:"lead"})` | 네이버 광고 lead 전환 | 맞춤 이벤트 `form_submit` |
| 맞춤 HTML (모든 페이지) | `wcs_add.wa="s_858dcaea9be"; wcs.inflow(); wcs_do()` + foresys `clickPrev.js` (data-userid="wbstation") | gtm.js |
| 링크 클릭 리스너 | waitForTags=false | gtm.js |

- **'카카오 트리거'**는 다섯 조건을 모두 만족해야 실행된다:
  1. Click URL **= `https://pf.kakao.com/_vxhEfj/chat`**
  2. Click Text **에 `TALK` 포함**
  3. Click Classes **에 `bg-[#FEE500]` 포함**
  4. 링크 클릭 이벤트일 것
  5. 해당 리스너에서 발생한 것
- 이 조건을 모두 만족하는 요소는 사이트 전체에서 **`/contact/` 의 서울 TALK 버튼 하나뿐**이다(`src/pages/contact.astro:131-141`, 서울 행). Tailwind 클래스명이나 버튼 글자만 바뀌어도 아무 경고 없이 측정이 끊긴다.
- 사이트가 보내는 `generate_lead` 를 쓰는 트리거는 **없다**. `src/pages/inquiry/popup.astro:335-341` 의 push 는 지금 아무 효과가 없다.

### 1-2. GA4 속성 설정 (공개 `gtag/js?id=G-1ZLPBMQXNH` 해석) [관찰]

증거: `raw/gtag_resource.json`

- **향상된 측정 전부 켜짐:** 페이지뷰, 스크롤, 외부 링크 클릭, 파일 다운로드, 양식 상호작용, 동영상, 사이트 검색, 기록 변경
- **핵심 이벤트(전환) 규칙: `close_convert_lead`, `qualify_lead`, `purchase` 3개뿐.**
  - 셋 다 GA4 가 자동으로 만드는 기본값이다. 사이트에서는 발생하지 않는 이벤트다.
  - 이 목록은 Google 이 서빙하는 설정 파일에서 읽은 것이다. 최종 확인은 GA4 관리 화면에서 해야 한다.
- Google 신호 데이터: 모든 지역에서 비활성
- 사용자 제공 데이터 자동 수집(이메일·전화·주소 자동 감지): **켜짐**. 테스트에서는 해시 이메일(`em`) 전송이 관찰되지 않았다(F9).

---

## 2. 발견사항 상세

### F1 [P0] 문의 전환이 실패 시 1건, 성공 시 2건, 봇도 2건으로 잡힘

**관찰**
- 라이브와 같은 GTM·GA4 설정이 로드되는 로컬 개발 서버에서 테스트했다. 원본 코드 그대로이고, `/api/inquiry` 는 가짜 응답으로 대체해 DB 에는 아무것도 저장되지 않았다.
- 증거: `audit/analytics/formexp/form_experiment_original.json`

| 상황 (원본 코드) | 서버 전송 | GA4 `rental_inquiry_submit_page` | 네이버 `wcs.trans lead` |
|---|---|---|---|
| 기기 미선택 → 경고창, **전송 안 됨** | 0 | **1** | **1** |
| 정상 접수 (id 4321) | 1 | **2** | **2** |
| 허니팟에 걸린 봇 (서버가 `{success:true,id:0}` 응답) | 1 | **2** | **2** |

**원인 (대조 실험으로 확정)**
- GA4 향상된 측정의 '양식 상호작용'은 폼의 `submit` 이벤트마다 내부적으로 **`form_submit`** 이벤트를 만든다. 대행사 GTM 의 '맞춤 이벤트 = form_submit' 트리거가 이 이벤트에도 반응한다.
- 대조 실험: GA4 라이브러리(`gtag/js`)만 차단하고 같은 실패 제출을 했더니 네이버 lead 전환이 **사라졌다**(`formexp/form_experiment.json` A1 vs A2).
- 여기에 2026-10-04 에 추가된 사이트의 `form_submit` push(`src/pages/inquiry/popup.astro:334`)가 성공 시 한 번 더 실행된다.
- 봇 건: `src/pages/api/inquiry.ts:27-29` 는 허니팟에 걸려도 성공으로 응답하고, 클라이언트(`popup.astro:326`)는 `res.ok` 만 보고 전환을 보낸다.
- **실제 영향 [가설]:**
  - 가장 큰 피해는 네이버 검색광고 전환이다. 광고 보고서의 전환수와 CPA, 그리고 전환 기반 자동입찰을 쓴다면 그 입찰까지 왜곡된다.
  - 플레이북의 '채널별 문의당 비용(CPA)'이 네이버 광고 보고서 기준이라면, 그 전환 수는 실제 문의보다 많다.
  - 기기 미선택, 전화·이메일 형식 오류, 서버 오류 등 실패한 시도와 중복이 섞여 있다.
  - 정확한 배수는 관리자 화면의 실제 문의 수와 네이버 광고 '전환수'를 같은 기간으로 비교하면 바로 나온다.

**수정**
- 코드(3-2): 제출 이벤트 전파 차단 + `id > 0` 확인.
- 테스트 결과(`form_experiment_patched.json`):

| 상황 | 결과 |
|---|---|
| 실패 | 전환 0 |
| 성공 | GA4 `rental_inquiry_submit_page` 1 + 네이버 lead 1 + GA4 `generate_lead` 1 |
| 봇 | 0 |

- GA4 의 `form_start` 는 그대로 남는다. 덕분에 '폼 시작 → 접수' 전환율을 볼 수 있다.
- 추가(대행사 또는 GA4 권한 확보 후): 다음 둘 중 하나로 이중 안전장치를 둔다. (4장 ②)
  - GA4 향상된 측정에서 '양식 상호작용' 끄기
  - GTM 트리거를 `generate_lead` 로 바꾸기

### F2 [P0] GA4 에 실제 전환이 하나도 지정돼 있지 않음

- **관찰:** 1-2 참고. 핵심 이벤트 = `close_convert_lead` / `qualify_lead` / `purchase` 뿐이다.
- **영향:** GA4 의 '핵심 이벤트'와 '채널별 전환' 보고서가 비어 있다. 구글 광고로 전환을 가져가는 것도 불가능하다.
- **수정:** 4장 ③. 코드 배포 후 `generate_lead` 하나만 핵심 이벤트로 지정한다.
  - `rental_inquiry_submit_page` 까지 같이 지정하면 이중 집계가 된다.
  - 카카오·전화는 파생 이벤트(`kakao_click`, `phone_click`)로 만들어 지정한다.

### F3 [P1] 카카오톡·전화 클릭 측정 공백

**사이트의 연락 링크 전체 (코드 grep + 렌더링 확인)**

| 위치 | 카카오 | 전화 | 인스타 | 문의 버튼 | 현재 측정 [관찰] |
|---|---|---|---|---|---|
| 푸터, 전 페이지 (`Footer.astro:2-27, 53, 78-118`) | 4지점 아이콘 | 4지점 | 4지점 | '문의하기' | 카카오·인스타: GA4 자동 `click`(일반 외부 링크)만. 전화·문의: **없음** |
| 플로팅 버튼, 전 페이지 (`FloatingContactButton.astro:9,19`) | – | – | – | 웨딩문의(`/contact/?type=wedding`), 행사문의(`/inquiry/popup/`) | **없음** |
| `/contact/` (`contact.astro:131-172`) | TALK ×4 | ×4 | ×4 | – | **서울 TALK 만** 대행사 이벤트 + 네이버 lead. 부산·대전·전주 TALK 는 일반 `click` 만. 전화 없음 |
| `/rental/`, `/corporate/`, `/pricing/` (`rental.astro:319-330` 등) | '카카오톡 상담'(서울, 노란 버튼) | 02-338-9180 | – | '문의하기', '예약 문의 →' | 카카오: 일반 `click` 만(글자가 TALK 가 아니라 제외). 전화·버튼: **없음** |
| 지역 페이지 10개 + `/graduation/` (`busan.astro:221-224` 등) | – | 지점 번호 | – | `/contact/` | **없음** |
| `/brand/` (`BranchOffices.astro:57,79`) | 텍스트(링크 아님) | ×4 | ×4 | – | 인스타 일반 `click` 만 |

**라이브 클릭 테스트 (모바일·데스크톱) [관찰]**
- 대행사 이벤트(`rental_inquiry_submit_kakao` + 네이버 lead)가 발생한 건 **/contact/ 서울 TALK 하나**였다.
- 그 외:
  - `/rental/` 노란 '카카오톡 상담'(같은 서울 채널 URL, 같은 노란 클래스), /contact/ 부산 TALK, 푸터 카카오 아이콘 → GA4 일반 `click`(outbound) 뿐
  - `tel:` 링크 → `gtm.linkClick` 만 생기고 **어디로도 전송 안 됨**
  - 문의 버튼(내부 링크) → 아무것도 없음

**추가 관찰 (UX·콘텐츠 담당 참고)**
- `/wedding/` 의 `BookingInquiry` 는 import 만 남아 있고 렌더링되지 않는다(`wedding.astro:7`, `:256` "removed").
- `BookingProcess`, `PartnerCompanies`, `InstagramSection`, `CTASection` 도 어디서도 렌더링되지 않는다.
- 결과적으로 `/`, `/wedding/`, `/popup/` 본문에는 연락 버튼이 없다. 상단 메뉴(`src/data/navigation.ts`)에도 '문의'가 없다. 이 페이지들의 문의 경로는 플로팅 버튼과 푸터뿐이다.

**수정:** 3-1 의 클릭 리스너. 테스트 결과는 모바일·데스크톱 **14/14 통과**다. 각 링크 유형의 `method`·`branch`·`link_area` 가 정확했고, GA4 에도 `contact_click` 이 전송됐다.

### F4 [P1] 네이버 애널리틱스 페이지뷰가 대행사 키로 새어 나감

**관찰**
- 사이트(`BaseLayout.astro:116-122`)와 대행사 GTM 태그가 **같은 전역 변수 `wcs_add.wa`** 에 각자 키를 쓴다.
- `wcslog.js` 는 `wcs_do()` 를 **호출하는 순간의 값**을 읽는다(`raw/wcslog_pstatic.js`: `i.wa=wcs_add.wa||"unknown"`).
- GTM 태그가 먼저 실행되면 사이트의 `wcs_do()` 도 `s_858dcaea9be` 로 나간다. 그러면 사장님 네이버 애널리틱스(`2403ec27630898`)는 그 페이지뷰를 받지 못하고, 대행사 키는 2번 받는다.

**실측**
- 라이브 페이지 로드 **14회 중 4회 유실**: 모바일 `/wedding/`, 모바일·데스크톱 `/contact/`, 첫 시험 로드.
- 호출 순서 기록(`live/naver_diag.json`):

```
CALL wcs_do wa=s_858dcaea9be by GTM tag
CALL wcs_do wa=s_858dcaea9be by SITE onload   ← 우리 키여야 함
```

**구조적 원인**
- GTM 스니펫은 `<head>` 맨 앞(오프셋 65)에 있다.
- 사이트의 네이버 스크립트(오프셋 2859)는 구글 폰트 `<link rel="stylesheet">`(오프셋 2496) 뒤에 있다. 그래서 폰트 CSS 가 도착할 때까지 실행되지 않는다(`raw/live_contact.html`).
- 또 GTM 이 쓰는 `wcs.naver.net/wcslog.js` 는 Cache-Control 헤더가 없어(Last-Modified 만 있음) 브라우저가 경험적 캐시로 오래 보관할 수 있다. 사이트가 쓰는 `wcs.pstatic.net/wcslog.js` 는 `max-age=43` 이다. 두 번째 이후 페이지에서 GTM 쪽이 이기기 쉽다 [가설, 아래 실험의 '재방문(warm)' 결과와 일치].

**재현 실험 (HTML 은 메모리에서 제공, 폰트 CSS 지연만 조절, `race/race_results_delay*.json`)**

| 조건 | 원본 유실 | 수정본 유실 |
|---|---|---|
| 지연 없음 | 0/40 | 0/40 |
| 폰트 CSS 400ms 지연 | 3/24 | **0/24** (GTM 이 먼저 실행된 경우 포함) |
| 1200ms 지연 | 1/20 | 0/20 |

**영향**
- 유실된 페이지가 랜딩 페이지면 네이버 애널리틱스에서 그 방문의 **유입 경로·네이버 검색어가 통째로 빠진다**. 1페이지만 보고 나간 방문(이탈 51%)은 방문 자체가 빠진다.
- 플레이북이 근거로 쓴 '하루 ~65명'은 과소 집계일 수 있다 [가설: 유실률은 사용자 네트워크·캐시에 따라 다름].

**수정:** 3-1 의 네이버 블록. `wcs_do()` 직전에 우리 키를 다시 넣는다. 어느 쪽이 먼저 실행돼도 두 계정이 정확히 1번씩 받는다(실험·로컬 테스트로 확인).

### F5 [P2] 카카오 클릭이 네이버 광고 '문의(lead)' 전환에 섞임

- **관찰:** 서울 TALK 클릭 시 `wcs.naver.com/b` 로 `{"t":"conv","trans":"{\"type\":\"lead\"}"}` 가 전송된다. 폼 문의와 같은 유형이다(`live/summary.txt` contact 클릭).
- **영향:** 검색광고 보고서에서 '폼 문의'와 '카카오 클릭'(그것도 /contact/ 서울 버튼만)을 구분할 수 없다.
- **수정:** 4장 ④. GTM 에서 사이트 이벤트(`contact_click`, method=kakao/phone)를 트리거로 쓰고, 폼과 다른 전환 유형으로 분리한다.
  - 네이버가 지원하는 유형명은 검색광고 시스템에서 확인해야 한다.
  - `wcs.trans` 에 `id`(문의 번호)를 넘기면 네이버가 중복을 걸러 준다. 로드된 wcslog.js 에서 `id` 처리 코드를 확인했다.

### F6 [P2] 대행사 GTM 안의 부정클릭 감시 스크립트 (foresys)

**관찰** (`raw/clickPrev.js` 정독)

모든 페이지에서 다음을 한다:
1. 1년짜리 `fid` 쿠키와 세션 `tid`(쿠키 + localStorage + sessionStorage)를 만든다.
2. 접속 URL 전체(광고 파라미터 포함)·리퍼러·제목을 `mkt.foresys.co.kr` 로 보낸다. 나갈 때(`beforeunload`)도 한 번 더 보낸다.
   - 전화 링크를 누를 때도 실행되는 것을 확인했다.
3. `cdn.jsdelivr.net/npm/sweetalert2@9` 를 버전 고정·무결성(SRI) 확인 없이 로드한다.
4. 서버 응답이 `isAlert:'on'` 이면 **서버가 준 HTML 로 경고 팝업을 사이트 위에 띄운다**(`Swal.fire({html: eval_data.alertMsg})`).

**영향**
- 개인정보 처리방침에 제3자 수집 고지가 필요할 수 있다 [가설: 법률 검토 대상].
- 외부 서버가 사이트 위에 임의 HTML 을 띄울 수 있는 구조라 보안상 위험하다.
- 방문자에게 경고창이 뜰 수 있다.

**수정:** 4장 ⑤. 대행사에 용도와 계약 여부를 확인한다.
- 필요 없다면 GTM 맞춤 HTML 태그에서 **foresys 한 줄만** 삭제한다.
- 같은 태그 안의 네이버 `wcs.inflow()` 부분은 광고 전환 연결에 필요하니 남긴다.

### F7 [P2] 측정 도구 소유권

- GTM: 대행사 소유이고 접근할 수 없다(`docs/SEO_RECOVERY.md` 4번).
- GA4: G-1ZLPBMQXNH 의 소유자와 사장님 접근 권한은 **미확인**이다. 문서상 권한 공유를 요청한 상태다.
- 이 감사의 코드 수정은 GTM 변경 없이도 GA4 에 바로 기록된다(`send_to` 직접 전송, 아래 3장). 다만 GA4 속성에 접근하지 못하면 결과를 볼 수 없다.
- **조치:** 4장 ①
  - 권한을 받을 때까지 기다리지 않으려면 '사장님 소유 GA4 속성 추가'를 대안으로 쓴다. `GA4_ID` 상수에 측정 ID 하나를 추가하는 수준이다.

### F8 [P3] 기타

- `generate_lead` dataLayer push 는 지금 GTM 에서 쓰이지 않는다. 수정안에서는 GA4 로 직접 전송하는 핵심 이벤트가 된다.
- GA4 '사용자 제공 데이터 자동 수집'이 켜져 있다. 핵심 이벤트를 지정하면 폼의 이메일·전화가 해시 형태로 구글에 전송될 수 있다 [가설]. 개인정보 처리방침 고지 문구를 점검해야 한다. GA4 관리 > 데이터 수집에서 끌 수도 있다.

---

## 3. 코드 수정안 (복사본에서 실행·브라우저 테스트 완료)

- 전체 diff:
  - `audit/analytics/patch/BaseLayout.diff`
  - `audit/analytics/patch/inquiry_popup.diff`
- 테스트 스크립트: `audit/analytics/scripts/pw_local_test.js`, `pw_form_experiment*.js`, `pw_race.js`

### 3-1. `src/layouts/BaseLayout.astro`

**(a) GTM 스니펫 바로 아래(51행 `<!-- End Google Tag Manager -->` 다음)에 추가: 연락 클릭 측정**
- 문서 전체에 클릭 리스너 하나를 캡처 단계로 단다.
- 이동(새 탭·전화 앱)은 막지 않는다.
- DB 에서 렌더링되는 블로그 본문 링크까지 자동으로 포함된다.

```html
    <!-- 문의 경로 클릭 측정 — 카카오톡·전화·인스타그램·문의 버튼 클릭을 사이트가 직접 기록
         (대행사 GTM 의 카카오 트리거는 /contact/ 서울 TALK 버튼 1개에만 걸려 있어 나머지 클릭이 집계되지 않음) -->
    <script is:inline>
      (function () {
        // 지점 구분: 카카오 채널 ID · 전화번호(숫자만) · 인스타그램 계정 → 지점 코드
        var BRANCH = {
          _vxhEfj: 'seoul', _RxgxkPb: 'busan', _xgqgyb: 'daejeon', _TPxjxoG: 'jeonju',
          '023389180': 'seoul', '01031224746': 'busan', '01088388122': 'daejeon', '01057438122': 'jeonju',
          simplecube_photobooth: 'seoul', simplecube_wedding: 'seoul',
          simplecube_busan: 'busan', simplecube_daejeon: 'daejeon', simplecube_jeonju: 'jeonju'
        };
        // GTM 이 설치한 GA4 (측정 ID). 페이지에서 보내는 gtag 이벤트는 send_to 를 지정해야 GA4 로 전송된다
        var GA4_ID = 'G-1ZLPBMQXNH';
        function gtag() { window.dataLayer.push(arguments); }
        function classify(a) {
          var href = a.getAttribute('href') || '';
          if (/^tel:/i.test(href)) return { method: 'phone', branch: BRANCH[href.replace(/\D/g, '')] };
          if (/^mailto:/i.test(href)) return { method: 'email' };
          var u;
          try { u = new URL(href, location.href); } catch (e) { return null; }
          var first = u.pathname.split('/')[1] || '';
          if (u.hostname === 'pf.kakao.com') return { method: 'kakao', branch: BRANCH[first] };
          if (/(^|\.)instagram\.com$/.test(u.hostname)) return { method: 'instagram', branch: BRANCH[first.toLowerCase()] };
          if (u.origin === location.origin && (first === 'contact' || first === 'inquiry')) return { method: 'inquiry_cta' };
          return null;
        }
        // 캡처 단계에서 듣는다 — 다른 스크립트가 클릭 전파를 막아도 기록되고, 이동(새 탭·전화 앱)은 막지 않는다
        document.addEventListener('click', function (e) {
          var a = e.target instanceof Element ? e.target.closest('a[href]') : null;
          var info = a && classify(a);
          if (!info) return;
          var params = {
            method: info.method,
            branch: info.branch || 'none',
            link_url: a.href,
            link_text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) || a.getAttribute('aria-label') || '',
            link_area: a.closest('footer') ? 'footer' : a.closest('#floating-quick') ? 'floating' : a.closest('header') ? 'header' : 'main',
            page_path: location.pathname
          };
          try {
            window.dataLayer = window.dataLayer || [];
            // GTM 트리거용 맞춤 이벤트 — 네이버 광고 전환 등은 GTM 에서 이 이벤트(contact_click)에 연결
            window.dataLayer.push(Object.assign({ event: 'contact_click' }, params));
            // GA4 로 직접 전송 (GTM 이 설치한 Google 태그가 처리) — GTM 에 contact_click 용 GA4 태그를 또 만들면 중복
            gtag('event', 'contact_click', Object.assign({ send_to: GA4_ID }, params));
          } catch (err) { /* 측정 실패가 클릭 동작에 영향 주지 않음 */ }
        }, true);
      })();
    </script>
```

**(b) 114-125행 네이버 애널리틱스 블록 교체 (F4)**

```html
    <!-- Naver Analytics (비동기 로드 — 렌더링을 막지 않음) -->
    <script is:inline>
      (function () {
        // 대행사 GTM 의 네이버 광고 태그도 같은 전역 wcs_add.wa 를 자기 키(s_…)로 바꾼다.
        // wcs_do() 호출 직전에 우리 키를 다시 넣어야 네이버 애널리틱스 페이지뷰가 대행사 키로 새지 않는다.
        var NA_KEY = '2403ec27630898';
        window.wcs_add = window.wcs_add || {};
        window.wcs_add['wa'] = NA_KEY;
        var s = document.createElement('script');
        s.src = 'https://wcs.pstatic.net/wcslog.js';
        s.async = true;
        s.onload = function () {
          if (!window.wcs) return;
          window.wcs_add['wa'] = NA_KEY;
          window.wcs_do();
        };
        document.head.appendChild(s);
      })();
    </script>
```

### 3-2. `src/pages/inquiry/popup.astro` (F1)

**`form.addEventListener('submit', …)` 첫 줄(`e.preventDefault();`) 다음에 추가:**

```ts
    // GA4 '양식 상호작용' 자동 측정이 이 submit 을 보고 'form_submit' 을 만들면, 대행사 GTM 의 문의 전환
    // (GA4 rental_inquiry_submit_page + 네이버 lead)이 검증 실패·전송 실패 때도 실행되고 성공 시엔 2번 집계된다.
    // 제출 이벤트를 여기서 멈추고, 실제 접수 성공 시에만 아래에서 form_submit 을 직접 보낸다.
    e.stopPropagation();
```

**`if (res.ok) {` 안의 기존 try 블록(326-342행)을 교체:**

```ts
      if (res.ok) {
        // 전환 추적: 문의 완료 시 GTM으로 lead 이벤트 전송
        // (분석 전용 — 위 fetch 성공 이후에만 실행되며 문의/이메일 발송 로직과 무관)
        // 허니팟에 걸린 봇 요청도 서버는 성공(id: 0)으로 응답한다 — 실제로 접수된 문의(id > 0)만 전환으로 기록
        const result = await res.json().catch(() => null);
        const inquiryId = Number(result?.id) || 0;
        if (inquiryId > 0) {
          try {
            const w = window as any;
            w.dataLayer = w.dataLayer || [];
            const lead = { form_id: 'event_inquiry', inquiry_id: String(inquiryId), booth_type: boothTypes, region, referral };
            // GTM 컨테이너의 문의 전환 태그(GA4 rental_inquiry_submit_page + 네이버 광고 lead 전환)는
            // 'form_submit' 이벤트로 실행된다 — 이 이벤트가 없으면 두 전환 모두 집계되지 않음
            w.dataLayer.push({ event: 'form_submit', form_id: 'event_inquiry', inquiry_id: lead.inquiry_id });
            w.dataLayer.push({ event: 'generate_lead', ...lead });
            // GA4 로 직접 전송 (대행사 GTM 과 무관) — GA4 관리 > 이벤트에서 generate_lead 를 '핵심 이벤트'로 지정
            const gtag = function (..._args: unknown[]) { w.dataLayer.push(arguments); };
            gtag('event', 'generate_lead', { ...lead, send_to: 'G-1ZLPBMQXNH' });
          } catch { /* 추적 실패는 문의 성공에 영향 주지 않음 */ }
        }

        form.classList.add('hidden');
        // …(이하 기존 코드 그대로)
```

### 3-3. 테스트 결과 요약

- **환경:** 저장소 복사본 + `astro dev --port 4391`. 같은 GTM·GA4 설정이 로드됐다. 추적 전송은 전부 차단했고 `/api/inquiry` 는 가짜 응답으로 대체했다.
- **클릭 14종 × 모바일·데스크톱: 모두 통과.**
  - 대상: 카카오(서울·부산·전주 TALK, 렌탈 노란 버튼, 푸터 대전 아이콘), 전화(대전, 렌탈, 푸터 서울, 부산 페이지), 인스타(부산, 푸터 전주), 이메일, 문의 버튼(렌탈 '문의하기', 플로팅 '행사문의')
  - dataLayer `contact_click` 의 method·branch·link_area 가 기대값과 일치했다.
  - GA4 `contact_click` 전송도 확인했다(`localtest2`, `localtest3`).
  - 예시: `{"method":"phone","branch":"seoul","link_text":"서울 본점 전화","link_area":"footer","page_path":"/contact/"}`
- **중요한 사실 [관찰]:** GTM 이 설치한 Google 태그는 페이지의 `gtag('event', …)` 를 **`send_to` 없이는 GA4 로 보내지 않는다.** `send_to: 'G-1ZLPBMQXNH'` 를 넣으면 전송된다(`formexp/form_experiment.json` B). 그래서 코드에 `send_to` 를 명시했다.
- **폼:** 3-2 적용 후 실패 0 / 성공 각 1 / 봇 0 (F1 표 참고).
- **네이버:** 매 로드마다 `2403ec27630898` 1회 + `s_858dcaea9be` 1회.
- **배포 후 확인 (사장님 또는 개발자):**
  1. GA4 → 보고서 → 실시간 화면을 연다.
  2. 휴대폰으로 사이트 하단 전화 아이콘을 누른다.
  3. 1분 안에 `contact_click` 이 보이면 정상이다.
  4. 문의 폼 실제 1건 → `generate_lead` 1건과 `rental_inquiry_submit_page` 1건(2건이 아님)인지 확인한다.

### 3-4. (선택, P3) 문의마다 유입 출처 저장

- GA4 접근과 무관하게 관리자 화면에서 '이 문의가 어디서 왔는지'를 보는 방법이다.
- 첫 방문 시 `utm_*`·외부 리퍼러·랜딩 페이지를 `localStorage` 에 저장해 문의 전송에 포함한다. `inquiries` 에는 `source TEXT` 컬럼을 추가한다.
  - 기존 패턴: `src/lib/db.ts:416-433` 의 `ALTER TABLE … ADD COLUMN` 마이그레이션
- 지금은 '인지 경로'(자기 응답)가 있으므로 우선순위는 낮다. 설계만 제안하며 미검증이다.

---

## 4. 관리 화면 작업 (코드로 못 하는 것, 순서대로)

**① 권한 확보 (사장님 → 대행사에 요청)**
1. GA4: '관리 → 속성 액세스 관리 → + → 사용자 추가' → `simplecube2019@gmail.com` 을 **관리자**로 추가 요청
2. GTM: '관리 → 사용자 관리' → 같은 계정을 컨테이너 **게시** 권한으로 추가 요청
3. 2주 안에 안 되면: 사장님 계정으로 새 GA4 속성을 만든다(analytics.google.com → 관리 → 만들기 → 속성 → 웹 스트림 `https://simplecube.net`). 받은 측정 ID 를 개발자에게 전달해 코드에 추가한다.

**② 이중 집계 차단 (대행사 또는 권한 확보 후)**
- 3-2 를 배포하면 코드만으로 해결된다. 추가 안전장치로 아래 둘 중 **하나**를 한다:
  - (a) GA4 '관리 → 데이터 스트림 → 웹 → 향상된 측정 톱니바퀴 → 양식 상호작용 끄기'
  - (b) GTM 문의 전환 트리거를 '맞춤 이벤트 = `generate_lead`'로 바꾸고, 네이버 태그에 `id: {{DLV - inquiry_id}}` 추가

**③ GA4 핵심 이벤트 지정 (코드 배포 후)**
1. 관리 → 데이터 표시 → 핵심 이벤트 → '새 핵심 이벤트' → `generate_lead`
   - `rental_inquiry_submit_page` 는 지정하지 않는다. 같이 지정하면 이중 집계된다.
2. 관리 → 데이터 표시 → 이벤트 → '이벤트 만들기'
   - `kakao_click` = event_name 이 `contact_click` 이고 `method` 가 `kakao`
   - `phone_click` = `method` 가 `phone`
   - 둘 다 핵심 이벤트로 지정한다.
3. 관리 → 데이터 표시 → 맞춤 정의 → 맞춤 측정기준(범위: 이벤트): `branch`, `link_area`, `booth_type`, `region`, `referral`
   - `method`·`link_url`·`link_text` 는 GA4 기본 측정기준이라 등록이 필요 없다.
4. 관리 → 데이터 보관 → 이벤트 데이터 **14개월**. 기본 2개월이면 작년 비교가 불가능하다.
5. 관리 → 데이터 스트림 → 태그 설정 구성 → 내부 트래픽 정의에 사무실 IP 를 넣는다. 그다음 데이터 필터에서 '내부 트래픽'을 활성화한다.

**④ GTM 정리 (대행사)**
1. 카카오 트리거(URL·TALK·노란 클래스 5조건)를 '맞춤 이벤트 `contact_click` + `method` 가 kakao'로 교체한다(전 지점·전 버튼).
2. 전화도 같은 방식으로 `method = phone` 을 적용한다.
3. 카카오·전화의 네이버 전환은 폼 'lead'와 **다른 유형**으로 분리한다. searchad.naver.com → 도구 → 전환 추적 설정에서 지원 유형을 확인한다.
4. GA4 용 `contact_click`·`generate_lead` 태그는 **만들지 않는다**. 사이트가 직접 보내므로 만들면 중복된다.
5. `docs/MARKETING_PLAYBOOK.md` 1장의 'GTM 트리거 generate_lead → GA4 이벤트 태그' 단계는 이 코드로 대체되니 하지 않는다. 네이버·메타 전환만 GTM 에서 연결한다.

**⑤ foresys 스크립트 확인 (대행사)**
- 용도·비용·필요성을 확인한다. 불필요하면 '모든 페이지' 맞춤 HTML 태그에서 `mkt.foresys.co.kr/…/clickPrev.js` 줄만 삭제한다.
- 계속 쓴다면 개인정보 처리방침에 수탁·제3자 수집 내용을 고지한다.

---

## 5. UTM 규칙 (외부 → 사이트 링크에만, 사이트 내부 링크에는 절대 금지)

**공통 규칙**
- 영어 소문자와 밑줄(_)만 쓴다. 한글은 쓰지 않는다(인코딩돼 보고서에서 깨짐).
- `utm_source` = 어디서, `utm_medium` = 어떤 방식, `utm_campaign` = 지점·목적, `utm_content` = 게시물 구분
- 링크 생성: https://ga-dev-tools.google/campaign-url-builder/

| 출처 | 예시 URL | GA4 채널 |
|---|---|---|
| 인스타 프로필 링크 (지점별) | `https://simplecube.net/?utm_source=instagram&utm_medium=social&utm_campaign=bio_seoul` | Organic Social |
| 인스타 게시물·스토리 | `…/wedding/?utm_source=instagram&utm_medium=social&utm_campaign=wedding_2026fall&utm_content=story_1030` | Organic Social |
| 인스타·메타 유료 광고 | `…&utm_source=instagram&utm_medium=paid_social&utm_campaign=wedding_retarget` | Paid Social |
| 네이버 블로그 글 하단 링크 | `…/rental/?utm_source=naver_blog&utm_medium=referral&utm_campaign=blog&utm_content=<글번호>` | Referral |
| 카카오톡 채널 프로필 '홈페이지' 버튼 | `https://simplecube.net/?utm_source=kakao_channel&utm_medium=social&utm_campaign=profile_seoul` | Organic Social |
| 카카오 상담 중 보내는 링크 | `…/pricing/?utm_source=kakao_channel&utm_medium=chat&utm_campaign=consult_seoul` | 할당되지 않음 |
| 네이버 파워링크 | `…/wedding/?utm_source=naver&utm_medium=cpc&utm_campaign=powerlink_wedding` | Paid Search |
| (선택) 네이버 플레이스 홈페이지 링크 | `https://simplecube.net/?utm_source=naver_place&utm_medium=organic&utm_campaign=seoul` | Organic Search |
| 포토스트립·현장 안내판 QR | `https://simplecube.net/?utm_source=photostrip&utm_medium=qr&utm_campaign=<행사명>` | 할당되지 않음 |

- **파워링크:** UTM 이 없으면 GA4 에서 유료 유입이 `ad.search.naver.com / referral` 이나 자연 검색으로 섞일 수 있다 [가설]. 네이버 자체 분석(네이버 애널리틱스·검색광고 보고서)은 UTM 없이도 광고 유입을 구분한다.
- **플레이스 링크:** 네이버 로컬 담당과 협의 후 적용한다. canonical 태그가 `?utm_…` 변형을 정리하므로 색인 문제는 없다.
- **QR·채팅:** GA4 기본 채널 그룹에서는 '할당되지 않음(Unassigned)'으로 분류된다. '관리 → 채널 그룹'에서 `medium` 이 `qr`·`chat` 인 '오프라인·상담' 채널을 만들면 보기 좋다.

---

## 6. 측정 계획 — "노출이 잘 되고 있나?" (매주 월요일 15분)

| # | KPI | 어디서 보나 | 기준선 (문서) | 해석 |
|---|---|---|---|---|
| 1 | 구글 노출·클릭·CTR·평균 순위 (**브랜드/비브랜드 분리**) | 서치콘솔 → 실적 → 검색결과 → 필터 '검색어 → 맞춤(정규식) → 일치하지 않음 `심플큐브\|simplecube\|심플 큐브`' + 비교: 지난 주 | — | 비브랜드 노출이 늘어야 '신규 노출'이 늘어난 것 |
| 2 | 구글 색인 페이지 수 | 서치콘솔 → 색인 생성 → 페이지 | 10/4 색인 20 / 미색인 119 | 색인 수 증가, '발견됨-색인 안 됨' 감소 |
| 3 | 네이버 웹문서 노출·클릭 | 서치어드바이저 → 사이트 선택 → 리포트 → 콘텐츠 노출 및 클릭(검색 노출) | 7/28 하루 800~1,000 노출, 클릭≈0 | 클릭 0 탈출이 1차 목표 |
| 4 | 네이버 수집·색인 | 서치어드바이저 → 진단 → 수집 현황 (메뉴명은 개편될 수 있음) | — | 수집 실패·오류 0 유지 |
| 5 | 방문(세션) 채널별 | GA4 → 보고서 → 획득 → 트래픽 획득 (세션 소스/매체). 교차 확인: 네이버 애널리틱스 → 유입분석 (**네이버 검색어는 여기서만 보임**) | 네이버 애널리틱스 ~65명/일 (6~7월) | GSC·서치어드바이저 클릭 증가가 실제 방문으로 이어지는지 |
| 6 | 연락 클릭 (카카오·전화, 지점별) | GA4 → 탐색 → 자유 형식: 이벤트 `contact_click` × `method` × `branch` (코드 배포 후) | 없음 (배포 주가 기준) | 지점별 수요 파악 |
| 7 | 문의 접수 | GA4 핵심 이벤트 `generate_lead` (채널별). **정답지 = 관리자 → 문의 목록 건수** | — | 두 숫자가 같아야 측정이 건강함 |
| 8 | 실제 카카오 상담 수 | 카카오톡 채널 관리자센터(center-pf.kakao.com) → 지점 채널 → 통계 → 채팅 | — | 6번 클릭 수 대비 실제 상담 전환 |
| 9 | 광고 효율 | searchad.naver.com → 보고서 → 클릭·비용·전환 → **CPA = 비용 ÷ 7번 실제 문의** | 플레이북: 유료 28% | F1 수정 전 숫자로 판단하지 말 것 |

**서치콘솔 ↔ GA4 연결**
1. GA4 관리 → 제품 링크 → Search Console 링크 → 연결 → `https://simplecube.net/` 선택 → 웹 스트림 선택 → 제출
   - 조건: 같은 구글 계정이 서치콘솔 '소유자'이면서 GA4 '편집자' 이상이어야 한다.
2. GA4 → 보고서 → 라이브러리 → 'Search Console' 컬렉션 → 게시
   - '구글 자연 검색어'와 '랜딩 페이지별 노출 → 세션 → 문의'를 한 화면에서 볼 수 있다.

**Looker Studio 주간 대시보드 (무료)**
- **데이터 소스**
  - Search Console 커넥터: '사이트 노출' + 'URL 노출'
  - GA4 커넥터: G-1ZLPBMQXNH
  - 구글 시트 '네이버_주간': 매주 수기 입력. 네이버 노출·클릭, 네이버 애널리틱스 방문, 광고비·전환, 플레이스 조회, 카카오 채팅 수 (네이버는 무료 커넥터가 없음)
- **페이지 1 '노출':** 구글·네이버 노출과 클릭의 주별 추세, 브랜드 대 비브랜드, 상위 검색어·페이지
  - 계산 필드: `CASE WHEN REGEXP_MATCH(Query, ".*(심플큐브|simplecube|심플 큐브).*") THEN "브랜드" ELSE "비브랜드" END`
- **페이지 2 '유입':** GA4 채널별 세션, 랜딩 페이지 상위 10, 기기
- **페이지 3 '문의':** `generate_lead`·`kakao_click`·`phone_click` 의 채널별·지점별 수, 랜딩 페이지별 문의율, CPA(시트 광고비 ÷ 문의)
- **공유:** Looker Studio 의 '공유 → 전송 예약'으로 매주 월요일 오전 메일 발송

**Vercel Web Analytics / Speed Insights 판단**
- **Web Analytics: 켜는 것을 권장 (P2).**
  - 장점
    - 사장님 소유(Vercel 팀 `steviedawonders-projects`)이고 대행사와 무관하다.
    - 쿠키를 쓰지 않고, 사이트 자체 경로(`/_vercel/insights/script.js`)로 수집한다.
    - 페이지·리퍼러·국가·기기·UTM 별로 볼 수 있다.
    - CLI·MCP 로 조회할 수 있어 주간 보고를 자동화할 수 있다.
  - 비용·확인 사항
    - 플랜별 무료 포함량이 다르고 초과하면 과금된다. Vercel 대시보드 → 프로젝트 → Analytics 탭에서 현재 요금을 확인한다(이 감사에서는 요금을 확인하지 못함).
    - 맞춤 이벤트는 쓰지 않고 페이지뷰만 쓰면 충분하다.
    - GA4·네이버 애널리틱스와 숫자가 다르게 나오는 것은 정상(측정 방식 차이)이라고 미리 알아둘 것.
  - 설치
    - 대시보드에서 Enable
    - `astro.config.mjs` 의 `adapter: vercel({ webAnalytics: { enabled: true } })` 한 줄 추가
    - 설치된 `@astrojs/vercel` 9.0.4 가 이 옵션을 지원함을 확인했다(`dist/lib/web-analytics.js`).
- **Speed Insights: 보류 (P3).** 하루 방문 ~65명이면 표본이 적다. Vercel 문서상 상위 기능(Plus)은 Pro 플랜이 필요하다. 성능 담당이 필드 데이터가 꼭 필요할 때 검토한다.
- **확인 필요:** 프로젝트가 Hobby 플랜이라면 Vercel 공정 사용 정책상 상업적 사용 제한이 있다. API 로는 플랜을 확인하지 못했다.

---

## 7. 검증 메타·파일 — 전부 유지

라이브 응답으로 확인했다 [관찰].

| 자산 | 위치 | 라이브 | 판단 |
|---|---|---|---|
| `google5058387aec84b78b.html` | `public/` | 200, 내용 `google-site-verification: google5058387aec84b78b.html` | **유지 필수.** 10/4 simplecube2019 계정 서치콘솔 소유권(HTML 파일 방식), `SEO_RECOVERY.md` 에 '삭제 금지' |
| `google-site-verification` `eMVHYc4Y…` | `BaseLayout.astro:98` | 모든 페이지 head | **유지.** 어느 계정 것인지 미확인 |
| `google-site-verification` `DukaOvIw…` | `BaseLayout.astro:99` | 〃 | **유지.** 〃 |
| `naver-site-verification` `99c64b13…` | `BaseLayout.astro:100` | 〃 | **유지.** 〃 |
| `naver-site-verification` `150bf729…` | `BaseLayout.astro:101` | 〃 | **유지.** 〃 |

- 메타 4개는 저장소 첫 커밋(2026-04-10, `ca34b12`)부터 있었다. 이전 사이트에서 옮겨 온 것으로 보이며, 어느 것이 오래됐는지 증명할 수 없다.
- 소유자를 정리하려면 먼저 아래 화면에서 각 토큰의 계정을 확인한다. 그 계정이 아직 쓰이고 있다면 지우면 안 된다.
  - 서치콘솔 → 설정 → 사용자 및 권한 / 소유권 확인
  - 서치어드바이저 → 사이트 관리 → 소유 확인

---

## 8. 부록 — 방법·증거·한계

**증거 파일** (모두 `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/analytics/` 아래)
- 라이브 측정: `live/` (요약 `live/summary.txt`), `live_mobile_home/`
- 컨테이너·설정: `raw/gtm.js`, `raw/gtm_resource.json`, `raw/gtag_G-1ZLPBMQXNH.js`, `raw/gtag_resource.json`, `raw/clickPrev.js`, `raw/wcslog_pstatic.js`, `raw/live_contact.html`
- 네이버 경합: `race/race_results_delay0/400/1200.json`
- 로컬 테스트: `localtest2/`, `localtest3/`, `formexp/form_experiment*.json`
- 수정 diff: `patch/BaseLayout.diff`, `patch/inquiry_popup.diff`
- 스크립트: `scripts/*.js`

**안전 조치**
- 모든 추적 전송을 `ERR_BLOCKED_BY_CLIENT` 로 차단했다. 서버에 도달한 추적 전송 0건을 검사했다(`summary.txt` 첫 줄).
- 서울 TALK 클릭·전환 모의 테스트도 전송 전에 차단해 사장님·대행사 통계에 영향이 없다.
- 예외: 네이버 경합 실험(`pw_race.js`)은 차단 대상을 GA4·네이버·foresys 로 좁혔다. 그래서 구글 태그 자체 진단 핑(`googletagmanager.com/a`)은 나갔을 수 있다. 사장님 GA4 보고서와는 무관하다.
- 문의 API 는 로컬에서만, 가짜 응답으로 대체했다.

**부수 효과 (공개)**
- 복사본의 `node_modules` 를 저장소 것과 심볼릭 링크로 공유했다. 그래서 개발 서버가 Vite 의존성 캐시를 `/home/user/simplecube/node_modules/.vite/deps` 에 썼다(16:40).
- git 에 포함되지 않는 자동 재생성 캐시이고 소스는 변경 없다(`git status` 깨끗함).

**확인하지 못한 것**
- GA4·GTM·서치콘솔·서치어드바이저·검색광고 관리 화면: 로그인 필요
- 실제 GA4 보고서 숫자
- 현장 사용자 기준의 정확한 네이버 유실률
- Vercel 플랜과 Web Analytics 요금
