import { notFound } from 'next/navigation';
import { apex, getImageUrl } from '@/lib/apex';
import { HomeClient } from '@/components/HomeClient';
import type { Metadata } from 'next';

const PER_PAGE = 15;

async function getInitialData(category: string, page: number, filter: Record<string, any>) {
    const categoryLabel = category
        .split('-')
        .map((w) => w.replace(/[a-z]/, (c) => c.toUpperCase()))
        .join(' ');

    const combinedFilter = {
        ...(category !== 'for-you' ? { category: categoryLabel } : {}),
        ...filter,
    };

    const [pinsList, categoriesResult] = await Promise.all([
        apex.collection('pins').list({
            filter: Object.keys(combinedFilter).length ? combinedFilter : undefined,
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

export async function generateMetadata({
    params,
}: {
    params: Promise<{ category: string; pageSlug: string }>;
}): Promise<Metadata> {
    const { category, pageSlug } = await params;
    const match = pageSlug.match(/^page-(\d+)$/);
    if (!match) return {};

    const pageNum = parseInt(match[1], 10);
    const label = category.split('-').map((w) => w.replace(/[a-z]/, (c) => c.toUpperCase())).join(' ');
    return { title: `${label} — Page ${pageNum} | InspoWall` };
}

export default async function CategoryPagedPage({
    params,
    searchParams,
}: {
    params: Promise<{ category: string; pageSlug: string }>;
    searchParams: Promise<{ filter?: string }>;
}) {
    const { category, pageSlug } = await params;

    // Only "page-N" is valid here — anything else is a 404, not a crash
    const match = pageSlug.match(/^page-(\d+)$/);
    if (!match) notFound();

    const page = parseInt(match[1], 10);
    const { filter: filterParam } = await searchParams;
    const filter = filterParam ? JSON.parse(decodeURIComponent(filterParam)) : {};

    const { initialPins, initialTotal, categories } = await getInitialData(category, page, filter);

    return (
        <HomeClient
            initialPins={initialPins}
            initialTotal={initialTotal}
            initialCategories={categories}
            perPage={PER_PAGE}
            initialPage={page}
            initialFilter={filter}
            initialCategory={category}
        />
    );
}
