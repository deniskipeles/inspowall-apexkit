import { Search, Bell, MessageCircle, Plus, Camera, X, Clock, TrendingUp } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useAuth } from '../context/AuthContext';

const POPULAR_SEARCHES = [
  'Cyberpunk City',
  'Minimalist Setup',
  'Neon Typography',
  'Brutalist Architecture',
  'Abstract 3D',
  'Dark Mode UI'
];

const RECENT_SEARCHES = [
  'Mechanical Keyboard',
  'Retro Futurism'
];

export function Navbar() {
  const { searchQuery, setSearchQuery, searchImage, setSearchImage } = useSearch();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSearchImage(reader.result as string);
        setSearchQuery(''); // Clear text search when image searching
        setIsSearchFocused(false);
        if (location.pathname !== '/') navigate('/');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value && searchImage) setSearchImage(null); // Clear image search when typing
    if (location.pathname !== '/') navigate('/');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    if (searchImage) setSearchImage(null);
    setIsSearchFocused(false);
    if (location.pathname !== '/') navigate('/');
  };

  const filteredPopular = POPULAR_SEARCHES.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRecent = RECENT_SEARCHES.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <nav className="fixed top-0 w-full z-50 bg-ink/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-neon rounded-xl flex items-center justify-center transform -rotate-6 shadow-[0_0_15px_rgba(204,255,0,0.3)] group-hover:rotate-0 transition-transform duration-300">
            <span className="text-ink font-display font-black text-xl">V</span>
          </div>
          <span className="font-display font-bold text-xl hidden md:block tracking-tight group-hover:text-neon transition-colors">VORTEX</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-3xl">
          <div className="relative group flex items-center" ref={searchContainerRef}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <Search size={18} className="text-gray-400 group-focus-within:text-neon transition-colors" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleTextSearch}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search for ideas..." 
              className="w-full bg-surface border border-white/10 rounded-full py-3 pl-12 pr-20 text-sm focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-500 text-white relative z-10"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1 z-10">
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 transition-colors rounded-full ${searchImage ? 'text-neon bg-neon/10' : 'text-gray-400 hover:text-neon'}`}
                title="Search by image"
              >
                <Camera size={18} />
              </button>
            </div>

            {/* Search Suggestions Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-2">
                  {filteredRecent.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-2">Recent Searches</h3>
                      {filteredRecent.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors text-left"
                        >
                          <Clock size={16} className="text-gray-400" />
                          <span className="text-gray-200">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredPopular.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-2">Popular on Vortex</h3>
                      {filteredPopular.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors text-left"
                        >
                          <TrendingUp size={16} className="text-neon" />
                          <span className="text-gray-200">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredRecent.length === 0 && filteredPopular.length === 0 && (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      No suggestions found for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <>
              <button className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                <Plus size={16} />
                <span>Create</span>
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors hidden sm:block">
                <Bell size={22} />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors hidden sm:block">
                <MessageCircle size={22} />
              </button>
              <Link to="/profile" className="w-10 h-10 rounded-full bg-surface border border-white/10 overflow-hidden ml-2 block">
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-white hover:text-neon font-medium px-4 py-2 transition-colors">
                Log in
              </Link>
              <Link to="/register" className="bg-neon text-ink hover:bg-white font-bold px-5 py-2 rounded-full transition-colors">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
