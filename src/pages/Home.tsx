import { CategoryPills, CATEGORIES } from '../components/CategoryPills';
import { MasonryGrid, MasonryGridSkeleton } from '../components/MasonryGrid';
import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { X, ScanSearch } from 'lucide-react';
import ReactCrop, { type Crop } from 'react-image-crop';
import { apex } from '../lib/apex';
import 'react-image-crop/dist/ReactCrop.css';

export function Home() {
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
              const croppedImage = await getCroppedImg(searchImage, completedCrop);
              if (croppedImage) {
                results = await apex.collection('pins').searchImageVector(croppedImage, 20);
              } else {
                results = await apex.collection('pins').searchImageVector(searchImage, 20);
              }
            } catch (err) {
              console.error("Failed to crop image for search:", err);
              results = await apex.collection('pins').searchImageVector(searchImage, 20);
            }
          } else {
            results = await apex.collection('pins').searchImageVector(searchImage, 20);
          }
        } else if (searchQuery) {
          // Text Search using multi-modal vector
          results = await apex.collection('pins').searchImageVectorWithText(searchQuery, 20);
        } else {
          // Default Feed / Category
          let filter = '';
          if (selectedCategory !== 'For You') {
            filter = `category = "${selectedCategory}"`;
          }
          const list = await apex.collection('pins').list({ 
            filter,
            per_page: 50,
            expand: 'author_id'
          });
          results = list.items;
        }

        const mappedPins = (results || []).map((record: any) => {
          const data = record.data || record;
          const authorObj = record.expand?.author_id;
          const authorRecord = Array.isArray(authorObj) ? authorObj[0] : authorObj;
          const authorData = (authorRecord?.data || authorRecord) || {};
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

        setPins(mappedPins);
      } catch (err) {
        console.error("Failed to fetch pins:", err);
        setPins([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPins();
  }, [selectedCategory, searchQuery, searchImage, completedCrop]);

  async function getCroppedImg(imageSrc: string, crop: Crop): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const imgElement = document.querySelector('.ReactCrop img') as HTMLImageElement;
        const scaleX = image.naturalWidth / (imgElement?.width || image.width);
        const scaleY = image.naturalHeight / (imgElement?.height || image.height);
        
        const pixelWidth = crop.unit === '%' ? (crop.width * image.naturalWidth) / 100 : crop.width * scaleX;
        const pixelHeight = crop.unit === '%' ? (crop.height * image.naturalHeight) / 100 : crop.height * scaleY;
        const pixelX = crop.unit === '%' ? (crop.x * image.naturalWidth) / 100 : crop.x * scaleX;
        const pixelY = crop.unit === '%' ? (crop.y * image.naturalHeight) / 100 : crop.y * scaleY;

        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(
          image,
          pixelX,
          pixelY,
          pixelWidth,
          pixelHeight,
          0,
          0,
          pixelWidth,
          pixelHeight
        );

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      image.onerror = (e) => reject(e);
    });
  }

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
                  src={searchImage || null} 
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
