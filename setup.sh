#!/bin/bash
# =============================================
# Simple Cube - 자동 환경 셋업 스크립트
# 새 PC에서: git clone 후 ./setup.sh 실행
# =============================================

set -e

echo ""
echo "🔧 Simple Cube 환경 셋업 시작..."
echo "=================================="

# 1. Node.js 확인
echo ""
echo "📌 [1/5] Node.js 확인..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    echo "   https://nodejs.org 에서 설치해주세요."
    exit 1
fi
echo "✅ Node.js $(node --version)"

# 2. npm install
echo ""
echo "📌 [2/5] 패키지 설치..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules 이미 존재 - 스킵 (강제 설치: npm install)"
else
    npm install
    echo "✅ 패키지 설치 완료"
fi

# 3. Vercel CLI 확인 및 링크
echo ""
echo "📌 [3/5] Vercel 연결..."
if ! command -v vercel &> /dev/null; then
    echo "⏳ Vercel CLI 설치 중..."
    npm install -g vercel
fi

if [ ! -d ".vercel" ]; then
    echo "⏳ Vercel 프로젝트 연결 중..."
    vercel link --yes
else
    echo "✅ Vercel 이미 연결됨"
fi

# 4. 환경변수 (.env)
echo ""
echo "📌 [4/5] 환경변수 설정..."
if [ -f ".env" ]; then
    # .env가 있지만 TURSO가 없으면 다시 받기
    if grep -q "TURSO_DATABASE_URL" .env; then
        echo "✅ .env 파일 이미 존재 (Turso 설정 확인됨)"
    else
        echo "⏳ .env에 Turso 설정이 없습니다. Vercel에서 가져오는 중..."
        vercel env pull --yes 2>/dev/null || vercel env pull
        echo "✅ 환경변수 업데이트 완료"
    fi
else
    echo "⏳ Vercel에서 환경변수 가져오는 중..."
    vercel env pull --yes 2>/dev/null || vercel env pull
    echo "✅ .env 파일 생성 완료"
fi

# 5. 환경변수 검증
echo ""
echo "📌 [5/5] 환경변수 검증..."
MISSING=""
for VAR in TURSO_DATABASE_URL TURSO_AUTH_TOKEN CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET; do
    if grep -q "$VAR" .env 2>/dev/null; then
        echo "  ✅ $VAR"
    else
        echo "  ❌ $VAR - 누락!"
        MISSING="$MISSING $VAR"
    fi
done

if [ -n "$MISSING" ]; then
    echo ""
    echo "⚠️  누락된 환경변수가 있습니다:$MISSING"
    echo "   Vercel 대시보드에서 환경변수를 확인해주세요."
    echo "   또는 다른 PC의 .env 파일을 복사해주세요."
fi

# 완료
echo ""
echo "=================================="
echo "🎉 셋업 완료!"
echo ""
echo "  개발 서버 시작: npm run dev"
echo "  사이트 접속:    http://localhost:4321"
echo "=================================="
echo ""
