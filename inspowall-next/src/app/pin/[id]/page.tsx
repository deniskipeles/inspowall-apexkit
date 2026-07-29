import { apex, getImageUrl } from '@/lib/apex';
import { PinDetailClient } from '@/components/PinDetailClient';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

async function getPin(id: string) {
  try {
    const record = await apex.collection('pins').get(id, { expand: 'author_id' });
    const data = record.data || record;
    const authorObj = record.expand?.author_id;
    const authorRecord = Array.isArray(authorObj) ? authorObj[0] : authorObj;
    const authorData = (authorRecord?.metadata || authorRecord) || {};
    const metadata = data.metadata || null;

    // Resolve author from metadata if present, else fall back to DB author
    let author = authorData.name || data.author || 'Anonymous';
    let authorHandle = authorData.handle || '@anonymous';
    let authorAvatar = authorData.avatar
      ? await getImageUrl(authorData.avatar)
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${record.id}`;

    if (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) {
      const source = metadata.src?.original?.includes('pexels.com') || metadata.photographer
        ? 'pexels'
        : metadata.alternative_slugs || metadata.urls?.raw?.includes('unsplash.com')
          ? 'unsplash'
          : null;

      if (source === 'pexels' && metadata.photographer) {
        author = metadata.photographer;
        authorHandle = `@${metadata.photographer.toLowerCase().replace(/\s+/g, '-')}`;
        authorAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${metadata.photographer_id || metadata.photographer}`;
      } else if (source === 'unsplash' && metadata.user) {
        author = metadata.user.name || metadata.user.username;
        authorHandle = `@${metadata.user.username}`;
        authorAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${metadata.user.username || metadata.user.id}`;
      }
    }

    return {
      id: record.id,
      title: data.title,
      description: data.description,
      author,
      authorHandle,
      authorAvatar,
      image: await getImageUrl(data.image),
      rawImage: data.image,
      tags: data.tags || [],
      likes_count: data.likes_count || 0,
      category: data.category,
      metadata,
      logo: apex.baseUrl
    };
  } catch {
    return null;
  }
}

async function getSimilarPins(pin: NonNullable<Awaited<ReturnType<typeof getPin>>>) {
  try {
    let results: any[] = [];
    try {
      const vectors = await apex.collection('pins').getVector(pin.id);
      const imageVector = vectors.find((v: any) => v.field_name === 'image')?.vector;
      if (imageVector) {
        const res = await apex.collection('pins').searchVectorWithVector('image', imageVector, { limit: 15 });
        results = res.items || res;
      } else {
        const res = await apex.collection('pins').searchVectorWithText(pin.title, { limit: 15 });
        results = res.items || res;
      }
    } catch {
      const res = await apex.collection('pins').searchVectorWithText(pin.title, { limit: 15 });
      results = res.items || res;
    }

    // Wrap the mapped array in Promise.all so all image URLs resolve before returning
    return Promise.all(
      (results || [])
        .filter((r: any) => r && r.id !== pin.id)
        .map(async (r: any) => {
          const rData = r.data || r;
          return {
            id: r.id,
            image: await getImageUrl(rData.image, '300x0'),
            title: rData.title,
            author: rData.author || 'Anonymous',
            category: rData.category,
            height: rData.height || 300,
            likes_count: rData.likes_count || 0,
          };
        })
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const pin = await getPin(id);

  if (!pin) return { title: 'Pin not found | InspoWall' };

  const headersList = await headers();
  const host = headersList.get('host') || 'inspowall.pages.dev';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  let ogImageUrl = pin.image;

  const ogApiKey = process.env.NEXT_PUBLIC_OG_API_KEY || process.env.OG_API_KEY || '';

  const templateId = typeof sp.template_id === 'string' ? sp.template_id : 'default-opengraph';

  // 🔴 CRITICAL FIX FOR WHATSAPP: Force JPEG if using the whatsapp square template
  let format = typeof sp.format === 'string' ? sp.format : 'webp';
  if (templateId === 'og-whatsapp-channel' && typeof sp.format !== 'string') {
    format = 'jpeg'; // WebP often breaks WhatsApp layout/parsing
  }

  // Lower quality slightly for WhatsApp to stay under their strict 300KB limit
  let quality = typeof sp.quality === 'string' ? parseInt(sp.quality, 10) : 80;
  if (templateId === 'og-whatsapp-channel' && typeof sp.quality !== 'string') {
    quality = 75;
  }

  const blur = typeof sp.blur === 'string' ? parseFloat(sp.blur) : undefined;
  const imgParams: any = {};
  if (blur) imgParams.blur = blur;

  let platform = 'inspowall';
  let platformId = pin.rawImage;
  if (pin.metadata && typeof pin.metadata === 'object' && Object.keys(pin.metadata).length > 0) {
    if (pin.metadata.src?.original?.includes('pexels.com') || pin.metadata.photographer) {
      platform = 'pexels';
      platformId = String(pin.metadata.id || pin.rawImage);
    } else if (pin.metadata.alternative_slugs || pin.metadata.urls?.raw?.includes('unsplash.com')) {
      platform = 'unsplash';
      platformId = String(pin.metadata.id || pin.rawImage);
    }
  }

  const dynamicDataPayload = [
    { type: 'image', target: 'IMAGE_URL', value: platformId, platform, params: imgParams },
    { type: 'text', target: 'TITLE', value: pin.title },
    { type: 'text', target: 'SUBTITLE', value: pin.description || 'Curated on InspoWall' },
    { type: 'text', target: 'SITE_NAME', value: host.toUpperCase() },
    { type: 'text', target: 'PHOTOGRAPHER', value: pin.author || 'Community Artist' },
    { type: 'text', target: "PLATFORM", value: platform.toUpperCase() }
  ];

  try {
    const targetUrl = `${protocol}://${host}/opengraph`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-og-api-key': ogApiKey,
      },
      body: JSON.stringify({
        templateId,
        format,
        quality,
        data: dynamicDataPayload,
      }),
    });

    const res = await response.json();

    if (res && res.success && res.url) {
      ogImageUrl = res.url;
    }
  } catch (err) {
    console.error('Failed to generate OpenGraph edge card for pin:', err);
  }

  // 🔴 DYNAMIC DIMENSIONS BASED ON TEMPLATE
  const isSquare = templateId === 'og-whatsapp-channel';
  const imgWidth = isSquare ? 1200 : 1200;
  const imgHeight = isSquare ? 1200 : 630;
  const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';

  return {
    title: `${pin.title} | InspoWall`,
    description: pin.description,
    openGraph: {
      title: pin.title,
      description: pin.description,
      images: [
        {
          url: ogImageUrl,
          width: imgWidth,
          height: imgHeight,
          alt: pin.title,
          type: mimeType, // 🔴 Explicitly tell WhatsApp what format this is
        },
      ],
      siteName: "InspoWall Page"
    },
    twitter: {
      card: 'summary_large_image',
      title: pin.title,
      description: pin.description,
      images: [ogImageUrl],
    },
  };
}

export default async function PinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pin = await getPin(id);
  const similarPins = pin ? await getSimilarPins(pin) : [];

  return <PinDetailClient id={id} initialPin={pin} initialSimilarPins={similarPins} />;
}