'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchImage: string | null;
  setSearchImage: (img: string | null) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchImage, setSearchImage] = useState<string | null>(null);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchImage(null);
  };

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, searchImage, setSearchImage, clearSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used within SearchProvider');
  return context;
}
