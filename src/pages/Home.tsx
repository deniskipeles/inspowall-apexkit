import { CategoryPills } from '../components/CategoryPills';
import { MasonryGrid, MasonryGridSkeleton } from '../components/MasonryGrid';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { X, ScanSearch, Loader2 } from 'lucide-react';
import ReactCrop, { type Crop } from 'react-image-crop';
import { apex } from '../lib/apex';
import { useAuth } from '../context/AuthContext';
import { getCroppedImg } from '../lib/imageUtils';
import 'react-image-crop/dist/ReactCrop.css';

const PER_PAGE = 15; // Standard page size for smooth layout loads

export function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'For You';
  const [categories, setCategories] = useState<string[]>(['For You']);
  const [isLoading, setIsLoading] = useState(true);
  const [pins, setPins] = useState<any[]>([]);
  const { searchQuery, searchImage, clearSearch } = useSearch();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const setSelectedCategory = (category: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (category === 'For You') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', category);
    }
    setSearchParams(nextParams);
  };

  // Fetch dynamic database categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const list = await apex.scripts.run('get-categories', {});
        if (Array.isArray(list)) {
          setCategories(['For You', ...list]);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic categories:", err);
      }
    };
    loadCategories();
  }, []);

  // Reset page and clear list immediately on filter/query changes for quick UX feedback
  useEffect(() => {
    setPage(1);
    setPins([]);
  }, [selectedCategory, searchQuery, searchImage, completedCrop]);

  useEffect(() => {
    const fetchPins = async () => {
      setIsLoading(true);
      try {
        let results: any[] = [];
        let totalCount = 0;
        const currentLimit = page * PER_PAGE;

        if (searchImage) {
          // Visual Search (scales limit dynamically with page size)
          if (completedCrop && completedCrop.width && completedCrop.height) {
            try {
              const imgElement = document.querySelector('.ReactCrop img') as HTMLImageElement;
              const croppedImage = await getCroppedImg(searchImage, completedCrop, imgElement);
              if (croppedImage) {
                results = await apex.collection('pins').searchImageVectorWithImage(croppedImage, currentLimit);
              } else {
                results = await apex.collection('pins').searchImageVectorWithImage(searchImage, currentLimit);
              }
            } catch (err) {
              console.error("Failed to crop image for search:", err);
              results = await apex.collection('pins').searchImageVectorWithImage(searchImage, currentLimit);
            }
          } else {
            results = await apex.collection('pins').searchImageVectorWithImage(searchImage, currentLimit);
          }
          totalCount = results.length;
        } else if (searchQuery) {
          // Text Search using multi-modal vector
          results = await apex.collection('pins').searchImageVectorWithText(searchQuery, currentLimit);
          totalCount = results.length;
        } else {
          // Default Feed / Category (Using native SQL page offsets)
          const list = await apex.collection('pins').list({
            filter: selectedCategory !== 'For You' ? { category: selectedCategory } : undefined,
            page: page,
            per_page: PER_PAGE,
            expand: 'author_id'
          });
          results = list.items;
          totalCount = list.total;
        }

        const mappedPins = (results || []).map((record: any) => {
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
            likes_count: data.likes_count || 0
          };
        });

        // --- OPTIMIZED SINGLE BATCH FETCH FOR ALL LIKES & SAVES USING $and ---
        let likedPinIds = new Set<string | number>();
        let savedPinIds = new Set<string | number>();

        if (user && mappedPins.length > 0) {
          const allPins = page > 1 ? [...pins, ...mappedPins] : mappedPins;
          const pinIds = Array.from(new Set(allPins.map(p => p.id)));
          try {
            const [likesRes, savedRes] = await Promise.all([
              apex.collection('likes').list({
                filter: {
                  $and: [
                    {
                      user_id: user.id,
                      pin_id: { $in: pinIds }
                    }
                  ]
                },
                per_page: 100
              }),
              apex.collection('saved_pins').list({
                filter: {
                  $and: [
                    {
                      user_id: user.id,
                      pin_id: { $in: pinIds }
                    }
                  ]
                },
                per_page: 100
              })
            ]);

            // Safely target the nested data property
            likesRes.items.forEach((item: any) => {
              const pId = item.data?.pin_id;
              if (pId) likedPinIds.add(pId);
            });

            savedRes.items.forEach((item: any) => {
              const pId = item.data?.pin_id;
              if (pId) savedPinIds.add(pId);
            });
          } catch (err) {
            console.error("Failed to batch fetch likes/saves:", err);
          }
        }

        const finalPins = mappedPins.map(p => ({
          ...p,
          initiallyLiked: likedPinIds.has(p.id),
          initiallySaved: savedPinIds.has(p.id)
        }));

        if (page === 1) {
          setPins(finalPins);
          if (searchImage || searchQuery) {
            setHasMore(results.length >= currentLimit);
          } else {
            setHasMore(finalPins.length < totalCount);
          }
        } else {
          setPins(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = finalPins.filter(p => !existingIds.has(p.id));
            const combined = [...prev, ...uniqueNew];
            
            if (searchImage || searchQuery) {
              setHasMore(results.length >= currentLimit);
            } else {
              setHasMore(combined.length < totalCount);
            }
            return combined;
          });
        }
      } catch (err: any) {
        if (!err.message?.includes('Rate limit')) {
          console.error("Failed to fetch pins:", err);
          setPins([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchPins();
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, searchImage, completedCrop, page, user]);

  // Reset crop when search image changes
  useEffect(() => {
    setCrop(undefined);
    setCompletedCrop(null);
  }, [searchImage]);

  const isSearching = searchQuery || searchImage;
  const hasActiveCrop = crop?.width || completedCrop?.width;

  return (
    <>
      {!isSearching && (
        <CategoryPills
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
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
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Showing results for "{searchQuery}"</p>
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
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                className="max-h-[40vh] object-contain"
              >
                <img
                  src={searchImage || undefined}
                  alt="Search query"
                  className="max-h-[40vh] w-auto object-contain rounded-lg"
                />
              </ReactCrop>
            </div>
          )}
        </div>
      )}

      {isLoading && page === 1 ? (
        <MasonryGridSkeleton count={15} />
      ) : (
        pins.length > 0 ? (
          <>
            <MasonryGrid pins={pins} />
            
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-12 mb-6">
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={isLoading}
                  className="bg-surface hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-ink-invert px-8 py-3.5 rounded-full font-bold text-md transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <span>Load More</span>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No pins found matching your search.</p>
          </div>
        )
      )}
    </>
  );
}