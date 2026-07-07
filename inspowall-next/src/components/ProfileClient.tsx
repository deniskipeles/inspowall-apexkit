'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { redirect, useRouter } from 'next/navigation';
import Image from 'next/image';
import { MasonryGrid, MasonryGridSkeleton } from './MasonryGrid';
import { LogOut } from 'lucide-react';
import { apex, getImageUrl } from '@/lib/apex';

export function ProfileClient() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('saved');
  const [pins, setPins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfilePins = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        let results: any[] = [];
        if (activeTab === 'created') {
          const list = await apex.collection('pins').list({ filter: { author_id: Number(user.id) }, expand: 'author_id' });
          results = list.items;
        } else {
          const list = await apex.collection('saved_pins').list({ filter: { user_id: Number(user.id) }, expand: 'pin_id,pin_id.author_id' });
          results = list.items.map((item: any) => {
            const pin = item.expand?.pin_id;
            return Array.isArray(pin) ? pin[0] : pin;
          });
        }

        const mapped = await Promise.all(
          (results || []).filter(Boolean).map(async (p: any) => {
            const pData = p.data || p;
            const authorObj = p.expand?.author_id;
            const authorRecord = Array.isArray(authorObj) ? authorObj[0] : authorObj;
            const authorData = (authorRecord?.metadata || authorRecord) || {};

            return {
              id: p.id,
              image: await getImageUrl(pData.image, '300x0'),
              title: pData.title,
              author: authorData.name || pData.author || 'Anonymous',
              category: pData.category,
              height: pData.height || 300,
              likes_count: pData.likes_count || 0,
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
            likesRes.items.forEach((item: any) => {
              if (item.data?.pin_id) likedPinIds.add(item.data.pin_id);
            });
            savedRes.items.forEach((item: any) => {
              if (item.data?.pin_id) savedPinIds.add(item.data.pin_id);
            });
          } catch (err) {
            console.error('Failed to batch fetch likes/saves on profile:', err);
          }
        }

        setPins(mapped.map((p) => ({ ...p, initiallyLiked: likedPinIds.has(p.id), initiallySaved: savedPinIds.has(p.id) })));
      } catch (err) {
        console.error('Failed to fetch profile pins:', err);
        setPins([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfilePins();
  }, [user, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-neon border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="max-w-7xl mx-auto pt-8">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="relative w-32 h-32 rounded-full border-4 border-surface shadow-2xl mb-4 overflow-hidden">
          <Image src={user.avatar || undefined as any} alt={user.name} fill sizes="128px" className="object-cover" referrerPolicy="no-referrer" unoptimized />
        </div>
        <h1 className="text-4xl font-display font-bold mb-1">{user.name}</h1>
        <p className="text-gray-400 mb-4">{user.handle}</p>

        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <span className="block font-bold text-xl">1.2k</span>
            <span className="text-sm text-gray-400">Followers</span>
          </div>
          <div className="text-center">
            <span className="block font-bold text-xl">348</span>
            <span className="text-sm text-gray-400">Following</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="bg-surface hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 px-6 py-2.5 rounded-full font-medium transition-colors text-ink-invert">
            Share
          </button>
          <button className="bg-surface hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 px-6 py-2.5 rounded-full font-medium transition-colors text-ink-invert">
            Edit Profile
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-6 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-8 mb-8 border-b border-black/10 dark:border-white/10">
        <button
          onClick={() => setActiveTab('created')}
          className={`pb-4 font-medium transition-colors relative ${activeTab === 'created' ? 'text-ink-invert' : 'text-gray-500 hover:text-ink-invert'}`}
        >
          Created
          {activeTab === 'created' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neon rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-4 font-medium transition-colors relative ${activeTab === 'saved' ? 'text-ink-invert' : 'text-gray-500 hover:text-ink-invert'}`}
        >
          Saved
          {activeTab === 'saved' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neon rounded-t-full" />}
        </button>
      </div>

      {isLoading ? (
        <MasonryGridSkeleton count={12} />
      ) : pins.length > 0 ? (
        <MasonryGrid pins={pins} />
      ) : (
        <div className="text-center py-20 text-gray-500">No pins to show yet.</div>
      )}
    </div>
  );
}
