import { CategoryPills, CATEGORIES } from '../components/CategoryPills';
import { MasonryGrid, MasonryGridSkeleton, generateMockPins } from '../components/MasonryGrid';
import { useMemo, useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { X, ScanSearch } from 'lucide-react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const { searchQuery, searchImage, clearSearch } = useSearch();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  
  // Generate a larger pool of pins so filtering has enough items
  const allPins = useMemo(() => generateMockPins(100, 'home-'), []);

  const filteredPins = useMemo(() => {
    let result = allPins;

    if (searchImage) {
      // Mock visual search: return a subset of pins to simulate "visually similar" results
      // Use active crop for live feedback, fallback to completedCrop
      const activeCrop = crop?.width ? crop : completedCrop;
      const offset = activeCrop && activeCrop.width > 0 ? Math.floor((activeCrop.x + activeCrop.y) / 20) % 4 : 0;
      result = allPins.filter((_, i) => i % 4 === offset);
    } else if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = allPins.filter(pin => 
        pin.title.toLowerCase().includes(q) || 
        pin.category.toLowerCase().includes(q) ||
        pin.author.toLowerCase().includes(q)
      );
    } else {
      if (selectedCategory !== 'For You') {
        result = allPins.filter(pin => pin.category === selectedCategory);
      }
    }
    return result;
  }, [allPins, selectedCategory, searchQuery, searchImage, crop, completedCrop]);

  // Simulate network request delay when category or search changes
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600); // 600ms loading simulation
    
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, searchImage]); // Removed crop dependencies to allow live filtering

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
        <div className="mb-8 flex flex-col gap-4 bg-surface p-6 rounded-3xl border border-white/5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {searchImage ? (
                <div>
                  <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                    <ScanSearch className="text-neon" />
                    Visual Search
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {hasActiveCrop ? 'Showing live matches for selected area' : 'Draw a box to search a specific area'}
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-display font-bold">Search Results</h2>
                  <p className="text-sm text-gray-400 mt-1">Showing results for "{searchQuery}"</p>
                </div>
              )}
            </div>
            <button 
              onClick={clearSearch}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full transition-colors text-sm font-medium"
            >
              <X size={16} />
              Clear Search
            </button>
          </div>

          {searchImage && (
            <div className="mt-4 flex justify-center bg-black/50 rounded-2xl p-4 border border-white/5">
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                className="max-h-[40vh] object-contain"
              >
                <img 
                  src={searchImage} 
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
        filteredPins.length > 0 ? (
          <MasonryGrid pins={filteredPins} />
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No pins found matching your search.</p>
          </div>
        )
      )}
    </>
  );
}
