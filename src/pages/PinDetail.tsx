import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { generateMockPins, MasonryGrid, MasonryGridSkeleton } from '../components/MasonryGrid';
import { ArrowLeft, Download, Heart, Share2, MoreHorizontal, ScanSearch, X } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export function PinDetail() {
  const { id } = useParams();
  const [isLensMode, setIsLensMode] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  
  // Scroll to top when ID changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLensMode(false);
    setCrop(undefined);
    setCompletedCrop(null);
  }, [id]);

  // Mock fetching pin details based on ID
  const pin = useMemo(() => {
    const keyword = ['architecture', 'neon', 'cyberpunk', 'nature', 'minimal', 'abstract', 'portrait', 'fashion', 'tech', 'space'][Math.floor(Math.random() * 10)];
    return {
      id,
      title: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Inspiration`,
      description: `A stunning visual exploration of ${keyword} aesthetics, featuring high contrast and brutalist elements. Perfect for your moodboard.`,
      author: `Creator ${id?.replace(/[^0-9]/g, '') || '0'}`,
      image: `https://picsum.photos/seed/${id}/800/1000`,
      tags: [keyword, 'inspiration', 'design', 'brutalist']
    };
  }, [id]);

  // Generate a base set of similar pins
  const baseSimilarPins = useMemo(() => generateMockPins(30, `similar-${id}-`), [id]);

  // Filter similar pins based on crop to simulate visual search
  const similarPins = useMemo(() => {
    if (isLensMode) {
      const activeCrop = crop?.width ? crop : completedCrop;
      if (activeCrop && activeCrop.width > 0) {
        const offset = Math.floor((activeCrop.x + activeCrop.y) / 20) % 4;
        return baseSimilarPins.filter((_, i) => i % 4 === offset).slice(0, 15);
      }
    }
    return baseSimilarPins.slice(0, 15);
  }, [baseSimilarPins, isLensMode, crop, completedCrop]);

  // Simulate loading when entering lens mode
  useEffect(() => {
    if (isLensMode) {
      setIsLoadingSimilar(true);
      const timer = setTimeout(() => {
        setIsLoadingSimilar(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLensMode]); // Removed completedCrop to allow live filtering

  const hasActiveCrop = crop?.width || completedCrop?.width;

  return (
    <div className="max-w-7xl mx-auto">
      <Helmet>
        <title>{pin.title} | Vortex</title>
        <meta name="description" content={pin.description} />
        <meta property="og:title" content={pin.title} />
        <meta property="og:description" content={pin.description} />
        <meta property="og:image" content={pin.image} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors font-medium">
        <ArrowLeft size={20} />
        <span>Back to feed</span>
      </Link>

      <div className="bg-surface rounded-3xl overflow-hidden flex flex-col md:flex-row mb-16 border border-white/5 shadow-2xl">
        {/* Image Section */}
        <div className="w-full md:w-1/2 bg-black flex items-center justify-center relative group min-h-[50vh]">
          {isLensMode ? (
            <ReactCrop 
              crop={crop} 
              onChange={c => setCrop(c)} 
              onComplete={c => setCompletedCrop(c)}
              className="max-h-[85vh] object-contain"
            >
              <img 
                src={pin.image} 
                alt={pin.title} 
                className="w-full h-auto max-h-[85vh] object-contain" 
                referrerPolicy="no-referrer" 
              />
            </ReactCrop>
          ) : (
            <img 
              src={pin.image} 
              alt={pin.title} 
              className="w-full h-auto max-h-[85vh] object-contain" 
              referrerPolicy="no-referrer" 
            />
          )}

          {/* Lens Toggle Button */}
          <div className="absolute top-4 right-4 flex gap-2 transition-opacity">
            <button 
              onClick={() => {
                setIsLensMode(!isLensMode);
                if (isLensMode) {
                  setCrop(undefined);
                  setCompletedCrop(null);
                }
              }}
              className={`backdrop-blur-md p-3 rounded-full transition-colors flex items-center gap-2 ${
                isLensMode ? 'bg-neon text-ink hover:bg-white' : 'bg-black/50 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100'
              }`}
              title={isLensMode ? "Exit visual search" : "Search by image section"}
            >
              {isLensMode ? <X size={20} /> : <ScanSearch size={20} />}
              {isLensMode && <span className="font-bold text-sm pr-1">Exit Lens</span>}
            </button>
            {!isLensMode && (
              <button className="bg-black/50 backdrop-blur-md p-3 rounded-full hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100 text-white">
                <Download size={20} />
              </button>
            )}
          </div>
          
          {isLensMode && !hasActiveCrop && (
            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
              <span className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium">
                Draw a box to search a specific area
              </span>
            </div>
          )}
        </div>
        
        {/* Details Section */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div className="flex gap-3">
              <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-gray-300 hover:text-neon">
                <Heart size={22} />
              </button>
              <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                <Share2 size={22} />
              </button>
              <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                <MoreHorizontal size={22} />
              </button>
            </div>
            <button className="bg-neon text-ink font-bold py-3 px-8 rounded-full hover:bg-white transition-colors text-lg shadow-[0_0_20px_rgba(204,255,0,0.2)]">
              Save
            </button>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">{pin.title}</h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">{pin.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {pin.tags.map(tag => (
              <span key={tag} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 cursor-pointer transition-colors">
                #{tag}
              </span>
            ))}
          </div>

          {/* Author */}
          <div className="flex items-center justify-between mt-auto pt-8 border-t border-white/10">
            <div className="flex items-center gap-4">
              <img 
                src={`https://picsum.photos/seed/user-${pin.author}/100/100`} 
                alt={pin.author} 
                className="w-14 h-14 rounded-full border-2 border-surface" 
                referrerPolicy="no-referrer" 
              />
              <div>
                <h3 className="font-bold text-lg">{pin.author}</h3>
                <p className="text-gray-500 text-sm">12.4k followers</p>
              </div>
            </div>
            <button className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-full font-medium transition-colors">
              Follow
            </button>
          </div>
        </div>
      </div>

      {/* Similar Images */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">
          {isLensMode && hasActiveCrop ? 'Live matches for selected area' : 'More like this'}
        </h2>
      </div>
      
      {isLoadingSimilar ? (
        <MasonryGridSkeleton count={15} />
      ) : (
        <MasonryGrid pins={similarPins} />
      )}
    </div>
  );
}
