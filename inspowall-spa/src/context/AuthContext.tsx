import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apex } from '../lib/apex';

interface User {
  id: string;
  name: string;
  email: string;
  handle: string;
  avatar: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and validate persistent token on app load / refresh
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('apex_token');
        if (savedToken) {
          // Manually load the persistent token into the ApexKit client instance
          apex.setToken(savedToken);

          const me = await apex.auth.getMe();
          if (me) {
            const meData = me?.data?.metadata || me.data || me;
            setUser({
              id: me.id,
              name: meData.name || meData.email.split('@')[0],
              email: meData.email,
              handle: meData.handle || `@${meData.email.split('@')[0]}`,
              avatar: meData.avatar ? await apex.files.getFileUrl(meData.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${meData.email}`
            });
          }
        }
      } catch (err) {
        console.log("Persistent session is invalid or expired.");
        // Clean up invalid session parameters
        localStorage.removeItem('apex_token');
        apex.setToken('');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apex.auth.login(email, password);
    const uData = res.user.data?.metadata || res.user.data || res.user;

    // Persist token locally
    localStorage.setItem('apex_token', res.token);

    setUser({
      id: res.user.id,
      name: uData.name || uData.email.split('@')[0],
      email: uData.email,
      handle: uData.handle || `@${uData.email.split('@')[0]}`,
      avatar: uData.avatar ? await apex.files.getFileUrl(uData.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${uData.email}`
    });
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apex.auth.register(email, password, { name });

    // Persist token locally
    localStorage.setItem('apex_token', res.token);

    setUser({
      id: res.user.id,
      name: name,
      email: res.user.email,
      handle: `@${name.toLowerCase().replace(/\s+/g, '')}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed={res.user.email}`
    });
  };

  const logout = () => {
    // Clear persistent token store
    localStorage.removeItem('apex_token');
    apex.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}