/**
 * Sanitize a blog post slug.
 * - Lowercases ASCII letters
 * - Removes periods, commas, and other punctuation
 * - Replaces whitespace with hyphens
 * - Preserves Korean characters (가-힣), English letters, digits, hyphens
 * - Collapses multiple hyphens
 * - Max 100 characters
 */
export function sanitizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '') // Remove punctuation except hyphens
    .replace(/\s+/g, '-')               // Spaces → hyphens
    .replace(/-{2,}/g, '-')             // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '')            // Trim leading/trailing hyphens
    .substring(0, 100);
}

/**
 * Generate a clean slug from a post title.
 */
export function generateSlugFromTitle(title: string): string {
  return sanitizeSlug(title);
}

/**
 * Check if a slug is already clean (no spaces, no periods, only allowed chars).
 */
export function isCleanSlug(slug: string): boolean {
  return /^[a-z0-9가-힣-]+$/.test(slug);
}
