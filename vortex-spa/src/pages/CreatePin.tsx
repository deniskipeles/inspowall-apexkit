import React, { useState, useRef } from 'react';
import { Upload, X, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apex } from '../lib/apex';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  'Architecture', 'Design', 'Art', 'Technology', 'Nature', 'Fashion', 'Photography', 'Food'
];

export function CreatePin() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Design');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }
    if (!user) {
      setError('You must be logged in to create a pin');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Upload the file
      const uploadedFile = await apex.files.upload(selectedFile);
      const filename = typeof uploadedFile === 'string' ? uploadedFile : uploadedFile.filename || uploadedFile.id;
      
      if (!filename) {
        throw new Error('Failed to get filename from upload response');
      }
      
      // 2. Create the pin record
      // We'll calculate a random height for the masonry effect if not provided, 
      // but in a real app we'd get the actual image dimensions.
      const img = new Image();
      img.src = previewUrl!;
      await new Promise(r => img.onload = r);
      const aspectRatio = img.height / img.width;
      const height = Math.min(Math.max(aspectRatio * 300, 200), 500);

      await apex.collection('pins').create({
        title,
        description,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        image: filename,
        author_id: user.id,
        height: Math.round(height),
        likes_count: 0
      });

      navigate('/');
    } catch (err: any) {
      console.error('Failed to create pin:', err);
      setError(err.message || 'Failed to create pin. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-ink-invert transition-colors mb-8 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image Upload Area */}
        <div className="space-y-4">
          <div 
            className={`relative aspect-[3/4] rounded-3xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center p-8 text-center cursor-pointer group
              ${previewUrl ? 'border-neon/30 bg-surface' : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:border-neon/50 hover:bg-black/10 dark:hover:bg-white/10'}
            `}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
          >
            <AnimatePresence mode="wait">
              {previewUrl ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                      className="bg-red-500 text-white p-3 rounded-full hover:scale-110 transition-transform"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-neon/10 group-hover:text-neon transition-all text-ink-invert">
                    <Upload size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-1 text-ink-invert">Click to upload image</p>
                    <p className="text-sm text-gray-500">We recommend using high quality .jpg or .png files</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Form Fields */}
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add your title"
              className="w-full bg-transparent border-b border-black/10 dark:border-white/10 py-3 text-3xl font-bold focus:outline-none focus:border-neon transition-colors placeholder-gray-400 dark:placeholder-gray-700 text-ink-invert"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
            <textarea 
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell everyone what your Pin is about"
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 focus:outline-none focus:border-neon transition-colors resize-none placeholder-gray-400 dark:placeholder-gray-600 text-ink-invert"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon transition-colors appearance-none text-ink-invert"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-surface text-ink-invert">{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tags</label>
              <input 
                type="text" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tech, design, abstract"
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:border-neon transition-colors placeholder-gray-400 dark:placeholder-gray-600 text-ink-invert"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isUploading || !selectedFile}
            className="w-full bg-neon text-ink font-bold py-4 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          >
            {isUploading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Creating Pin...</span>
              </>
            ) : (
              <span>Create Pin</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
