import { motion } from 'motion/react';
import { Heart, Download, ArrowUpRight, Check, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apex } from '../lib/apex';

export function PinCard({ id, image, title, author, height, initiallySaved = false, initiallyLiked = false, likes_count = 0 }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [isSaving, setIsSaving] = useState(false);
  const [saveId, setSaveId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(initiallyLiked);
  const [likesCount, setLikesCount] = useState(likes_count);
  const [isLiking, setIsLiking] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setIsSaved(initiallySaved);
    setIsLiked(initiallyLiked);
    setLikesCount(likes_count);
  }, [initiallySaved, initiallyLiked, likes_count]);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    setIsLiking(true);
    try {
      const res = await apex.scripts.run('toggle-like', { pinId: id });
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      console.error("Failed to toggle like:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    setIsSaving(true);
    try {
      if (isSaved) {
        let idToDelete = saveId;
        if (!idToDelete) {
          const list = await apex.collection('saved_pins').list({
            filter: `user_id = "${user.id}" && pin_id = "${id}"`
          });
          if (list.total > 0) idToDelete = list.items[0].id;
        }
        if (idToDelete) {
          await apex.collection('saved_pins').delete(idToDelete);
          setIsSaved(false);
          setSaveId(null);
        }
      } else {
        const res = await apex.collection('saved_pins').create({ user_id: user.id, pin_id: id });
        setIsSaved(true);
        setSaveId(res.id);
      }
    } catch (err) {
      console.error("Failed to toggle save on card:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      className="relative break-inside-avoid group cursor-zoom-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        onClick={() => navigate(`/pin/${id}`)}
        className="block relative rounded-2xl overflow-hidden bg-surface shadow-md"
      >
        {/* Aspect-ratio driven image — scales correctly to any column width.
            300 is the base width used when height was originally calculated
            in CreatePin.tsx (aspectRatio * 300), so this reconstructs the
            correct proportions regardless of screen size. */}
        <img
          src={image || null}
          alt={title}
          className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ aspectRatio: `300 / ${height}` }}
          referrerPolicy="no-referrer"
        />

        {/* Always-visible corner badges for touch/mobile */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-20 pointer-events-none">
          {isSaved && (
            <div className="bg-neon text-ink p-1.5 rounded-full shadow-lg border border-black/5">
              <Check size={12} className="stroke-[3]" />
            </div>
          )}
          {isLiked && (
            <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg border border-white/5">
              <Heart size={12} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 flex flex-col justify-between p-4 z-10 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex justify-end">
            <button
              onClick={handleToggleSave}
              disabled={isSaving}
              className={`font-bold py-2 px-5 rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center gap-1 ${isSaved ? 'bg-neon text-ink hover:opacity-90' : 'bg-black/60 text-white hover:bg-black/80'
                }`}
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isSaved ? (
                <><Check size={16} /><span>Saved</span></>
              ) : (
                'Save'
              )}
            </button>
          </div>
          <div className="flex justify-between items-end">
            <a
              href={image}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md py-2 px-3 rounded-full hover:bg-white/20 transition-colors text-xs font-medium text-white"
            >
              <ArrowUpRight size={14} />
              <span>vortex.io</span>
            </a>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <Download size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Title + like row */}
      <div className="mt-3 px-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm text-ink-invert line-clamp-2 leading-snug break-words">
            {title}
          </h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">{author}</p>
        </div>
        <button
          onClick={handleToggleLike}
          disabled={isLiking}
          className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium mt-0.5 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
        >
          {isLiking
            ? <Loader2 size={14} className="animate-spin" />
            : <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
          }
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>
      </div>
    </motion.div>
  );
}