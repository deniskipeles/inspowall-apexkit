import { apex } from '@/lib/apex';
import { HomeClient } from '@/components/HomeClient';
import type { Metadata } from 'next';

const PER_PAGE = 15;

async function getInitialData(page: number, filter: Record<string, any>) {
  const [pinsList, categoriesResult] = await Promise.all([
    apex.collection('pins').list({
      filter: Object.keys(filter).length ? filter : undefined,
      page,
      per_page: PER_PAGE,
      expand: 'author_id',
    }).catch(() => ({ items: [], total: 0 })),
    apex.scripts.run('get-categories', {}).catch(() => []),
  ]);

  const mappedPins = (pinsList.items || []).map((record: any) => {
    const data = record.data || record;
    const authorObj = record.expand?.author_id;
    const authorRecord = Array.isArray(authorObj) ? authorObj[0] : authorObj;
    const authorData = (authorRecord?.metadata || authorRecord) || {};
    return {
      id: record.id,
      image: apex.files.getFileUrl(data.image, '300x0'),
      title: data.title,
      author: authorData.name || data.author || 'Anonymous',
      category: data.category,
      height: data.height || 300,
      likes_count: data.likes_count || 0,
    };
  });

  return {
    initialPins: mappedPins,
    initialTotal: pinsList.total || 0,
    categories: ['For You', ...(Array.isArray(categoriesResult) ? categoriesResult : [])],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const pageNum = parseInt(page.replace('page-', ''), 10) || 1;
  return { title: `Page ${pageNum} | Vortex` };
}

export default async function HomePagedPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { page: pageParam } = await params;
  const { filter: filterParam } = await searchParams;

  const page = parseInt(pageParam.replace('page-', ''), 10) || 1;
  const filter = filterParam ? JSON.parse(decodeURIComponent(filterParam)) : {};

  const { initialPins, initialTotal, categories } = await getInitialData(page, filter);

  return (
    <HomeClient
      initialPins={initialPins}
      initialTotal={initialTotal}
      initialCategories={categories}
      perPage={PER_PAGE}
      initialPage={page}
      initialFilter={filter}
      initialCategory="for-you"
    />
  );
}