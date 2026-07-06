'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { SearchProvider } from '@/context/SearchContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SearchProvider>{children}</SearchProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
