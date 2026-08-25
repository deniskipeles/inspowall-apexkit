import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

/**
 * Validates binary magic bytes to guarantee the payload is a valid image.
 */
function inspectImageMagicBytes(bytes: Uint8Array): { valid: boolean; mimeType: string } {
  if (bytes.length < 12) return { valid: false, mimeType: 'application/octet-stream' };

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, mimeType: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { valid: true, mimeType: 'image/png' };
  }

  // WebP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, mimeType: 'image/webp' };
  }

  // GIF: GIF87a or GIF89a
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { valid: true, mimeType: 'image/gif' };
  }

  // SVG (<svg or <?xml)
  const headerSlice = new TextDecoder().decode(bytes.subarray(0, 100)).trim().toLowerCase();
  if (headerSlice.includes('<svg') || headerSlice.includes('<?xml')) {
    return { valid: true, mimeType: 'image/svg+xml' };
  }

  return { valid: false, mimeType: 'application/octet-stream' };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const subpath = path ? path.join('/') : '';
  
  // Enforce format=webp in query params if not specified
  const searchParams = new URLSearchParams(req.nextUrl.search);
  if (!searchParams.has('format')) {
    searchParams.set('format', 'webp');
  }
  
  const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
  let targetUrl = `${API_URL.replace(/\/$/, '')}/${subpath}${search}`;

  try {
    let res = await fetch(targetUrl, {
      headers: {
        Accept: 'image/webp,image/*,*/*',
      },
    });

    let buffer = await res.arrayBuffer();
    let bytes = new Uint8Array(buffer);
    let { valid, mimeType } = inspectImageMagicBytes(bytes);

    // AUTO-RECOVERY: If payload is corrupted (e.g. legacy Photon output),
    // bypass the cache and fetch directly from the native raw storage engine
    if (!valid || buffer.byteLength < 2048) {
      console.warn('[_cdn Route] Corrupted or small payload detected. Initiating native recovery...');
      
      const filename = path[path.length - 1];
      const tenantMatch = subpath.match(/tenant\/([^/]+)/);
      const tenantPart = tenantMatch ? `tenant/${tenantMatch[1]}/` : '';
      
      const fallbackUrl = `${API_URL.replace(/\/$/, '')}/${tenantPart}api/v1/storage/file/${encodeURIComponent(filename)}?format=webp&quality=80`;
      
      const recoveryRes = await fetch(fallbackUrl);
      if (recoveryRes.ok) {
        buffer = await recoveryRes.arrayBuffer();
        bytes = new Uint8Array(buffer);
        const checked = inspectImageMagicBytes(bytes);
        if (checked.valid) {
          valid = true;
          mimeType = checked.mimeType;
        }
      }
    }

    const isCacheable = res.ok && valid && buffer.byteLength >= 2048;
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Access-Control-Allow-Origin', '*');

    if (isCacheable) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Cloudflare-CDN-Cache-Control', 'max-age=31536000');
      headers.set('CDN-Cache-Control', 'max-age=31536000');
    } else {
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
      headers.set('CDN-Cache-Control', 'no-store');
    }

    return new NextResponse(buffer, {
      status: valid ? 200 : res.status,
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