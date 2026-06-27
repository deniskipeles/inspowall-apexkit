import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MasonryGrid, MasonryGridSkeleton } from '../components/MasonryGrid';
import { ArrowLeft, Download, Heart, Share2, MoreHorizontal, ScanSearch, X, Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import { apex } from '../lib/apex';
import { useAuth } from '../context/AuthContext';
import 'react-image-crop/dist/ReactCrop.css';

export function PinDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLensMode, setIsLensMode] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [isLoadingPin, setIsLoadingPin] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveId, setSaveId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [pin, setPin] = useState<any>(null);
  const [similarPins, setSimilarPins] = useState<any[]>([]);
  
  // Fetch pin details
  useEffect(() => {
    const fetchPin = async () => {
      if (!id) return;
      setIsLoadingPin(true);
      try {
        const record = await apex.collection('pins').get(id, { expand: 'author_id' });
        const data = record.data || record;
        const authorObj = record.expand?.author_id;
        const authorRecord = Array.isArray(authorObj) ? authorObj[0] : authorObj;
        const authorData = (authorRecord?.data || authorRecord) || {};
        const pData = {
          id: record.id,
          title: data.title,
          description: data.description,
          author: authorData.name || 'Anonymous',
          authorHandle: authorData.handle || '@anonymous',
          authorAvatar: authorData.avatar ? apex.files.getFileUrl(authorData.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${record.id}`,
          image: apex.files.getFileUrl(data.image),
          tags: data.tags || [],
          likes_count: data.likes_count || 0
        };
        setPin(pData);
        setLikesCount(pData.likes_count);

        // Check if saved & liked
        if (user) {
          const [savedList, likedList] = await Promise.all([
            apex.collection('saved_pins').list({
              filter: `user_id = "${user.id}" && pin_id = "${id}"`
            }).catch(() => ({ total: 0, items: [] })),
            apex.collection('likes').list({
              filter: `user_id = "${user.id}" && pin_id = "${id}"`
            }).catch(() => ({ total: 0, items: [] }))
          ]);
          
          if (savedList.total > 0) {
            setIsSaved(true);
            setSaveId(savedList.items[0].id);
          } else {
            setIsSaved(false);
            setSaveId(null);
          }

          if (likedList.total > 0) {
            setIsLiked(true);
          } else {
            setIsLiked(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch pin:", err);
      } finally {
        setIsLoadingPin(false);
      }
    };

    window.scrollTo(0, 0);
    setIsLensMode(false);
    setCrop(undefined);
    setCompletedCrop(null);
    fetchPin();
  }, [id]);

  // Fetch similar pins
  useEffect(() => {
    const fetchSimilar = async () => {
      if (!pin) return;
      setIsLoadingSimilar(true);
      try {
        let results: any[] = [];
        if (isLensMode && completedCrop && completedCrop.width && completedCrop.height) {
          // Visual search for specific cropped area
          try {
            const croppedImage = await getCroppedImg(pin.image, completedCrop);
            if (croppedImage) {
              results = await apex.collection('pins').searchImageVector(croppedImage, 15);
            } else {
              results = await apex.collection('pins').searchImageVector(pin.image, 15);
            }
          } catch (err) {
            console.error("Failed to crop image for search:", err);
            results = await apex.collection('pins').searchImageVector(pin.image, 15);
          }
        } else if (isLensMode) {
          // Visual search for whole image
          results = await apex.collection('pins').searchImageVector(pin.image, 15);
        } else {
          // Text search based on title for "More like this"
          results = await apex.collection('pins').searchTextVector(pin.title, 15);
        }

        const mapped = (results || [])
          .filter((r: any) => r && r.id !== pin.id)
          .map((r: any) => {
            const rData = r.data || r;
            return {
              id: r.id,
              image: apex.files.getFileUrl(rData.image, '300x0'),
              title: rData.title,
              author: rData.author || 'Anonymous',
              category: rData.category,
              height: rData.height || 300
            };
          });
        setSimilarPins(mapped);
      } catch (err) {
        console.error("Failed to fetch similar:", err);
      } finally {
        setIsLoadingSimilar(false);
      }
    };

    fetchSimilar();
  }, [pin, isLensMode, completedCrop]);

  async function getCroppedImg(imageSrc: string, crop: Crop): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        
        // If crop unit is percentage, we need to calculate pixels
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

  const handleToggleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsLiking(true);
    try {
      const { liked } = await apex.collection('pins').toggleLike(user.id, pin.id);
      setIsLiked(liked);
      setLikesCount(prev => liked ? prev + 1 : Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to toggle like:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsSaving(true);
    try {
      if (isSaved && saveId) {
        await apex.collection('saved_pins').delete(saveId);
        setIsSaved(false);
        setSaveId(null);
      } else {
        const res = await apex.collection('saved_pins').create({
          user_id: user.id,
          pin_id: pin.id
        });
        setIsSaved(true);
        setSaveId(res.id);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasActiveCrop = crop?.width || completedCrop?.width;

  if (isLoadingPin) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="animate-pulse flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 h-[600px] bg-surface rounded-3xl"></div>
          <div className="w-full md:w-1/2 space-y-4">
            <div className="h-10 bg-surface rounded w-3/4"></div>
            <div className="h-6 bg-surface rounded w-1/2"></div>
            <div className="h-32 bg-surface rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pin) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold">Pin not found</h2>
        <Link to="/" className="text-neon mt-4 inline-block hover:underline">Return to home</Link>
      </div>
    );
  }

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
                src={pin.image || null} 
                alt={pin.title} 
                className="w-full h-auto max-h-[85vh] object-contain" 
                referrerPolicy="no-referrer" 
              />
            </ReactCrop>
          ) : (
            <img 
              src={pin.image || null} 
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
              <button 
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isLiked 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-red-500'
                }`}
              >
                {isLiking ? <Loader2 size={22} className="animate-spin" /> : <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />}
              </button>
              <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                <Share2 size={22} />
              </button>
              <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                <MoreHorizontal size={22} />
              </button>
            </div>
            <button 
              onClick={handleToggleSave}
              disabled={isSaving}
              className={`font-bold py-3 px-8 rounded-full transition-all text-lg shadow-[0_0_20px_rgba(204,255,0,0.2)] flex items-center gap-2 ${
                isSaved 
                ? 'bg-white/10 text-white hover:bg-white/20' 
                : 'bg-neon text-ink hover:bg-white'
              }`}
            >
              {isSaving ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isSaved ? (
                <>
                  <Check size={20} />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2 tracking-tight">{pin.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
            <span className="flex items-center gap-1.5">
              <Heart size={14} className={isLiked ? 'text-red-500 fill-red-500' : ''} />
              {likesCount} likes
            </span>
            <span>•</span>
            <span className="bg-white/5 px-3 py-1 rounded-full text-xs border border-white/5">{pin.category}</span>
          </div>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">{pin.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {pin.tags.map((tag: string, index: number) => (
              <span key={`${tag}-${index}`} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 cursor-pointer transition-colors">
                #{tag}
              </span>
            ))}
          </div>

          {/* Author */}
          <div className="flex items-center justify-between mt-auto pt-8 border-t border-white/10">
            <div className="flex items-center gap-4">
              <img 
                src={pin.authorAvatar || null} 
                alt={pin.author} 
                className="w-14 h-14 rounded-full border-2 border-surface object-cover" 
                referrerPolicy="no-referrer" 
              />
              <div>
                <h3 className="font-bold text-lg">{pin.author}</h3>
                <p className="text-gray-500 text-sm">{pin.authorHandle}</p>
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
