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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await apex.auth.getMe();
        if (me) {
          const meData = me.data || me;
          setUser({
            id: me.id,
            name: meData.name || meData.email.split('@')[0],
            email: meData.email,
            handle: meData.handle || `@${meData.email.split('@')[0]}`,
            avatar: meData.avatar ? apex.files.getFileUrl(meData.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${meData.email}`
          });
        }
      } catch (err) {
        console.log("No active session");
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apex.auth.login(email, password);
    const uData = res.user.data || res.user;
    setUser({
      id: res.user.id,
      name: uData.name || uData.email.split('@')[0],
      email: uData.email,
      handle: uData.handle || `@${uData.email.split('@')[0]}`,
      avatar: uData.avatar ? apex.files.getFileUrl(uData.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${uData.email}`
    });
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apex.auth.register(email, password);
    // After register, update user details if needed
    // For now, ApexKit register doesn't take name, so we login and update if it was supported
    // But let's just use what register returns
    setUser({
      id: res.user.id,
      name: name,
      email: res.user.email,
      handle: `@${name.toLowerCase().replace(/\s+/g, '')}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.email}`
    });
  };

  const logout = () => {
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
