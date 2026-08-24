import { NextRequest, NextResponse } from 'next/server';
import { apex } from '@/lib/apex';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash: rawHash } = await params;
  
  const hash = rawHash.replace(/\.(jpg|jpeg|png|webp)$/i, '').trim();
  const etag = `"${hash}"`;

  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304 });
  }

  try {
    apex.setHeader('x-source', 'inspowall-edge');

    const targetUrl = `${apex.baseUrl.replace(/\/$/, '')}/api/v1/webhook/og/image/${hash}`;
    
    const imageRes = await fetch(targetUrl, { 
      headers: apex.getHeaders(),
      cache: 'force-cache' 
    });
    
    if (!imageRes.ok) {
      const errText = await imageRes.text();
      return new NextResponse(
        JSON.stringify({ error: 'Failed to fetch OpenGraph image', details: errText.substring(0, 300) }),
        { status: imageRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = await imageRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': imageRes.headers.get('content-type') || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cloudflare-CDN-Cache-Control': 'max-age=31536000',
        'ETag': etag,
        'Vary': 'Accept-Encoding', 
      },
    });
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error', message: err.message || String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    apex.removeHeader('x-source');
  }
}