'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MasonryGrid, MasonryGridSkeleton } from './MasonryGrid';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Crop } from 'react-image-crop';
import { apex } from '@/lib/apex';
import { useAuth } from '@/context/AuthContext';
import { getCroppedImg } from '@/lib/imageUtils';
import { PinImageLens } from './PinImageLens';
import { PinDetailsSection } from './PinDetailsSection';
import 'react-image-crop/dist/ReactCrop.css';

export function PinDetailClient({
  id,
  initialPin,
  initialSimilarPins = [],
}: {
  id: string;
  initialPin: any | null;
  initialSimilarPins?: any[];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [isLensMode, setIsLensMode] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveId, setSaveId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialPin?.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [pin] = useState<any>(initialPin);
  const [similarPins, setSimilarPins] = useState<any[]>(initialSimilarPins);

  // The pin itself is already SSR'd — this just checks per-user saved/liked
  // status once we know who's logged in, since that can't be known at SSR time.
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !pin) return;
      try {
        const [savedList, likedList] = await Promise.all([
          apex
            .collection('saved_pins')
            .list({ filter: { $and: [{ user_id: user.id, pin_id: Number(id) }] } })
            .catch(() => ({ total: 0, items: [] })),
          apex
            .collection('likes')
            .list({ filter: { $and: [{ user_id: user.id, pin_id: Number(id) }] } })
            .catch(() => ({ total: 0, items: [] })),
        ]);
        if (savedList.total > 0) {
          setIsSaved(true);
          setSaveId(savedList.items[0].id);
        } else {
          setIsSaved(false);
          setSaveId(null);
        }
        setIsLiked(likedList.total > 0);
      } catch (err) {
        console.error('Failed to check saved/liked status:', err);
      }
    };
    window.scrollTo(0, 0);
    setIsLensMode(false);
    setCrop(undefined);
    setCompletedCrop(null);
    checkStatus();
  }, [id, user, pin]);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!pin) return;

      // Default similar pins came from SSR — only re-fetch when lens mode is active
      if (!isLensMode) {
        setSimilarPins(initialSimilarPins);
        return;
      }

      setIsLoadingSimilar(true);
      try {
        let results: any[] = [];
        if (isLensMode && completedCrop && completedCrop.width && completedCrop.height) {
          try {
            const imgElement = document.querySelector('.ReactCrop img') as HTMLImageElement;
            const croppedImage = await getCroppedImg(pin.image, completedCrop, imgElement);
            results = croppedImage
              ? await apex.collection('pins').searchImageVectorWithImage(croppedImage, 15)
              : await apex.collection('pins').searchImageVectorWithImage(pin.image, 15);
          } catch (err) {
            console.error('Failed to crop image for search:', err);
            results = await apex.collection('pins').searchImageVectorWithImage(pin.image, 15);
          }
        } else if (isLensMode) {
          results = await apex.collection('pins').searchImageVectorWithImage(pin.image, 15);
        } else {
          try {
            const vectors = await apex.collection('pins').getVector(pin.id);
            const imageVector = vectors.find((v: any) => v.field_name === 'image')?.vector;
            if (imageVector) {
              const res = await apex.collection('pins').searchVectorWithVector('image', imageVector, { limit: 15 });
              results = res.items || res;
            } else {
              const res = await apex.collection('pins').searchVectorWithText(pin.title, { limit: 15 });
              results = res.items || res;
            }
          } catch (err) {
            console.error('Vector search failed, falling back to title search', err);
            const res = await apex.collection('pins').searchVectorWithText(pin.title, { limit: 15 });
            results = res.items || res;
          }
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
              height: rData.height || 300,
              likes_count: rData.likes_count || 0,
            };
          });

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

        setSimilarPins(mapped.map((p) => ({ ...p, initiallyLiked: likedPinIds.has(p.id), initiallySaved: savedPinIds.has(p.id) })));
      } catch (err) {
        console.error('Failed to fetch similar:', err);
      } finally {
        setIsLoadingSimilar(false);
      }
    };

    fetchSimilar();
  }, [pin, isLensMode, completedCrop, user]);

  const handleToggleLike = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setIsLiking(true);
    try {
      const res = await apex.scripts.run('toggle-like', { pinId: pin.id });
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setIsSaving(true);
    try {
      if (isSaved && saveId) {
        await apex.collection('saved_pins').delete(saveId);
        setIsSaved(false);
        setSaveId(null);
      } else {
        const res = await apex.collection('saved_pins').create({ user_id: user.id, pin_id: pin.id });
        setIsSaved(true);
        setSaveId(res.id);
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasActiveCrop = crop?.width || completedCrop?.width;

  if (!pin) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold">Pin not found</h2>
        <Link href="/" className="text-neon mt-4 inline-block hover:underline">
          Return to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-ink-invert mb-6 transition-colors font-medium">
        <ArrowLeft size={20} />
        <span>Back to feed</span>
      </Link>

      <div className="bg-surface rounded-3xl overflow-hidden flex flex-col md:flex-row mb-16 border border-black/5 dark:border-white/5 shadow-2xl">
        <PinImageLens
          image={pin.image}
          title={pin.title}
          isLensMode={isLensMode}
          setIsLensMode={setIsLensMode}
          crop={crop}
          setCrop={setCrop}
          completedCrop={completedCrop}
          setCompletedCrop={setCompletedCrop}
        />
        <PinDetailsSection
          pin={pin}
          isLiked={isLiked}
          isLiking={isLiking}
          likesCount={likesCount}
          handleToggleLike={handleToggleLike}
          isSaved={isSaved}
          isSaving={isSaving}
          handleToggleSave={handleToggleSave}
        />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">{isLensMode && hasActiveCrop ? 'Live matches for selected area' : 'More like this'}</h2>
      </div>

      {isLoadingSimilar ? <MasonryGridSkeleton count={15} /> : <MasonryGrid pins={similarPins} />}
    </div>
  );
}
