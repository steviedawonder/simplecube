# 구조화 데이터(schema.org / JSON-LD) 감사 — simplecube.net

- 작성: 구조화 데이터 담당 · 2026-10-30 · 대상: 라이브 `https://simplecube.net` (= 커밋 `2559567`)
- 원칙: 저장소 읽기 전용. 제안 코드는 **스크래치 샌드박스 복사본에서 실제로 렌더링·검증까지 마침** (§7).
- 증거·스크립트 폴더: `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/schema/`

---

## 0. 한눈에 보기

| # | 발견 | 영향×공수 | 구분 |
|---|---|---|---|
| F1 | **지역 페이지 9곳의 Service 제공자 전화가 화면의 지점 전화와 다름**(02-338-9180 vs 부산·대전·전주 지점 번호), **6곳은 areaServed 에 그 페이지 도시가 없음**(대구 페이지인데 서울·부산·대전·전주) | **High × S** | Observed |
| F2 | 엔티티가 서로 연결되지 않음: `@id` 없는 "심플큐브" 사업체 사본 **22개**(19페이지), 전화 표기 2종, 본사·회사가 같은 sameAs 5개 공유, WebPage 노드 없음 | **High × S** | Observed |
| F3 | /pricing/ Offer 가 **고정가 500000 하나**뿐 — 화면은 "웨딩 50만원~ / 행사 55만원~" 두 카드. /rental/·/corporate/ 는 같은 가격 카드가 보이는데 Offer 없음 | **Med × S** | Observed |
| F4 | BreadcrumbList 첫 항목 이름이 **"홈"** — 네이버 가이드가 명시적으로 피하라는 일반 단어. /brand/·/contact/·/blog/ 는 이동경로 없음 | **Med × S** | Observed |
| F5 | BlogPosting `image` 가 **1200×630 이라고 적었지만 실제 773×1031 · 773×515 · 711×533**. headline(=seo_title)이 화면 H1 과 다른 글 있음. author/publisher 가 회사 엔티티와 미연결 | **Med × S** | Observed |
| F6 | **구글 FAQ 리치결과는 2026-05-07 완전 종료**. 그런데 /rental/·/corporate/·/graduation/ 은 /popup/ 과 **똑같은 6문답**을 마크업, **/pricing/ 은 FAQ 가 화면·마크업 모두 사라짐**(대체 경로 버그) | **Med × S~M** | Observed |
| F7 | 지점 LocalBusiness(부산·대전·전주) — **시·도 단위 주소 + 전화·상담시간·채널로는 지금 추가해도 안전**, 상세주소·좌표는 사이트에 없어 **아직 불가** | **Med × S** | Observed |
| F8 | 미사용 `ProductSchema.astro`(서비스에 Product+InStock+고정가) — 정책 위험 잠재 | Low × S | Observed |
| F9 | `contactPoint.availableLanguage` 에 "English" — 사이트 어디에도 영어 상담 표기 없음 | Low × S | Observed |

**문제 없음(확인됨)**: JSON 문법 오류 0 · `@context` 정상 · schema.org 어휘 오류 0(공식 어휘 파일로 전수 검사) · FAQ 문답은 화면 텍스트와 100% 일치 · 자기 평가(AggregateRating/Review) 없음 · 로고 512×512 PNG(크롤 가능) · 영업시간 `Mo-Fr 10:00-18:00` 은 /contact/ "10:00 ~ 18:00, 주말·공휴일 휴무"와 일치.

**제안 코드 적용 후(샌드박스 실측)**: 로컬 검증 ERROR 15 → **0**, WARN 38 → **0**. validator.schema.org(홈·문의·가격·블로그 글) **오류 0 / 경고 0**.

---

## 1. 조사 방법

1. 라이브 23페이지를 순차 수집(0.3초 간격, 총 요청 ≈ 30회): `/`, `/rental/`, `/wedding/`, `/popup/`, `/corporate/`, `/pricing/`, `/graduation/`, `/brand/`, `/contact/`, 지역 10곳, `/blog/`, 블로그 글 3개(`/sitemap-blog.xml` 최신·최고·특이 슬러그). 모두 HTTP 200. → `schema/live/*.html`
2. `<script type="application/ld+json">` 전부 추출·파싱 → `schema/extracted.json` (스크립트 `schema/scripts/extract.py`)
3. **validator.schema.org API**(HTML 본문 전송, 사이트 재크롤 없음) — 14페이지 응답 수신, 나머지는 구글 측 속도 제한(302 캡차)으로 막힘 → `schema/validator/`
4. **로컬 구조 검증기**(`schema/scripts/local_validate.py`): schema.org 최신 어휘 파일(`schemaorg-current-https.jsonld`, 3,256 term)로 타입·속성·도메인·범위 검사 + 구글 문서 요건 + 네이버 이동경로 규칙 + **화면 텍스트와의 일치(전화·가격·도시·FAQ)** + 페이지 간 `@id` 충돌. 결과: `schema/local_validate_live.txt`
5. 구글·네이버 공식 문서 직접 확인(§3, 2026-10-30 기준).
6. 제안 코드는 저장소를 복사한 샌드박스(`schema/sandbox/`, node_modules 는 읽기 전용 심볼릭 링크, Vite 캐시는 샌드박스로 분리)에서 `astro dev --port 4391` 로 렌더링 → 같은 검증기 + validator.schema.org 재검증 → 서버 종료(§7).

---

## 2. 페이지별 @type 인벤토리 (라이브, 2026-10-30)

| 페이지 | 블록 | 최상위 타입 (중첩) | 비고 |
|---|---|---|---|
| `/` | 1 (`@graph`) | Organization `#org`, LocalBusiness `#hq`, WebSite `#website` (ImageObject, ContactPoint, PostalAddress, Country) | 유일하게 `@id` 사용 |
| `/rental/` `/wedding/` `/popup/` `/corporate/` `/graduation/` | 3 | BreadcrumbList · Service(→ **익명 LocalBusiness**) · FAQPage | rental·corporate·graduation FAQ = popup 과 동일 6문답 |
| `/pricing/` | 2 | BreadcrumbList · Service(+Offer 500000) | **FAQPage 없음**(화면 FAQ 도 없음) |
| 지역 10곳 | 3 | BreadcrumbList · Service(→ 익명 LocalBusiness, 서울 주소·02 번호) · FAQPage(지역 4문답) | 9곳 전화 불일치, 6곳 도시 누락 |
| `/brand/` `/contact/` `/blog/` | **0** | — | 이동경로·페이지 타입 없음 |
| 블로그 글 3개 | 2 | BlogPosting(→ WebPage, ImageObject, Organization×2) · BreadcrumbList | 이미지 크기 허위, URL 은 비인코딩 IRI |

