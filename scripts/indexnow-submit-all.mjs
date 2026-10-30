#!/usr/bin/env node
/**
 * 사이트맵의 모든 페이지 URL 을 IndexNow(네이버·Bing)에 한 번에 제출하는 1회용 스크립트.
 * 처음 IndexNow 를 켠 직후, 또는 대규모 수정·도메인 정리 뒤에만 실행한다(매일 돌리지 말 것 — 429 위험).
 *
 * 사용법 (프로젝트 루트에서, 배포가 끝나 키 파일이 사이트에 올라간 뒤):
 *   node scripts/indexnow-submit-all.mjs --dry-run   # 제출할 URL 만 출력
 *   node scripts/indexnow-submit-all.mjs             # 실제 제출
 * 키는 src/lib/indexnow.ts 의 INDEXNOW_KEY 와 같은 값(public/<키>.txt). INDEXNOW_KEY 환경변수로 바꿀 수 있다.
 * 옵션: --site <주소>  사이트맵·키 파일을 읽어 올 주소 (기본 https://simplecube.net, 로컬 확인용)
 *       INDEXNOW_ENDPOINTS=<쉼표 구분>  엔드포인트 바꾸기 (기본: 네이버 + Bing)
 */
const SITE = 'https://simplecube.net';
const HOST = 'simplecube.net';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const siteIdx = args.indexOf('--site');
const fetchBase = (siteIdx >= 0 ? args[siteIdx + 1] : SITE).replace(/\/$/, '');
const key = (process.env.INDEXNOW_KEY || 'acde365603e594bff6d045541413a119').trim();
const endpoints = (process.env.INDEXNOW_ENDPOINTS || 'https://searchadvisor.naver.com/indexnow,https://www.bing.com/indexnow')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!/^[a-fA-F0-9-]{8,128}$/.test(key)) fail('INDEXNOW_KEY 가 없거나 형식 오류 (16진수 a-f·0-9 와 -, 8~128자)');

// 1) 키 파일이 실제로 배포돼 있는지 먼저 확인 (없으면 403 이 나므로 제출하지 않는다)
const keyUrl = `${fetchBase}/${key}.txt`;
const keyRes = await fetch(keyUrl, { redirect: 'manual' });
const keyBody = keyRes.ok ? (await keyRes.text()).trim() : '';
if (keyRes.status !== 200 || keyBody !== key) {
  const msg = `키 파일 확인 실패: ${keyUrl} → HTTP ${keyRes.status} (public/${key}.txt 배포 여부 확인)`;
  if (!dryRun) fail(msg);
  console.warn(`⚠ ${msg} — dry-run 이라 계속`);
} else {
  console.log(`✔ 키 파일 확인: ${keyUrl}`);
}

// 2) 사이트맵 인덱스 → 하위 사이트맵(이미지 사이트맵 제외) → <loc> 수집
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
const toFetchUrl = (u) => u.replace(SITE, fetchBase);
const indexXml = await (await fetch(`${fetchBase}/sitemap.xml`)).text();
const children = locs(indexXml).filter((u) => !u.includes('image-sitemap'));
const urls = new Set();
for (const child of children) {
  const xml = await (await fetch(toFetchUrl(child))).text();
  for (const u of locs(xml)) if (u.startsWith(`${SITE}/`)) urls.add(u);
}
const urlList = [...urls];
console.log(`사이트맵 ${children.length}개에서 URL ${urlList.length}개 수집`);
if (urlList.length === 0) fail('제출할 URL 이 없습니다');
if (dryRun) {
  urlList.forEach((u) => console.log('  ', decodeURI(u)));
  console.log('(--dry-run: 제출하지 않음)');
  process.exit(0);
}

// 3) 엔드포인트마다 POST (한 번에 최대 10,000개 — 지금 규모면 1회)
const body = JSON.stringify({ host: HOST, key, keyLocation: `${SITE}/${key}.txt`, urlList });
for (const endpoint of endpoints) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const ok = res.status === 200 || res.status === 202;
    console.log(`${ok ? '✔' : '✖'} ${endpoint} → HTTP ${res.status}${ok ? '' : ` ${(await res.text()).slice(0, 200)}`}`);
  } catch (e) {
    console.log(`✖ ${endpoint} → ${e instanceof Error ? e.message : e}`);
  }
}
console.log('200/202 = 접수. 403 = 키 파일 문제, 422 = URL·키 불일치, 429 = 너무 잦은 제출');
