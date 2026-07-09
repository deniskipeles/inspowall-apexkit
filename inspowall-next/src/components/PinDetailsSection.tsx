'use client';

import Image from 'next/image';
import { Heart, Share2, MoreHorizontal, Check, Loader2, ExternalLink, X, Copy, CheckCheck } from 'lucide-react';
import { useState } from 'react';

interface PinDetailsSectionProps {
  pin: any;
  isLiked: boolean;
  isLiking: boolean;
  likesCount: number;
  handleToggleLike: () => void;
  isSaved: boolean;
  isSaving: boolean;
  handleToggleSave: () => void;
}

function detectSource(metadata: any): 'pexels' | 'unsplash' | null {
  if (!metadata || typeof metadata !== 'object') return null;
  if (metadata.src?.original?.includes('pexels.com') || metadata.photographer) return 'pexels';
  if (metadata.alternative_slugs || metadata.urls?.raw?.includes('unsplash.com')) return 'unsplash';
  return null;
}

function getSourceCredit(metadata: any, source: 'pexels' | 'unsplash') {
  if (source === 'pexels') {
    return {
      name: metadata.photographer || 'Unknown',
      handle: `@${(metadata.photographer || 'unknown').toLowerCase().replace(/\s+/g, '-')}`,
      profileUrl: metadata.photographer_url || 'https://www.pexels.com',
      sourceUrl: metadata.url || 'https://www.pexels.com',
      sourceName: 'Pexels',
      sourceIcon: 'https://www.pexels.com/favicon.ico',
      avatarSeed: String(metadata.photographer_id || metadata.photographer || 'pexels'),
    };
  }
  return {
    name: metadata.user?.name || metadata.user?.username || 'Unknown',
    handle: `@${metadata.user?.username || 'unknown'}`,
    profileUrl: metadata.user?.links?.html || `https://unsplash.com/@${metadata.user?.username}`,
    sourceUrl: metadata.links?.html || 'https://unsplash.com',
    sourceName: 'Unsplash',
    sourceIcon: 'https://unsplash.com/favicon.ico',
    avatarSeed: String(metadata.user?.username || metadata.user?.id || 'unsplash'),
  };
}

