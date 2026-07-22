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
      logo:apex.baseUrl
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
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pin = await getPin(id);
  if (!pin) return { title: 'Pin not found | InspoWall' };

  // Determine user agent to serve the most optimized OG image size
  const headersList = await headers();
  const userAgent = (headersList.get('user-agent') || '').toLowerCase();

  let optimalSize = '1200x630';
  let width = 1200;
  let height = 630;

  if (userAgent.includes('whatsapp')) {
    optimalSize = '1200x630';
    width = 1200;
    height = 630;
  } else if (userAgent.includes('facebook') || userAgent.includes('fb')) {
    optimalSize = '1200x630';
    width = 1200;
    height = 630;
  } else if (userAgent.includes('twitter')) {
    optimalSize = '1200x600';
    width = 1200;
    height = 600;
  } else if (userAgent.includes('telegram')) {
    optimalSize = '1200x630';
    width = 1200;
    height = 630;
  } else if (userAgent.includes('discord')) {
    optimalSize = '1200x630';
    width = 1200;
    height = 630;
  } else if (userAgent.includes('reddit')) {
    optimalSize = '1200x630';
    width = 1200;
    height = 630;
  } else if (userAgent.includes('snapchat')) {
    optimalSize = '1080x1920';
    width = 1080;
    height = 1920;
  } else if (userAgent.includes('instagram')) {
    optimalSize = '1080x1080';
    width = 1080;
    height = 1080;
  }

  const optimizedImageUrl = await getImageUrl(pin.rawImage, optimalSize);

  return {
    title: `${pin.title} | InspoWall`,
    description: pin.description,
    openGraph: {
      title: pin.title,
      description: pin.description,
      images: optimizedImageUrl ? [
        {
          url: optimizedImageUrl,
          width,
          height,
          alt: pin.title,
        }
      ] : [],
    },
    twitter: { 
      card: 'summary_large_image',
      title: pin.title,
      description: pin.description,
      images: optimizedImageUrl ? [optimizedImageUrl] : [],
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