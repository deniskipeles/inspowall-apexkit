'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MasonryGrid, MasonryGridSkeleton } from './MasonryGrid';
import { Share2, ExternalLink, Copy, CheckCheck, X } from 'lucide-react';
import { apex } from '@/lib/apex';
import { getImageUrl } from '@/lib/apex';
import { useAuth } from '@/context/AuthContext';

const PER_PAGE = 15;

function SharePanel({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const targets = [
    { label: 'Copy link', icon: copied ? <CheckCheck size={18} className="text-neon" /> : <Copy size={18} />, onClick: handleCopy, href: null },
    { label: 'Share on X', icon: <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.261 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>, href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out ${name} on InspoWall`)}`, onClick: null },
    { label: 'Share on Facebook', icon: <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current text-blue-500"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, onClick: null },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-bold text-ink-invert">Share Profile</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-ink-invert">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4 truncate">{url}</p>
        <div className="flex flex-col gap-2">
          {targets.map(t => t.href ? (
            <a key={t.label} href={t.href} target="_blank" rel="noreferrer noopener"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm font-medium text-ink-invert border border-black/5 dark:border-white/5">
              <span className="flex-shrink-0">{t.icon}</span>{t.label}
            </a>
          ) : (
            <button key={t.label} onClick={t.onClick!}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm font-medium text-ink-invert border border-black/5 dark:border-white/5 text-left">
              <span className="flex-shrink-0">{t.icon}</span>
              {copied && t.label === 'Copy link' ? 'Copied!' : t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfilePageClient({ username, initialProfile }: { username: string; initialProfile: any | null }) {
  const [profile] = useState(initialProfile);
  const [pins, setPins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const { user } = useAuth();

  const url = typeof window !== 'undefined' ? window.location.href : `https://inspowall.pages.dev/@${username}`;

  const fetchPins = useCallback(async (pageNum: number, append: boolean) => {
    if (!profile) return;
    if (pageNum === 1) setIsLoading(true); else setIsLoadingMore(true);
    try {
      const list = await apex.collection('pins').list({
        filter: { author_id: profile.userId },
        page: pageNum,
        per_page: PER_PAGE,
      });

      const mapped = await Promise.all((list.items || []).map(async (record: any) => {
        const data = record.data || record;
        return {
          id: record.id,
          image: await getImageUrl(data.image, '300x0'),
          title: data.title,
          author: profile.name || username,
          category: data.category,
          height: data.height || 300,
          likes_count: data.likes_count || 0,
        };
      }));

      let likedIds = new Set<string | number>();
      let savedIds = new Set<string | number>();
      if (user && mapped.length > 0) {
        const pinIds = mapped.map(p => p.id);
        try {
          const [likesRes, savedRes] = await Promise.all([
            apex.collection('likes').list({ filter: { $and: [{ user_id: user.id, pin_id: { $in: pinIds } }] }, per_page: 100 }),
            apex.collection('saved_pins').list({ filter: { $and: [{ user_id: user.id, pin_id: { $in: pinIds } }] }, per_page: 100 }),
          ]);
          likesRes.items.forEach((item: any) => { if (item.data?.pin_id) likedIds.add(item.data.pin_id); });
          savedRes.items.forEach((item: any) => { if (item.data?.pin_id) savedIds.add(item.data.pin_id); });
        } catch { /* silent */ }
      }

      const final = mapped.map(p => ({ ...p, initiallyLiked: likedIds.has(p.id), initiallySaved: savedIds.has(p.id) }));

      if (append) {
        setPins(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...final.filter(p => !existingIds.has(p.id))];
        });
      } else {
        setPins(final);
      }
      setHasMore(final.length + (append ? pins.length : 0) < list.total);
    } catch (err) {
      console.error('Failed to fetch profile pins:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [profile, user, username]);

  useEffect(() => {
    fetchPins(1, false);
    setPage(1);
  }, [profile, user]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPins(next, true);
  };

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold text-ink-invert">User not found</h2>
        <Link href="/" className="text-neon mt-4 inline-block hover:underline">Return to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pt-8">
      {showShare && <SharePanel url={url} name={profile.name || username} onClose={() => setShowShare(false)} />}

      <div className="flex flex-col items-center text-center mb-12">
        <div className="relative w-32 h-32 rounded-full border-4 border-surface shadow-2xl mb-4 overflow-hidden">
          <Image src={profile.avatar} alt={profile.name || username} fill sizes="128px" className="object-cover" unoptimized />
        </div>
        <h1 className="text-4xl font-display font-bold mb-1 text-ink-invert">{profile.name || username}</h1>
        <p className="text-gray-400 mb-1">@{username}</p>
        {profile.bio && <p className="text-gray-500 text-sm max-w-md mb-2">{profile.bio}</p>}
        {profile.website && (
          <a href={profile.website} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 text-neon text-sm hover:underline mb-4">
            <ExternalLink size={14} />{profile.website.replace(/^https?:\/\//, '')}
          </a>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-2 bg-surface hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 px-6 py-2.5 rounded-full font-medium transition-colors text-ink-invert"
          >
            <Share2 size={16} />
            Share
          </button>
          <button
            onClick={() => setFollowing(f => !f)}
            className={`px-6 py-2.5 rounded-full font-medium transition-all border ${
              following
                ? 'bg-neon text-ink border-neon shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-ink-invert border-black/10 dark:border-transparent'
            }`}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-8 border-b border-black/10 dark:border-white/10">
        <div className="pb-4 font-medium text-ink-invert relative">
          Created
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neon rounded-t-full" />
        </div>
      </div>

      {isLoading ? (
        <MasonryGridSkeleton count={15} />
      ) : pins.length > 0 ? (
        <>
          <MasonryGrid pins={pins} />
          {hasMore && (
            <div className="flex justify-center mt-12 mb-6">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="bg-surface hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-ink-invert px-8 py-3.5 rounded-full font-bold transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">No pins yet.</div>
      )}
    </div>
  );
}