# 심플큐브 웹사이트 현황 분석서

## 1. 프로젝트 기본 정보

| 항목 | 내용 |
|------|------|
| **프레임워크** | Astro 5.17 + TypeScript |
| **스타일링** | Tailwind CSS v4 + 커스텀 CSS |
| **애니메이션** | GSAP + ScrollTrigger (6가지 프리셋: fadeUp, fadeIn, slideLeft, slideRight, scaleIn, textReveal) |
| **UI 프레임워크** | React 19 (관리자 에디터용) |
| **데이터베이스** | Turso (LibSQL/SQLite) |
| **이미지 호스팅** | Cloudinary (SHA-1 서명 업로드, URL 변환 지원) |
| **배포** | Vercel (Serverless) |
| **인증** | JWT (jose 라이브러리, 24시간 만료, HttpOnly 쿠키) |
| **폰트** | Pretendard(본문, 400-700) + ONE Mobile Title(타이틀, 로컬 TTF) |
| **색상 시스템** | Primary #1d1d1f, Secondary #6e6e73, Accent(Gold) #D4AA45, BG #f7f7f5, Border #d2d2d7/#e8e8ed |
| **사이트 URL** | https://simplecube.vercel.app |
| **리치 텍스트** | TipTap 에디터 (headings, images, links, text-align, underline, placeholder) |
| **마크다운** | marked + sanitize-html |
| **기타** | slugify, turndown(HTML→MD), jose(JWT) |

---

## 2. 사이트맵 (현재 라우트 구조)

### 공개 페이지 (마케팅)

```
/                → 홈페이지 (HeroSection + BrandStory + BranchOffices)
/popup           → 행사 포토부스 (ServiceIntro, MachineShowcase, Portfolio, Custom, Booking, Client)
/wedding         → 웨딩 포토부스 (ServiceIntro, Package, Template, Booking, PartnerHalls)
/gray            → 그레이 포토부스 (독립형 풀 페이지, 441줄 인라인)
/brand           → 브랜드소개 (BrandStory + BranchOffices)
/contact         → 예약문의 (4개 지점 카카오톡/전화/인스타)
/qna             → 자주 묻는 질문 (8개 FAQ, 아코디언)
/faq             → /qna로 301 리다이렉트
/blog            → 블로그 목록 (DB 기반, 카테고리/검색 필터링)
/blog/[slug]     → 블로그 상세 (JSON-LD 구조화 데이터, SEO)
/game            → 고양이 슈팅 게임 (이스터에그, HTML5 Canvas)
```

### 테스트 페이지 (정리 대상)

```
/test-hero, /test-footer, /test-hero-popup, /test-modal, /test-portfolio, /spec-test
```

### 관리자 페이지 (/admin)

```
/admin/login      → 로그인 (비밀번호 기반, 다크 테마)
/admin            → 대시보드 (통계, 최근 글, SEO 분포, 카테고리 분포)
/admin/posts      → 글 목록 관리
/admin/posts/new  → 새 글 작성 (TipTap 리치 에디터 + SEO 패널)
/admin/posts/[id] → 글 수정
/admin/categories → 카테고리 관리 (자동 슬러그 생성)
/admin/tags       → 태그 관리
/admin/media      → 미디어 라이브러리 (Cloudinary, 드래그앤드롭)
/admin/portfolio  → 포트폴리오 관리 (정렬, 태그, 페이지별, 가시성)
/admin/seo-settings → SEO 규칙 설정 (31개 규칙, 5개 카테고리)
/admin/settings   → 사이트 설정 (기본정보, 소셜링크)
/admin/popups     → 팝업 관리 (최대 2개 활성, 색상/이미지 커스텀)
```

---

## 3. API 엔드포인트 (백엔드)