- 모든 JSON-LD 는 `<main>` 안(body)에 있음 — 구글·네이버 모두 허용(위치 규정 없음). 문제 아님.
- 중복/충돌 엔티티: "심플큐브" 사업체가 홈 `#hq`(`+82-2-338-9180`, addressRegion "Seoul") 외에 **@id 없는 사본 22개**(서비스 16페이지의 provider `02-338-9180`, 블로그 글 3개의 author·publisher). 회사 `#org` 와 본사 `#hq` 가 **동일한 sameAs 5개**를 가짐(“둘 다 같은 인스타·플레이스 계정”이라고 주장하는 셈).

---

## 3. 2026년 기준 — 유형별로 실제 얻을 수 있는 것

| 타입 | 구글 (공식 문서 확인일 2026-10-30) | 네이버 | AI 답변 엔진 |
|---|---|---|---|
| FAQPage | **종료.** 2023-09 정부·보건 사이트로 제한 → **2026-05-07 검색에서 완전히 표시 중단**, 2026-06-15 문서 삭제 (developers.google.com/search/updates) | 공식 지원 유형 아님 | 화면 문답 텍스트가 핵심. 마크업은 무해·보조 |
| HowTo | 2023 종료(갤러리에 없음) | — | — |
| BreadcrumbList | 리치결과 유지, **데스크톱 전용**(2025-01-22) | **지원**(“사이트 이동 경로”). 이름에 “top”, “홈” 같은 일반 단어 금지 | 사이트 구조 이해 |
| Organization | 로고·지식패널. 홈 또는 회사 소개 1페이지면 충분. 로고 ≥112×112 | **“사이트 연관채널”**: 루트 페이지의 Organization/Person `name`·`url`·`sameAs`(필수 3개). 지원 채널: 네이버 블로그·스마트스토어·지식iN·치지직·클립·당근·스레드·인스타그램·유튜브·카카오스토리·**카카오톡 채널**·티스토리·틱톡·페이스북·X (플레이스 URL 은 대상 아님) | 브랜드 엔티티 확정 |
| WebSite | 사이트 이름(site name) 결정에 사용. 사이트링크 검색창은 2024-11 종료 | — | — |
| LocalBusiness | 필수: `name`, `address`(가능한 많이). 권장: telephone(국가번호), openingHoursSpecification, url(지점별), geo 등. 실제 노출은 비즈니스 프로필 영향이 큼 | 문서화된 유형 아님(플레이스가 담당) | 지점·전화·권역 사실관계 |
| Article/BlogPosting | 필수 없음. 권장 author(+url), dates(ISO 8601, 시간대), headline, **image 여러 장(16:9·4:3·1:1, ≥5만 픽셀, 크롤 가능)**. 썸네일엔 schema.org image 와 og:image 둘 다 사용(2026-03) | — | 발행·수정일·저자 신뢰 신호 |
| Service / Offer | 구글 리치결과 유형 아님 → 의미 전달용 | — | **가격·지역 질문 답변의 근거**(정확해야 함) |
| Product | 상품 스니펫/판매자 리스팅. 서비스 제외 문구는 없지만 이 사이트는 해당 없음 | — | — |
| Review/AggregateRating | **자기 평가(사업자가 자신에 대한 리뷰를 직접 관리)는 별점 표시 불가**. Service 는 itemReviewed 허용 타입도 아님 | 리뷰 유형 지원(해당 없음) | — |

**결론**: 이 사이트에서 구글 “노출 효과”가 남은 건 Breadcrumb(데스크톱)·Organization(로고)·WebSite(사이트명)·Article 이미지 정도다. 나머지 가치는 **엔티티·사실관계의 정확성**(지점·전화·가격·지역)이며, 이건 네이버 연관채널과 AI 답변(“부산 포토부스 대여 가격/연락처”)에 직접 쓰인다. 그래서 **틀린 사실(F1·F3)을 고치는 것이 1순위**다.

---

## 4. 상세 발견 사항

### F1. 지역 페이지 Service — 제공자 전화·지역이 화면과 다름 〔High × S, Observed〕
- 증거(라이브 `/busan/`): 화면 “010-3122-4746 (부산 지점)”, FAQ “심플큐브 부산 지점에서 직접 응대합니다. 전화(010-3122-4746)” ↔ JSON-LD `provider: {"@type":"LocalBusiness","name":"심플큐브","telephone":"02-338-9180","address":{"addressLocality":"서울"}}`.
- 동일 불일치 9곳: busan·daegu·ulsan(부산 지점), daejeon·cheonan·cheongju·chungju(대전 지점), jeonju·gwangju(전주 지점). seoul 만 일치.
- `/daegu/` 의 Service 이름은 “대구 포토부스 대여”인데 `areaServed` = 서울·부산·대전·전주 → **대구 없음**. 같은 문제: gwangju·ulsan·cheonan·cheongju·chungju (6곳). 전국 서비스 페이지(웨딩·팝업 등)도 “전국 출장”인데 4개 도시로 한정.
- 원인: `src/components/seo/ServiceSchema.astro:26-43` 에 provider·areaServed 가 하드코딩. 지역 페이지가 `RegionUniqueInfo` 에는 `phone`/`branchOrigin` 을 넘기지만(`src/pages/busan.astro:166-171`) 스키마엔 안 넘김.
- 수정: ServiceSchema 에 `branch`·`areaServed` prop 추가, provider 는 `@id` 가 있는 지점 엔티티(§6). 지역→지점 매핑(화면 `branchOrigin` 기준): 서울→본점 / 부산·대구·울산→부산 지점 / 대전·천안·청주·충주→대전 지점 / 전주·광주→전주 지점.

