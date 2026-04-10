import { createClient, type Client } from '@libsql/client';
import bcrypt from 'bcryptjs';

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

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor' CHECK(role IN ('owner', 'editor')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL CHECK(page IN ('wedding', 'popup', 'rental', 'corporate', 'general', 'pricing')),
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS page_contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL,
      section TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text'
        CHECK(type IN ('text','image','price','number')),
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(page, section, key)
    );

    CREATE TABLE IF NOT EXISTS package_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL CHECK(page IN ('wedding','popup')),
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      price TEXT,
      sort_order INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photostrip_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backgrounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      public_id TEXT NOT NULL,
      title TEXT,
      category TEXT DEFAULT '기본',
      sort_order INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backdrops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      public_id TEXT NOT NULL,
      title TEXT,
      sort_order INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS model_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id TEXT NOT NULL CHECK(model_id IN ('popup','module','wood-edge','wood-round')),
      image_url TEXT NOT NULL,
      public_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS popups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      body TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      link_url TEXT DEFAULT '',
      link_text TEXT DEFAULT '',
      bg_color TEXT DEFAULT '#1d1d1f',
      text_color TEXT DEFAULT '#ffffff',
      active INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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

export async function migrateUsersEmailToUsername() {
  const client = getClient();
  try {
    // Check if old 'email' column exists
    const tableInfo = await client.execute("PRAGMA table_info(users)");
    const hasEmail = tableInfo.rows.some((r: any) => r.name === 'email');
    const hasUsername = tableInfo.rows.some((r: any) => r.name === 'username');

    if (hasEmail && !hasUsername) {
      await client.execute('ALTER TABLE users RENAME COLUMN email TO username');
      console.log('Migrated users.email → users.username');
    }
  } catch (e) {
    console.error('migrateUsersEmailToUsername error:', e);
  }
}

