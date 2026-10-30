/**
 * IndexNow — 글 발행·수정·삭제를 네이버(서치어드바이저)와 Bing 에 바로 알린다.
 *
 * - 네이버 공식 가이드: https://searchadvisor.naver.com/guide/indexnow-request
 * - 키 규칙(네이버): 16진수 문자(a-f, A-F, 0-9)와 '-' 만, 8~128자, UTF-8.
 *   키 파일 = public/<키>.txt (내용은 키 한 줄). 사이트 루트에 있어야 사이트 전체 URL 에 유효.
 *   키는 비밀값이 아니다(검색엔진이 키 파일을 읽어 소유를 확인) — 그래서 코드에 둔다.
 * - Bing 으로 보낸 URL 은 IndexNow 참여 엔진(Yandex·Seznam·Yep 등)에 공유된다. Google 은 미참여.
 * - 운영(Vercel Production)에서만 전송한다. 로컬·Preview 에서는 건너뜀(테스트할 때만 INDEXNOW_FORCE=1).
 * - 실패해도 저장·발행은 절대 막지 않는다: 예외를 던지지 않고 로그만 남기며, 요청마다 5초 타임아웃.
 */
import { waitUntil } from '@vercel/functions';
import type { Client } from '@libsql/client';

export const SITE = 'https://simplecube.net';
const HOST = 'simplecube.net';
const TIMEOUT_MS = 5000;

// public/acde365603e594bff6d045541413a119.txt 와 같은 값. 바꿀 때는 새 키 파일을 같이 배포할 것.
export const INDEXNOW_KEY = 'acde365603e594bff6d045541413a119';

const DEFAULT_ENDPOINTS = [
  'https://searchadvisor.naver.com/indexnow', // 네이버 서치어드바이저 (공식 엔드포인트)
  'https://www.bing.com/indexnow', // Bing → 다른 IndexNow 참여 엔진에도 공유
];

// 테스트용 스위치(INDEXNOW_FORCE·INDEXNOW_ENDPOINTS)와 VERCEL_ENV 는 런타임 process.env 로만 읽는다
// — import.meta.env 로 읽으면 로컬 .env 값이 빌드 결과물에 박혀 버린다.
function config() {
  const key = (process.env.INDEXNOW_KEY || INDEXNOW_KEY).trim();
  const force = process.env.INDEXNOW_FORCE === '1';
  const isProd = process.env.VERCEL_ENV === 'production';
  const endpointsRaw = (process.env.INDEXNOW_ENDPOINTS || '').trim();
  const endpoints = endpointsRaw ? endpointsRaw.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_ENDPOINTS;
  const validKey = /^[a-fA-F0-9-]{8,128}$/.test(key);
  if (key && !validKey) console.warn('[IndexNow] INDEXNOW_KEY 형식 오류 — 16진수(a-f, 0-9)와 - 만, 8~128자');
  return { key, endpoints, enabled: validKey && (isProd || force) };
}