### F2. 연결되지 않은·중복된 엔티티 〔High × S, Observed〕
- 홈만 `@id`(#org/#hq/#website) 사용. 다른 19페이지의 provider·author·publisher 는 `@id` 없는 “심플큐브” 사본 22개 → 검색엔진이 같은 회사로 묶을 근거가 약하고, 전화 표기(`+82-2-338-9180` vs `02-338-9180`)·주소 필드(addressRegion 유무)도 서로 다름.
- `#org` 와 `#hq` 가 sameAs 5개를 그대로 공유(`OrganizationSchema.astro:9-15, 29, 66`).
- 페이지 노드(WebPage)가 없어 “이 페이지의 주 엔티티가 무엇인지” 연결이 없음.
- 수정: `src/data/business.ts`(신규) 한 곳에서 NAP·`@id` 관리, 모든 참조는 `@id` + 이름·URL·로고 포함 참조(`ORG_REF`). BaseLayout 에서 페이지마다 WebPage(`@id` = canonical) 출력, Service·BlogPosting 은 `mainEntityOfPage` 로 연결.

### F3. 가격 Offer 가 화면 가격과 다름 〔Med × S, Observed〕
- 화면(`/pricing/`, `/rental/` 동일): **웨딩 포토부스 50만원~ (최대 할인가 42만원)**, **행사 포토부스 55만원~**. `/corporate/`: 행사 포토부스 55만원~. 다른 페이지엔 가격 표시 없음.
- JSON-LD: `/pricing/` 에만 `offers: {"price":"500000","priceCurrency":"KRW","availability":"InStock"}` — “~부터” 가격을 **확정가**로 표현, 55만원 상품 누락(`src/pages/pricing.astro:34`). rental·corporate 는 Offer 없음.
- 수정: 화면 카드와 1:1 대응하는 Offer 에 `priceSpecification.minPrice`(500000 / 550000, KRW). 42만원은 조건이 화면에 없으므로 가격으로 마크업하지 않고 설명문에만. **가격을 바꿀 땐 페이지 카드와 `offers` prop 을 함께 바꿀 것**(최근 커밋 86d14ec 처럼 가격이 자주 바뀜).

### F4. 이동경로 〔Med × S, Observed〕
- 모든 BreadcrumbList 첫 항목 `name: "홈"`(`BreadcrumbSchema.astro:16`, 블로그 `[slug].astro:178`). 네이버 서치어드바이저 “사이트 이동 경로” 가이드: *name — "top", "홈" 등 일반적인 단어가 아닌 페이지를 잘 설명하는 텍스트로 입력*. → `심플큐브` 로.
- `/brand/`·`/contact/`·`/blog/` 는 BreadcrumbList 없음.
- 블로그 글 마지막 항목이 seo_title(화면엔 안 보임)인 경우가 있음.
- 수정: 루트 이름 `심플큐브`(화면 라벨도 같이), `@id`=`<페이지>#breadcrumb`, 루트 URL 끝 슬래시 통일, 세 페이지에 추가. 샌드박스 스크린샷 확인: /brand/·/blog/ 는 기존 서비스·지역 16페이지와 똑같은 모양, /contact/ 는 히어로 위에 한 줄이 생김(§7).

### F5. BlogPosting 〔Med × S, Observed〕
- `image: {"width":1200,"height":630}` 고정(`[slug].astro:158-160`) — Cloudinary 실측(fl_getinfo): 수원 글 **773×1031**(세로), 웨딩 가이드 **773×515**, 로레알 **711×533**. 허위 크기.
- headline = `seo_title || title`(`:151`) → “심플큐브 웨딩포토부스 대여 서비스 완벽 가이드 (2026)” 글의 화면 H1 은 “결혼식 웨딩포토부스, 정말 필요할까요? …” 로 다름.
- `url`/`mainEntityOfPage` 가 비인코딩 한글 IRI(`:138`) — canonical(퍼센트 인코딩)과 디코딩해야만 같음 → WebPage 노드와 `@id` 문자열이 안 맞음.
- author/publisher 는 `@id` 없는 Organization(사본).
- 수정: 구글 권장 16:9·4:3·1:1 을 Cloudinary `c_fill,g_auto` 로 **정확히 1200×675 / 1200×900 / 1200×1200** 생성(실측 일치 확인, `res.cloudinary.com` robots 허용), headline = 화면 H1(`post.title`), URL 은 `absUrl()`(canonical 과 동일 문자열), author·publisher = `ORG_REF`. 참고: 원본이 773px 이라 1200px 는 업스케일 — 앞으로 대표 이미지는 가로 1200px 이상으로 올리길 권장(콘텐츠 담당).

### F6. FAQ 〔Med × S~M, Observed (+원인은 Hypothesis)〕
- 구글 FAQ 리치결과는 **2026-05-07 종료** → 구글 노출 목적으로는 FAQ 마크업에 시간을 쓰지 말 것. 화면 문답과 정확히 일치하므로 **기존 마크업은 유지해도 무해**(Bing·AI 파서 보조).
- 라이브에서 `/rental/`·`/corporate/`·`/graduation/` 의 FAQPage 6문답이 `/popup/` 과 글자까지 동일(“심플큐브는 어떤 서비스를…”, “비용은 어떻게 되나요?” 등). 코드상 페이지 전용 FAQ 가 없으면 popup FAQ 로 대체(`rental.astro:15-19`, `corporate.astro:15-19`, `graduation.astro:14-18`).
- **`/pricing/` 은 FAQ 섹션 자체가 안 보임**: 대체 순서가 pricing → rental 뿐인데(`pricing.astro:15-19`) rental 전용 FAQ 도 0건 → 화면 H2 “포토부스 가격 자주 묻는 질문”이 라이브 HTML 에 없음. (로컬 시드 DB 도 popup 6·wedding 5건뿐 — 운영 DB 도 같다고 추정 = Hypothesis, 출력은 Observed)
- 수정: ① 코드 — 대체 FAQ 는 마크업하지 않음(같은 문답은 /popup/ 한 곳만). ② **사장님 작업** — 관리자에서 가격·대여·기업행사·졸업 페이지 전용 FAQ 등록(특히 가격 페이지: “웨딩 50만원~, 행사 55만원~” 같은 숫자를 답에 명시하면 AI 답변 인용에 유리). 문구 기획은 콘텐츠 담당 영역.

### F7. 지점 LocalBusiness — 지금 추가해도 되는가 〔Med × S, Observed〕
저장소 안 NAP 대조: `src/pages/contact.astro:5-50`, `src/components/brand/BranchOffices.astro:6-11`, `src/components/common/Footer.astro:2-27`, 지역 페이지 `phone`/`branchOrigin` prop, `docs/NAVER_PLACE_BRAND_UNIFICATION.md §1-3`.

- **전화·카카오·인스타·상담시간·담당 권역: 4곳 모두 완전히 일치** → 안전.
- **상세 주소: 사이트 어디에도 없음**(푸터·문의·브랜드 모두 주소·사업자정보 미표기). 문서상 카카오맵만 “성수동2가”(본점), “유성구, 0502-5553-8235”(대전, 안심번호) → **외부 채널과도 아직 불일치**. → 상세주소·우편번호·좌표는 **지금 넣으면 안 됨**.
- 결론: **시·도 단위 주소로 지금 추가 OK**. 넣을 값(= `src/data/business.ts`):

| @id | name / alternateName(표준 플레이스명) | telephone | address (locality / region) | areaServed | 영업 | sameAs | url |
|---|---|---|---|---|---|---|---|
| `/#hq` | 심플큐브 서울 본점 / 심플큐브 포토부스 서울본점 | +82-2-338-9180 | 서울 / 서울특별시 | 서울특별시·경기도·강원특별자치도 | 월–금 10:00–18:00 | (회사 sameAs 와 같아 생략) | /seoul/ |
| `/#branch-busan` | 심플큐브 부산 지점 / 심플큐브 포토부스 부산점 | +82-10-3122-4746 | 부산 / 부산광역시 | 부산광역시·경상남도·울산광역시·대구광역시 | 〃 | instagram.com/simplecube_busan, pf.kakao.com/_RxgxkPb | /busan/ |
| `/#branch-daejeon` | 심플큐브 대전 지점 / 심플큐브 포토부스 대전점 | +82-10-8838-8122 | 대전 / 대전광역시 | 대전광역시·세종특별자치시·충청남도·충청북도 | 〃 | instagram.com/simplecube_daejeon, pf.kakao.com/_xgqgyb | /daejeon/ |
| `/#branch-jeonju` | 심플큐브 전주 지점 / 심플큐브 포토부스 전주점 | +82-10-5743-8122 | 전주 / 전북특별자치도 | 전북특별자치도·광주광역시·전라남도 | 〃 | instagram.com/simplecube_jeonju, pf.kakao.com/_TPxjxoG | /jeonju/ |

- 출력 위치: `/contact/`(4곳 모두 화면에 있음), 각 지역 페이지의 Service.provider(그 지점 1곳), 홈(본점). 모두 같은 함수에서 생성 → 페이지 간 값 충돌 없음.
- alternateName 의 표준 플레이스명은 문서에서 정한 목표값. 네이버·카카오 업체명 변경을 하지 않을 거라면 이 줄은 빼도 됨.
- 확인 불가: `sameAs` 의 `m.place.naver.com/place/1454645046` 이 어느 지점인지(네이버 429 차단) — 그래서 회사 노드에 그대로 둠.

### F8. 미사용 ProductSchema 〔Low × S, Observed〕
`src/components/seo/ProductSchema.astro` 는 어디서도 import 되지 않음(grep). 서비스에 Product + `InStock` + 고정가 + Brand 를 붙이는 형태라 누가 나중에 쓰면 오해 소지 → 삭제.

### F9. 그 외 소소한 것 〔Low, Observed〕
- `contactPoint.availableLanguage: ["Korean","English"]` — 영어 상담 표기가 사이트에 없음 → `Korean` 만(실제로 영어 응대가 되면 화면에 표기 후 유지).
- 본사 `address.addressRegion: "Seoul"`(영문) vs `addressLocality: "서울"` 혼용 → `서울특별시`.
- `openingHours` 텍스트 → 구글 문서 형식 `openingHoursSpecification`.
- 회사 노드에 화면 푸터의 이메일(simple_cube@naver.com)·대표전화 추가, `url` 끝 슬래시 통일.

---

## 5. 개선된 @graph 설계

```
WebSite  https://simplecube.net/#website ──publisher──▶ Organization  /#org  (name·logo /#logo·sameAs→네이버 연관채널)
   ▲ isPartOf                                              ▲ parentOrganization          ▲ provider (전국 페이지)
WebPage  <canonical>  (모든 색인 페이지, BaseLayout)          │                             │
   │ breadcrumb ─▶ BreadcrumbList <canonical>#breadcrumb    LocalBusiness /#hq · /#branch-busan · /#branch-daejeon · /#branch-jeonju
   ▲ mainEntityOfPage                                        ▲ provider (지역 페이지: 그 지점)
Service <canonical>#service (areaServed=도시 또는 대한민국, offers=화면 가격 카드)
BlogPosting <canonical>#article (author·publisher=/#org, image 16:9·4:3·1:1)
FAQPage (페이지 전용 문답만)
```

| 노드 | @id 규칙 | 어디서 출력 |
|---|---|---|
| Organization | `https://simplecube.net/#org` | 홈(전체), 그 외는 `ORG_REF`(이름·URL·로고 포함 참조) |
| WebSite | `https://simplecube.net/#website` | 홈(전체), 그 외는 `WEBSITE_REF` |
| LocalBusiness | `/#hq`, `/#branch-{busan,daejeon,jeonju}` | 홈(본점), /contact/(4곳), 지역 페이지(담당 지점) |
| WebPage(About/Contact/CollectionPage) | canonical URL 그대로 | BaseLayout(모든 비-noindex 페이지) |
| BreadcrumbList | `<canonical>#breadcrumb` | BreadcrumbSchema / 블로그 글 |
| Service | `<canonical>#service` | ServiceSchema |
| BlogPosting | `<canonical>#article` | blog/[slug] |

---

## 6. 코드 변경안 (붙여넣기용)

전체 패치(27파일, +323/−152): `/tmp/claude-0/-home-user-simplecube/db51fb47-817f-5414-8045-af475d7004dd/scratchpad/audit/schema/proposed-changes.diff` — 저장소 루트에서 `git apply <경로>` 로 그대로 적용 가능(샌드박스에서 생성). 핵심 파일은 아래.

### 6-1. 신규 `src/data/business.ts`
```ts
// 심플큐브 사업자·지점 정보(NAP)와 JSON-LD 엔티티 @id 의 단일 출처.
// - 값은 사이트에 보이는 표기와 같아야 한다: contact 페이지·푸터·BranchOffices·지역 페이지.
// - 상세 주소(streetAddress)·우편번호·좌표는 사이트에 공개돼 있지 않고 네이버 플레이스·카카오맵과
//   표기도 통일되지 않았으므로 넣지 않는다. 주소를 /contact/ 에 공개한 뒤 branchNode() 의 address 에 추가할 것.

export const SITE_URL = 'https://simplecube.net';
export const ORG_ID = `${SITE_URL}/#org`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const ORG_NAME = '심플큐브';

// public/images/common/logo.png — 512×512 PNG (Google: 112×112 이상)
export const ORG_LOGO = {
  '@type': 'ImageObject',
  '@id': `${SITE_URL}/#logo`,
  url: `${SITE_URL}/images/common/logo.png`,
  width: 512,
  height: 512,
};

/** 다른 노드에서 회사를 가리킬 때 쓰는 참조 — 이름·URL·로고를 함께 넣어 그 페이지만 읽어도 뜻이 통하게 */
export const ORG_REF = { '@type': 'Organization', '@id': ORG_ID, name: ORG_NAME, url: `${SITE_URL}/`, logo: ORG_LOGO };
export const WEBSITE_REF = { '@type': 'WebSite', '@id': WEBSITE_ID, name: ORG_NAME, url: `${SITE_URL}/` };

/** 경로 → 절대 URL. 한글 경로는 canonical 과 같은 퍼센트 인코딩 형태가 된다 */
export function absUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

/** '02-338-9180' → '+82-2-338-9180' (Google: 국가번호 포함) */
export function toIntlPhone(phone: string): string {
  return `+82-${phone.replace(/^0/, '')}`;
}

// contact 페이지 상담 시간과 동일: 10:00 ~ 18:00, 주말·공휴일 휴무
const WEEKDAY_HOURS = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '10:00',
    closes: '18:00',
  },
];

