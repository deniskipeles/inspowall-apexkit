import { apex, getImageUrl } from '@/lib/apex';
import { HomeClient } from '@/components/HomeClient';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

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
    searchParams,
}: {
    params: Promise<{ category: string }>;
    searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
    const { category } = await params;
    const { page } = await searchParams;

    const homePageMatch = category.match(/^page-(\d+)$/);
    if (homePageMatch) {
        return { title: `Page ${homePageMatch[1]} | InspoWall` };
    }

    const pageNum = parseInt(page || '1', 10);
    const label = category.split('-').map((w) => w.replace(/[a-z]/, (c) => c.toUpperCase())).join(' ');
    return { title: pageNum > 1 ? `${label} — Page ${pageNum} | InspoWall` : `${label} | InspoWall` };
}

export default async function CategoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ category: string }>;
    searchParams: Promise<{ page?: string; filter?: string }>;
}) {
    const { category } = await params;
    const { page: pageParam, filter: filterParam } = await searchParams;

    // Safety net: @username leaked through middleware — hard redirect
    if (category.startsWith('@')) {
        redirect(`/u/${category.slice(1)}`);
    }

    // /page-2, /page-3 etc are home pagination, not categories
    const homePageMatch = category.match(/^page-(\d+)$/);
    if (homePageMatch) {
        const page = parseInt(homePageMatch[1], 10);
        const filter = filterParam ? JSON.parse(decodeURIComponent(filterParam)) : {};
        const { initialPins, initialTotal, categories } = await getInitialData('for-you', page, filter);
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

    // rest of the existing category logic unchanged...
    const page = parseInt(pageParam || '1', 10);
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