/** 블로그 글 URL 경로 — sitemap-blog.xml·canonical 과 같은 형식 (/blog/<인코딩된 슬러그>/) */
export function blogPath(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}/`;
}

/** 공개 상태 판정 — /blog/[slug]·sitemap-blog.xml·rss.xml 과 같은 기준 */
export function isLivePost(p: { draft?: unknown; deleted_at?: unknown; scheduled_at?: unknown; external_url?: unknown }): boolean {
  if (Number(p.draft) !== 0) return false;
  if (p.deleted_at) return false;
  if (p.external_url) return false; // 외부(네이버 블로그) 연동 글은 /blog/{slug} 가 외부로 302 → 제출 대상 아님
  if (p.scheduled_at && new Date(String(p.scheduled_at)) > new Date()) return false;
  return true;
}

export type IndexNowResult = { endpoint: string; status: number | 'error'; detail?: string };

/** 실제 전송. 비활성·빈 목록이면 아무것도 하지 않는다. 절대 throw 하지 않는다. */
export async function submitToIndexNow(paths: string[]): Promise<IndexNowResult[]> {
  const { key, endpoints, enabled } = config();
  if (!enabled) return [];

  const urlList = [...new Set(paths.map((p) => (p.startsWith('http') ? p : `${SITE}${p}`)))].filter((u) =>
    u.startsWith(`${SITE}/`)
  );
  if (urlList.length === 0) return [];

  const body = JSON.stringify({ host: HOST, key, keyLocation: `${SITE}/${key}.txt`, urlList });

  const results = await Promise.all(
    endpoints.map(async (endpoint): Promise<IndexNowResult> => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return { endpoint, status: res.status };
      } catch (e) {
        return { endpoint, status: 'error', detail: e instanceof Error ? e.message : String(e) };
      }
    })
  );

  // 200 = 접수, 202 = 접수(키 확인 중). 403 = 키 파일 문제, 422 = URL·키 불일치, 429 = 너무 잦은 전송
  const failed = results.filter((r) => r.status !== 200 && r.status !== 202);
  if (failed.length > 0) console.warn('[IndexNow] 전송 실패', JSON.stringify(failed), urlList);
  else console.log(`[IndexNow] ${urlList.length}건 전송`, urlList);
  return results;
}

/** 저장 API 용: 응답을 기다리게 하지 않고 백그라운드로 전송(Vercel waitUntil). 절대 throw 하지 않는다. */
export function notifyIndexNow(paths: string[]): void {
  try {
    const task = submitToIndexNow(paths).catch((e) => console.warn('[IndexNow] 예외', e));
    waitUntil(task); // 로컬 dev 에서는 no-op — 프로세스가 살아 있으니 그대로 완료된다
  } catch (e) {
    console.warn('[IndexNow] 예약 실패', e);
  }
}

// ── 관리자 화면에서 고치는 SSR 페이지(FAQ·패키지·페이지 문구) → 공개 URL ─────────────────
// FAQ 'popup' 은 popup·corporate·graduation·rental 에, 'rental' 은 rental·pricing 에 함께 노출된다.
const FAQ_PAGE_PATHS: Record<string, string[]> = {
  wedding: ['/wedding/'],
  popup: ['/popup/', '/corporate/', '/graduation/', '/rental/'],
  rental: ['/rental/', '/pricing/'],
  corporate: ['/corporate/'],
  pricing: ['/pricing/'],
  graduation: ['/graduation/'],
  seoul: ['/seoul/'],
  busan: ['/busan/'],
  daegu: ['/daegu/'],
  daejeon: ['/daejeon/'],
  gwangju: ['/gwangju/'],
  ulsan: ['/ulsan/'],
  jeonju: ['/jeonju/'],
  cheonan: ['/cheonan/'],
  cheongju: ['/cheongju/'],
  chungju: ['/chungju/'],
};
const CONTENT_PAGE_PATHS: Record<string, string[]> = {
  popup: ['/popup/'], // page_contents(custom) → CustomOptions
  wedding: ['/wedding/'], // page_contents(specs)·package_items → PackageDetails
};

/** 최근 25시간 안에 관리자 수정이 있었던 SSR 페이지 경로 (하루 1회 크론에서 묶어서 전송) */
export async function recentlyEditedPagePaths(db: Client): Promise<string[]> {
  const rs = await db.execute(`
    SELECT 'faq' AS src, page FROM faqs WHERE updated_at >= datetime('now', '-25 hours')
    UNION SELECT 'content', page FROM page_contents WHERE updated_at >= datetime('now', '-25 hours')
    UNION SELECT 'content', page FROM package_items WHERE updated_at >= datetime('now', '-25 hours')`);
  const paths = new Set<string>();
  for (const row of rs.rows as unknown as { src: string; page: string }[]) {
    const map = row.src === 'faq' ? FAQ_PAGE_PATHS : CONTENT_PAGE_PATHS;
    for (const p of map[String(row.page)] ?? []) paths.add(p);
  }
  return [...paths];
}