export type BranchKey = 'seoul' | 'busan' | 'daejeon' | 'jeonju';

interface Branch {
  id: string;
  name: string;         // 사이트 표기 (지역 페이지 "심플큐브 부산 지점에서 직접 응대")
  placeName: string;    // docs/NAVER_PLACE_BRAND_UNIFICATION.md 표준 플레이스 업체명
  phone: string;        // 사이트 표기 그대로
  locality: string;
  region: string;
  areaServed: string[]; // contact 페이지 담당 권역 + 이 지점이 응대하는 지역 페이지
  url: string;          // 지점이 담당하는 대표 지역 페이지
  sameAs?: string[];    // 지점 전용 채널만 (본점 채널은 회사 sameAs 와 같아 생략)
}

export const BRANCHES: Record<BranchKey, Branch> = {
  seoul: {
    id: `${SITE_URL}/#hq`,
    name: '심플큐브 서울 본점',
    placeName: '심플큐브 포토부스 서울본점',
    phone: '02-338-9180',
    locality: '서울',
    region: '서울특별시',
    areaServed: ['서울특별시', '경기도', '강원특별자치도'],
    url: `${SITE_URL}/seoul/`,
  },
  busan: {
    id: `${SITE_URL}/#branch-busan`,
    name: '심플큐브 부산 지점',
    placeName: '심플큐브 포토부스 부산점',
    phone: '010-3122-4746',
    locality: '부산',
    region: '부산광역시',
    areaServed: ['부산광역시', '경상남도', '울산광역시', '대구광역시'],
    url: `${SITE_URL}/busan/`,
    sameAs: ['https://www.instagram.com/simplecube_busan', 'https://pf.kakao.com/_RxgxkPb'],
  },
  daejeon: {
    id: `${SITE_URL}/#branch-daejeon`,
    name: '심플큐브 대전 지점',
    placeName: '심플큐브 포토부스 대전점',
    phone: '010-8838-8122',
    locality: '대전',
    region: '대전광역시',
    areaServed: ['대전광역시', '세종특별자치시', '충청남도', '충청북도'],
    url: `${SITE_URL}/daejeon/`,
    sameAs: ['https://www.instagram.com/simplecube_daejeon', 'https://pf.kakao.com/_xgqgyb'],
  },
  jeonju: {
    id: `${SITE_URL}/#branch-jeonju`,
    name: '심플큐브 전주 지점',
    placeName: '심플큐브 포토부스 전주점',
    phone: '010-5743-8122',
    locality: '전주',
    region: '전북특별자치도',
    areaServed: ['전북특별자치도', '광주광역시', '전라남도'],
    url: `${SITE_URL}/jeonju/`,
    sameAs: ['https://www.instagram.com/simplecube_jeonju', 'https://pf.kakao.com/_TPxjxoG'],
  },
};

