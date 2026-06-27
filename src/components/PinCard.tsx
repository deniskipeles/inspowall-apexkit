import { motion } from 'motion/react';
import { Heart, Download, ArrowUpRight, Check, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apex } from '../lib/apex';

export function PinCard({ id, image, title, author, height, initiallySaved = false, likes_count = 0 }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [isSaving, setIsSaving] = useState(false);
  const [saveId, setSaveId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(likes_count);
  const [isLiking, setIsLiking] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setLikesCount(likes_count);
    
    const checkLiked = async () => {
      if (user) {
        try {
          const list = await apex.collection('likes').list({
            filter: `user_id = "${user.id}" && pin_id = "${id}"`
          });
          setIsLiked(list.total > 0);
        } catch (err) {
          // Silently fail if 'likes' collection isn't created yet
        }
      }
    };
    checkLiked();
  }, [user, id, likes_count]);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    setIsLiking(true);
    try {
      const { liked } = await apex.collection('pins').toggleLike(user.id, id);
      setIsLiked(liked);
      setLikesCount(prev => liked ? prev + 1 : Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to toggle like:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    setIsSaving(true);
    try {
      if (isSaved) {
        // If we don't have saveId, we might need to find it first if it was initiallySaved
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
        const res = await apex.collection('saved_pins').create({
          user_id: user.id,
          pin_id: id
        });
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
      className="relative mb-6 break-inside-avoid group cursor-zoom-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div 
        onClick={() => navigate(`/pin/${id}`)} 
        className="block relative rounded-2xl overflow-hidden bg-surface"
      >
        <img 
          src={image || null} 
          alt={title} 
          className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ height: `${height}px` }}
          referrerPolicy="no-referrer"
        />
        
        {/* Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 flex flex-col justify-between p-4 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex justify-end">
            <button 
              onClick={handleToggleSave}
              disabled={isSaving}
              className={`font-bold py-2 px-5 rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center gap-1 ${
                isSaved 
                ? 'bg-black/60 text-white hover:bg-black/80' 
                : 'bg-neon text-ink hover:bg-white'
              }`}
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isSaved ? (
                <>
                  <Check size={16} />
                  <span>Saved</span>
                </>
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
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md py-2 px-3 rounded-full hover:bg-white/20 transition-colors text-xs font-medium"
            >
              <ArrowUpRight size={14} />
              <span>vortex.io</span>
            </a>
            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <Download size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 px-1 flex items-center justify-between">
        <div className="min-w-0 pr-4">
          <h3 className="font-medium text-sm text-gray-100 truncate">{title}</h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">{author}</p>
        </div>
        <button 
          onClick={handleToggleLike}
          disabled={isLiking}
          className={`transition-colors flex-shrink-0 flex items-center gap-1.5 text-xs font-medium ${
            isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          }`}
        >
          {isLiking ? <Loader2 size={14} className="animate-spin" /> : <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />}
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>
      </div>
    </motion.div>
  );
}
