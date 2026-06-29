import { CategoryPills, CATEGORIES } from '../components/CategoryPills';
import { MasonryGrid, MasonryGridSkeleton } from '../components/MasonryGrid';
import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { X, ScanSearch } from 'lucide-react';
import ReactCrop, { type Crop } from 'react-image-crop';
import { apex } from '../lib/apex';
import { useAuth } from '../context/AuthContext';
import { getCroppedImg } from '../lib/imageUtils';
import 'react-image-crop/dist/ReactCrop.css';

export function Home() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [pins, setPins] = useState<any[]>([]);
  const { searchQuery, searchImage, clearSearch } = useSearch();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);

  useEffect(() => {
    const fetchPins = async () => {
      setIsLoading(true);
      try {
        let results: any[] = [];

        if (searchImage) {
          // Visual Search
          if (completedCrop && completedCrop.width && completedCrop.height) {
            try {
              const imgElement = document.querySelector('.ReactCrop img') as HTMLImageElement;
              const croppedImage = await getCroppedImg(searchImage, completedCrop, imgElement);
              if (croppedImage) {
                results = await apex.collection('pins').searchImageVectorWithImage(croppedImage, 20);
              } else {
                results = await apex.collection('pins').searchImageVectorWithImage(searchImage, 20);
              }
            } catch (err) {
              console.error("Failed to crop image for search:", err);
              results = await apex.collection('pins').searchImageVectorWithImage(searchImage, 20);
            }
          } else {
            results = await apex.collection('pins').searchImageVectorWithImage(searchImage, 20);
          }
        } else if (searchQuery) {
          // Text Search using multi-modal vector
          results = await apex.collection('pins').searchImageVectorWithText(searchQuery, 20);
        } else {
          // Default Feed / Category
          const list = await apex.collection('pins').list({
            filter: selectedCategory !== 'For You' ? { category: selectedCategory } : undefined,
            per_page: 50,
            expand: 'author_id'
          });
          results = list.items;
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
          const pinIds = mappedPins.map(p => p.id);
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

        setPins(finalPins);
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
  }, [selectedCategory, searchQuery, searchImage, completedCrop, user]);

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

      {isLoading ? (
        <MasonryGridSkeleton count={20} />
      ) : (
        pins.length > 0 ? (
          <MasonryGrid pins={pins} />
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No pins found matching your search.</p>
          </div>
        )
      )}
    </>
  );
}