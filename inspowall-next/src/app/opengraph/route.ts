import { NextRequest, NextResponse } from 'next/server';
import { apex } from '@/lib/apex';

export async function POST(req: NextRequest) {
  try {
    const ogApiKey = req.headers.get('x-og-api-key') || req.headers.get('x-api-key') || '';
    if (!ogApiKey) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Missing x-og-api-key header' }, { status: 401 });
    }

    const body = await req.json();
    const targetUrl = `${apex.baseUrl.replace(/\/$/, '')}/api/v1/run/og-manager`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-og-api-key': ogApiKey,
      },
      body: JSON.stringify({
        action: 'store',
        templateId: body.templateId || 'default-opengraph',
        format: body.format || 'webp',
        quality: body.quality || 80,
        data: body.data, // <--- Passing the dynamic array!
      }),
    });

    const responseText = await response.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch (err) {
      return NextResponse.json(
        { error: 'Backend Response Error', message: `Non-JSON response: ${responseText.substring(0, 200)}` },
        { status: 502 }
      );
    }

    if (!response.ok || !data.success) {
      return NextResponse.json({ error: data.error || 'Failed to create OpenGraph image' }, { status: 400 });
    }

    const origin = req.headers.get('host')?.includes('localhost')
      ? `http://${req.headers.get('host')}`
      : 'https://inspowall.pages.dev';

    return NextResponse.json({
      success: true,
      hash: data.hash,
      url: `${origin}/opengraph/${data.hash}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Error', message: err.message }, { status: 500 });
  }
}