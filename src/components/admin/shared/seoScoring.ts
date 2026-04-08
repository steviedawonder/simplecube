// No React imports needed - this is a pure utility module

// ── Types ──
export type ScoreCheck = { label: string; ok: boolean; detail: string };
export type ScoreCategory = { name: string; checks: ScoreCheck[]; passCount: number; failCount: number };

// ── SEO/GEO Score Calculator (Rank Math style) ──
export function calculateScores(data: { title: string; excerpt: string; body: string; focusKeyword: string; seoTitle: string; seoDesc: string; tags: string[]; category: string; slug: string }) {
  const { title, excerpt, body, focusKeyword, seoTitle, seoDesc, tags, category, slug } = data;

  // Strip HTML tags for plain text analysis
  const plainBody = body.replace(/<[^>]*>/g, '');
  const bodyLen = plainBody.replace(/\s/g, '').length;
  const wordCount = plainBody.trim().split(/\s+/).filter(Boolean).length;
  const kwLower = focusKeyword?.toLowerCase() || '';
  const titleLower = title.toLowerCase();
  const excerptLower = excerpt.toLowerCase();
  const bodyLower = plainBody.toLowerCase();
  const seoTitleLower = (seoTitle || '').toLowerCase();
  const seoDescLower = (seoDesc || '').toLowerCase();
  const slugLower = (slug || '').toLowerCase();

  const kwCount = kwLower ? (bodyLower.split(kwLower).length - 1) : 0;
  const kwDensity = bodyLen > 0 && kwLower ? (kwCount * kwLower.length / bodyLen * 100) : 0;
  const h2Matches = body.match(/<h2[^>]*>/gi) || plainBody.match(/^## /gm) || [];
  const h2Count = h2Matches.length;
  const h3Matches = body.match(/<h3[^>]*>/gi) || plainBody.match(/^### /gm) || [];
  const h3Count = h3Matches.length;
  const linkCount = (body.match(/<a\s/gi) || []).length + (plainBody.match(/https?:\/\//g) || []).length;
  const hasLinks = linkCount > 0;
  const imgCount = (body.match(/<img\s/gi) || []).length;
  const definitiveCount = (plainBody.match(/입니다|합니다|됩니다|있습니다/g) || []).length;
  const questionCount = (plainBody.match(/\?/g) || []).length;
  const sentenceCount = (plainBody.match(/[.!?。]\s*/g) || []).length || 1;
  const avgSentenceLen = bodyLen / sentenceCount;
  const paragraphs = plainBody.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const shortParagraphs = paragraphs.filter(p => p.replace(/\s/g, '').length <= 300).length;
  const kwInFirst100 = kwLower ? bodyLower.slice(0, 150).includes(kwLower) : false;
  const titleHasNumber = /\d/.test(title);
  const titleHasPower = /비법|방법|가이드|꿀팁|노하우|비교|추천|완벽|필수|핵심|최고|TOP|best|tip/i.test(title);
  const usedKwBefore = false;
  const hasDoFollowLinks = hasLinks;

  // --- SEO 기본 ---
  const seoBasic: ScoreCheck[] = [
    {
      label: 'SEO 제목에 포커스 키워드 사용',
      ok: !!kwLower && (seoTitleLower || titleLower).includes(kwLower),
      detail: kwLower
        ? (seoTitleLower || titleLower).includes(kwLower)
          ? `좋아요! SEO 제목에 포커스 키워드를 사용하고 있습니다.`
          : `SEO 제목에 "${focusKeyword}" 키워드를 포함시켜 주세요. 검색 결과에서 클릭률이 높아집니다.`
        : `포커스 키워드를 먼저 설정해 주세요.`
    },
    {
      label: 'SEO 메타 설명에 포커스 키워드 사용',
      ok: !!kwLower && (seoDescLower || excerptLower).includes(kwLower),
      detail: kwLower
        ? (seoDescLower || excerptLower).includes(kwLower)
          ? `좋아요! 메타 설명에서 사용되는 포커스 키워드가 포함되어 있습니다.`
          : `SEO 메타 설명(요약)에 "${focusKeyword}" 키워드를 넣어 주세요. 검색 결과 미리보기에 표시됩니다.`
        : `포커스 키워드를 먼저 설정해 주세요.`
    },
    {
      label: 'URL에 포커스 키워드 사용',
      ok: !!kwLower && slugLower.includes(kwLower.replace(/\s+/g, '-')),
      detail: kwLower
        ? slugLower.includes(kwLower.replace(/\s+/g, '-'))
          ? `좋아요! URL에 포커스 키워드가 포함되어 있습니다.`
          : `URL 슬러그에 "${focusKeyword}" 키워드를 포함시켜 주세요. URL은 50자 이내가 이상적입니다.`
        : `포커스 키워드를 먼저 설정해 주세요.`
    },
    {
      label: '콘텐츠 시작 부분에 포커스 키워드 사용',
      ok: kwInFirst100,
      detail: kwInFirst100
        ? `좋아요! 콘텐츠 시작 부분(처음 150자 이내)에 포커스 키워드가 있습니다.`
        : `게시물 콘텐츠의 첫 부분(150자 이내)에 "${focusKeyword || '키워드'}"를 넣어 주세요. 검색 엔진이 주제를 빠르게 파악합니다.`
    },
    {
      label: '게시물 콘텐츠에 포커스 키워드 포함',
      ok: kwCount > 0,
      detail: kwCount > 0
        ? `좋아요! 게시물 콘텐츠에 포커스 키워드가 있습니다.`
        : `본문에 "${focusKeyword || '키워드'}"를 자연스럽게 포함시켜 주세요.`
    },
    {
      label: '콘텐츠 길이 600자 이상',
      ok: bodyLen >= 600,
      detail: bodyLen >= 600
        ? `본문 길이가 ${bodyLen.toLocaleString()}자입니다. 잘했어요!`
        : `현재 ${bodyLen.toLocaleString()}자입니다. 최소 600자 이상 작성해 주세요. SEO에 유리한 콘텐츠 길이는 1,500자 이상입니다.`
    },
  ];

  // --- SEO 추가 ---
  const seoExtra: ScoreCheck[] = [
    {
      label: '부제목에 포커스 키워드 포함',
      ok: !!kwLower && (body.match(/<h[2-4][^>]*>.*?<\/h[2-4]>/gi) || []).some(h => h.toLowerCase().includes(kwLower)),
      detail: (() => {
        const headings = (body.match(/<h[2-4][^>]*>.*?<\/h[2-4]>/gi) || []);
        const hasKwInHeading = headings.some(h => h.toLowerCase().includes(kwLower));
        return hasKwInHeading
          ? `좋아요! 부제목에 포커스 키워드가 있습니다.`
          : `H2, H3 등 부제목 중 하나에 "${focusKeyword || '키워드'}"를 포함시켜 주세요.`;
      })()
    },
    {
      label: '이미지 대체 속성에 포커스 키워드 사용',
      ok: !!kwLower && (body.match(/alt="[^"]*"/gi) || []).some(a => a.toLowerCase().includes(kwLower)),
      detail: (() => {
        const alts = body.match(/alt="[^"]*"/gi) || [];
        const hasKwInAlt = alts.some(a => a.toLowerCase().includes(kwLower));
        return hasKwInAlt
          ? `좋아요! 이미지 대체 속성에 포커스 키워드가 있습니다.`
          : `이미지의 alt 속성에 "${focusKeyword || '키워드'}"를 넣어 주세요. 이미지 검색 노출에 도움이 됩니다.`;
      })()
    },
    {
      label: `키워드 밀도 적정 범위 (0.5~3%)`,
      ok: kwDensity >= 0.5 && kwDensity <= 3,
      detail: kwLower
        ? kwDensity >= 0.5 && kwDensity <= 3
          ? `키워드 밀도가 ${kwDensity.toFixed(1)}%이고 포커스 키워드 조합이 ${kwCount}번 나타납니다.`
          : kwDensity < 0.5
            ? `키워드 밀도가 ${kwDensity.toFixed(1)}%로 낮습니다. 본문에 "${focusKeyword}"를 더 사용해 주세요. (권장: 0.5~3%)`
            : `키워드 밀도가 ${kwDensity.toFixed(1)}%로 높습니다. 키워드 과다 사용은 오히려 불이익이 될 수 있습니다. (권장: 0.5~3%)`
        : `포커스 키워드를 먼저 설정해 주세요.`
    },
    {
      label: 'URL 길이 적정 (50자 이내)',
      ok: (slug || title).length <= 50,
      detail: (slug || title).length <= 50
        ? `URL은 ${(slug || title).length}자 길이입니다. Kudos!`
        : `URL이 ${(slug || title).length}자입니다. 50자 이내로 줄여 주세요. 짧은 URL이 검색 결과에서 더 잘 보입니다.`
    },
    {
      label: '외부 리소스에 링크',
      ok: hasDoFollowLinks,
      detail: hasDoFollowLinks
        ? `좋아요! 외부 리소스에 링크하고 있습니다. 콘텐츠에 DoFollow가 포함된 외부 링크가 하나 이상 있습니다.`
        : `관련 외부 사이트(통계, 출처 등)에 링크를 넣어 주세요. 신뢰도가 높아집니다.`
    },
    {
      label: '웹사이트의 다른 리소스에 내부 링크',
      ok: linkCount >= 2,
      detail: linkCount >= 2
        ? `웹사이트의 다른 리소스에 연결하고 있습니다.`
        : `사이트 내 다른 글이나 페이지로 연결되는 내부 링크를 추가해 주세요. SEO에 매우 중요합니다.`
    },
    {
      label: '태그 2개 이상 설정',
      ok: tags.length >= 2,
      detail: tags.length >= 2
        ? `${tags.length}개의 태그가 설정되어 있습니다.`
        : `현재 ${tags.length}개 태그가 있습니다. 2개 이상의 관련 태그를 추가하면 분류와 검색에 도움이 됩니다.`
    },
    {
      label: '카테고리 설정',
      ok: !!category,
      detail: category
        ? `카테고리가 설정되어 있습니다.`
        : `카테고리를 선택해 주세요. 콘텐츠 분류가 명확해지면 사용자와 검색 엔진 모두에게 좋습니다.`
    },
  ];

  // --- 제목 가독성 ---
  const titleReadability: ScoreCheck[] = [
    {
      label: 'SEO 제목 앞쪽에 포커스 키워드 배치',
      ok: !!kwLower && (seoTitleLower || titleLower).indexOf(kwLower) <= Math.floor((seoTitle || title).length * 0.4),
      detail: (() => {
        const t = seoTitleLower || titleLower;
        const idx = kwLower ? t.indexOf(kwLower) : -1;
        return idx >= 0 && idx <= Math.floor((seoTitle || title).length * 0.4)
          ? `좋아요! SEO 제목의 앞쪽에서 사용되는 포커스 키워드가 포함되어 있습니다.`
          : `SEO 제목의 앞부분(전체 길이의 40% 이내)에 포커스 키워드를 배치해 주세요. 검색 결과에서 눈에 더 잘 띕니다.`;
      })()
    },
    {
      label: 'SEO 제목에 숫자를 사용',
      ok: titleHasNumber,
      detail: titleHasNumber
        ? `SEO 제목에 숫자를 사용하고 있습니다. 클릭률이 높아집니다!`
        : `제목에 숫자를 포함하면 클릭률(CTR)이 36% 증가합니다. 예: "5가지 방법", "2025 가이드"`
    },
    {
      label: 'SEO 제목 길이 적정 (10~60자)',
      ok: title.length >= 10 && title.length <= 60,
      detail: title.length >= 10 && title.length <= 60
        ? `제목이 ${title.length}자입니다. 적절한 길이입니다!`
        : title.length < 10
          ? `현재 ${title.length}자입니다. 제목이 너무 짧습니다. 10자 이상으로 작성해 주세요.`
          : `현재 ${title.length}자입니다. 60자를 초과하면 검색 결과에서 잘릴 수 있습니다.`
    },
    {
      label: '파워 키워드 사용 (클릭 유도)',
      ok: titleHasPower,
      detail: titleHasPower
        ? `좋아요! 제목에 파워 키워드(가이드, 방법, 추천 등)가 포함되어 있습니다.`
        : `제목에 "가이드", "방법", "추천", "비교", "꿀팁" 등의 파워 키워드를 넣으면 클릭률이 높아집니다.`
    },
  ];

  // --- 콘텐츠 가독성 ---
  const contentReadability: ScoreCheck[] = [
    {
      label: '소제목(H2/H3)으로 텍스트 분할',
      ok: h2Count + h3Count >= 2,
      detail: h2Count + h3Count >= 2
        ? `소제목을 사용하여 텍스트를 분해하는 것 같습니다. ${h2Count}개의 H2와 ${h3Count}개의 H3가 있습니다.`
        : `H2, H3 소제목으로 글을 나눠 주세요. 현재 소제목이 ${h2Count + h3Count}개입니다. 긴 글은 독자가 읽기 어렵습니다.`
    },
    {
      label: '짧은 문단 사용 (300자 이하)',
      ok: paragraphs.length === 0 || shortParagraphs >= paragraphs.length * 0.7,
      detail: paragraphs.length === 0
        ? `본문을 작성해 주세요.`
        : shortParagraphs >= paragraphs.length * 0.7
          ? `좋아요! 짧은 문단을 사용하고 있습니다. 전체 ${paragraphs.length}개 문단 중 ${shortParagraphs}개가 300자 이하입니다.`
          : `문단이 너무 깁니다. 전체 ${paragraphs.length}개 문단 중 ${paragraphs.length - shortParagraphs}개가 300자를 초과합니다. 짧은 문단이 읽기 쉽습니다.`
    },
    {
      label: '콘텐츠에 이미지 및/또는 비디오 포함',
      ok: imgCount >= 1,
      detail: imgCount >= 1
        ? `콘텐츠에 이미지가 ${imgCount}개 포함되어 있습니다. 시각적 콘텐츠는 독자 참여도를 높입니다.`
        : `이미지나 비디오를 추가해 주세요. 시각적 콘텐츠가 있는 글은 체류 시간이 2배 이상 늘어납니다.`
    },
    {
      label: '메타 설명 길이 적정 (50~160자)',
      ok: (seoDesc || excerpt).length >= 50 && (seoDesc || excerpt).length <= 160,
      detail: (() => {
        const len = (seoDesc || excerpt).length;
        return len >= 50 && len <= 160
          ? `메타 설명이 ${len}자입니다. 적절합니다!`
          : len < 50
            ? `현재 ${len}자입니다. 50자 이상 작성해야 검색 결과에서 충분한 정보를 제공합니다.`
            : `현재 ${len}자입니다. 160자를 넘으면 검색 결과에서 잘립니다. 핵심만 간결하게 작성해 주세요.`;
      })()
    },
  ];

  // --- GEO (AI 검색 최적화) 기본 ---
  const geoBasic: ScoreCheck[] = [
    {
      label: '명확한 팩트 서술 (3문장 이상)',
      ok: definitiveCount >= 3,
      detail: definitiveCount >= 3
        ? `단정적 서술("~입니다", "~합니다")이 ${definitiveCount}개 있습니다. AI가 인용하기 좋은 형식입니다.`
        : `현재 단정적 서술이 ${definitiveCount}개입니다. "~입니다" 형식의 명확한 문장을 3개 이상 사용하면 AI 검색에서 인용될 확률이 높아집니다.`
    },
    {
      label: '질문-답변(Q&A) 형식 포함',
      ok: questionCount >= 1 && h2Count >= 1,
      detail: questionCount >= 1 && h2Count >= 1
        ? `질문 형식이 ${questionCount}개 포함되어 있고 소제목도 있습니다. AI 검색이 Q&A 형식을 선호합니다.`
        : `소제목을 질문 형식("웨딩 포토부스란?", "비용은 얼마인가요?")으로 작성하면 AI 검색 결과에 직접 인용됩니다.`
    },
    {
      label: '전문 용어/브랜드명 사용 (5개 이상)',
      ok: (plainBody.match(/[A-Z][a-zA-Z]{2,}/g) || []).length >= 5,
      detail: (() => {
        const terms = (plainBody.match(/[A-Z][a-zA-Z]{2,}/g) || []);
        return terms.length >= 5
          ? `전문 용어/브랜드명이 ${terms.length}개 감지되었습니다. AI가 전문성을 인식합니다.`
          : `현재 ${terms.length}개입니다. 브랜드명, 제품명, 전문 용어를 5개 이상 사용하면 AI가 콘텐츠의 전문성을 더 높이 평가합니다.`;
      })()
    },
    {
      label: '콘텐츠 1,500자 이상 (AI 검색 유리)',
      ok: bodyLen >= 1500,
      detail: bodyLen >= 1500
        ? `본문이 ${bodyLen.toLocaleString()}자입니다. AI 검색에 충분한 길이입니다.`
        : `현재 ${bodyLen.toLocaleString()}자입니다. 1,500자 이상의 콘텐츠가 AI 검색(Perplexity, SGE 등)에서 인용될 가능성이 3배 높습니다.`
    },
  ];

  // --- GEO 추가 ---
  const geoExtra: ScoreCheck[] = [
    {
      label: '소제목 3개 이상 (깊이 있는 콘텐츠)',
      ok: h2Count >= 3,
      detail: h2Count >= 3
        ? `H2 소제목이 ${h2Count}개 있습니다. 주제를 깊이 있게 다루고 있어 AI가 구조화된 정보로 인식합니다.`
        : `현재 H2 소제목이 ${h2Count}개입니다. 3개 이상의 소제목으로 주제를 세분화하면 AI가 각 섹션을 독립적으로 인용할 수 있습니다.`
    },
    {
      label: '요약문 80자 이상 (AI 스니펫용)',
      ok: (seoDesc || excerpt).length >= 80,
      detail: (() => {
        const len = (seoDesc || excerpt).length;
        return len >= 80
          ? `요약문이 ${len}자입니다. AI가 스니펫으로 활용하기 좋은 길이입니다.`
          : `현재 ${len}자입니다. 80자 이상의 상세한 요약을 작성하면 AI 검색 결과의 스니펫으로 직접 사용됩니다.`;
      })()
    },
    {
      label: '출처/참고 링크 포함',
      ok: hasLinks,
      detail: hasLinks
        ? `외부 링크가 포함되어 있습니다. 통계나 수치의 출처가 있으면 AI가 콘텐츠 신뢰도를 높게 평가합니다.`
        : `통계, 수치, 주장의 출처 링크를 넣어 주세요. AI는 출처가 있는 콘텐츠를 더 자주 인용합니다.`
    },
    {
      label: '권위적 어조 (확신 있는 서술)',
      ok: definitiveCount >= 5,
      detail: definitiveCount >= 5
        ? `확신 있는 서술이 ${definitiveCount}개 있습니다. 권위 있는 어조가 AI 인용에 유리합니다.`
        : `현재 ${definitiveCount}개입니다. "~일 수 있습니다" 대신 "~입니다"로 확신 있게 작성하세요. AI는 단정적 표현을 더 자주 인용합니다.`
    },
    {
      label: '리스트/목록 형식 포함',
      ok: /<[ou]l>/i.test(body) || /^[-*]\s/m.test(plainBody),
      detail: /<[ou]l>/i.test(body) || /^[-*]\s/m.test(plainBody)
        ? `목록 형식이 포함되어 있습니다. AI가 구조화된 목록을 직접 인용하기 좋습니다.`
        : `글머리 기호(UL) 또는 번호 목록(OL)을 사용해 주세요. AI 검색이 목록 형식의 답변을 선호합니다.`
    },
    {
      label: '숫자/통계 데이터 포함',
      ok: (plainBody.match(/\d+[%만원억천개건명]/g) || []).length >= 2,
      detail: (() => {
        const stats = (plainBody.match(/\d+[%만원억천개건명]/g) || []);
        return stats.length >= 2
          ? `수치/통계 데이터가 ${stats.length}개 포함되어 있습니다. 구체적 수치는 AI 인용 확률을 크게 높입니다.`
          : `구체적인 숫자와 통계("30% 절감", "50만원부터" 등)를 2개 이상 포함해 주세요. AI는 수치가 포함된 문장을 우선 인용합니다.`;
      })()
    },
  ];

  const allSeoChecks = [...seoBasic, ...seoExtra, ...titleReadability, ...contentReadability];
  const allGeoChecks = [...geoBasic, ...geoExtra];

  const seoScore = Math.round(allSeoChecks.filter(c => c.ok).length / allSeoChecks.length * 100);
  const geoScore = Math.round(allGeoChecks.filter(c => c.ok).length / allGeoChecks.length * 100);
  const totalScore = Math.round(seoScore * 0.6 + geoScore * 0.4);

  const seoCategories: ScoreCategory[] = [
    { name: '기본 SEO', checks: seoBasic, passCount: seoBasic.filter(c => c.ok).length, failCount: seoBasic.filter(c => !c.ok).length },
    { name: '추가', checks: seoExtra, passCount: seoExtra.filter(c => c.ok).length, failCount: seoExtra.filter(c => !c.ok).length },
    { name: '제목 가독성', checks: titleReadability, passCount: titleReadability.filter(c => c.ok).length, failCount: titleReadability.filter(c => !c.ok).length },
    { name: '콘텐츠 가독성', checks: contentReadability, passCount: contentReadability.filter(c => c.ok).length, failCount: contentReadability.filter(c => !c.ok).length },
  ];

  const geoCategories: ScoreCategory[] = [
    { name: 'AI 검색 기본', checks: geoBasic, passCount: geoBasic.filter(c => c.ok).length, failCount: geoBasic.filter(c => !c.ok).length },
    { name: 'AI 검색 심화', checks: geoExtra, passCount: geoExtra.filter(c => c.ok).length, failCount: geoExtra.filter(c => !c.ok).length },
  ];

  return { seoCategories, geoCategories, seoScore, geoScore, totalScore, allSeoChecks, allGeoChecks };
}
