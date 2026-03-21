# CLAUDE.md

## 작업 원칙
- 작업 완료 전 반드시 직접 테스트(브라우저 접속, 클릭, 업로드 등)까지 수행한 후 완료 보고
- 테스트 없이 "완료됐다"고 말하지 않기

## 프로젝트 정보
- 프레임워크: Astro + Tailwind CSS
- DB: Turso (libsql) - 클라우드 SQLite
- 이미지 스토리지: Cloudinary
- 배포: Vercel
- 애니메이션: GSAP

## 환경변수
- TURSO_DATABASE_URL, TURSO_AUTH_TOKEN (DB)
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (이미지)
- 로컬: .env / 프로덕션: Vercel 환경변수

## 개발 서버
- `npm run dev` → localhost:4321
- .claude/launch.json 의 "dev" 설정 사용
