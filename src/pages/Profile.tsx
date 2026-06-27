import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { MasonryGrid, generateMockPins } from '../components/MasonryGrid';
import { LogOut } from 'lucide-react';

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('saved');

  const savedPins = useMemo(() => generateMockPins(24, 'saved-'), []);
  const createdPins = useMemo(() => generateMockPins(8, 'created-'), []);

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
          src={user.avatar} 
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
      <MasonryGrid pins={activeTab === 'created' ? createdPins : savedPins} />
    </div>
  );
}
