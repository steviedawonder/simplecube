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
  category: 'basic' | 'title' | 'content' | 'links';
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
        const intLinks = input.content.match(/href="\//gi) || [];
        if (intLinks.length > 0) {
          status = 'pass';
          message = `${intLinks.length}개의 내부 링크가 포함되어 있습니다.`;
        } else {
          status = 'warning';
          message = '사이트 내 다른 페이지로의 링크를 추가하세요.';
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