/** 지점 LocalBusiness 노드 — 주소는 시·도 단위까지만 (상세 주소 미공개) */
export function branchNode(key: BranchKey) {
  const b = BRANCHES[key];
  return {
    '@type': 'LocalBusiness',
    '@id': b.id,
    name: b.name,
    alternateName: b.placeName,
    url: b.url,
    telephone: toIntlPhone(b.phone),
    address: {
      '@type': 'PostalAddress',
      addressLocality: b.locality,
      addressRegion: b.region,
      addressCountry: 'KR',
    },
    areaServed: b.areaServed.map((name) => ({ '@type': 'AdministrativeArea', name })),
    openingHoursSpecification: WEEKDAY_HOURS,
    priceRange: '₩₩',
    ...(b.sameAs && { sameAs: b.sameAs }),
    parentOrganization: ORG_REF,
  };
}
```

### 6-2. `src/components/seo/ServiceSchema.astro` (전체 교체)
```astro
---
import { ORG_REF, absUrl, branchNode, type BranchKey } from '@data/business';

interface OfferItem {
  name: string;
  minPrice: number;      // 화면 가격 카드의 'N만원~' 과 같은 값 (원 단위)
  description?: string;
  url?: string;
}

interface ServiceItem {
  name: string;
  description: string;
  url: string;
  image?: string;
  branch?: BranchKey;     // 이 서비스를 직접 응대하는 지점 (지역 페이지). 없으면 회사(심플큐브)
  areaServed?: string[];  // 서비스 도시. 없으면 대한민국 전역 (전국 출장)
  offers?: OfferItem[];   // 화면에 보이는 가격 카드만 — 가격을 바꾸면 여기도 같이 바꿀 것
}

