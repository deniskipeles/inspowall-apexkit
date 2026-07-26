'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Sparkles,
  Copy,
  Check,
  Plus,
  Loader2,
  ExternalLink,
  Code,
  Layers,
  ShieldCheck,
  RefreshCw,
  Globe,
  Trash2,
} from 'lucide-react';
import { apex } from '@/lib/apex';
import { useAuth } from '@/context/AuthContext';

export function OpenGraphStudio() {
  const { user } = useAuth();

  // API Key State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isLoadingKeys, setIsLoadingLoadingKeys] = useState(true);

  // Form Controls (DEFAULTS TO WEBP)
  const [platform, setPlatform] = useState<'unsplash' | 'pexels' | 'inspowall'>('unsplash');
  const [imageId, setImageId] = useState('eX9850123');
  const [templateId, setTemplateId] = useState('default-opengraph');
  const [title, setTitle] = useState('Modern Brutalist Architecture');
  const [subtitle, setSubtitle] = useState('Concrete & Neon Expressions');
  const [siteName, setSiteName] = useState('INSPOWALL');
  const [format, setFormat] = useState<'webp' | 'png' | 'jpeg'>('webp'); // Default WebP
  const [quality, setQuality] = useState(80);

  // Output State
  const [generatedPublicUrl, setGeneratedPublicUrl] = useState<string>('');
  const [generatedHash, setGeneratedHash] = useState<string>('');
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch User's API Keys from `og_api_keys` collection
  const loadApiKeys = useCallback(async () => {
    if (!user) return;
    setIsLoadingLoadingKeys(true);
    try {
      const res = await apex.collection('og_api_keys').list({
        per_page: 50,
      });

      const keys = res.items || [];
      setApiKeys(keys);
      if (keys.length > 0 && !selectedKey) {
        setSelectedKey(keys[0].data?.key || keys[0].key || '');
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setIsLoadingLoadingKeys(false);
    }
  }, [user, selectedKey]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  // 2. Generate New API Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsCreatingKey(true);
    setError(null);

    try {
      const generatedKey = `og_live_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

      await apex.collection('og_api_keys').create({
        key: generatedKey,
        client_name: newKeyName,
        active: true,
        total_requests: 0,
        rate_limit: 1000,
      });

      setNewKeyName('');
      setSelectedKey(generatedKey);
      await loadApiKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to create API key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  // 3. Delete API Key
  const handleDeleteApiKey = async (id: string) => {
    try {
      await apex.collection('og_api_keys').delete(id);
      await loadApiKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to delete key');
    }
  };

  // 4. Test Card Generation (`POST /opengraph`)
  const handleGenerateCard = async () => {
    if (!selectedKey) {
      setError('Please select or create an API Key first.');
      return;
    }
    if (!imageId.trim()) {
      setError('Please enter an Image ID.');
      return;
    }

    setIsGeneratingCard(true);
    setError(null);

    try {
      const res = await fetch('/opengraph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-og-api-key': selectedKey, // Dedicated API key header
        },
        body: JSON.stringify({
          platform,
          imageId,
          title,
          subtitle,
          siteName,
          templateId,
          format,
          quality,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate OpenGraph image');
      }

      setGeneratedHash(data.hash);
      setGeneratedPublicUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'Error creating OpenGraph card');
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'meta' | 'key', keyId?: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'key' && keyId) {
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else if (type === 'meta') {
      setCopiedMeta(true);
      setTimeout(() => setCopiedMeta(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const metaTag = generatedPublicUrl ? `<meta property="og:image" content="${generatedPublicUrl}" />` : '';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 border-b border-black/10 dark:border-white/10 pb-8">
        <div>
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <span className="p-2 rounded-xl bg-neon/10 text-neon border border-neon/20">
              <Sparkles size={24} />
            </span>
            <h1 className="text-4xl font-display font-bold text-ink-invert">OpenGraph Studio</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Generate and test edge-cached OpenGraph preview cards for Unsplash, Pexels, and InspoWall.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface border border-black/10 dark:border-white/10 px-4 py-2 rounded-full text-xs font-mono text-gray-400">
          <Globe size={14} className="text-neon" />
          <span>Edge CDN Cached • WebP / PNG / JPEG</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Key Management & Card Controls */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Section 1: API Keys Management */}
          <div className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold flex items-center gap-2 text-ink-invert">
                <Key className="text-neon" size={18} />
                API Keys
              </h2>
              <span className="text-xs text-gray-500">{apiKeys.length} active key(s)</span>
            </div>

            {/* Create Key Form */}
            <form onSubmit={handleCreateApiKey} className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="New key name (e.g. Production App)"
                className="flex-1 bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm text-ink-invert focus:outline-none focus:border-neon/50 placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={isCreatingKey || !newKeyName.trim()}
                className="bg-neon text-ink font-bold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isCreatingKey ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                <span>Create</span>
              </button>
            </form>

            {/* Key List */}
            {isLoadingKeys ? (
              <div className="py-6 text-center text-gray-500">
                <Loader2 size={20} className="animate-spin mx-auto text-neon" />
              </div>
            ) : apiKeys.length > 0 ? (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                {apiKeys.map((item) => {
                  const data = item.data || item;
                  const keyStr = data.key || '';
                  const isSelected = selectedKey === keyStr;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedKey(keyStr)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-neon bg-neon/5 shadow-[0_0_15px_rgba(204,255,0,0.1)]'
                          : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink-invert truncate">{data.client_name || 'Key'}</span>
                          {isSelected && (
                            <span className="bg-neon text-ink text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-gray-500 truncate mt-0.5">{keyStr.substring(0, 16)}...</p>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          Requests: {data.total_requests || 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => copyToClipboard(keyStr, 'key', item.id)}
                          className="p-2 text-gray-400 hover:text-ink-invert transition-colors"
                          title="Copy Full Key"
                        >
                          {copiedKeyId === item.id ? <Check size={16} className="text-neon" /> : <Copy size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete Key"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                No API keys created yet. Create one above to get started.
              </div>
            )}
          </div>

          {/* Section 2: Card Configuration */}
          <div className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-display font-bold flex items-center gap-2 text-ink-invert mb-2">
              <Layers className="text-neon" size={18} />
              Card Parameters
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e: any) => setPlatform(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-ink-invert focus:outline-none focus:border-neon"
                >
                  <option value="unsplash" className="bg-surface">Unsplash</option>
                  <option value="pexels" className="bg-surface">Pexels</option>
                  <option value="inspowall" className="bg-surface">InspoWall (Direct)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Image ID / Path
                </label>
                <input
                  type="text"
                  value={imageId}
                  onChange={(e) => setImageId(e.target.value)}
                  placeholder="e.g. 2014422"
                  className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-ink-invert focus:outline-none focus:border-neon"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Card Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Main headline..."
                className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-ink-invert focus:outline-none focus:border-neon"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Tagline..."
                  className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-ink-invert focus:outline-none focus:border-neon"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="INSPOWALL"
                  className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-ink-invert focus:outline-none focus:border-neon"
                />
              </div>
            </div>

            {/* FORMAT DEFAULTS TO WEBP */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Format (Default WebP)
                </label>
                <select
                  value={format}
                  onChange={(e: any) => setFormat(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-ink-invert focus:outline-none focus:border-neon"
                >
                  <option value="webp" className="bg-surface">WebP (Optimal)</option>
                  <option value="png" className="bg-surface">PNG</option>
                  <option value="jpeg" className="bg-surface">JPEG</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Quality ({quality}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-10 accent-neon cursor-pointer"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateCard}
              disabled={isGeneratingCard || !selectedKey}
              className="w-full bg-neon text-ink font-bold py-3.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-base shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50 mt-2"
            >
              {isGeneratingCard ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Downloading Image &amp; Rendering...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Edge Public Card</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Card Canvas & Code Export */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-neon" /> Live Edge Canvas (1200x630)
            </span>
            <span className="text-xs font-mono bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full text-ink-invert uppercase">
              {format} • {quality}%
            </span>
          </div>

          {/* Canvas Wrapper */}
          <div className="relative w-full aspect-[1200/630] rounded-3xl border border-black/10 dark:border-white/10 bg-[#0d1117] overflow-hidden flex items-center justify-center shadow-2xl group">
            {isGeneratingCard && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 text-white">
                <RefreshCw size={32} className="animate-spin text-neon" />
                <span className="text-xs font-mono">Fetching photo from {platform.toUpperCase()} &amp; rendering...</span>
              </div>
            )}

            {generatedPublicUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={generatedPublicUrl}
                alt="OpenGraph Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-gray-500">
                  <ShieldCheck size={24} />
                </div>
                <p className="text-sm text-gray-400 max-w-sm">
                  Click <strong className="text-neon">&quot;Generate Edge Public Card&quot;</strong> to download the image, persist it, and generate a live cached link.
                </p>
              </div>
            )}

            {generatedPublicUrl && (
              <a
                href={generatedPublicUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute top-4 right-4 p-3 bg-black/70 hover:bg-black text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur"
                title="Open Direct Image in New Tab"
              >
                <ExternalLink size={18} />
              </a>
            )}
          </div>

          {/* Code Export Box */}
          <div className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
            {/* HTML Meta Tag */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code size={14} className="text-neon" /> Generated HTML Meta Tag
                </label>
                <button
                  onClick={() => copyToClipboard(metaTag, 'meta')}
                  disabled={!generatedPublicUrl}
                  className="text-xs text-neon hover:underline flex items-center gap-1 disabled:opacity-40"
                >
                  {copiedMeta ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedMeta ? 'Copied' : 'Copy Tag'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-[#161b22] border border-black/10 dark:border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all select-all min-h-[42px]">
                {metaTag || '// HTML Meta tag will appear here...'}
              </pre>
            </div>

            {/* Edge Public Cache URL */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Edge Public Cache URL
                </label>
                <button
                  onClick={() => copyToClipboard(generatedPublicUrl, 'url')}
                  disabled={!generatedPublicUrl}
                  className="text-xs text-neon hover:underline flex items-center gap-1 disabled:opacity-40"
                >
                  {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
              <input
                readOnly
                value={generatedPublicUrl}
                placeholder="https://inspowall.pages.dev/opengraph/a1b2c3..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 font-mono text-xs text-gray-300 select-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}