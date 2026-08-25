import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const subpath = path.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${API_URL.replace(/\/$/, '')}/${subpath}${search}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        // Forward origin request headers if needed
        Accept: req.headers.get('accept') || '*/*',
      },
    });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const isImage = contentType.startsWith('image/');
    
    // AUTOMATIC 2KB FILTER:
    // If response is smaller than 2KB, not OK, or not an image -> DO NOT CACHE
    const isCacheable = res.ok && isImage && buffer.byteLength >= 2048;

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Access-Control-Allow-Origin', '*');

    if (isCacheable) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Cloudflare-CDN-Cache-Control', 'max-age=31536000');
      headers.set('CDN-Cache-Control', 'max-age=31536000');
    } else {
      // Force edge and browser to re-fetch on every subsequent attempt
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
      headers.set('CDN-Cache-Control', 'no-store');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    }

    return new NextResponse(buffer, {
      status: res.status,
      headers,
    });
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({ error: 'Proxy Fetch Error', message: err.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, max-age=0',
        },
      }
    );
  }
}