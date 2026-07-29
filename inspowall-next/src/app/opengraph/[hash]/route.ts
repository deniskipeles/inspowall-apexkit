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
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;

  try {
    // 1. Resolve hash mapping via og-manager script
    // Add 'force-cache' so Next.js caches this JSON response permanently
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

    // 2. Fetch rendered binary image buffer from ApexKit
    // Add 'force-cache' so the rendered PNG/WebP bytes are cached in Next.js memory
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

    // 3. Return image with Cloudflare edge caching headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'Cloudflare-CDN-Cache-Control': 'max-age=31536000',
      },
    });
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error', message: err.message || String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}