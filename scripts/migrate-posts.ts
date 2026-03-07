/**
 * 기존 마크다운 블로그 포스트를 Turso DB로 이관하는 스크립트.
 * 실행: npx tsx scripts/migrate-posts.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.resolve(__dirname, '../src/content/blog');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  category: string;
  image: string;
  tags: string[];
  externalUrl?: string;
}

function parseFrontmatter(raw: string): { frontmatter: PostFrontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('Invalid frontmatter');

  const fm: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Parse array
    if (value.startsWith('[')) {
      try {
        fm[key] = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        fm[key] = value;
      }
    } else {
      fm[key] = value;
    }
  }

  return {
    frontmatter: fm as unknown as PostFrontmatter,
    body: match[2].trim(),
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function initTables() {
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
  `);
}

async function getOrCreateCategory(name: string): Promise<number> {
  const slug = slugify(name);
  const existing = await client.execute({ sql: 'SELECT id FROM categories WHERE name = ?', args: [name] });
  if (existing.rows.length > 0) return Number((existing.rows[0] as any).id);

  const result = await client.execute({
    sql: 'INSERT INTO categories (name, slug) VALUES (?, ?)',
    args: [name, slug],
  });
  return Number(result.lastInsertRowid);
}

async function getOrCreateTag(name: string): Promise<number> {
  const slug = slugify(name);
  const existing = await client.execute({ sql: 'SELECT id FROM tags WHERE name = ?', args: [name] });
  if (existing.rows.length > 0) return Number((existing.rows[0] as any).id);

  const result = await client.execute({
    sql: 'INSERT INTO tags (name, slug) VALUES (?, ?)',
    args: [name, slug],
  });
  return Number(result.lastInsertRowid);
}

async function migrate() {
  console.log('Initializing tables...');
  await initTables();

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown posts to migrate.`);

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const slug = file.replace('.md', '');

    // Check if already migrated
    const existing = await client.execute({ sql: 'SELECT id FROM posts WHERE slug = ?', args: [slug] });
    if (existing.rows.length > 0) {
      console.log(`  [SKIP] "${frontmatter.title}" - already exists`);
      continue;
    }

    // Convert markdown body to HTML
    const htmlContent = body ? await marked.parse(body) : '';

    // Get or create category
    let categoryId: number | null = null;
    if (frontmatter.category) {
      categoryId = await getOrCreateCategory(frontmatter.category);
    }

    // Insert post
    const result = await client.execute({
      sql: `INSERT INTO posts (title, slug, description, content, category_id, image, seo_title, seo_description, external_url, draft, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        frontmatter.title,
        slug,
        frontmatter.description || '',
        htmlContent,
        categoryId,
        frontmatter.image || '',
        frontmatter.title,
        frontmatter.description || '',
        frontmatter.externalUrl || '',
        frontmatter.date ? `${frontmatter.date}T00:00:00` : new Date().toISOString(),
        frontmatter.date ? `${frontmatter.date}T00:00:00` : new Date().toISOString(),
      ],
    });

    const postId = Number(result.lastInsertRowid);

    // Insert tags
    if (Array.isArray(frontmatter.tags)) {
      for (const tagName of frontmatter.tags) {
        const tagId = await getOrCreateTag(tagName);
        await client.execute({
          sql: 'INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)',
          args: [postId, tagId],
        });
      }
    }

    console.log(`  [OK] "${frontmatter.title}" (${slug})`);
  }

  console.log('\nMigration complete!');
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
