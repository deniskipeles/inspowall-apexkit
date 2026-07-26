import { NextRequest, NextResponse } from 'next/server';
import { apex } from '@/lib/apex';

function getMimeType(format?: string): string {
  switch (format?.toLowerCase()) {
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
    default:
      return 'image/png';
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;

  try {
    // 1. Resolve hash mapping via og-manager script
    const res = await apex.scripts.run('og-manager', {
      action: 'resolve',
      hash,
    });

    if (!res || !res.success || !res.renderUrl) {
      return new NextResponse('OpenGraph Image Not Found', { status: 404 });
    }

    // 2. Fetch rendered binary image buffer from ApexKit
    const imageRes = await fetch(res.renderUrl);
    if (!imageRes.ok) {
      return new NextResponse('Failed to render OpenGraph image', { status: 502 });
    }

    const imageBuffer = await imageRes.arrayBuffer();

    // 3. Determine MIME type (image/webp, image/jpeg, image/png)
    const contentType = getMimeType(res.format);

    // 4. Return image with long-term Cloudflare edge caching headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'Cloudflare-CDN-Cache-Control': 'max-age=31536000',
      },
    });
  } catch (err) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}