interface Props {
  services: ServiceItem[];
}

const { services } = Astro.props;

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': services.map(service => {
    const url = absUrl(service.url);
    const serviceSchema: Record<string, any> = {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: service.name,
      serviceType: '포토부스 대여',
      description: service.description,
      url,
      mainEntityOfPage: { '@id': url },
      provider: service.branch ? branchNode(service.branch) : ORG_REF,
      areaServed: service.areaServed?.length
        ? service.areaServed.map(name => ({ '@type': 'City', name }))
        : { '@type': 'Country', name: '대한민국' },
    };

    if (service.image) {
      serviceSchema.image = absUrl(service.image);
    }

    if (service.offers?.length) {
      // '~부터' 가격이므로 고정 price 대신 PriceSpecification.minPrice 사용
      serviceSchema.offers = service.offers.map(offer => ({
        '@type': 'Offer',
        name: offer.name,
        ...(offer.description && { description: offer.description }),
        url: absUrl(offer.url ?? service.url),
        priceCurrency: 'KRW',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: offer.minPrice,
          priceCurrency: 'KRW',
        },
      }));
    }

    return serviceSchema;
  }),
};
---

<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

### 6-3. 지역 페이지 10곳 — `url:` 줄 아래 2줄 추가
```astro
      url: '/daegu/',
      branch: 'busan',
      areaServed: ['대구'],
```
| 파일 | branch | areaServed |
|---|---|---|
| `src/pages/seoul.astro` | `'seoul'` | `['서울']` |
| `busan.astro` / `daegu.astro` / `ulsan.astro` | `'busan'` | `['부산']` / `['대구']` / `['울산']` |
| `daejeon.astro` / `cheonan.astro` / `cheongju.astro` / `chungju.astro` | `'daejeon'` | `['대전']` / `['천안']` / `['청주']` / `['충주']` |
| `jeonju.astro` / `gwangju.astro` | `'jeonju'` | `['전주']` / `['광주']` |

### 6-4. 가격 Offer — `pricing.astro`(기존 `price: '500000',` 줄 교체) · `rental.astro`(url 줄 아래 추가)
```astro
      offers: [
        { name: '웨딩 포토부스', description: '결혼식 · 웨딩홀 맞춤 세팅 (최대 할인가 42만원)', minPrice: 500000, url: '/wedding/' },
        { name: '행사 포토부스', description: '브랜드 행사 · 기업 이벤트', minPrice: 550000, url: '/corporate/' },
      ],
```
`corporate.astro`(url 줄 아래):
```astro
      offers: [
        { name: '행사 포토부스', description: '기업 이벤트 · 컨퍼런스 · 전시회', minPrice: 550000 },
      ],
```

### 6-5. `src/components/seo/OrganizationSchema.astro` (전체 교체)
```astro
---
// 홈페이지용 Organization + 서울 본점 LocalBusiness + WebSite 스키마.
// 지점 정보(NAP)는 @data/business 한 곳에서 관리한다 — 지점 전체는 /contact/ 의 BranchesSchema 가 출력.
import { SITE_URL, ORG_ID, WEBSITE_ID, ORG_NAME, ORG_LOGO, BRANCHES, branchNode, toIntlPhone } from '@data/business';

// 브랜드 공식 채널 (존재 확인된 것만). 네이버 '사이트 연관채널'은 루트 페이지의 이 sameAs 를 읽는다
// (지원 도메인: 네이버 블로그·인스타그램·카카오톡 채널 등 — 플레이스 URL 은 연관채널 대상이 아니지만 구글 엔티티 연결용으로 유지)
const SAME_AS = [
  'https://www.instagram.com/simplecube_photobooth',
  'https://www.instagram.com/simplecube_wedding',
  'https://pf.kakao.com/_vxhEfj',
  'https://blog.naver.com/simple_cube',
  'https://m.place.naver.com/place/1454645046',
];

const hqPhone = toIntlPhone(BRANCHES.seoul.phone);

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: ORG_NAME,
      alternateName: ['SIMPLE CUBE', '심플큐브 포토부스', 'SIMPLE CUBE Photo Booth'],
      url: `${SITE_URL}/`,
      logo: ORG_LOGO,
      image: { '@id': ORG_LOGO['@id'] },
      description: '2019년 설립된 한국의 1세대 오픈형 포토부스 브랜드. 16,000건 이상의 행사 운영 경력을 바탕으로 웨딩·팝업스토어·기업행사·페스티벌에 맞춤 포토부스 대여 서비스를 제공합니다.',
      foundingDate: '2019',
      email: 'simple_cube@naver.com',
      telephone: hqPhone,
      sameAs: SAME_AS,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: hqPhone,
          contactType: 'reservations',
          areaServed: 'KR',
          availableLanguage: 'Korean',
        },
      ],
      knowsAbout: [
        '포토부스 대여',
        '웨딩 포토부스',
        '결혼식 포토부스',
        '팝업 포토부스',
        '기업행사 포토부스',
        '브랜드 팝업스토어 포토부스',
        '페스티벌 포토부스',
        '포토부스 렌탈',
      ],
      areaServed: { '@type': 'Country', name: '대한민국' },
    },
    branchNode('seoul'),
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: ORG_NAME,
      alternateName: 'SIMPLE CUBE',
      url: `${SITE_URL}/`,
      inLanguage: 'ko-KR',
      publisher: { '@id': ORG_ID },
    },
  ],
};
---

<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

### 6-6. `src/components/seo/BreadcrumbSchema.astro` — 프론트매터만 교체 (아래 `<nav>` 마크업은 그대로)
```astro
---
import { ORG_NAME, absUrl } from '@data/business';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface Props {
  items: BreadcrumbItem[];
}

