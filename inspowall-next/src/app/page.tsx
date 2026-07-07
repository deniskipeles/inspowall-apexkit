import { apex, getImageUrl } from '@/lib/apex';
import { HomeClient } from '@/components/HomeClient';

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

  const mappedPins = await Promise.all(
    (pinsList.items || []).map(async (record: any) => {
      const data = record.data || record;
      const authorObj = record.expand?.author_id;
      const authorRecord = Array.isArray(authorObj) ? authorObj[0] : authorObj;
      const authorData = (authorRecord?.metadata || authorRecord) || {};
      return {
        id: record.id,
        image: await getImageUrl(data.image, '300x0'),
        title: data.title,
        author: authorData.name || data.author || 'Anonymous',
        category: data.category,
        height: data.height || 300,
        likes_count: data.likes_count || 0,
      };
    })
  );

  return {
    initialPins: mappedPins,
    initialTotal: pinsList.total || 0,
    categories: ['For You', ...(Array.isArray(categoriesResult) ? categoriesResult : [])],
  };
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ page?: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { page: pageParam } = await params;
  const { filter: filterParam } = await searchParams;

  const page = parseInt(pageParam?.replace('page-', '') || '1', 10);
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
    />
  );
}