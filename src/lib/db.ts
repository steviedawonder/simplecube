import { createClient, type Client } from '@libsql/client';

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    const url = (import.meta.env.TURSO_DATABASE_URL || 'file:local.db').trim();
    _client = createClient({
      url,
      authToken: import.meta.env.TURSO_AUTH_TOKEN?.trim() || undefined,
    });
  }
  return _client;
}

// Lazy proxy — DB 클라이언트는 실제 메서드 호출 시에만 생성됨
// 빌드 타임에 정적 페이지가 이 모듈을 import해도 에러 없음
const db: Client = new Proxy({} as Client, {
  get(_target, prop: string) {
    const client = getClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default db;

export async function initDB() {
  const client = getClient();
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      category_id INTEGER REFERENCES categories(id),
      image TEXT DEFAULT '',
      focus_keyword TEXT DEFAULT '',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      seo_score INTEGER DEFAULT 0,
      external_url TEXT DEFAULT '',
      draft INTEGER NOT NULL DEFAULT 1,
      scheduled_at TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT NOT NULL,
      url TEXT NOT NULL,
      filename TEXT NOT NULL,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_rules (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT DEFAULT '',
      max_score INTEGER NOT NULL,
      enabled INTEGER DEFAULT 1,
      config TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      page TEXT DEFAULT 'popup',
      image_url TEXT NOT NULL,
      public_id TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      focus_keyword TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export async function seedSEORules() {
  const client = getClient();
  const existing = await client.execute('SELECT COUNT(*) as count FROM seo_rules');
  const existingCount = (existing.rows[0] as any).count;

  // If rules exist, check if GEO rules are missing and add them
  if (existingCount > 0) {
    const geoCheck = await client.execute("SELECT COUNT(*) as count FROM seo_rules WHERE category = 'geo'");
    if ((geoCheck.rows[0] as any).count === 0) {
      const geoRules = [
        { id: 'geo_question_answer', category: 'geo', label: '질문-답변 형식 포함', max_score: 5, config: '{}' },
        { id: 'geo_statistics', category: 'geo', label: '통계/수치 데이터 포함', max_score: 4, config: '{"minCount": 2}' },
        { id: 'geo_list_structure', category: 'geo', label: '목록(리스트) 구조 사용', max_score: 4, config: '{}' },
        { id: 'geo_definition', category: 'geo', label: '명확한 정의/설명문 포함', max_score: 4, config: '{}' },
        { id: 'geo_source_citation', category: 'geo', label: '출처/인용 표기', max_score: 3, config: '{}' },
        { id: 'geo_structured_headings', category: 'geo', label: '계층적 제목 구조 (H2→H3)', max_score: 4, config: '{}' },
        { id: 'geo_concise_summary', category: 'geo', label: '핵심 요약문 포함 (처음 2문장)', max_score: 4, config: '{}' },
        { id: 'geo_table_usage', category: 'geo', label: '표(테이블) 사용', max_score: 3, config: '{}' },
      ];
      for (const rule of geoRules) {
        await client.execute({
          sql: 'INSERT OR IGNORE INTO seo_rules (id, category, label, max_score, config) VALUES (?, ?, ?, ?, ?)',
          args: [rule.id, rule.category, rule.label, rule.max_score, rule.config],
        });
      }
    }
    return;
  }

  const rules = [
    { id: 'keyword_in_title', category: 'basic', label: 'SEO 제목에 포커스 키워드 포함', max_score: 8, config: '{}' },
    { id: 'keyword_in_description', category: 'basic', label: '메타 설명에 포커스 키워드 포함', max_score: 8, config: '{}' },
    { id: 'keyword_in_url', category: 'basic', label: 'URL에 포커스 키워드 포함', max_score: 5, config: '{}' },
    { id: 'keyword_in_first_10', category: 'basic', label: '본문 처음 10%에 포커스 키워드 포함', max_score: 5, config: '{"percentage": 10}' },
    { id: 'keyword_in_content', category: 'basic', label: '본문에 포커스 키워드 포함', max_score: 5, config: '{}' },
    { id: 'content_length', category: 'basic', label: '본문 길이 충분', max_score: 8, config: '{"minWords": 600}' },
    { id: 'keyword_in_subheadings', category: 'basic', label: '부제목(h2/h3)에 포커스 키워드 포함', max_score: 5, config: '{}' },
    { id: 'keyword_in_image_alt', category: 'basic', label: '이미지 alt에 포커스 키워드 포함', max_score: 3, config: '{}' },
    { id: 'keyword_density', category: 'basic', label: '적절한 키워드 밀도', max_score: 3, config: '{"min": 0.5, "max": 2.5}' },
    { id: 'keyword_at_beginning', category: 'title', label: '제목 앞쪽에 포커스 키워드 위치', max_score: 8, config: '{}' },
    { id: 'number_in_title', category: 'title', label: '제목에 숫자 포함', max_score: 4, config: '{}' },
    { id: 'title_length', category: 'title', label: 'SEO 제목 길이 적절', max_score: 3, config: '{"min": 30, "max": 60}' },
    { id: 'content_has_headings', category: 'content', label: '본문에 제목 태그(h2/h3) 사용', max_score: 5, config: '{}' },
    { id: 'short_paragraphs', category: 'content', label: '짧은 문단 사용', max_score: 5, config: '{"maxWords": 150}' },
    { id: 'content_has_media', category: 'content', label: '이미지/미디어 포함', max_score: 5, config: '{}' },
    { id: 'description_length', category: 'content', label: '메타 설명 길이 적절', max_score: 5, config: '{"min": 70, "max": 160}' },
    { id: 'url_length', category: 'links', label: 'URL 길이 적절', max_score: 3, config: '{"max": 75}' },
    { id: 'external_links', category: 'links', label: '외부 링크 포함', max_score: 4, config: '{}' },
    { id: 'internal_links', category: 'links', label: '내부 링크 포함', max_score: 4, config: '{}' },
    { id: 'keyword_uniqueness', category: 'links', label: '포커스 키워드 중복 없음', max_score: 4, config: '{}' },
    // GEO (Generative Engine Optimization)
    { id: 'geo_question_answer', category: 'geo', label: '질문-답변 형식 포함', max_score: 5, config: '{}' },
    { id: 'geo_statistics', category: 'geo', label: '통계/수치 데이터 포함', max_score: 4, config: '{"minCount": 2}' },
    { id: 'geo_list_structure', category: 'geo', label: '목록(리스트) 구조 사용', max_score: 4, config: '{}' },
    { id: 'geo_definition', category: 'geo', label: '명확한 정의/설명문 포함', max_score: 4, config: '{}' },
    { id: 'geo_source_citation', category: 'geo', label: '출처/인용 표기', max_score: 3, config: '{}' },
    { id: 'geo_structured_headings', category: 'geo', label: '계층적 제목 구조 (H2→H3)', max_score: 4, config: '{}' },
    { id: 'geo_concise_summary', category: 'geo', label: '핵심 요약문 포함 (처음 2문장)', max_score: 4, config: '{}' },
    { id: 'geo_table_usage', category: 'geo', label: '표(테이블) 사용', max_score: 3, config: '{}' },
  ];

  for (const rule of rules) {
    await client.execute({
      sql: 'INSERT INTO seo_rules (id, category, label, max_score, config) VALUES (?, ?, ?, ?, ?)',
      args: [rule.id, rule.category, rule.label, rule.max_score, rule.config],
    });
  }
}
