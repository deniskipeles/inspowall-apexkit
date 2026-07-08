'use client';

import { CategoryPills } from './CategoryPills';
import { MasonryGrid, MasonryGridSkeleton } from './MasonryGrid';
import { useState, useEffect, useRef } from 'react';
import { useSearch } from '@/context/SearchContext';
import { useRouter } from 'next/navigation';
import { X, ScanSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactCrop, { type Crop } from 'react-image-crop';
import { apex, getImageUrl } from '@/lib/apex';
import { useAuth } from '@/context/AuthContext';
import { getCroppedImg } from '@/lib/imageUtils';
import 'react-image-crop/dist/ReactCrop.css';
import Link from 'next/link';

interface HomeClientProps {
  initialPins: any[];
  initialTotal: number;
  initialCategories: string[];
  perPage: number;
  initialPage?: number;
  initialFilter?: Record<string, any>;
  initialCategory?: string;
}

export function HomeClient({
  initialPins,
  initialTotal,
  initialCategories,
  perPage,
  initialPage = 1,
  initialFilter = {},
  initialCategory = 'for-you',
}: HomeClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [pins, setPins] = useState<any[]>(initialPins);
  const [isLoading, setIsLoading] = useState(false);
  const { searchQuery, searchImage, clearSearch } = useSearch();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const totalPages = Math.ceil(initialTotal / perPage);

  // Search-mode state — purely client-side, not paginated via SSR
  const [searchPins, setSearchPins] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const skipNextFetch = useRef(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const list = await apex.scripts.run('get-categories', {});
        if (Array.isArray(list)) setCategories(['For You', ...list]);
      } catch (err) {
        console.error('Failed to fetch dynamic categories:', err);
      }
    };
    loadCategories();
  }, []);

  // When SSR props change (new page/category navigation), sync them in
  useEffect(() => {
    setPins(initialPins);
  }, [initialPins]);

  // Hydrate liked/saved on the SSR-fetched initial pins once user is known.
  // Runs once per page load — patches initialPins in-place without a re-fetch.
  useEffect(() => {
    const hydrate = async () => {
      if (!user || initialPins.length === 0) return;
      const pinIds = initialPins.map((p) => p.id);
      try {
        const [likesRes, savedRes] = await Promise.all([
          apex.collection('likes').list({
            filter: { $and: [{ user_id: user.id, pin_id: { $in: pinIds } }] },
            per_page: 100,
          }),
          apex.collection('saved_pins').list({
            filter: { $and: [{ user_id: user.id, pin_id: { $in: pinIds } }] },
            per_page: 100,
          }),
        ]);

        const likedIds = new Set<string | number>();
        const savedIds = new Set<string | number>();
        likesRes.items.forEach((item: any) => { if (item.data?.pin_id) likedIds.add(item.data.pin_id); });
        savedRes.items.forEach((item: any) => { if (item.data?.pin_id) savedIds.add(item.data.pin_id); });

        setPins((prev) =>
          prev.map((p) => ({
            ...p,
            initiallyLiked: likedIds.has(p.id),
            initiallySaved: savedIds.has(p.id),
          }))
        );
      } catch (err) {
        console.error('Failed to hydrate liked/saved state:', err);
      }
    };

    hydrate();
  }, [user, initialPins]);

  // --- Search (client-side only, bypasses SSR pagination) ---
  useEffect(() => {
    if (!searchQuery && !searchImage) {
      setSearchPins([]);
      return;
    }

    const run = async () => {
      setSearchLoading(true);
      try {
        let results: any[] = [];

        if (searchImage) {
          if (completedCrop && completedCrop.width && completedCrop.height) {
            try {
              const imgElement = document.querySelector('.ReactCrop img') as HTMLImageElement;
              const croppedImage = await getCroppedImg(searchImage, completedCrop, imgElement);
              results = croppedImage
                ? await apex.collection('pins').searchImageVectorWithImage(croppedImage, 60)
                : await apex.collection('pins').searchImageVectorWithImage(searchImage, 60);
            } catch {
              results = await apex.collection('pins').searchImageVectorWithImage(searchImage, 60);
            }
          } else {
            results = await apex.collection('pins').searchImageVectorWithImage(searchImage, 60);
          }
        } else if (searchQuery) {
          results = await apex.collection('pins').searchImageVectorWithText(searchQuery, 60);
        }

        const mapped = await Promise.all(
          (results || []).map(async (record: any) => {
            const data = record.data || record;
            return {
              id: record.id,
              image: await getImageUrl(data.image, '300x0'),
              title: data.title,
              author: data.author || 'Anonymous',
              category: data.category,
              height: data.height || 300,
              likes_count: data.likes_count || 0,
            };
          })
        );

        let likedPinIds = new Set<string | number>();
        let savedPinIds = new Set<string | number>();
        if (user && mapped.length > 0) {
          const pinIds = mapped.map((p) => p.id);
          try {
            const [likesRes, savedRes] = await Promise.all([
              apex.collection('likes').list({ filter: { $and: [{ user_id: user.id, pin_id: { $in: pinIds } }] }, per_page: 100 }),
              apex.collection('saved_pins').list({ filter: { $and: [{ user_id: user.id, pin_id: { $in: pinIds } }] }, per_page: 100 }),
            ]);
            likesRes.items.forEach((item: any) => { if (item.data?.pin_id) likedPinIds.add(item.data.pin_id); });
            savedRes.items.forEach((item: any) => { if (item.data?.pin_id) savedPinIds.add(item.data.pin_id); });
          } catch { /* silent */ }
        }

        setSearchPins(mapped.map((p) => ({ ...p, initiallyLiked: likedPinIds.has(p.id), initiallySaved: savedPinIds.has(p.id) })));
      } catch (err: any) {
        if (!err.message?.includes('Rate limit')) console.error('Search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    };

    const timer = setTimeout(run, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchImage, completedCrop, user]);

  useEffect(() => {
    setCrop(undefined);
    setCompletedCrop(null);
  }, [searchImage]);

  // --- Category pill click → navigate to /category (SSR) ---
  const handleSelectCategory = (cat: string) => {
    const slug = cat.toLowerCase().replace(/\s+/g, '-');
    if (slug === 'for-you') {
      router.push('/');
    } else {
      router.push(`/${slug}`);
    }
  };

  const activeCategoryLabel = initialCategory === 'for-you'
    ? 'For You'
    : initialCategory.split('-').map((w) => w.replace(/[a-z]/, (c) => c.toUpperCase())).join(' ');

  // --- SSR page navigation ---
  const getPageHref = (p: number) => {
    const base = initialCategory === 'for-you' ? '' : `/${initialCategory}`;
    const filterPart = Object.keys(initialFilter).length
      ? `?filter=${encodeURIComponent(JSON.stringify(initialFilter))}`
      : '';
    return p === 1 ? `${base || '/'}${filterPart}` : `${base}/page-${p}${filterPart}`;
  };

  const isSearching = searchQuery || searchImage;
  const hasActiveCrop = crop?.width || completedCrop?.width;
  const displayedPins = isSearching ? searchPins : pins;
  const showPagination = !isSearching && totalPages > 1;

  return (
    <>
      {!isSearching && (
        <CategoryPills
          categories={categories}
          selectedCategory={activeCategoryLabel}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {isSearching && (
        <div className="mb-8 flex flex-col gap-4 bg-surface p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {searchImage ? (
                <div>
                  <h2 className="text-2xl font-display font-bold flex items-center gap-2 text-ink-invert">
                    <ScanSearch className="text-neon" />
                    Visual Search
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {hasActiveCrop ? 'Showing live matches for selected area' : 'Draw a box to search a specific area'}
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-display font-bold text-ink-invert">Search Results</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Showing results for &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </div>
            <button
              onClick={clearSearch}
              className="flex items-center gap-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 px-5 py-2.5 rounded-full transition-colors text-sm font-medium text-ink-invert"
            >
              <X size={16} />
              Clear Search
            </button>
          </div>

          {searchImage && (
            <div className="mt-4 flex justify-center bg-black/5 dark:bg-black/50 rounded-2xl p-4 border border-black/5 dark:border-white/5">
              <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} className="max-h-[40vh] object-contain">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={searchImage} alt="Search query" className="max-h-[40vh] w-auto object-contain rounded-lg" />
              </ReactCrop>
            </div>
          )}
        </div>
      )}

      {(isSearching ? searchLoading : isLoading) && <MasonryGridSkeleton count={15} />}

      {!(isSearching ? searchLoading : isLoading) && (
        displayedPins.length > 0 ? (
          <>
            <MasonryGrid pins={displayedPins} />

            {showPagination && (
              <div className="flex items-center justify-center gap-2 mt-12 mb-6">
                <Link
                  href={getPageHref(initialPage - 1)}
                  aria-disabled={initialPage <= 1}
                  className={`p-2.5 rounded-full bg-surface border border-black/10 dark:border-white/10 text-ink-invert hover:bg-black/5 dark:hover:bg-white/10 transition-all ${initialPage <= 1 ? 'pointer-events-none opacity-30' : ''
                    }`}
                >
                  <ChevronLeft size={18} />
                </Link>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - initialPage) <= 2)
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`e-${idx}`} className="px-1 text-gray-500">…</span>
                    ) : (
                      <Link
                        key={item}
                        href={getPageHref(item as number)}
                        className={`w-10 h-10 rounded-full text-sm font-bold transition-all flex items-center justify-center ${item === initialPage
                          ? 'bg-neon text-ink shadow-[0_0_12px_rgba(204,255,0,0.4)] pointer-events-none'
                          : 'bg-surface border border-black/10 dark:border-white/10 text-ink-invert hover:bg-black/5 dark:hover:bg-white/10'
                          }`}
                      >
                        {item}
                      </Link>
                    )
                  )}

                <Link
                  href={getPageHref(initialPage + 1)}
                  aria-disabled={initialPage >= totalPages}
                  className={`p-2.5 rounded-full bg-surface border border-black/10 dark:border-white/10 text-ink-invert hover:bg-black/5 dark:hover:bg-white/10 transition-all ${initialPage >= totalPages ? 'pointer-events-none opacity-30' : ''
                    }`}
                >
                  <ChevronRight size={18} />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No pins found.</p>
          </div>
        )
      )}
    </>
  );
}