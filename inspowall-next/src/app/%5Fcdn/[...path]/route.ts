import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const subpath = path ? path.join('/') : '';
  const search = req.nextUrl.search;
  const targetUrl = `${API_URL.replace(/\/$/, '')}/${subpath}${search}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        Accept: req.headers.get('accept') || '*/*',
      },
    });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const isImage = contentType.startsWith('image/');
    const byteLength = buffer.byteLength;

    // AUTOMATIC 2KB CACHE FILTER
    // Only cache if response is 200 OK, is an image, and >= 2KB
    const isCacheable = res.ok && isImage && byteLength >= 2048;

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Access-Control-Allow-Origin', '*');

    if (isCacheable) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Cloudflare-CDN-Cache-Control', 'max-age=31536000');
      headers.set('CDN-Cache-Control', 'max-age=31536000');
    } else {
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
      JSON.stringify({ 
        error: 'Proxy Fetch Error', 
        targetUrl, 
        message: err.message 
      }),
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