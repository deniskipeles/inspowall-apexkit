'use client';

import { Search, Bell, MessageCircle, Plus, Camera, X, Loader2, Moon, Sun, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apex, ApexKitRealtimeWSClient } from '@/lib/apex';

export function Navbar() {
  const { searchQuery, setSearchQuery, searchImage, setSearchImage } = useSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<ApexKitRealtimeWSClient | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [hasText, setHasText] = useState(!!searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [noResultsFor, setNoResultsFor] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery === '' && searchInputRef.current) {
      searchInputRef.current.value = '';
      setHasText(false);
      setSuggestions([]);
      setNoResultsFor(null);
    }
  }, [searchQuery]);

  useEffect(() => {
    const token = apex.getToken();
    const client = new ApexKitRealtimeWSClient(apex.baseUrl, token);
    client.connect();
    wsClientRef.current = client;
    return () => client.disconnect();
  }, [user]);

  const runSuggestionSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setNoResultsFor(null);
      return;
    }

    setIsSearchingSuggestions(true);
    try {
      let results: any[] = [];
      if (wsClientRef.current && wsClientRef.current.isConnected) {
        results = await wsClientRef.current.search('pins', query, 8);
      } else {
        results = await apex.collection('pins').searchRecordsInstantlyWithOSE(query);
      }

      const mapped = (results || []).map((r: any) => ({
        id: r.id,
        title: r.snippet?.title || r.title || 'Untitled',
        description: r.snippet?.description || r.description || '',
      }));

      if (searchInputRef.current && searchInputRef.current.value.trim() !== query.trim()) {
        return;
      }

      setSuggestions(mapped);
      setNoResultsFor(mapped.length === 0 ? query : null);
    } catch (err: any) {
      if (!err.message?.includes('Rate limit')) {
        console.error('Failed to fetch autocomplete suggestions:', err);
      }
    } finally {
      setIsSearchingSuggestions(false);
    }
  }, []);

  const scheduleSuggestionFetch = useCallback(() => {
    const val = searchInputRef.current?.value ?? '';
    setHasText(val.length > 0);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSuggestionSearch(val);
    }, 300);
  }, [runSuggestionSearch]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSearchImage(reader.result as string);
        if (searchInputRef.current) searchInputRef.current.value = '';
        setHasText(false);
        setSuggestions([]);
        setSearchQuery('');
        setIsSearchFocused(false);
        if (pathname !== '/') router.push('/');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNativeInput = () => {
    if (searchImage && searchInputRef.current?.value) setSearchImage(null);
    scheduleSuggestionFetch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const val = searchInputRef.current?.value ?? '';
      setIsSearchFocused(false);
      setSearchQuery(val);
      if (pathname !== '/') router.push('/');
    }
  };

  const handleSuggestionClick = (pinId: number | string) => {
    setIsSearchFocused(false);
    if (searchInputRef.current) searchInputRef.current.value = '';
    setHasText(false);
    setSuggestions([]);
    router.push(`/pin/${pinId}`);
  };

  const handleClearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      searchInputRef.current.focus();
    }
    setHasText(false);
    setSuggestions([]);
    setNoResultsFor(null);
    setSearchQuery('');
  };

  const currentTypedValue = searchInputRef.current?.value ?? '';

  return (
    <nav className="fixed top-0 w-full z-50 bg-ink/80 backdrop-blur-xl border-b border-black/10 dark:border-white/10">
      <div className="flex items-center justify-between px-4 py-3 gap-4 max-w-[1800px] mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden transform -rotate-6 shadow-[0_0_15px_rgba(204,255,0,0.3)] group-hover:rotate-0 transition-transform duration-300 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${apex.baseUrl}/logo`} alt="InspoWall" className="w-full h-full object-cover" />
          </div>
          <span className="font-display font-bold text-xl hidden md:block tracking-tight group-hover:text-neon transition-colors text-ink-invert">INSPOWALL</span>
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
              defaultValue={searchQuery}
              onInput={handleNativeInput}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search for ideas..."
              className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-full py-3 pl-12 pr-20 text-sm focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-500 text-ink-invert relative z-10"
              style={{ WebkitTextFillColor: 'currentColor', caretColor: 'currentColor' }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1 z-10">
              {hasText && (
                <button onClick={handleClearSearch} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Clear search">
                  <X size={16} />
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 transition-colors rounded-full ${searchImage ? 'text-neon bg-neon/10' : 'text-gray-400 hover:text-neon'}`}
                title="Search by image"
              >
                <Camera size={18} />
              </button>
            </div>

            {isSearchFocused && (currentTypedValue || suggestions.length > 0) && (
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
                            {pin.description && <span className="text-gray-500 text-xs truncate max-w-[400px]">{pin.description}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : noResultsFor ? (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">No results found for &quot;{noResultsFor}&quot;</div>
                  ) : (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm italic">Start typing to see suggestions...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={toggleTheme} className="hidden md:flex p-2 text-gray-400 hover:text-ink-invert transition-colors rounded-full" title="Toggle theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {loading ? (
            <div className="w-10 h-10 rounded-full bg-surface animate-pulse"></div>
          ) : user ? (
            <>
              <Link
                href="/create"
                className="flex items-center gap-2 bg-surface hover:bg-black/10 dark:hover:bg-white/20 text-ink-invert p-2 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-colors border border-black/10 dark:border-white/10"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Create</span>
              </Link>
              <button className="p-2 text-gray-400 hover:text-ink-invert transition-colors hidden sm:block">
                <Bell size={22} />
              </button>
              <button className="p-2 text-gray-400 hover:text-ink-invert transition-colors hidden sm:block">
                <MessageCircle size={22} />
              </button>
              <Link href="/profile" className="w-10 h-10 rounded-full bg-surface border border-black/10 dark:border-white/10 overflow-hidden ml-2 block relative">
                <Image
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt="Profile"
                  fill
                  sizes="40px"
                  className="object-cover"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden md:block text-ink-invert hover:text-neon font-medium px-4 py-2 transition-colors whitespace-nowrap">
                Log in
              </Link>
              <Link href="/register" className="hidden md:block bg-neon text-ink font-bold px-5 py-2 rounded-full transition-colors hover:opacity-90 whitespace-nowrap">
                Sign up
              </Link>

              <div className="relative md:hidden" ref={mobileMenuRef}>
                <button onClick={() => setIsMobileMenuOpen((prev) => !prev)} className="p-2 text-gray-400 hover:text-ink-invert transition-colors rounded-full" title="More options">
                  <MoreVertical size={22} />
                </button>

                {isMobileMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col p-2 gap-1">
                    <button
                      onClick={() => {
                        toggleTheme();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-ink-invert text-sm font-medium text-left"
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-ink-invert text-sm font-medium">
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 mt-1 bg-neon text-ink font-bold px-3 py-2.5 rounded-xl transition-colors hover:opacity-90 text-sm"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
