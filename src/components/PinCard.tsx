import { motion } from 'motion/react';
import { Heart, Download, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function PinCard({ id, image, title, author, height }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

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
          src={image} 
          alt={title} 
          className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ height: `${height}px` }}
          referrerPolicy="no-referrer"
        />
        
        {/* Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 flex flex-col justify-between p-4 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex justify-end">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="bg-neon text-ink font-bold py-2 px-5 rounded-full hover:bg-white transition-colors transform hover:scale-105 active:scale-95"
            >
              Save
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
        <button className="text-gray-500 hover:text-neon transition-colors flex-shrink-0">
          <Heart size={16} />
        </button>
      </div>
    </motion.div>
  );
}
