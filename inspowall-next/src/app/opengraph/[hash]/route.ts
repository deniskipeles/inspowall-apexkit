import { NextRequest, NextResponse } from 'next/server';
import { apex } from '@/lib/apex';

function getMimeType(format?: string): string {
  switch (format?.toLowerCase()) {
    case 'webp': return 'image/webp';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png':
    default: return 'image/png';
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash: rawHash } = await params;
  
  // 🔴 CRITICAL FIX: Strip the dummy extension we added for legacy mode renderers
  const hash = rawHash.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const etag = `"${hash}"`;

  // 1. BROWSER DISK CACHE CHECK (Instant 304 Not Modified)
  // If the browser sends If-None-Match, it means it has the file on disk.
  // Since our hash is deterministic, it NEVER changes. We can instantly tell the browser to use its cache.
  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304 });
  }

  try {
    const resolveRes = await fetch(`${apex.baseUrl.replace(/\/$/, '')}/api/v1/run/og-manager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', hash }),
      cache: 'force-cache', 
    });

    const res = await resolveRes.json();

    if (!res || !res.success || !res.renderUrl) {
      return new NextResponse(
        JSON.stringify({ error: res?.error || 'OpenGraph Image Not Found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const imageRes = await fetch(res.renderUrl, { cache: 'force-cache' });
    
    if (!imageRes.ok) {
      const errText = await imageRes.text();
      return new NextResponse(
        JSON.stringify({ error: 'Failed to render OpenGraph image', details: errText.substring(0, 300) }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const contentType = getMimeType(res.format);

    // 2. Return Image with ETag and fixed Vary headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cloudflare-CDN-Cache-Control': 'max-age=31536000',
        'ETag': etag,
        // Overwrite Next.js React Server Component tracking to fix browser disk caching
        'Vary': 'Accept-Encoding', 
      },
    });
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error', message: err.message || String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}