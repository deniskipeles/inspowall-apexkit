import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  handle: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  register: (name: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string) => {
    const name = email.split('@')[0];
    setUser({
      id: '1',
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email,
      handle: `@${name}`,
      avatar: `https://picsum.photos/seed/${email}/150/150`
    });
  };

  const register = (name: string, email: string) => {
    setUser({
      id: '1',
      name,
      email,
      handle: `@${name.toLowerCase().replace(/\s+/g, '')}`,
      avatar: `https://picsum.photos/seed/${email}/150/150`
    });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
