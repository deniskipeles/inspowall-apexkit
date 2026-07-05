import { Heart, Share2, MoreHorizontal, Check, Loader2 } from 'lucide-react';

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

export function PinDetailsSection({
  pin,
  isLiked,
  isLiking,
  likesCount,
  handleToggleLike,
  isSaved,
  isSaving,
  handleToggleSave
}: PinDetailsSectionProps) {
  return (
    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
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
          <button className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-300 hover:text-ink-invert">
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

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-8">
        {pin.tags.map((tag: string, index: number) => (
          <span key={`${tag}-${index}`} className="px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer transition-colors">
            #{tag}
          </span>
        ))}
      </div>

      {/* Author */}
      <div className="flex items-center justify-between mt-auto pt-8 border-t border-black/10 dark:border-white/10">
        <div className="flex items-center gap-4">
          <img 
            src={pin.authorAvatar || null} 
            alt={pin.author} 
            className="w-14 h-14 rounded-full border-2 border-surface object-cover" 
            referrerPolicy="no-referrer" 
          />
          <div>
            <h3 className="font-bold text-lg text-ink-invert">{pin.author}</h3>
            <p className="text-gray-500 text-sm">{pin.authorHandle}</p>
          </div>
        </div>
        <button className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 px-6 py-2.5 rounded-full font-medium transition-colors text-ink-invert border border-black/10 dark:border-transparent">
          Follow
        </button>
      </div>
    </div>
  );
}
