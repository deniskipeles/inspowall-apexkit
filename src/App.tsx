import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { PinDetail } from './pages/PinDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <SearchProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-ink text-white selection:bg-neon selection:text-ink font-sans">
              <Navbar />
              <main className="pt-24 px-4 md:px-8 pb-12 max-w-[1800px] mx-auto">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/pin/:id" element={<PinDetail />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </SearchProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
