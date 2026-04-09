import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'URL 파라미터가 필요합니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SimpleCubeBot/1.0)',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: '페이지를 불러올 수 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await res.text();

    // Try og:image first
    let image = '';
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch) {
      image = ogMatch[1];
    }

    // Fallback: first large image in the page
    if (!image) {
      const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch) {
        image = imgMatch[1];
      }
    }

    // Make relative URLs absolute
    if (image && !image.startsWith('http')) {
      const baseUrl = new URL(targetUrl);
      image = new URL(image, baseUrl.origin).href;
    }

    return new Response(JSON.stringify({ image }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || '이미지 추출 실패' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