| 리소스 | 엔드포인트 | 메서드 | 비고 |
|--------|-----------|--------|------|
| **인증** | `/api/auth/login` | POST | 비밀번호 → JWT 토큰 발급 |
| **인증** | `/api/auth/logout` | POST | 세션 쿠키 클리어 |
| **글** | `/api/posts` | GET/POST | draft, category_id, search, deleted 필터 |
| **글** | `/api/posts/[id]` | GET/PUT/DELETE | 소프트 삭제 |
| **글 부가** | `/api/posts/[id]/duplicate` | POST | 글 복제 |
| **글 부가** | `/api/posts/[id]/restore` | POST | 삭제 복원 |
| **글 부가** | `/api/posts/[id]/permanent-delete` | POST | 영구 삭제 |
| **글 부가** | `/api/posts/[id]/revisions` | GET | 수정 이력 |
| **카테고리** | `/api/categories`, `/api/categories/[id]` | GET/POST/PUT/DELETE | |
| **태그** | `/api/tags`, `/api/tags/[id]` | GET/POST/PUT/DELETE | |
| **미디어** | `/api/media` | GET/POST | 메타데이터 관리 |
| **미디어** | `/api/media/upload` | POST | Cloudinary 업로드 |
| **미디어** | `/api/media/[id]` | GET/DELETE | |
| **포트폴리오** | `/api/portfolio` | GET/POST | page=popup/wedding 필터 |
| **포트폴리오** | `/api/portfolio/[id]` | GET/PUT/DELETE | |
| **포트폴리오** | `/api/portfolio/reorder` | POST | 순서 변경 |
| **SEO** | `/api/seo/rules` | GET | 규칙 조회 |
| **SEO** | `/api/seo/analyze` | POST | SEO 점수 분석 |
| **설정** | `/api/settings` | GET/POST | key-value 설정 |
| **팝업** | `/api/popups`, `/api/popups/[id]` | GET/POST/PUT/DELETE | |
| **크론** | `/api/cron/publish-scheduled` | POST | 예약 발행 자동화 |

---

## 4. DB 테이블 구조

```
posts           - id, title, slug, description, content, image, category_id,
                  draft, scheduled_at, deleted_at, seo_title, seo_description,
                  focus_keyword, seo_score, external_url, created_at, updated_at
categories      - id, name, slug, created_at
tags            - id, name, slug, created_at
post_tags       - post_id, tag_id (다대다 연결)
media           - id, filename, url, public_id, width, height, format, bytes, created_at
settings        - key, value (key-value 저장소)
seo_rules       - id, rule_id, category, label, enabled, max_score
portfolio       - id, image_url, public_id, title, tags, page, visible, sort_order, created_at
post_revisions  - 글 수정 이력 추적
popups          - id, title, subtitle, body, image_url, link_url, link_text,
                  bg_color, text_color, sort_order, active, created_at, updated_at
```

---

## 5. 각 페이지별 상세 구조

### 5-1. 홈페이지 (`/`)

**레이아웃:** BaseLayout (Navbar + Footer + FloatingContactButton + PromoPopup 포함)

**섹션 구성:**
1. **HeroSection** - 브랜드명 "심플큐브" (ONE Mobile Title 폰트, 반응형 clamp 사이즈) + 태그라인 + "12,000건+" 통계 + 팝업/웨딩 2컬럼 이미지 그리드 + 스크롤 다운 화살표 애니메이션
2. **BrandStory** - 미션문 + 골드 라인 + 4개 통계 카드 (2019년 설립, 연 1,600건+, 전국 4지점, 5개 모델) + 2개 스토리 블록 ("심플하지만 특별하게" 철학 + "끊임없는 혁신")
3. **BranchOffices** - 서울본점(HQ뱃지)/부산/대전/전주 4지점 카드, 카카오톡/인스타/전화 링크, 호버 그림자 효과

**사용되지 않는 import:** ServicesSection, WhySimpleCube, WeddingIntro, PopupIntro, CTASection, InstagramSection이 컴포넌트로 존재하지만 홈페이지에서 활발히 사용 여부 확인 필요

### 5-2. 행사 포토부스 (`/popup`)

**레이아웃:** BaseLayout (transparentNav=false)
**타이틀:** "POP-UP | 심플큐브"
**설명:** "심플큐브 팝업 포토부스. 브랜드 팝업스토어, 기업 행사, 페스티벌을 위한 맞춤형 포토부스 서비스."

