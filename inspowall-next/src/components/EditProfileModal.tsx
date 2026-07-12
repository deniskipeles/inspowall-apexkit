'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Upload, Loader2, Check } from 'lucide-react';
import { apex } from '@/lib/apex';
import { useAuth } from '@/context/AuthContext';

interface EditProfileModalProps {
  onClose: () => void;
  onSaved: (updated: { name: string; handle: string; avatar: string | null }) => void;
}

export function EditProfileModal({ onClose, onSaved }: EditProfileModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.handle?.replace('@', '') || '');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load existing profile on mount
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const list = await apex.collection('user_profile').list({
          filter: { user_id: Number(user.id) },
          per_page: 1,
        });
        if (list.total > 0) {
          const record = list.items[0];
          const data = record.data || record;
          setExistingProfileId(record.id);
          setName(data.name || user.name || '');
          setUsername(data.username || user.handle?.replace('@', '') || '');
          setBio(data.bio || '');
          setWebsite(data.website || '');
          if (data.avatar) {
            const url = await apex.files.getFileUrl(data.avatar);
            setAvatarPreview(typeof url === 'string' ? url : user.avatar);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setError(null);

    try {
      let avatarFilename: string | undefined;

      if (avatarFile) {
        const uploaded = await apex.files.upload(avatarFile);
        avatarFilename = typeof uploaded === 'string' ? uploaded : uploaded.filename || uploaded.id;
      }

      const payload: Record<string, any> = {
        user_id: user.id,
        username: username.toLowerCase().replace(/\s+/g, ''),
        name,
        bio,
        website,
      };
      if (avatarFilename) payload.avatar = avatarFilename;

      if (existingProfileId) {
        await apex.collection('user_profile').update(existingProfileId, payload);
      } else {
        const created = await apex.collection('user_profile').create(payload);
        setExistingProfileId(created.id);
      }

      setSaved(true);
      onSaved({
        name,
        handle: `@${payload.username}`,
        avatar: avatarPreview,
      });
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-black/10 dark:border-white/10">
          <h2 className="text-xl font-display font-bold text-ink-invert">Edit Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-ink-invert"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neon" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-8 py-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative w-24 h-24 rounded-full border-4 border-neon/30 overflow-hidden cursor-pointer group shadow-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar" fill sizes="96px" className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Upload size={20} className="text-white" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-neon hover:underline"
              >
                Change photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-ink-invert focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-400 dark:placeholder-gray-600"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                  placeholder="username"
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-ink-invert focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-400 dark:placeholder-gray-600"
                />
              </div>
              <p className="text-xs text-gray-500">Only lowercase letters, numbers and underscores.</p>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="Tell the world about yourself..."
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-ink-invert focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all resize-none placeholder-gray-400 dark:placeholder-gray-600"
              />
              <p className="text-xs text-gray-500 text-right">{bio.length}/200</p>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-ink-invert focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all placeholder-gray-400 dark:placeholder-gray-600"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-neon text-ink font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-[0_0_20px_rgba(204,255,0,0.2)] mt-2"
            >
              {isSaving ? (
                <><Loader2 size={20} className="animate-spin" /><span>Saving...</span></>
              ) : saved ? (
                <><Check size={20} /><span>Saved!</span></>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}