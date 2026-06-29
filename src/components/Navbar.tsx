import { Search, Bell, MessageCircle, Plus, Camera, X, Loader2, Moon, Sun } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apex, ApexKitRealtimeWSClient } from '../lib/apex';

export function Navbar() {
  const { searchQuery, setSearchQuery, searchImage, setSearchImage } = useSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<ApexKitRealtimeWSClient | null>(null);
  const cursorRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
  const navigate = useNavigate();
  const location = useLocation();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync localQuery when searchQuery is cleared externally
  useEffect(() => {
    if (searchQuery === '') {
      setLocalQuery('');
    }
  }, [searchQuery]);

  // Establish a single, persistent WebSocket Client connection for fast autocomplete lookups
  useEffect(() => {
    const token = apex.getToken();
    const client = new ApexKitRealtimeWSClient(apex.baseUrl, token);
    client.connect();
    wsClientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, [user]);

  // Instant Autocomplete search via WebSocket to avoid HTTP roundtrip overhead
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!localQuery || localQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearchingSuggestions(true);
      try {
        let results: any[] = [];
        if (wsClientRef.current && wsClientRef.current.isConnected) {
          results = await wsClientRef.current.search('pins', localQuery, 8);
        } else {
          // Fallback to HTTP API if WebSocket is connecting or unavailable
          results = await apex.collection('pins').searchRecordsInstantlyWithOSE(localQuery);
        }

        // Map unified results structure safely
        const mapped = (results || []).map((r: any) => ({
          id: r.id,
          title: r.snippet?.title || r.title || 'Untitled',
          description: r.snippet?.description || r.description || ''
        }));

        setSuggestions(mapped);
      } catch (err: any) {
        if (!err.message?.includes('Rate limit')) {
          console.error("Failed to fetch autocomplete suggestions:", err);
        }
      } finally {
        setIsSearchingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [localQuery]);

  // Restore virtual cursor selection range on mobile keyboards
  useLayoutEffect(() => {
    if (searchInputRef.current && cursorRef.current.start !== null) {
      searchInputRef.current.setSelectionRange(
        cursorRef.current.start,
        cursorRef.current.end
      );
    }
  }, [localQuery]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSearchImage(reader.result as string);
        setLocalQuery('');
        setSearchQuery(''); // Clear text search when image searching
        setIsSearchFocused(false);
        if (location.pathname !== '/') navigate('/');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    cursorRef.current = {
      start: e.target.selectionStart,
      end: e.target.selectionEnd
    };
    setLocalQuery(e.target.value);
    if (e.target.value && searchImage) setSearchImage(null); // Clear image search when typing
  };

  // Submit search only when user hits 'Enter'
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsSearchFocused(false);
      setSearchQuery(localQuery); // Triggers Home.tsx to call searchImageVectorWithText
      if (location.pathname !== '/') navigate('/');
    }
  };

  // Navigate directly to exact selected pin detail
  const handleSuggestionClick = (pinId: number | string) => {
    setIsSearchFocused(false);
    setLocalQuery('');
    navigate(`/pin/${pinId}`);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-ink/80 backdrop-blur-xl border-b border-black/10 dark:border-white/10">
      <div className="flex items-center justify-between px-4 py-3 gap-4 max-w-[1800px] mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-neon rounded-xl flex items-center justify-center transform -rotate-6 shadow-[0_0_15px_rgba(204,255,0,0.3)] group-hover:rotate-0 transition-transform duration-300">
            <span className="text-[#050505] font-display font-black text-xl">V</span>
          </div>
          <span className="font-display font-bold text-xl hidden md:block tracking-tight group-hover:text-neon transition-colors text-ink-invert">VORTEX</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-3xl">
          <div className="relative group flex items-center" ref={searchContainerRef}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <Search size={18} className="text-gray-400 group-focus-within:text-neon transition-colors" />
            </div>
            <input 
              ref={searchInputRef}
              type="text" 
              value={localQuery}
              onChange={handleTextSearch}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search for ideas..." 
              className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-full py-3 pl-12 pr-20 text-sm focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-500 text-ink-invert relative z-10"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1 z-10">
              {localQuery && (
                <button 
                  onClick={() => {
                    setLocalQuery('');
                    setSearchQuery('');
                  }} 
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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
            {isSearchFocused && (localQuery || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
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
                          onClick={() => handleSuggestionClick(pin.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
                        >
                          <Search size={16} className="text-gray-400" />
                          <div className="flex flex-col">
                            <span className="text-ink-invert text-sm font-medium">{pin.title}</span>
                            {pin.description && (
                              <span className="text-gray-500 text-xs truncate max-w-[400px]">{pin.description}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : localQuery.length >= 2 ? (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      No results found for "{localQuery}"
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
          <button 
            onClick={toggleTheme} 
            className="p-2 text-gray-400 hover:text-ink-invert transition-colors rounded-full"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {loading ? (
            <div className="w-10 h-10 rounded-full bg-surface animate-pulse"></div>
          ) : user ? (
            <>
              <Link to="/create" className="flex items-center gap-2 bg-surface hover:bg-black/10 dark:hover:bg-white/20 text-ink-invert p-2 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-colors border border-black/10 dark:border-white/10">
                <Plus size={18} />
                <span className="hidden sm:inline">Create</span>
              </Link>
              <button className="p-2 text-gray-400 hover:text-ink-invert transition-colors hidden sm:block">
                <Bell size={22} />
              </button>
              <button className="p-2 text-gray-400 hover:text-ink-invert transition-colors hidden sm:block">
                <MessageCircle size={22} />
              </button>
              <Link to="/profile" className="w-10 h-10 rounded-full bg-surface border border-black/10 dark:border-white/10 overflow-hidden ml-2 block">
                <img src={user.avatar || undefined} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-ink-invert hover:text-neon font-medium px-4 py-2 transition-colors whitespace-nowrap">
                Log in
              </Link>
              <Link to="/register" className="bg-neon text-ink font-bold px-5 py-2 rounded-full transition-colors hover:opacity-90 whitespace-nowrap">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}