**섹션 구성:**
1. **헤더** - 골드 왼쪽 보더 4px + "행사 포토부스" 제목 + "POP-UP" 서브타이틀 + "브랜드 팝업스토어 · 기업 행사 · 페스티벌"
2. **ServiceIntro** - About 소개 + 3컬럼 통계 그리드 (Since 2019, 연 1,600건+, 전국 서비스)
3. **MachineShowcase** - 4개 부스 모델:
   - Popup Booth (추천 뱃지)
   - Module
   - Wood Edge
   - Wood Round
   - 각 모델 클릭 시 스펙 모달 + 포트폴리오 라이트박스 (화살표/키보드 네비게이션)
4. **PortfolioGallery** - `/api/portfolio?page=popup` 실시간 로딩, 태그 필터 버튼, 2컬럼(모바일)/3컬럼(데스크탑) 그리드, 지연 로딩
5. **CustomOptions** - 4가지 커스터마이징 카드:
   - 래핑 (Wrapping)
   - 메인 화면 (Main Screen)
   - 백드롭 (Backdrop)
   - 인화지 (Paper)
   - 각 카드 클릭 시 상세 모달
6. **BookingProcess** - 5단계 타임라인:
   - 문의 → 디자인 확정 → 계약 → 최종 점검 → 행사 진행
   - 모바일: 세로 타임라인 (좌측 점), 데스크탑: 가로 스텝 바
7. **ClientShowcase** - 35개+ 클라이언트 로고 (삼성, LG, BMW, 나이키, 구글, 구찌, 넷플릭스 등), 3~6컬럼 반응형, 호버 투명도, mix-blend-mode: multiply

### 5-3. 웨딩 포토부스 (`/wedding`)

**레이아웃:** BaseLayout (transparentNav=false)
**타이틀:** "WEDDING | 심플큐브"

**섹션 구성:**
1. **헤더** - 골드 왼쪽 보더 + "웨딩 포토부스" / "WEDDING" / "결혼식 · 웨딩홀 · 하객 포토 서비스"
2. **ServiceIntro** - 히어로 이미지 + 웨딩 부스 설명 + 2컬럼 포토스트립 이미지 갤러리
3. **PackageDetails** - 4개 패키지:
   - 하객 사진 (Guest Photos)
   - 포토 방명록 (Photo Guestbook)
   - 액자 (Frame)
   - USB
   - 8개 기본 포함 항목 (백드롭, 조명, 무제한 인화, 스탭 등)
   - 모바일: 2컬럼 컴팩트 + 상세 모달, 데스크탑: 2×2 이미지+텍스트
4. **TemplateGallery** - 3개 템플릿 프리뷰 이미지 + 6개 백드롭 옵션 (골드 시퀸, 로즈골드, 플라워 가랜드 등) + 사양 (2100mm × 2000mm) + 클로즈업/야외 세팅 이미지
5. **PartnerHalls** - 14개+ 제휴 웨딩홀, 모바일 3컬럼/데스크탑 4컬럼, 호버 오버레이 이름 표시
6. **BookingInquiry** - 5단계 예약 프로세스 (팝업과 유사, 웨딩 맞춤), CTA 버튼

### 5-4. 그레이 포토부스 (`/gray`)

**레이아웃:** BaseLayout (transparentNav=false)
**타이틀:** "GRAY 포토부스 | 심플큐브"
**특징:** 독립형 풀 페이지, 컴포넌트 없이 441줄 인라인 코드

**섹션 구성:**
1. **페이지 헤더** - 골드 왼쪽 보더 + "그레이 포토부스" / "GRAY" / "Simple Cube Gray · 모노톤 웨딩 포토부스"
2. **커버** - 풀 와이드 이미지 (`/images/wedding/gray/cover.png`) + "모노톤이 주는 깊이 있는 감성" 컨셉 설명
3. **기기 스펙 그리드** - 인라인 데이터:
   - 크기: 330 × 330 × 390 mm
   - 모니터: 11.6인치
   - 카메라: 1,500만 화소
   - 소비전력: 300W (Max 700W)
   - 설치방식: 스탠드형 / 테이블형
   - 출력사이즈: 2×4인치 흑백(B&W)
   - 기기 이미지: `/images/wedding/gray/device.png`
