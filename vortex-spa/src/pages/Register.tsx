import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name && email && password) {
      try {
        await register(name, email, password);
        navigate('/');
      } catch (err: any) {
        setError(err.message || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Helmet><title>Sign Up | Vortex</title></Helmet>
      <div className="bg-surface border border-black/10 dark:border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-neon rounded-xl flex items-center justify-center transform -rotate-6 mx-auto mb-4 shadow-[0_0_15px_rgba(204,255,0,0.3)]">
            <span className="text-[#050505] font-display font-black text-2xl">V</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-ink-invert">Join Vortex</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Discover and save your next big idea</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-ink-invert focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Alex Rivera"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-ink-invert focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-ink-invert focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-neon text-ink font-bold py-3 rounded-xl mt-4 hover:bg-white transition-colors shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          >
            Sign Up
          </button>
        </form>
        
        <p className="text-center text-gray-400 mt-6 text-sm">
          Already have an account? <Link to="/login" className="text-neon hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
