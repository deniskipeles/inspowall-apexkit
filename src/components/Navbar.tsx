import { Search, Bell, MessageCircle, Plus, Camera, X, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import React, { useRef, useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useAuth } from '../context/AuthContext';
import { apex } from '../lib/apex';

export function Navbar() {
  const { searchQuery, setSearchQuery, searchImage, setSearchImage } = useSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Instant Search / Autocomplete
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearchingSuggestions(true);
      try {
        const results = await apex.collection('pins').searchRecordsWithOSE(searchQuery);
        setSuggestions(results.slice(0, 8)); // Limit to 8 suggestions
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsSearchFocused(false);
      if (location.pathname !== '/') navigate('/');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    if (searchImage) setSearchImage(null);
    setIsSearchFocused(false);
    if (location.pathname !== '/') navigate('/');
  };

  const { user, loading } = useAuth();

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
              onKeyDown={handleKeyDown}
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
            {isSearchFocused && (searchQuery || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-2">
                  {isSearchingSuggestions ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 size={24} className="text-neon animate-spin" />
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-2">Suggestions</h3>
                      {suggestions.map((pin, index) => (
                        <button
                          key={`${pin.id}-${index}`}
                          onClick={() => handleSuggestionClick(pin.title)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors text-left"
                        >
                          <Search size={16} className="text-gray-400" />
                          <div className="flex flex-col">
                            <span className="text-gray-200 text-sm font-medium">{pin.title}</span>
                            {pin.description && (
                              <span className="text-gray-500 text-xs truncate max-w-[400px]">{pin.description}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      No results found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm italic">
                      Start typing to see suggestions...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {loading ? (
            <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse"></div>
          ) : user ? (
            <>
              <Link to="/create" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white p-2 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-colors">
                <Plus size={18} />
                <span className="hidden sm:inline">Create</span>
              </Link>
              <button className="p-2 text-gray-400 hover:text-white transition-colors hidden sm:block">
                <Bell size={22} />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors hidden sm:block">
                <MessageCircle size={22} />
              </button>
              <Link to="/profile" className="w-10 h-10 rounded-full bg-surface border border-white/10 overflow-hidden ml-2 block">
                <img src={user.avatar || null} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