export async function seedOwnerAccount() {
  const client = getClient();

  // Migrate old email-based account to username 'admin'
  const oldAccount = await client.execute("SELECT COUNT(*) as count FROM users WHERE username = 'simple_cube@naver.com'");
  if ((oldAccount.rows[0] as any).count > 0) {
    await client.execute("UPDATE users SET username = 'admin' WHERE username = 'simple_cube@naver.com'");
    console.log('Migrated owner account: simple_cube@naver.com → admin');
    return;
  }

  const existing = await client.execute("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
  if ((existing.rows[0] as any).count > 0) return;

  const adminPassword = (import.meta.env.ADMIN_PASSWORD || 'admin1234').trim();
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await client.execute({
    sql: 'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
    args: ['원더', 'admin', passwordHash, 'owner'],
  });
}

export async function seedFaqs() {
  const client = getClient();
  const existing = await client.execute('SELECT COUNT(*) as count FROM faqs');
  if ((existing.rows[0] as any).count > 0) return;

  const faqs = [
    { page: 'popup', question: '심플큐브는 어떤 서비스를 제공하나요?', answer: '심플큐브는 팝업 포토부스와 웨딩 포토부스 서비스를 제공합니다. 브랜드 팝업 이벤트, 기업 행사, 결혼식 등 다양한 행사에 맞춤형 포토부스를 설치하고 운영합니다.', sort_order: 0 },
    { page: 'popup', question: '서비스 가능 지역은 어디인가요?', answer: '전국 어디서든 서비스가 가능합니다. 서울, 경기를 비롯하여 지방 행사도 출장 서비스를 제공하고 있습니다. 자세한 사항은 문의 부탁드립니다.', sort_order: 1 },
    { page: 'popup', question: '팝업 포토부스는 어떤 행사에 적합한가요?', answer: '브랜드 팝업스토어, 기업 행사, 제품 런칭 이벤트, 페스티벌, 전시회 등 다양한 행사에 적합합니다. 브랜드 아이덴티티에 맞춘 커스텀 디자인도 가능합니다.', sort_order: 2 },
    { page: 'popup', question: '팝업 포토부스 예약은 얼마나 전에 해야 하나요?', answer: '최소 2주 전 예약을 권장드리며, 성수기(봄/가을)에는 한 달 이상 전에 예약하시는 것을 추천합니다. 급한 행사의 경우 별도 문의 부탁드립니다.', sort_order: 3 },
    { page: 'popup', question: '비용은 어떻게 되나요?', answer: '행사 규모, 시간, 장소, 추가 옵션에 따라 견적이 달라집니다. 정확한 비용은 상담을 통해 안내드리고 있으니, 편하게 문의해 주세요.', sort_order: 4 },
    { page: 'popup', question: '취소 및 환불 규정은 어떻게 되나요?', answer: '행사일 기준 7일 전까지 전액 환불이 가능하며, 3~6일 전에는 50% 환불, 2일 이내 취소 시에는 환불이 어렵습니다. 자세한 내용은 계약 시 안내드립니다.', sort_order: 5 },
    { page: 'wedding', question: '웨딩 포토부스 패키지에는 무엇이 포함되나요?', answer: '기본 패키지에는 포토부스 장비, 맞춤 디자인 템플릿, 현장 출력, 디지털 파일 제공, 전문 운영 스태프가 포함됩니다. 상세 구성은 WEDDING 페이지에서 확인하실 수 있습니다.', sort_order: 0 },
    { page: 'wedding', question: '웨딩 포토 템플릿은 커스터마이징이 가능한가요?', answer: '네, 가능합니다. 신랑신부의 이름, 날짜, 웨딩 컨셉에 맞춘 맞춤 디자인을 제공합니다. 기본 제공 템플릿 외에 완전한 커스텀 디자인도 별도 요청 가능합니다.', sort_order: 1 },
    { page: 'wedding', question: '서비스 가능 지역은 어디인가요?', answer: '전국 어디서든 서비스가 가능합니다. 서울, 경기를 비롯하여 지방 행사도 출장 서비스를 제공하고 있습니다. 자세한 사항은 문의 부탁드립니다.', sort_order: 2 },
    { page: 'wedding', question: '비용은 어떻게 되나요?', answer: '행사 규모, 시간, 장소, 추가 옵션에 따라 견적이 달라집니다. 정확한 비용은 상담을 통해 안내드리고 있으니, 편하게 문의해 주세요.', sort_order: 3 },
    { page: 'wedding', question: '취소 및 환불 규정은 어떻게 되나요?', answer: '행사일 기준 7일 전까지 전액 환불이 가능하며, 3~6일 전에는 50% 환불, 2일 이내 취소 시에는 환불이 어렵습니다. 자세한 내용은 계약 시 안내드립니다.', sort_order: 4 },
  ];

  for (const faq of faqs) {
    await client.execute({
      sql: 'INSERT INTO faqs (page, question, answer, sort_order) VALUES (?, ?, ?, ?)',
      args: [faq.page, faq.question, faq.answer, faq.sort_order],
    });
  }
}

export async function migrateFaqsPageConstraint() {
  const client = getClient();
  try {
    // Test if new page values are accepted — if CHECK constraint blocks, migrate the table
    await client.execute({ sql: "INSERT INTO faqs (page, question, answer, sort_order, active) VALUES (?, ?, ?, ?, ?)", args: ['rental', '__migration_test__', '__test__', -1, 0] });
    // Clean up test row
    await client.execute("DELETE FROM faqs WHERE question = '__migration_test__'");
  } catch {
    // CHECK constraint blocks new values — recreate table with expanded constraint
    console.log('Migrating faqs table to support new page values...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS faqs_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page TEXT NOT NULL CHECK(page IN ('wedding', 'popup', 'rental', 'corporate', 'general', 'pricing')),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    await client.execute('INSERT INTO faqs_new (id, page, question, answer, sort_order, active, created_at, updated_at) SELECT id, page, question, answer, sort_order, active, created_at, updated_at FROM faqs');
    await client.execute('DROP TABLE faqs');
    await client.execute('ALTER TABLE faqs_new RENAME TO faqs');
    console.log('faqs table migrated successfully');
  }
}

export async function migratePortfolioColumns() {
  const client = getClient();
  // Check if page_tag column exists
  const cols = await client.execute("PRAGMA table_info(portfolio)");
  const colNames = (cols.rows as any[]).map(r => r.name);

  if (!colNames.includes('page_tag')) {
    await client.execute("ALTER TABLE portfolio ADD COLUMN page_tag TEXT DEFAULT 'popup'");
    // Sync existing data: copy page value to page_tag
    await client.execute("UPDATE portfolio SET page_tag = page WHERE page IN ('popup', 'wedding')");
  }

  if (!colNames.includes('cut_type')) {
    await client.execute("ALTER TABLE portfolio ADD COLUMN cut_type TEXT DEFAULT NULL");
  }

  if (!colNames.includes('original_filename')) {
    try { await client.execute("ALTER TABLE portfolio ADD COLUMN original_filename TEXT DEFAULT ''"); } catch {}
  }

  if (!colNames.includes('file_size')) {
    try { await client.execute("ALTER TABLE portfolio ADD COLUMN file_size INTEGER DEFAULT 0"); } catch {}
  }
}

export async function seedPhotostripCategories() {
  const client = getClient();
  const existing = await client.execute('SELECT COUNT(*) as count FROM photostrip_categories');
  if ((existing.rows[0] as any).count > 0) return;

  const cats = [
    { name: '2컷', sort_order: 1 },
    { name: '3컷', sort_order: 2 },
    { name: '4컷', sort_order: 3 },
  ];

  for (const cat of cats) {
    await client.execute({
      sql: 'INSERT INTO photostrip_categories (name, sort_order) VALUES (?, ?)',
      args: [cat.name, cat.sort_order],
    });
  }
}

export async function seedPackageItems() {
  const client = getClient();
  const existing = await client.execute('SELECT COUNT(*) as count FROM package_items');
  if ((existing.rows[0] as any).count > 0) return;

  const items = [
    { page: 'wedding', name: '하객 제공 사진', description: '동일 사진 2장 즉시 인화. 한 장은 하객에게 기념으로, 한 장은 방명록용으로 제공됩니다.', image_url: '/images/wedding/booth-print.jpg', price: '', sort_order: 0 },
    { page: 'wedding', name: '포토 방명록', description: '사진+축하 메시지를 담은 바인더. 바인더형 방명록에 사진과 축하 메시지를 담아 신랑·신부님께 선물합니다.', image_url: '/images/wedding/photo-strips.jpg', price: '', sort_order: 1 },
    { page: 'wedding', name: '원목 액자', description: '대표 사진을 액자에 담아 제공. 신랑·신부님의 대표 사진을 원목 액자에 넣어 전달드립니다.', image_url: '/images/wedding/frame.jpg', price: '', sort_order: 2 },
    { page: 'wedding', name: '원본 & GIF USB', description: '모든 원본 사진+GIF USB 전달. 촬영된 모든 원본 사진과 GIF 파일을 USB에 담아 드립니다.', image_url: '/images/wedding/giftbox.jpg', price: '', sort_order: 3 },
  ];

  for (const item of items) {
    await client.execute({
      sql: 'INSERT INTO package_items (page, name, description, image_url, price, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      args: [item.page, item.name, item.description, item.image_url, item.price, item.sort_order],
    });
  }
}

export async function seedPageContents() {
  const client = getClient();
  const existing = await client.execute('SELECT COUNT(*) as count FROM page_contents');
  if ((existing.rows[0] as any).count > 0) return;

  const contents = [
    // 지점 연락처 - 서울 본점
    { page: 'branch', section: 'seoul', key: 'name', value: '서울 본점', type: 'text' },
    { page: 'branch', section: 'seoul', key: 'kakao', value: '심플큐브', type: 'text' },
    { page: 'branch', section: 'seoul', key: 'instagram', value: 'simplecube_photobooth', type: 'text' },
    { page: 'branch', section: 'seoul', key: 'phone', value: '02-338-9180', type: 'text' },
    { page: 'branch', section: 'seoul', key: 'isHQ', value: '1', type: 'number' },
    // 부산 지점
    { page: 'branch', section: 'busan', key: 'name', value: '부산 지점', type: 'text' },
    { page: 'branch', section: 'busan', key: 'kakao', value: '심플큐브 부산', type: 'text' },
    { page: 'branch', section: 'busan', key: 'instagram', value: 'simplecube_busan', type: 'text' },
    { page: 'branch', section: 'busan', key: 'phone', value: '010-3122-4746', type: 'text' },
    { page: 'branch', section: 'busan', key: 'isHQ', value: '0', type: 'number' },
    // 대전 지점
    { page: 'branch', section: 'daejeon', key: 'name', value: '대전 지점', type: 'text' },
    { page: 'branch', section: 'daejeon', key: 'kakao', value: '심플큐브 대전', type: 'text' },
    { page: 'branch', section: 'daejeon', key: 'instagram', value: 'simplecube_daejeon', type: 'text' },
    { page: 'branch', section: 'daejeon', key: 'phone', value: '010-8838-8122', type: 'text' },
    { page: 'branch', section: 'daejeon', key: 'isHQ', value: '0', type: 'number' },
    // 전주 지점
    { page: 'branch', section: 'jeonju', key: 'name', value: '전주 지점', type: 'text' },
    { page: 'branch', section: 'jeonju', key: 'kakao', value: '심플큐브 전주', type: 'text' },
    { page: 'branch', section: 'jeonju', key: 'instagram', value: 'simplecube_jeonju', type: 'text' },
    { page: 'branch', section: 'jeonju', key: 'phone', value: '010-5743-8122', type: 'text' },
    { page: 'branch', section: 'jeonju', key: 'isHQ', value: '0', type: 'number' },
    // 웨딩 패키지 스펙
    { page: 'wedding', section: 'specs', key: 'backdrop', value: '백드롭 6종 택 1', type: 'text' },
    { page: 'wedding', section: 'specs', key: 'lighting', value: '스튜디오 조명', type: 'text' },
    { page: 'wedding', section: 'specs', key: 'staff', value: '전담 스텝 2인', type: 'text' },
    { page: 'wedding', section: 'specs', key: 'props', value: '웨딩 소품 제공', type: 'text' },
    { page: 'wedding', section: 'specs', key: 'prints', value: '무제한', type: 'text' },
    { page: 'wedding', section: 'specs', key: 'packaging', value: '필름 개별 포장', type: 'text' },
    { page: 'wedding', section: 'specs', key: 'guestbook_paper', value: '무제한 제공', type: 'text' },
    { page: 'wedding', section: 'specs', key: 'info_card', value: '동봉카드 100매', type: 'text' },
  ];

  for (const c of contents) {
    await client.execute({
      sql: 'INSERT INTO page_contents (page, section, key, value, type) VALUES (?, ?, ?, ?, ?)',
      args: [c.page, c.section, c.key, c.value, c.type],
    });
  }
}

/**
 * One-time migration: fix any post slugs that contain spaces, periods, or other
 * characters that break SEO (e.g. "웨딩 포토부스. 완벽 가이드" → "웨딩-포토부스-완벽-가이드").
 * Safe to run multiple times — idempotent.
 */
export async function migrateBadSlugs() {
  const client = getClient();
  const badPosts = await client.execute({
    sql: "SELECT id, slug FROM posts WHERE slug LIKE '% %' OR slug LIKE '%.%'",
    args: [],
  });

  for (const row of badPosts.rows) {
    const oldSlug = String((row as any).slug);
    const newSlug = oldSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    if (newSlug && newSlug !== oldSlug) {
      try {
        await client.execute({
          sql: 'UPDATE posts SET slug = ?, updated_at = updated_at WHERE id = ?',
          args: [newSlug, (row as any).id],
        });
        console.log(`[migrateBadSlugs] "${oldSlug}" → "${newSlug}"`);
      } catch (e) {
        console.warn(`[migrateBadSlugs] Could not update slug for post ${(row as any).id}:`, e);
      }
    }
  }
}

export async function seedCustomContents() {
  const client = getClient();
  const customItems = [
    { page: 'popup', section: 'custom', key: 'desc_wrapping', value: '브랜드 아이덴티티를 담은 외관 래핑으로 특별한 포토부스를 만들어보세요.', type: 'text' },
    { page: 'popup', section: 'custom', key: 'desc_main', value: '메인 화면을 브랜드에 맞게 커스터마이징할 수 있습니다.', type: 'text' },
    { page: 'popup', section: 'custom', key: 'desc_backdrop', value: '다양한 백드롭과 백월로 공간을 연출합니다.', type: 'text' },
    { page: 'popup', section: 'custom', key: 'desc_paper', value: '다양한 인화지 옵션으로 특별한 사진을 완성합니다.', type: 'text' },
    { page: 'popup', section: 'custom', key: 'tag_wrapping', value: '랩핑', type: 'text' },
    { page: 'popup', section: 'custom', key: 'tag_main', value: '메인화면', type: 'text' },
    { page: 'popup', section: 'custom', key: 'tag_backdrop', value: '배경', type: 'text' },
  ];

  for (const c of customItems) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO page_contents (page, section, key, value, type) VALUES (?, ?, ?, ?, ?)',
      args: [c.page, c.section, c.key, c.value, c.type],
    });
  }
}
