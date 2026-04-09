export interface SEOInput {
  title: string;
  seoTitle: string;
  description: string;
  content: string;
  slug: string;
  focusKeyword: string;
  allPostKeywords?: string[];
}

export interface SEOCheck {
  id: string;
  category: 'basic' | 'title' | 'content' | 'links' | 'geo';
  label: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  score: number;
  maxScore: number;
}

export interface SEOResult {
  score: number;
  maxScore: number;
  checks: SEOCheck[];
  grade: 'good' | 'ok' | 'poor';
}

export interface SEORule {
  id: string;
  category: string;
  label: string;
  max_score: number;
  enabled: boolean;
  config: Record<string, any>;
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function countWords(text: string): number {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 0;
  // Korean: count characters as ~0.5 words equivalent, or count spaces
  // Simple approach: split by whitespace
  return cleaned.split(/\s+/).length;
}

function countKeywordOccurrences(text: string, keyword: string): number {
  if (!keyword) return 0;
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = lower.indexOf(kw, pos)) !== -1) {
    count++;
    pos += kw.length;
  }
  return count;
}

export function analyzeSEO(input: SEOInput, rules: SEORule[]): SEOResult {
  const checks: SEOCheck[] = [];
  const plainContent = stripHTML(input.content);
  const wordCount = countWords(plainContent);
  const seoTitle = input.seoTitle || input.title;
  const kw = input.focusKeyword?.toLowerCase() || '';

  for (const rule of rules) {
    if (!rule.enabled) continue;

    let status: 'pass' | 'fail' | 'warning' = 'fail';
    let message = '';
    const config = rule.config || {};

    switch (rule.id) {
      case 'keyword_in_title': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        if (seoTitle.toLowerCase().includes(kw)) {
          status = 'pass';
          message = 'SEO 제목에 포커스 키워드를 사용하고 있습니다.';
        } else {
          message = 'SEO 제목에 포커스 키워드가 없습니다.';
        }
        break;
      }
      case 'keyword_in_description': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        if (input.description.toLowerCase().includes(kw)) {
          status = 'pass';
          message = '메타 설명에 포커스 키워드가 포함되어 있습니다.';
        } else {
          message = '메타 설명에 포커스 키워드가 없습니다.';
        }
        break;
      }
      case 'keyword_in_url': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        if (input.slug.toLowerCase().includes(kw)) {
          status = 'pass';
          message = 'URL에 포커스 키워드가 포함되어 있습니다.';
        } else {
          message = 'URL에 포커스 키워드가 없습니다.';
        }
        break;
      }
      case 'keyword_in_first_10': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        const pct = config.percentage || 10;
        const first = plainContent.substring(0, Math.ceil(plainContent.length * pct / 100));
        if (first.toLowerCase().includes(kw)) {
          status = 'pass';
          message = `포커스 키워드가 본문 처음 ${pct}%에 포함되어 있습니다.`;
        } else {
          message = `포커스 키워드가 본문 처음 ${pct}%에 없습니다.`;
        }
        break;
      }
      case 'keyword_in_content': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        if (plainContent.toLowerCase().includes(kw)) {
          status = 'pass';
          message = '본문에 포커스 키워드가 포함되어 있습니다.';
        } else {
          message = '본문에 포커스 키워드가 없습니다.';
        }
        break;
      }
      case 'content_length': {
        const minWords = config.minWords || 600;
        if (wordCount >= minWords) {
          status = 'pass';
          message = `본문 길이가 ${wordCount}단어입니다.`;
        } else if (wordCount >= minWords * 0.7) {
          status = 'warning';
          message = `본문 길이가 ${wordCount}단어입니다. ${minWords}단어 이상을 권장합니다.`;
        } else {
          message = `본문 길이가 ${wordCount}단어입니다. 짧습니다! ${minWords}단어 이상을 권장합니다.`;
        }
        break;
      }
      case 'keyword_in_subheadings': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        const headings = input.content.match(/<h[2-4][^>]*>.*?<\/h[2-4]>/gi) || [];
        const hasKeyword = headings.some(h => stripHTML(h).toLowerCase().includes(kw));
        if (hasKeyword) {
          status = 'pass';
          message = '부제목에 포커스 키워드가 포함되어 있습니다.';
        } else {
          message = '부제목(h2/h3)에 포커스 키워드를 추가하세요.';
        }
        break;
      }
      case 'keyword_in_image_alt': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        const alts = input.content.match(/alt="([^"]*)"/gi) || [];
        const hasKeyword = alts.some(a => a.toLowerCase().includes(kw));
        if (alts.length === 0) {
          message = '본문에 이미지가 없습니다.';
        } else if (hasKeyword) {
          status = 'pass';
          message = '이미지 alt 속성에 포커스 키워드가 포함되어 있습니다.';
        } else {
          message = '이미지 alt 속성에 포커스 키워드를 추가하세요.';
        }
        break;
      }
      case 'keyword_density': {
        if (!kw || wordCount === 0) { message = '포커스 키워드를 입력하세요.'; break; }
        const occurrences = countKeywordOccurrences(plainContent, kw);
        const density = (occurrences / wordCount) * 100;
        const min = config.min || 0.5;
        const max = config.max || 2.5;
        if (density >= min && density <= max) {
          status = 'pass';
          message = `키워드 밀도 ${density.toFixed(1)}% (${occurrences}회 사용)`;
        } else if (density < min) {
          message = `키워드 밀도 ${density.toFixed(1)}%로 낮습니다. ${min}%-${max}%를 권장합니다.`;
        } else {
          status = 'warning';
          message = `키워드 밀도 ${density.toFixed(1)}%로 높습니다. 과도한 사용을 피하세요.`;
        }
        break;
      }
      case 'keyword_at_beginning': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        const titleLower = seoTitle.toLowerCase();
        const idx = titleLower.indexOf(kw);
        if (idx >= 0 && idx <= seoTitle.length * 0.3) {
          status = 'pass';
          message = '포커스 키워드가 제목 앞쪽에 위치합니다.';
        } else if (idx >= 0) {
          status = 'warning';
          message = '포커스 키워드가 제목에 있지만 뒤쪽에 위치합니다.';
        } else {
          message = '제목에 포커스 키워드가 없습니다.';
        }
        break;
      }
      case 'number_in_title': {
        if (/\d/.test(seoTitle)) {
          status = 'pass';
          message = '제목에 숫자가 포함되어 있습니다.';
        } else {
          status = 'warning';
          message = '제목에 숫자를 추가하면 클릭률이 높아질 수 있습니다.';
        }
        break;
      }
      case 'title_length': {
        const min = config.min || 30;
        const max = config.max || 60;
        const len = seoTitle.length;
        if (len >= min && len <= max) {
          status = 'pass';
          message = `SEO 제목 길이: ${len}자 (적절)`;
        } else if (len < min) {
          message = `SEO 제목이 ${len}자로 짧습니다. ${min}-${max}자를 권장합니다.`;
        } else {
          status = 'warning';
          message = `SEO 제목이 ${len}자로 깁니다. ${min}-${max}자를 권장합니다.`;
        }
        break;
      }
      case 'content_has_headings': {
        const headings = input.content.match(/<h[2-4][^>]*>/gi) || [];
        if (headings.length >= 2) {
          status = 'pass';
          message = `본문에 ${headings.length}개의 제목 태그를 사용하고 있습니다.`;
        } else if (headings.length === 1) {
          status = 'warning';
          message = '제목 태그를 더 추가하여 콘텐츠를 구조화하세요.';
        } else {
          message = '본문에 제목 태그(h2/h3)를 사용하세요.';
        }
        break;
      }
      case 'short_paragraphs': {
        const maxWords = config.maxWords || 150;
        const paragraphs = input.content.split(/<\/p>/i).filter(p => stripHTML(p).trim());
        const longParagraphs = paragraphs.filter(p => countWords(stripHTML(p)) > maxWords);
        if (longParagraphs.length === 0) {
          status = 'pass';
          message = '짧은 문단을 사용하고 있습니다.';
        } else {
          status = 'warning';
          message = `${longParagraphs.length}개의 긴 문단이 있습니다. ${maxWords}단어 이하로 나누세요.`;
        }
        break;
      }
      case 'content_has_media': {
        const images = input.content.match(/<img[^>]*>/gi) || [];
        const videos = input.content.match(/<(video|iframe)[^>]*>/gi) || [];
        if (images.length + videos.length > 0) {
          status = 'pass';
          message = `콘텐츠에 ${images.length}개의 이미지가 포함되어 있습니다.`;
        } else {
          message = '본문에 이미지나 미디어를 추가하세요.';
        }
        break;
      }
      case 'description_length': {
        const min = config.min || 70;
        const max = config.max || 160;
        const len = input.description.length;
        if (len >= min && len <= max) {
          status = 'pass';
          message = `메타 설명 길이: ${len}자 (적절)`;
        } else if (len < min) {
          message = `메타 설명이 ${len}자로 짧습니다. ${min}-${max}자를 권장합니다.`;
        } else {
          status = 'warning';
          message = `메타 설명이 ${len}자로 깁니다. ${min}-${max}자를 권장합니다.`;
        }
        break;
      }
      case 'url_length': {
        const max = config.max || 75;
        if (input.slug.length <= max) {
          status = 'pass';
          message = `URL 길이: ${input.slug.length}자`;
        } else {
          message = `URL이 ${input.slug.length}자로 깁니다. ${max}자 이하를 권장합니다.`;
        }
        break;
      }
      case 'external_links': {
        const extLinks = input.content.match(/href="https?:\/\/(?!simplecube)[^"]*"/gi) || [];
        if (extLinks.length > 0) {
          status = 'pass';
          message = `${extLinks.length}개의 외부 링크가 포함되어 있습니다.`;
        } else {
          status = 'warning';
          message = '외부 링크를 추가하면 SEO에 도움이 됩니다.';
        }
        break;
      }
      case 'internal_links': {
        const minLinks = config.minLinks || 3;
        const intLinks = input.content.match(/href="\//gi) || [];
        if (intLinks.length >= minLinks) {
          status = 'pass';
          message = `${intLinks.length}개의 내부 링크가 포함되어 있습니다.`;
        } else if (intLinks.length > 0) {
          status = 'warning';
          message = `내부 링크가 ${intLinks.length}개입니다. ${minLinks}개 이상을 권장합니다.`;
        } else {
          message = '사이트 내 다른 페이지로의 링크를 추가하세요.';
        }
        break;
      }
      case 'image_alt_coverage': {
        const allImgs = input.content.match(/<img[^>]*>/gi) || [];
        const emptyAlts = allImgs.filter(img => {
          const altMatch = img.match(/alt="([^"]*)"/i);
          return !altMatch || altMatch[1].trim() === '';
        });
        if (allImgs.length === 0) {
          status = 'warning';
          message = '본문에 이미지가 없습니다.';
        } else if (emptyAlts.length === 0) {
          status = 'pass';
          message = `모든 이미지(${allImgs.length}개)에 alt 텍스트가 있습니다.`;
        } else {
          message = `${allImgs.length}개 이미지 중 ${emptyAlts.length}개에 alt 텍스트가 없습니다.`;
        }
        break;
      }
      case 'keyword_uniqueness': {
        if (!kw) { message = '포커스 키워드를 입력하세요.'; break; }
        const others = input.allPostKeywords || [];
        if (!others.includes(kw)) {
          status = 'pass';
          message = '이 포커스 키워드는 다른 글에서 사용되지 않았습니다.';
        } else {
          message = '이 포커스 키워드가 다른 글에서도 사용되고 있습니다.';
        }
        break;
      }
      // === GEO (Generative Engine Optimization) ===
      case 'geo_question_answer': {
        // Check for question marks followed by answer content
        const questions = plainContent.match(/[^.!?]*\?/g) || [];
        const htmlQuestions = input.content.match(/<(h[2-4]|strong|b)[^>]*>[^<]*\?[^<]*<\//gi) || [];
        const totalQ = questions.length + htmlQuestions.length;
        if (totalQ >= 2) {
          status = 'pass';
          message = `${totalQ}개의 질문-답변 형식이 포함되어 있습니다. AI 검색에 유리합니다.`;
        } else if (totalQ === 1) {
          status = 'warning';
          message = '질문-답변 형식이 1개 있습니다. 더 추가하면 AI 검색 노출에 도움됩니다.';
        } else {
          message = '질문-답변 형식을 추가하세요. (예: "포토부스 가격은?" → 답변) AI가 인용하기 좋은 구조입니다.';
        }
        break;
      }
      case 'geo_statistics': {
        const minCount = config.minCount || 2;
        // Match numbers with units, percentages, years
        const stats = plainContent.match(/\d[\d,.]*\s*(%|개|건|명|원|만|억|년|월|일|회|배|kg|cm|m|px|inch|시간|분|초)/g) || [];
        if (stats.length >= minCount) {
          status = 'pass';
          message = `${stats.length}개의 수치/통계 데이터가 포함되어 있습니다. AI가 신뢰할 수 있는 근거입니다.`;
        } else if (stats.length > 0) {
          status = 'warning';
          message = `수치 데이터가 ${stats.length}개입니다. ${minCount}개 이상 사용하면 AI 인용 확률이 높아집니다.`;
        } else {
          message = '구체적인 수치나 통계를 추가하세요. (예: "연간 1,600건 이상") AI가 정확한 답변을 위해 선호합니다.';
        }
        break;
      }
      case 'geo_list_structure': {
        const ulOl = input.content.match(/<(ul|ol)[^>]*>/gi) || [];
        const listItems = input.content.match(/<li[^>]*>/gi) || [];
        if (ulOl.length >= 1 && listItems.length >= 3) {
          status = 'pass';
          message = `${ulOl.length}개의 목록에 ${listItems.length}개의 항목이 있습니다. AI 요약에 적합한 구조입니다.`;
        } else if (listItems.length > 0) {
          status = 'warning';
          message = '목록 항목이 부족합니다. 3개 이상의 항목을 가진 목록을 사용하세요.';
        } else {
          message = '글머리 기호(•) 또는 번호 목록을 추가하세요. AI가 핵심 정보를 추출하기 좋습니다.';
        }
        break;
      }
      case 'geo_definition': {
        // Check for definition patterns: "~은/는 ~입니다/이다", "~이란 ~", "~(이)라 함은"
        const defPatterns = plainContent.match(/(은|는|이란|란)\s+.{5,}(입니다|이다|합니다|됩니다|것이다|의미합니다)/g) || [];
        const whatIs = plainContent.match(/(무엇|뜻|의미|정의|개념)/g) || [];
        if (defPatterns.length >= 1 || whatIs.length >= 1) {
          status = 'pass';
          message = '명확한 정의/설명문이 포함되어 있습니다. AI가 "~란?" 질문에 인용하기 좋습니다.';
        } else {
          status = 'warning';
          message = '핵심 용어에 대한 정의문을 추가하세요. (예: "포토부스란 ~입니다") AI 검색 답변에 직접 인용됩니다.';
        }
        break;
      }
      case 'geo_source_citation': {
        // Check for citation patterns
        const citations = input.content.match(/(출처|참고|인용|자료|근거|연구|조사|보고서|통계청|한국\w+협회|according to)/gi) || [];
        const extLinks = input.content.match(/href="https?:\/\/[^"]*"/gi) || [];
        if (citations.length >= 1 || extLinks.length >= 2) {
          status = 'pass';
          message = '출처/인용이 포함되어 있습니다. AI가 신뢰도 높은 콘텐츠로 판단합니다.';
        } else if (extLinks.length >= 1) {
          status = 'warning';
          message = '외부 링크가 있지만, 출처를 명시적으로 표기하면 AI 신뢰도가 높아집니다.';
        } else {
          message = '출처나 참고 자료를 추가하세요. AI는 검증 가능한 정보를 우선 인용합니다.';
        }
        break;
      }
      case 'geo_structured_headings': {
        const h2s = input.content.match(/<h2[^>]*>/gi) || [];
        const h3s = input.content.match(/<h3[^>]*>/gi) || [];
        if (h2s.length >= 2 && h3s.length >= 1) {
          status = 'pass';
          message = `H2 ${h2s.length}개, H3 ${h3s.length}개의 계층 구조입니다. AI가 콘텐츠를 잘 이해할 수 있습니다.`;
        } else if (h2s.length >= 2) {
          status = 'warning';
          message = 'H2는 충분하지만 H3 소제목을 추가하면 AI가 세부 주제를 더 잘 파악합니다.';
        } else {
          message = 'H2→H3 계층적 제목 구조를 사용하세요. AI가 콘텐츠 구조를 파악하는 데 핵심입니다.';
        }
        break;
      }
      case 'geo_concise_summary': {
        // Check if first 2 sentences contain the keyword and are concise
        const sentences = plainContent.split(/[.!?]\s+/).filter(s => s.trim().length > 5);
        const firstTwo = sentences.slice(0, 2).join(' ');
        const hasKeywordInSummary = kw && firstTwo.toLowerCase().includes(kw);
        const isReasonableLength = firstTwo.length >= 30 && firstTwo.length <= 300;
        if (hasKeywordInSummary && isReasonableLength) {
          status = 'pass';
          message = '글 서두에 키워드가 포함된 핵심 요약이 있습니다. AI 답변으로 직접 인용될 수 있습니다.';
        } else if (isReasonableLength) {
          status = 'warning';
          message = '서두 요약은 있지만 포커스 키워드를 포함하면 AI 인용 확률이 높아집니다.';
        } else {
          message = '글 처음 1-2문장에 핵심 내용을 요약하세요. AI가 가장 먼저 참고하는 부분입니다.';
        }
        break;
      }
      case 'geo_table_usage': {
        const tables = input.content.match(/<table[^>]*>/gi) || [];
        if (tables.length >= 1) {
          status = 'pass';
          message = `${tables.length}개의 표가 포함되어 있습니다. 비교/정리 정보를 AI가 잘 추출합니다.`;
        } else {
          status = 'warning';
          message = '비교 데이터가 있다면 표(테이블)로 정리하세요. AI가 구조화된 데이터를 선호합니다.';
        }
        break;
      }
      default:
        message = `알 수 없는 규칙: ${rule.id}`;
    }

    checks.push({
      id: rule.id,
      category: rule.category as SEOCheck['category'],
      label: rule.label,
      status,
      message,
      score: status === 'pass' ? rule.max_score : status === 'warning' ? Math.floor(rule.max_score * 0.5) : 0,
      maxScore: rule.max_score,
    });
  }

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const normalizedScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    score: normalizedScore,
    maxScore: 100,
    checks,
    grade: normalizedScore >= 70 ? 'good' : normalizedScore >= 40 ? 'ok' : 'poor',
  };
}