const { items } = Astro.props;

// 첫 항목은 '홈' 대신 사이트 이름 — 네이버 가이드: "top"·"홈" 같은 일반 단어 대신 페이지를 설명하는 텍스트
const breadcrumbItems = [
  { name: ORG_NAME, url: absUrl('/') },
  ...items.map(item => ({
    name: item.name,
    url: absUrl(item.url),
  })),
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  '@id': `${breadcrumbItems[breadcrumbItems.length - 1].url}#breadcrumb`,
  itemListElement: breadcrumbItems.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
};
---
```

### 6-7. 신규 `src/components/seo/WebPageSchema.astro` + `BaseLayout.astro`
```astro
---
// 모든 색인 페이지의 WebPage 노드 (@id = canonical URL).
// WebSite(#website)·회사(#org)·이동 경로(#breadcrumb)와 연결되고, 페이지의 주요 엔티티(Service·BlogPosting)는
// 각 스키마의 mainEntityOfPage 가 이 노드를 가리킨다.
import { ORG_REF, WEBSITE_REF } from '@data/business';

interface Props {
  url: string;            // canonical URL
  name: string;
  description: string;
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage';
}

const { url, name, description, type = 'WebPage' } = Astro.props;
const isHome = new URL(url).pathname === '/';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': type,
  '@id': url,
  url,
  name,
  description,
  inLanguage: 'ko-KR',
  isPartOf: WEBSITE_REF,
  ...((isHome || type === 'AboutPage' || type === 'ContactPage') && { about: ORG_REF }),
  ...(!isHome && { breadcrumb: { '@id': `${url}#breadcrumb` } }),
};
---

<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```
`src/layouts/BaseLayout.astro` — 4곳:
```astro
import WebPageSchema from '@components/seo/WebPageSchema.astro';        // import 추가
  pageType?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage';  // Props 에 추가
  pageType,                                                              // 구조분해에 추가
    <!-- 구조화 데이터: 페이지 노드 (WebSite·회사·이동 경로와 @id 로 연결) -->
    {!noindex && <WebPageSchema url={canonicalURL.href} name={title} description={description} type={pageType} />}
                                                                         // <link rel="canonical"> 바로 아래
```

### 6-8. 신규 `src/components/seo/BranchesSchema.astro` + 문의·브랜드·블로그 목록
```astro
---
// 문의 페이지용 — 서울 본점·부산·대전·전주 지점 LocalBusiness.
// 화면의 지점 카드(전화·상담시간·카카오톡·인스타그램)와 같은 값을 @data/business 에서 가져온다.
import { BRANCHES, branchNode, type BranchKey } from '@data/business';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': (Object.keys(BRANCHES) as BranchKey[]).map(branchNode),
};
---

<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```
```astro
<!-- src/pages/contact.astro : import 2줄 추가 후 BaseLayout 에 -->
  pageType="ContactPage"
>
  <BreadcrumbSchema items={[{ name: '예약문의', url: '/contact/' }]} />
  <BranchesSchema />

<!-- src/pages/brand.astro -->
  pageType="AboutPage"
>
  <BreadcrumbSchema items={[{ name: '브랜드소개', url: '/brand/' }]} />

<!-- src/pages/blog/index.astro -->
  pageType="CollectionPage"
>
  <BreadcrumbSchema items={[{ name: '블로그', url: '/blog/' }]} />
```

### 6-9. 블로그 글 `src/pages/blog/[slug].astro` + `src/utils/image.ts`
`image.ts` 끝에 추가:
```ts
// Cloudinary 원본을 정확히 width×height 로 잘라낸 URL (g_auto: 피사체 중심).
// 구조화 데이터 image 처럼 실제 크기를 함께 적어야 할 때 사용 — Cloudinary 원본 URL 이 아니면 null.
export function cdnCrop(url: string | null | undefined, width: number, height: number): string | null {
  if (!url) return null;
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || i === -1) return null;
  const rest = url.slice(i + marker.length);
  if (!/^v\d+\//.test(rest)) return null;
  return `${url.slice(0, i + marker.length)}c_fill,g_auto,w_${width},h_${height},f_auto,q_auto/${rest}`;
}
```
`[slug].astro` — import 2줄(`cdnCrop`, `@data/business`), `pageUrl` 과 JSON-LD 블록 교체:
```ts
import { cdnImage, cdnCrop } from '@utils/image';
import { ORG_NAME, ORG_REF, absUrl } from '@data/business';

// canonical 과 같은 퍼센트 인코딩 형태 (JSON-LD @id 가 WebPage 노드와 정확히 일치하도록)
const pageUrl = absUrl(`/blog/${post.slug}/`);

// 대표 이미지: Google 권장 16:9·4:3·1:1 을 Cloudinary 로 정확한 크기로 잘라 실제 크기와 일치시킨다
// (Cloudinary 가 아닌 이미지는 크기를 적지 않고 URL 만)
const articleImages = post.image
  ? ([[1200, 675], [1200, 900], [1200, 1200]] as const)
      .map(([width, height]) => {
        const url = cdnCrop(post.image, width, height);
        return url && { '@type': 'ImageObject', url, width, height };
      })
      .filter(Boolean)
  : [];

const blogPostingLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  '@id': `${pageUrl}#article`,
  url: pageUrl,
  mainEntityOfPage: { '@id': pageUrl },
  inLanguage: 'ko-KR',
  headline: post.title,
  description: metaDescription,
  datePublished: publishedISO,
  dateModified: modifiedISO,
  wordCount,
  keywords: tags.join(', '),
  articleSection: post.category_name || '포토부스',
  ...(post.image && { image: articleImages.length > 0 ? articleImages : [post.image] }),
  author: ORG_REF,
  publisher: ORG_REF,
};

const breadcrumbItems = [
  { '@type': 'ListItem', position: 1, name: ORG_NAME, item: absUrl('/') },
  { '@type': 'ListItem', position: 2, name: '블로그', item: absUrl('/blog/') },
  { '@type': 'ListItem', position: 3, name: post.title, item: pageUrl },
];

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  '@id': `${pageUrl}#breadcrumb`,
  itemListElement: breadcrumbItems,
};
```
(화면 이동경로 라벨도 `홈` → `심플큐브` 로 맞춤 — 1단어)

### 6-10. FAQ 마크업은 페이지 전용 문답만 — `rental.astro` / `corporate.astro` / `graduation.astro`
```astro
  {/* 팝업 FAQ 로 대체 표시될 때는 마크업하지 않음 — 같은 문답은 /popup/ 한 곳에만 */}
  {rentalFaqResult.rows.length > 0 && <FAQSchema faqs={faqItems} />}