4. **패키지** - 9개 포함 항목:
   - 촬영 기기 & 전용 스탠드
   - 재사용 가능한 보관용 틴케이스
   - 메시지 액자 방명록
   - 청첩장 동봉 안내카드 100장
   - 촬영 소품 20여 가지
   - 현장 진행 스탭 1인
   - 무제한 사진 인화 & 인원수 맞춤 인화 서비스
   - 사진 개별 포장 필름
   - 웨딩 당일 원본 파일 + 움짤(GIF) USB 제공
   - 추가 안내카드: 100장당 10,000원
5. **프로세스 (01-PROCESS)** - 5단계:
   - 카카오채널 예약확인
   - 계약서 / 계약금 입금
   - 옵션사항 선택
   - 최종안내 및 점검
   - 행사 진행
   - 배송비, 해외 행사, 계약금 기한 안내
6. **옵션 (02-OPTIONS)** - 메인 화면 선택 (`/images/wedding/gray/main-screen.png`):
   - A type: 사진 삽입형
   - B type: 문구 삽입형
7. **포토스트립 템플릿 (03-TEMPLATES)** - 6개 디자인:
   - Wedding Day (Black/White/Beige, 1장×3회)
   - Vintage Mood (Black/White/Beige, 1장×3회)
   - Just Married (Black/White/Beige, 2장×3회)
   - Analog Stripe (Green/Beige/Blue, 2장×3회)
   - Share Moment (Black/White/Beige, 1장×3회)
   - Self Customize (커스텀 가이드)
   - 디자인 수정: 최대 2회 (오타 제외)
8. **액자 (06-FRAME)** - 2가지 사이즈:
   - A3: 297 × 420 mm (Black/Wood)
   - A2: 420 × 594 mm (Black/Wood)
9. **예약 CTA** - 다크 배경 + 카카오톡 문의 버튼 + 웨딩 페이지 네비게이션

### 5-5. 브랜드소개 (`/brand`)

**타이틀:** "BRAND | 심플큐브"
**헤더:** 골드 왼쪽 보더 + "브랜드소개" / "BRAND"
**컴포넌트:** BrandStory + BranchOffices (홈페이지와 동일 컴포넌트 재사용)

### 5-6. 예약문의 (`/contact`)

