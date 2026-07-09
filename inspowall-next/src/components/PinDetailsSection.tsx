import Image from 'next/image';
import { Heart, Share2, MoreHorizontal, Check, Loader2, ExternalLink, X } from 'lucide-react';
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

// Detect source from metadata shape
function detectSource(metadata: any): 'pexels' | 'unsplash' | null {
  if (!metadata || typeof metadata !== 'object') return null;
  if (metadata.src?.original?.includes('pexels.com')) return 'pexels';
  if (metadata.urls?.raw?.includes('unsplash.com')) return 'unsplash';
  if (metadata.alternative_slugs) return 'unsplash';
  if (metadata.photographer) return 'pexels';
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
      avatarSeed: metadata.photographer_id || metadata.photographer || 'pexels',
    };
  }
  // unsplash
  return {
    name: metadata.user?.name || metadata.user?.username || 'Unknown',
    handle: `@${metadata.user?.username || 'unknown'}`,
    profileUrl: metadata.user?.links?.html || `https://unsplash.com/@${metadata.user?.username}`,
    sourceUrl: metadata.links?.html || 'https://unsplash.com',
    sourceName: 'Unsplash',
    sourceIcon: 'https://unsplash.com/favicon.ico',
    avatarSeed: metadata.user?.username || metadata.user?.id || 'unsplash',
  };
}

function SourceMetadataPanel({ metadata, onClose }: { metadata: any; onClose: () => void }) {
  const source = detectSource(metadata);
  if (!source) return null;
  const credit = getSourceCredit(metadata, source);

  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${credit.avatarSeed}`;

  // Collect useful links
  const links: { label: string; url: string }[] = [
    { label: `View on ${credit.sourceName}`, url: credit.sourceUrl },
    { label: `${credit.handle} on ${credit.sourceName}`, url: credit.profileUrl },
  ];

  if (source === 'pexels' && metadata.src) {
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

      {/* Photographer / Author */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-surface flex-shrink-0">
          <Image
            src={avatarUrl}
            alt={credit.name}
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <a
            href={credit.profileUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="font-bold text-ink-invert hover:text-neon transition-colors block truncate"
          >
            {credit.name}
          </a>
          <span className="text-sm text-gray-500">
            {credit.handle}@{credit.sourceName.toLowerCase()}
          </span>
        </div>
        <a
          href={credit.profileUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto flex-shrink-0 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-ink-invert"
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {/* Source badge */}
      <div className="flex items-center gap-2 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={credit.sourceIcon} alt={credit.sourceName} className="w-4 h-4" />
        <span className="text-sm text-gray-500">
          Photo from{' '}
          <a
            href={source === 'pexels' ? 'https://www.pexels.com' : 'https://unsplash.com'}
            target="_blank"
            rel="noreferrer noopener"
            className="text-neon hover:underline"
          >
            {credit.sourceName}
          </a>
        </span>
      </div>

      {/* Dimensions if available */}
      {(metadata.width && metadata.height) && (
        <div className="text-sm text-gray-500 mb-6">
          Original resolution: {metadata.width} × {metadata.height}px
        </div>
      )}

      {/* Links */}
      <div className="flex flex-col gap-2 mt-auto">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
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

  const metadata = pin.metadata && typeof pin.metadata === 'object' && Object.keys(pin.metadata).length > 0
    ? pin.metadata
    : null;

  const source = metadata ? detectSource(metadata) : null;

  return (
    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col relative">
      {/* Source metadata panel overlay */}
      {showMetadata && metadata && (
        <SourceMetadataPanel metadata={metadata} onClose={() => setShowMetadata(false)} />
      )}

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
          <button className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-300 hover:text-ink-invert">
            <Share2 size={22} />
          </button>
          {/* Three dots — shows metadata panel if source metadata exists, otherwise is a generic menu */}
          <button
            onClick={() => metadata && setShowMetadata(true)}
            className={`w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-300 hover:text-ink-invert ${
              metadata ? 'cursor-pointer' : 'cursor-default'
            }`}
            title={metadata ? `View source on ${source === 'pexels' ? 'Pexels' : 'Unsplash'}` : undefined}
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
            <>
              <Check size={20} />
              <span>Saved</span>
            </>
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
          <div className="relative w-14 h-14 rounded-full border-2 border-surface overflow-hidden">
            <Image
              src={pin.authorAvatar}
              alt={pin.author}
              fill
              sizes="56px"
              className="object-cover"
              referrerPolicy="no-referrer"
              unoptimized
            />
          </div>
          <div>
            <h3 className="font-bold text-lg text-ink-invert">{pin.author}</h3>
            <p className="text-gray-500 text-sm">{pin.authorHandle}</p>
            {/* Inline source credit beneath the author row */}
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
        <button className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 px-6 py-2.5 rounded-full font-medium transition-colors text-ink-invert border border-black/10 dark:border-transparent">
          Follow
        </button>
      </div>
    </div>
  );
}