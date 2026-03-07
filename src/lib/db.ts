import { createClient } from '@libsql/client';

const client = createClient({
  url: import.meta.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: import.meta.env.TURSO_AUTH_TOKEN || undefined,
});

export default client;

export async function initDB() {
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
  const existing = await client.execute('SELECT COUNT(*) as count FROM seo_rules');
  if ((existing.rows[0] as any).count > 0) return;

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
  ];

  for (const rule of rules) {
    await client.execute({
      sql: 'INSERT INTO seo_rules (id, category, label, max_score, config) VALUES (?, ?, ?, ?, ?)',
      args: [rule.id, rule.category, rule.label, rule.max_score, rule.config],
    });
  }
}
