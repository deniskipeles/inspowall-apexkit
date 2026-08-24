import { NextRequest, NextResponse } from 'next/server';
import { apex } from '@/lib/apex';

export async function POST(req: NextRequest) {
  try {
    const ogApiKey = req.headers.get('x-og-api-key') || req.headers.get('x-api-key') || '';
    if (!ogApiKey) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Missing x-og-api-key header' }, { status: 401 });
    }

    const body = await req.json();

    // Set the Custom Header securely using the SDK
    apex.setHeader('x-og-api-key', ogApiKey);

    // Call the webhook natively using the SDK.
    // The SDK automatically resolves the correct endpoint: /api/v1/webhook/og/store
    const data = await apex.webhook('og').post('store', {
      templateId: body.templateId || 'default-opengraph',
      format: body.format || 'webp',
      quality: body.quality || 80,
      data: body.data,
    });

    // Use the actual request origin instead of hardcoding inspowall.pages.dev
    const origin = req.nextUrl.origin;

    return NextResponse.json({
      success: true,
      hash: data.hash,
      url: `${origin}/opengraph/${data.hash}.${body.format || 'webp'}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal Error', message: err.message || err.details || String(err) }, 
      { status: err.status || 500 }
    );
  } finally {
    // Clean up the header so it doesn't leak into other requests
    apex.removeHeader('x-og-api-key');
  }
}