**타이틀:** "예약문의 | 심플큐브"
**구성:**
1. **히어로** - "예약문의" 대형 헤딩 + SVG 헤드셋 일러스트
2. **4개 지점 카드 그리드** - 각 지점별:
   - 지점명 + 담당 지역
   - 카카오톡 버튼 (#FEE500 노란색)
   - CS 시간: 10:00 ~ 18:00
   - 전화번호
   - 인스타그램 핸들 + 링크
   - "주말, 공휴일 휴무" 안내
3. **안내 노트** - "전국 어디서든 출장 서비스 가능", "카카오톡 문의", "상담 후 견적서 안내"

**지점 데이터:**
- 서울 본점 (서울/경기/강원) - 카카오: 심플큐브, 인스타: simplecube_photobooth, 전화: 02-338-9180 (isHQ: true)
- 부산 지점 (부산/경남) - 카카오: 심플큐브 부산, 인스타: simplecube_busan, 전화: 010-3122-4746
- 대전 지점 (대전/충청) - 카카오: 심플큐브 대전, 인스타: simplecube_daejeon, 전화: 010-8838-8122
- 전주 지점 (전라) - 카카오: 심플큐브 전주, 인스타: simplecube_jeonju, 전화: 010-5743-8122

### 5-7. Q&A (`/qna`)

**타이틀:** "Q&A | 심플큐브"
**구성:** 헤더 + 아코디언 FAQ + 이메일/인스타 CTA
**데이터 소스:** `/src/data/faq.ts` (8개 항목)

**FAQ 항목:**
- **일반** (2개):
  - 심플큐브는 어떤 서비스를 제공하나요?
  - 서비스 가능 지역은 어디인가요?
- **팝업 포토부스** (2개):
  - 팝업 포토부스는 어떤 행사에 적합한가요?
  - 팝업 포토부스 예약은 얼마나 전에 해야 하나요?
- **웨딩 포토부스** (2개):
  - 웨딩 포토부스 패키지에는 무엇이 포함되나요?
  - 웨딩 포토 템플릿은 커스터마이징이 가능한가요?
- **비용** (2개):
  - 비용은 어떻게 되나요?
  - 취소 및 환불 규정은 어떻게 되나요?

### 5-8. 블로그 (`/blog`)

**타이틀:** "BLOG | 심플큐브"
**동적 페이지 (prerender: false)**

**데이터:** DB에서 발행된 글 조회 (draft=0, deleted_at IS NULL, scheduled_at 체크)
**기능:** 실시간 검색 필터링 (제목, 설명, 태그) + 카테고리 필터 버튼
**카드 구성:** 카테고리 뱃지 + 날짜 + 제목 + 설명 발췌 + 외부 링크 표시
**레이아웃:** 3컬럼(대)/2컬럼(중)/1컬럼(소)

**블로그 상세 (`/blog/[slug]`):**
- 메타데이터 (카테고리, 날짜) + 제목 + 설명 + 대표 이미지 + HTML 콘텐츠 + 태그
- JSON-LD 구조화 데이터 (BlogPosting 스키마)
- 커스텀 SEO: seo_title, seo_description, OG 이미지
- 외부 URL인 경우 해당 URL로 리다이렉트

**시드 콘텐츠 (마크다운 4개):**
1. `review-hd-log-wedding.md` - 엘블레스 웨딩 포토부스 후기 (외부 네이버 블로그 링크)
2. `popup-booth-guide.md` - 팝업 포토부스 완벽 가이드
3. `how-to-choose-photobooth.md` - 포토부스 업체 선택 가이드 5가지
4. `wedding-photobooth-trends-2025.md` - 2025 웨딩 포토부스 트렌드

---

## 6. 컴포넌트 목록

### 공통 컴포넌트 (src/components/common/)

| 컴포넌트 | Props | 용도 | 사용 페이지 |
|----------|-------|------|------------|
| **Navbar.astro** | transparent?: boolean | 고정 네비게이션, 투명/솔리드, 모바일 햄버거 메뉴, 스크롤 시 상태 변경 | 전체 (BaseLayout) |
| **Footer.astro** | - | 4지점 정보 (4컬럼→스택), 소셜 아이콘 (카카오/인스타/전화) | 전체 (BaseLayout) |
| **Button.astro** | href?, variant(4종), size(3종), class?, external? | 범용 버튼/링크, letter-spacing 0.08em | 전체 |
| **PageHero.astro** | title, subtitle?, backgroundImage, height? | 이미지 배경 히어로, 좌하단 텍스트, 이중 그라디언트, 골드 악센트 라인 | popup, wedding |
| **TextHero.astro** | title, subtitle?, description? | 흰 배경 텍스트 히어로, 장식 블러 원형 | brand, qna |
| **DarkTextHero.astro** | title, subtitle?, description?, bgImage? | 차콜(#6B5B4D) 배경 히어로, 블러 배경 이미지 | - |
| **SectionHeading.astro** | title, subtitle?, align, light?, class? | 넘버링 포함 섹션 제목 | popup, wedding, gray |
| **FloatingContactButton.astro** | - | 우하단 고정 3버튼 (웨딩/행사/예약), 탄/다크그레이/골드, 바운스 애니메이션 | 전체 (BaseLayout) |
| **PromoPopup.astro** | - | 홈페이지 프로모 팝업, 1초 후 표시, "오늘 하루 안보기" localStorage | 홈 (BaseLayout) |
| **SitePopup.astro** | - | DB 기반 다이내믹 팝업 (최대 2개), 커스텀 색상/이미지/링크, "1일 숨기기" | 전체 |

### 홈 컴포넌트 (src/components/home/)

| 컴포넌트 | 용도 |
|----------|------|
| **HeroSection.astro** | 브랜드명 + 태그라인 + 통계 + 2컬럼 이미지 + 스크롤 인디케이터 |
| **ServicesSection.astro** | 2컬럼 서비스 카드 (팝업/웨딩), 팝업은 7장 이미지 슬라이드쇼 (2초 간격) |
| **WhySimpleCube.astro** | 4가지 강점 (디자인, 인화, 디지털 공유, 프로 운영) + 통계 |
| **PopupIntro.astro** | 2컬럼 (이미지+텍스트), /popup CTA |
| **WeddingIntro.astro** | 2컬럼 (텍스트+이미지), /wedding CTA |
| **CTASection.astro** | 히어로 이미지 다크 오버레이 + 웨딩/팝업 CTA 버튼 2개 |
| **InstagramSection.astro** | 차콜(#6B5B4D) 배경 + 소셜 링크 (인스타/블로그/카카오) |

### 행사(팝업) 컴포넌트 (src/components/popup/)

| 컴포넌트 | 용도 |
|----------|------|
| **ServiceIntro.astro** | About + 3컬럼 통계 (Since 2019, 1600+/년, 전국) |
| **MachineShowcase.astro** | 4개 부스 모델, 2×2 모바일/4컬럼 데스크탑, 추천 뱃지, 스펙 모달 + 라이트박스 |
| **PortfolioGallery.astro** | API 실시간 로딩, 태그 필터, 2~3컬럼 그리드, 지연 로딩, 빈/로딩 상태 |
| **ClientShowcase.astro** | 35개+ 로고, 3~6컬럼 반응형, mix-blend-mode: multiply |
| **CustomOptions.astro** | 4가지 커스텀 카드 (래핑/화면/백드롭/인화지), 클릭 모달 |
| **BookingProcess.astro** | 5단계 타임라인, 모바일 세로/데스크탑 가로, 스텝 모달 |

### 웨딩 컴포넌트 (src/components/wedding/)

| 컴포넌트 | 용도 |
|----------|------|
| **ServiceIntro.astro** | 히어로 이미지 + 설명 + 2컬럼 포토스트립 갤러리 |
| **PackageDetails.astro** | 4개 패키지 + 8개 포함 항목, 모바일 컴팩트+모달/데스크탑 2×2 |
| **TemplateGallery.astro** | 3개 템플릿 + 6개 백드롭 + 사양 + 클로즈업/야외 이미지 |
| **PartnerHalls.astro** | 14개+ 제휴홀, 3~4컬럼, 호버 오버레이 이름 |
| **BookingInquiry.astro** | 5단계 예약, 모바일 타임라인/데스크탑 5컬럼, CTA |
| **PartnerCompanies.astro** | 파트너 회사 목록 |

### FAQ 컴포넌트 (src/components/faq/)

| 컴포넌트 | 용도 |
|----------|------|
| **AccordionList.astro** | 아코디언 컨테이너, faq.ts 데이터 사용 |
| **AccordionItem.astro** | 개별 아코디언 (question, answer), 그리드 기반 열기/닫기, 아이콘 회전, 단일 열기 |

### 브랜드 컴포넌트 (src/components/brand/)

| 컴포넌트 | 용도 |
|----------|------|
| **BrandStory.astro** | 미션문 + 골드라인 + 4개 통계 + 2개 스토리 블록 |
| **BranchOffices.astro** | 4지점 카드 (HQ뱃지, 카카오/인스타/전화), 2~4컬럼 |

### 관리자 컴포넌트 (src/components/admin/, React/TSX)

| 컴포넌트 | 용도 |
|----------|------|
| **PostEditor.tsx** | 글 작성/수정 폼 (React, client:load) |
| **TipTapEditor.tsx** | TipTap 리치 텍스트 에디터 |
| **SEOPanel.tsx** | SEO 분석/점수 패널 |
| **ImagePicker.tsx** | 이미지 선택 UI |
| **PostList.tsx** | 글 목록 테이블/그리드 |

---

## 7. 레이아웃

### BaseLayout.astro (공개 페이지용)

- **Props:** title, description, ogImage, transparentNav
- **포함:** Navbar, Footer, FloatingContactButton, PromoPopup
- **기능:**
  - OpenGraph 메타 태그
  - Canonical URL
  - RSS 피드 링크
  - Pretendard 폰트 프리로딩
  - GSAP/ScrollTrigger 초기화
  - 스크롤 리빌 애니메이션 클래스: `.gs-fade-up`, `.gs-fade-in`, `.gs-slide-left`, `.gs-slide-right`, `.gs-scale-in`, `.gs-stagger`
  - reduced-motion 미디어 쿼리 지원

### AdminLayout.astro (관리자용)

- 다크 테마 디자인
- 사이드바 네비게이션 (9개 메뉴)
- 상단 바 (사이트 보기 링크)
- 반응형 모바일 사이드바 + 오버레이
- 로그아웃 버튼
- 현재 라우트 하이라이팅

---

## 8. 네비게이션 구조

```
심플큐브 (로고)
├── 브랜드소개
│   ├── 브랜드 소개 → /#brand-story
│   └── 지점안내 → /#branches
├── 행사
│   ├── 행사 포토부스 → /popup
│   ├── 모델 소개 → /popup#machines
│   ├── 브랜드 커스텀 → /popup#custom
│   ├── 포트폴리오 → /popup#portfolio
│   └── Q&A → /qna
├── 웨딩
│   ├── 웨딩 포토부스 → /wedding
│   ├── 그레이 포토부스 → /gray
│   ├── 패키지안내 → /wedding#packages
│   ├── 제휴 웨딩홀 → /wedding#partner-halls
│   ├── 포트폴리오 → /wedding#gallery
│   └── Q&A → /qna
└── BLOG → /blog
```

---

## 9. 데이터 파일

### navigation.ts (`/src/data/`)

```typescript
interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  children?: NavItem[];
}
```

### faq.ts (`/src/data/`)

```typescript
interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}
// 8개 항목 (일반 2, 팝업 2, 웨딩 2, 비용 2)
```

### animations.ts (`/src/utils/`)

```
fadeUp, fadeIn, slideLeft, slideRight, scaleIn, textReveal 프리셋
```

---

## 10. 미들웨어 (`/src/middleware.ts`)

- **DB 초기화:** /admin, /api/, /blog 라우트 접근 시 자동 초기화
- **관리자 보호:** /admin/* 미인증 → /admin/login 리다이렉트
- **API 인증:** POST/PUT/DELETE 요청 시 JWT 검증 필요
- **예외:** /api/auth/login은 인증 불필요
- **실패 응답:** 401 JSON

---

## 11. 외부 연동 & 연락처

| 채널 | 서울 본점 | 부산 | 대전 | 전주 |
|------|----------|------|------|------|
| **카카오톡** | 심플큐브 (pf.kakao.com/_simplecube) | 심플큐브 부산 (_simplecube_busan) | 심플큐브 대전 (_simplecube_daejeon) | 심플큐브 전주 (_simplecube_jeonju) |
| **인스타그램** | @simplecube_photobooth | @simplecube_busan | @simplecube_daejeon | @simplecube_jeonju |
| **전화** | 02-338-9180 | 010-3122-4746 | 010-8838-8122 | 010-5743-8122 |
| **이메일** | simple_cube@naver.com (공통) |

---

## 12. 이미지 에셋 현황

| 디렉토리 | 내용 |
|----------|------|
| `/images/hero/` | 홈 히어로 이미지 |
| `/images/logos/` | 45개+ 클라이언트 로고 (삼성, 나이키, 구글, 구찌, 넷플릭스 등) |
| `/images/popup/` | 부스 모델: booth.jpg, module-model, wood-edge, wood-round |
| `/images/wedding/` | 백드롭, 프레임, 기프트박스, 세팅 이미지 |
| `/images/wedding/` (제휴홀) | 15개+ 제휴 웨딩홀 이미지 |
| `/images/wedding/` (템플릿) | 템플릿 프리뷰, PDF 페이지 이미지 |
| `/images/wedding/gray/` | cover, device, screens, main-screen, template-1~6 (6종) |
| `/images/blog/` | 블로그 포스트 이미지 |
| **Cloudinary** | 포트폴리오 이미지 (동적 로딩) |

---

## 13. 환경 변수

```
TURSO_DATABASE_URL    - Turso 데이터베이스 URL
TURSO_AUTH_TOKEN      - Turso 인증 토큰
JWT_SECRET            - JWT 서명 키
ADMIN_PASSWORD        - 관리자 비밀번호
CLOUDINARY_CLOUD_NAME - Cloudinary 클라우드명
CLOUDINARY_API_KEY    - Cloudinary API 키
CLOUDINARY_API_SECRET - Cloudinary API 시크릿
```

---

## 14. SEO 시스템 상세

**31개+ SEO 분석 규칙, 5개 카테고리:**

1. **기본 SEO** (10개 규칙) - 키워드 배치, 콘텐츠 길이, 밀도 등
2. **제목 가독성** (3개 규칙) - 키워드 위치, 숫자 포함, 길이
3. **콘텐츠 가독성** (4개 규칙) - 제목 태그, 짧은 단락, 미디어, 설명 길이
4. **링크 분석** (4개 규칙) - URL 길이, 외부/내부 링크, 키워드 고유성
5. **GEO (AI 검색 최적화)** (8개 규칙) - Q&A 형식, 통계, 목록, 정의, 인용 등

**기능:**
- 각 규칙별 활성/비활성 토글
- 규칙별 점수 가중치 설정 (0-20점)
- 전체 점수 등급: Good / OK / Poor
- 포커스 키워드 추적
- 글 작성 시 실시간 SEO 분석

---

## 15. 현재 상태 평가

### 잘 되어 있어서 살릴 수 있는 부분

- **관리자 CMS 전체** - 블로그 CRUD, 포트폴리오 관리, 미디어 라이브러리, 팝업 관리 완성도 높음
- **API 백엔드** - RESTful 구조, JWT 인증, 미들웨어 보호, 에러 처리
- **SEO 시스템** - 31개 규칙 + GEO 지원, 실시간 분석, 점수 대시보드
- **데이터베이스 구조** - 10개 테이블, 리비전 히스토리, 소프트 삭제, 예약 발행
- **Cloudinary 이미지 관리** - 업로드/삭제/URL 변환 완비
- **GSAP 애니메이션 시스템** - 6가지 프리셋, 스크롤 트리거, reduced-motion 대응
- **반응형 디자인 기반** - 모바일/태블릿/데스크탑 대응
- **클라이언트 로고 에셋** - 35개+ 주요 브랜드 로고 보유
- **4지점 연락처 데이터** - 전국 4개 지점 카카오/인스타/전화 완비
- **블로그 시스템** - TipTap 에디터, JSON-LD, 검색/필터, 카테고리/태그

### 재설계가 필요한 부분

- **홈페이지** - HeroSection + BrandStory + BranchOffices만으로 구성. ServicesSection, WhySimpleCube, PopupIntro, WeddingIntro, CTASection, InstagramSection 등 만들어놓은 컴포넌트가 충분히 활용되지 않음
- **테스트 페이지 6개** - 정리/삭제 필요 (test-hero, test-footer, test-hero-popup, test-modal, test-portfolio, spec-test)
- **gray 페이지** - 441줄 인라인 코드, 컴포넌트화 안 됨 (유지보수 어려움)
- **네비게이션 구조** - 브랜드소개가 홈페이지 앵커(/#brand-story)와 별도 페이지(/brand) 양쪽으로 연결되어 혼란
- **콘텐츠 중복** - BrandStory + BranchOffices가 홈(/)과 브랜드(/brand) 페이지에서 동일 사용
- **FAQ 데이터** - 8개로 적음, 실제 고객 문의 반영 부족
- **홈에서 서비스 소개 부재** - 방문자가 홈에서 바로 핵심 서비스를 파악하기 어려움
- **game 페이지** - 비즈니스와 무관, 유지 여부 결정 필요
- **faq → qna 리다이렉트** - 페이지명 통일 필요
