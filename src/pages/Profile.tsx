import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { MasonryGrid, MasonryGridSkeleton } from '../components/MasonryGrid';
import { LogOut } from 'lucide-react';
import { apex } from '../lib/apex';

export function Profile() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
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
          const list = await apex.collection('pins').list({
            filter: `author_id = "${user.id}"`,
            expand: 'author_id'
          });
          results = list.items;
        } else {
          const list = await apex.collection('saved_pins').list({
            filter: `user_id = "${user.id}"`,
            expand: 'pin_id,pin_id.author_id'
          });
          results = list.items.map((item: any) => {
            const pin = item.expand?.pin_id;
            return Array.isArray(pin) ? pin[0] : pin;
          });
        }

        const mapped = (results || []).filter(Boolean).map((p: any) => {
          const pData = p.data || p;
          const authorObj = p.expand?.author_id;
          const authorRecord = Array.isArray(authorObj) ? authorObj[0] : authorObj;
          const authorData = (authorRecord?.data || authorRecord) || {};
          
          return {
            id: p.id,
            image: apex.files.getFileUrl(pData.image, '300x0'),
            title: pData.title,
            author: authorData.name || pData.author || 'Anonymous',
            category: pData.category,
            height: pData.height || 300,
            initiallySaved: activeTab === 'saved',
            likes_count: pData.likes_count || 0
          };
        });
        setPins(mapped);
      } catch (err) {
        console.error("Failed to fetch profile pins:", err);
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
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto pt-8">
      <Helmet><title>{user.name} | Vortex</title></Helmet>
      
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mb-12">
        <img 
          src={user.avatar || null} 
          alt={user.name} 
          className="w-32 h-32 rounded-full object-cover border-4 border-surface shadow-2xl mb-4"
          referrerPolicy="no-referrer"
        />
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
          <button className="bg-surface hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-full font-medium transition-colors">
            Share
          </button>
          <button className="bg-surface hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-full font-medium transition-colors">
            Edit Profile
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-6 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-8 mb-8 border-b border-white/10">
        <button 
          onClick={() => setActiveTab('created')}
          className={`pb-4 font-medium transition-colors relative ${activeTab === 'created' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Created
          {activeTab === 'created' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neon rounded-t-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('saved')}
          className={`pb-4 font-medium transition-colors relative ${activeTab === 'saved' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Saved
          {activeTab === 'saved' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neon rounded-t-full" />
          )}
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <MasonryGridSkeleton count={12} />
      ) : pins.length > 0 ? (
        <MasonryGrid pins={pins} />
      ) : (
        <div className="text-center py-20 text-gray-500">
          No pins to show yet.
        </div>
      )}
    </div>
  );
}