function SourceMetadataPanel({ metadata, onClose }: { metadata: any; onClose: () => void }) {
  const source = detectSource(metadata);
  if (!source) return null;
  const credit = getSourceCredit(metadata, source);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${credit.avatarSeed}`;

  const links: { label: string; url: string }[] = [
    { label: `View on ${credit.sourceName}`, url: credit.sourceUrl },
    { label: `${credit.handle} on ${credit.sourceName}`, url: credit.profileUrl },
  ];
  if (source === 'pexels' && metadata.src?.original) {
    links.push({ label: 'Original full-res', url: metadata.src.original });
  }
  if (source === 'unsplash' && metadata.links?.download) {
    links.push({ label: 'Download on Unsplash', url: metadata.links.download });
  }

  return (
    <div className="absolute inset-0 z-30 bg-surface/95 backdrop-blur-sm rounded-3xl p-8 flex flex-col overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-ink-invert"
      >
        <X size={16} />
      </button>

      <h3 className="text-lg font-display font-bold text-ink-invert mb-6">Source & Credits</h3>

      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-surface flex-shrink-0">
          <Image src={avatarUrl} alt={credit.name} fill sizes="56px" className="object-cover" unoptimized />
        </div>
        <div className="min-w-0">
          <a href={credit.profileUrl} target="_blank" rel="noreferrer noopener" className="font-bold text-ink-invert hover:text-neon transition-colors block truncate">
            {credit.name}
          </a>
          <span className="text-sm text-gray-500">{credit.handle}@{credit.sourceName.toLowerCase()}</span>
        </div>
        <a href={credit.profileUrl} target="_blank" rel="noreferrer noopener" className="ml-auto flex-shrink-0 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-ink-invert">
          <ExternalLink size={16} />
        </a>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={credit.sourceIcon} alt={credit.sourceName} className="w-4 h-4" />
        <span className="text-sm text-gray-500">
          Photo from{' '}
          <a href={source === 'pexels' ? 'https://www.pexels.com' : 'https://unsplash.com'} target="_blank" rel="noreferrer noopener" className="text-neon hover:underline">
            {credit.sourceName}
          </a>
        </span>
      </div>

      {metadata.width && metadata.height && (
        <div className="text-sm text-gray-500 mb-6">Original resolution: {metadata.width} × {metadata.height}px</div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
        {links.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer noopener"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm font-medium text-ink-invert border border-black/5 dark:border-white/5"
          >
            <span className="truncate">{link.label}</span>
            <ExternalLink size={14} className="flex-shrink-0 text-gray-400" />
          </a>
        ))}
      </div>
    </div>
  );
}

function SharePanel({ pin, onClose }: { pin: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareTargets = [
    {
      label: 'Copy link',
      icon: copied ? <CheckCheck size={18} className="text-neon" /> : <Copy size={18} />,
      onClick: handleCopy,
      href: null,
    },
    {
      label: 'Share on X',
      icon: (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.261 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      ),
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(pin.title)}`,
      onClick: null,
    },
    {
      label: 'Share on Pinterest',
      icon: (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current text-red-500"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg>
      ),
      href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(pin.title)}`,
      onClick: null,
    },
    {
      label: 'Share on Facebook',
      icon: (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current text-blue-500"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      onClick: null,
    },
  ];

  return (
    <div className="absolute inset-0 z-30 bg-surface/95 backdrop-blur-sm rounded-3xl p-8 flex flex-col overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-ink-invert"
      >
        <X size={16} />
      </button>

      <h3 className="text-lg font-display font-bold text-ink-invert mb-2">Share</h3>
      <p className="text-sm text-gray-500 mb-6 truncate">{url}</p>

      <div className="flex flex-col gap-2">
        {shareTargets.map((target) =>
          target.href ? (
            <a
              key={target.label}
              href={target.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm font-medium text-ink-invert border border-black/5 dark:border-white/5"
            >
              <span className="flex-shrink-0 text-ink-invert">{target.icon}</span>
              {target.label}
            </a>
          ) : (
            <button
              key={target.label}
              onClick={target.onClick!}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm font-medium text-ink-invert border border-black/5 dark:border-white/5 text-left"
            >
              <span className="flex-shrink-0 text-ink-invert">{target.icon}</span>
              {copied && target.label === 'Copy link' ? 'Copied!' : target.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function PinDetailsSection({
  pin,
  isLiked,
  isLiking,
  likesCount,
  handleToggleLike,
  isSaved,
  isSaving,
  handleToggleSave,
}: PinDetailsSectionProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [following, setFollowing] = useState(false);

  const metadata = pin.metadata && typeof pin.metadata === 'object' && Object.keys(pin.metadata).length > 0
    ? pin.metadata
    : null;
  const source = metadata ? detectSource(metadata) : null;

  const closeAll = () => {
    setShowMetadata(false);
    setShowShare(false);
  };

  return (
    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col relative">
      {showMetadata && metadata && <SourceMetadataPanel metadata={metadata} onClose={closeAll} />}
      {showShare && <SharePanel pin={pin} onClose={closeAll} />}

      <div className="flex justify-between items-start mb-8">
        <div className="flex gap-3">
          <button
            onClick={handleToggleLike}
            disabled={isLiking}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isLiked
                ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10 hover:text-red-500'
            }`}
          >
            {isLiking ? <Loader2 size={22} className="animate-spin" /> : <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />}
          </button>

          <button
            onClick={() => { closeAll(); setShowShare(true); }}
            className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-300 hover:text-ink-invert"
          >
            <Share2 size={22} />
          </button>

          <button
            onClick={() => metadata && (closeAll(), setShowMetadata(true))}
            className={`w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-300 hover:text-ink-invert ${
              !metadata ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={metadata ? `View source on ${source === 'pexels' ? 'Pexels' : 'Unsplash'}` : 'No source info'}
            disabled={!metadata}
          >
            <MoreHorizontal size={22} />
          </button>
        </div>

        <button
          onClick={handleToggleSave}
          disabled={isSaving}
          className={`font-bold py-3 px-8 rounded-full transition-all text-lg shadow-[0_0_20px_rgba(204,255,0,0.2)] flex items-center gap-2 ${
            isSaved
              ? 'bg-black/10 dark:bg-white/10 text-ink-invert hover:bg-black/20 dark:hover:bg-white/20'
              : 'bg-neon text-ink hover:bg-ink-invert hover:text-ink'
          }`}
        >
          {isSaving ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isSaved ? (
            <><Check size={20} /><span>Saved</span></>
          ) : (
            <span>Save</span>
          )}
        </button>
      </div>

      <h1 className="text-4xl md:text-5xl font-display font-bold mb-2 tracking-tight text-ink-invert">{pin.title}</h1>
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
        <span className="flex items-center gap-1.5">
          <Heart size={14} className={isLiked ? 'text-red-500 fill-red-500' : ''} />
          {likesCount} likes
        </span>
        <span>•</span>
        <span className="bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full text-xs border border-black/5 dark:border-white/5">{pin.category}</span>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">{pin.description}</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {pin.tags.map((tag: string, index: number) => (
          <span
            key={`${tag}-${index}`}
            className="px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-auto pt-8 border-t border-black/10 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-full border-2 border-surface overflow-hidden flex-shrink-0">
            <Image src={pin.authorAvatar} alt={pin.author} fill sizes="56px" className="object-cover" referrerPolicy="no-referrer" unoptimized />
          </div>
          <div>
            <h3 className="font-bold text-lg text-ink-invert">{pin.author}</h3>
            <p className="text-gray-500 text-sm">{pin.authorHandle}</p>
            {metadata && source && (() => {
              const credit = getSourceCredit(metadata, source);
              return (
                <a
                  href={credit.profileUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs text-gray-400 hover:text-neon transition-colors mt-0.5 block"
                >
                  {credit.handle}@{credit.sourceName.toLowerCase()}
                </a>
              );
            })()}
          </div>
        </div>

        <button
          onClick={() => setFollowing((f) => !f)}
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
  );
}