```
(corporate 는 `corporateFaqResult`, graduation 은 `graduationFaqResult`. 화면 FAQ 는 그대로 보임.)

### 6-11. 삭제: `src/components/seo/ProductSchema.astro` (미사용)

---

## 7. 테스트 (샌드박스, 실제 렌더링)

| 항목 | 결과 |
|---|---|
| 샌드박스 `astro dev --port 4391` 렌더링 | 21페이지(홈·서비스 6·브랜드·문의·지역 10·블로그 목록·글 1) **모두 200**, 개발 서버 로그 오류 0 |
| 로컬 검증기(어휘+구글+네이버+화면 일치) | 라이브 **ERROR 15 / WARN 38** → 제안안 **ERROR 0 / WARN 0** (`local_validate_new.txt`, 남은 INFO 는 “상세 주소 없음”·“이미지 크기 확인” 안내뿐) |
| validator.schema.org (제안안) | `/`, `/contact/`, `/pricing/`, 블로그 글 → **오류 0 / 경고 0**. `/busan/` 은 구글 속도 제한으로 미응답(같은 노드 타입이 /contact/·/pricing/ 에서 통과) |
| validator.schema.org (라이브) | 응답받은 14페이지 오류 0 — 즉 현재 문제는 “문법”이 아니라 **사실관계·연결**(로컬 검증기로만 잡힘) |
| 타입 체크 | `tsc --strict` (business.ts, image.ts) 통과. `@astrojs/check` 미설치라 .astro 타입 체크는 개발 서버 컴파일로 대체 |
| Cloudinary 크롭 | 생성 URL 실측 1200×675 / 1200×900 / 1200×1200 = 선언값과 일치, HTTP 200(webp), `res.cloudinary.com/robots.txt` 전체 허용 |
| 연결 확인 | 블로그: WebPage `@id` = BlogPosting.mainEntityOfPage = canonical(문자열 완전 일치). 지역: provider `@id` = `/#branch-busan` 등, 전화 = 화면 지점 전화 |
| 화면 영향(스크린샷 `schema/shots/`) | 지역 페이지 라벨 “홈 > …” → “심플큐브 > …”. /brand/·/blog/ 이동경로는 기존 16개 서비스·지역 페이지와 동일한 모양. /contact/ 는 히어로 위에 한 줄(필요 시 히어로 `pt-36 lg:pt-44` 를 줄여 맞춤 — 디자인 판단) |
| 저장소 | 변경 0건(`git status` 깨끗, HEAD `2559567`), 샌드박스 서버 종료 확인 |

---

## 8. 사장님(비개발자) 작업

1. **가격·대여·기업행사·졸업 페이지 전용 FAQ 등록** — 관리자 페이지 → FAQ 관리 → 페이지 선택(가격안내/포토부스 대여/기업행사/졸업식) → 질문·답변 추가 → 활성화. 가격 페이지 답변엔 화면과 같은 숫자(웨딩 50만원~, 행사 55만원~)를 그대로 쓰기. (지금 가격 페이지는 FAQ 가 아예 안 보입니다.)
2. **지점 상세 주소 공개 여부 결정** — 네이버 플레이스·카카오맵에 등록된 주소(서울 성수, 대전 유성구 등)를 사이트 /contact/ 에도 똑같이 적을지 정해서 개발자에게 전달. 공개하면 그때 구조화 데이터에 도로명주소·우편번호·좌표를 추가합니다(지금은 “부산광역시” 수준까지만).
3. **가격을 바꿀 때 개발자에게 한 줄 요청** — 가격 카드 숫자와 구조화 데이터(`offers`)를 함께 바꿔야 합니다.
4. 배포 후 확인: ① https://search.google.com/test/rich-results 에 `https://simplecube.net/busan/`, `/pricing/`, 블로그 글 주소 입력 → “이동경로”, “조직” 항목에 오류 없는지. ② https://validator.schema.org 에 같은 주소 입력 → 오류 0. ③ 구글 서치콘솔 → 개선사항(이동경로) 1~2주 뒤 오류 없는지.

---

## 9. 범위 밖이지만 참고 (다른 담당자용)

- 지점 NAP 가 `contact.astro`·`Footer.astro`·`BranchOffices.astro` 3곳에 복사돼 있음 → 세 컴포넌트도 `@data/business` 의 `BRANCHES` 를 쓰면 표기가 다시 어긋날 일이 없음(이번 제안엔 포함하지 않음).
- 서비스·지역 페이지: 이동경로 nav(`pt-24`) + 히어로(`pt-20`) 사이 빈 공간이 큼(기존 디자인) — UX 담당 판단.
- 예약 발행 글은 `datePublished` 가 초안 작성 시각(`created_at`)이고 실제 발행 시각이 아님(`api/cron/publish-scheduled.ts:44` 는 `updated_at` 만 갱신) — Hypothesis, 블로그 운영 담당 확인 필요.
- 블로그 og:image 원본이 가로 773px 안팎 — 1200px 이상 원본 업로드 권장.
- 사이트에 사업자 정보(상호·대표·주소·사업자번호)가 전혀 없음 — 신뢰 신호이자 LocalBusiness 상세 주소의 전제 조건.

## 참고 출처 (2026-10-30 확인)
- Google: FAQ 종료·문서 삭제·Breadcrumb 데스크톱 전용·썸네일 소스 — https://developers.google.com/search/updates · 구조화 데이터 갤러리(2026-10-16) · Local business / Organization / Article / Breadcrumb / Review snippet / 일반 지침 각 문서(2026-07~09 갱신)
- 네이버 서치어드바이저: 구조화된 데이터 소개 · 사이트 연관채널(`/guide/structured-data-channel`) · 사이트 이동 경로(`/guide/structured-data-breadcrumb`) · 리뷰/동영상/레시피
