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
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { apex } from '@/lib/apex';
import { useAuth } from '@/context/AuthContext';

interface CustomVar {
  target: string;
  value: string;
}

export function OpenGraphStudio() {
  const { user } = useAuth();

  // API Key State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);

  // Template & Image Controls
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState('default-opengraph');
  const [format, setFormat] = useState<'webp' | 'png' | 'jpeg'>('webp');
  const [quality, setQuality] = useState(80);
  
  // Main Image Data
  const [platform, setPlatform] = useState<'unsplash' | 'pexels' | 'inspowall'>('unsplash');
  const [imageId, setImageId] = useState('eX9850123');
  const [imageTarget, setImageTarget] = useState('IMAGE_URL');
  const [blur, setBlur] = useState<string>('');

  // Dynamic Text Variables
  const [customVars, setCustomVars] = useState<CustomVar[]>([
    { target: 'TITLE', value: 'Modern Brutalist Architecture' },
    { target: 'SUBTITLE', value: 'Concrete & Neon Expressions' },
    { target: 'SITE_NAME', value: 'INSPOWALL' },
    { target: 'PHOTOGRAPHER', value: 'Community Artist' },
  ]);

  // Output State
  const [generatedPublicUrl, setGeneratedPublicUrl] = useState<string>('');
  const [generatedHash, setGeneratedHash] = useState<string>('');
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch API Keys & Templates
  const loadInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoadingKeys(true);
    try {
      const [keysRes, tmplRes] = await Promise.all([
        apex.collection('og_api_keys').list({ per_page: 50 }),
        apex.templates.list().catch(() => []),
      ]);

      const keys = keysRes.items || [];
      setApiKeys(keys);
      if (keys.length > 0 && !selectedKey) setSelectedKey(keys[0].data?.key || keys[0].key || '');

      setTemplates(Array.isArray(tmplRes) ? tmplRes : []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  }, [user, selectedKey]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
      await loadInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create API key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      await apex.collection('og_api_keys').delete(id);
      await loadInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete key');
    }
  };

  // 3. Test Card Generation (`POST /opengraph`)
  const handleGenerateCard = async () => {
    if (!selectedKey) return setError('Please select or create an API Key first.');
    if (!imageId.trim()) return setError('Please enter an Image ID.');

    setIsGeneratingCard(true);
    setError(null);

    // Build the dynamic data array payload
    const imageParams: any = {};
    if (blur && !isNaN(Number(blur))) imageParams.blur = Number(blur);

    const dataPayload = [
      {
        type: 'image',
        target: imageTarget,
        value: imageId,
        platform,
        params: imageParams,
      },
      ...customVars.filter(v => v.target.trim() && v.value.trim()).map(v => ({
        type: 'text',
        target: v.target,
        value: v.value,
      })),
    ];

    try {
      const res = await fetch('/opengraph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-og-api-key': selectedKey,
        },
        body: JSON.stringify({
          templateId,
          format,
          quality,
          data: dataPayload,
        }),
      });

      const resText = await res.text();
      let data;
      try { data = JSON.parse(resText); } catch { throw new Error('Invalid JSON response from server'); }

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

  // UI Helpers
  const handleAddVar = () => setCustomVars([...customVars, { target: 'NEW_VAR', value: '' }]);
  const handleRemoveVar = (index: number) => setCustomVars(customVars.filter((_, i) => i !== index));
  const handleUpdateVar = (index: number, field: 'target' | 'value', val: string) => {
    const updated = [...customVars];
    updated[index][field] = val;
    setCustomVars(updated);
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
      <div className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 border-b border-black/10 dark:border-white/10 pb-8">
        <div>
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <span className="p-2 rounded-xl bg-neon/10 text-neon border border-neon/20">
              <Sparkles size={24} />
            </span>
            <h1 className="text-4xl font-display font-bold text-ink-invert">OpenGraph Studio</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Design, test, and integrate dynamic edge-cached OpenGraph preview cards.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface border border-black/10 dark:border-white/10 px-4 py-2 rounded-full text-xs font-mono text-gray-400">
          <Globe size={14} className="text-neon" />
          <span>Edge CDN Cached • Dynamic SVG to PNG</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ================= LEFT COLUMN ================= */}
        <div className="lg:col-span-5 space-y-8 h-full pr-0 lg:pr-4">
          
          {/* 1. API Keys Management */}
          <div className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold flex items-center gap-2 text-ink-invert">
                <Key className="text-neon" size={18} /> API Keys
              </h2>
            </div>
            <form onSubmit={handleCreateApiKey} className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="New key name (e.g. NextJS Frontend)"
                className="flex-1 bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm text-ink-invert focus:outline-none focus:border-neon/50"
              />
              <button
                type="submit"
                disabled={isCreatingKey || !newKeyName.trim()}
                className="bg-neon text-ink font-bold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isCreatingKey ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create
              </button>
            </form>
            {isLoadingKeys ? (
              <div className="py-4 text-center text-gray-500"><Loader2 size={20} className="animate-spin mx-auto text-neon" /></div>
            ) : apiKeys.length > 0 ? (
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                {apiKeys.map((item) => {
                  const data = item.data || item;
                  const keyStr = data.key || '';
                  const isSelected = selectedKey === keyStr;
                  return (
                    <div key={item.id} onClick={() => setSelectedKey(keyStr)} className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected ? 'border-neon bg-neon/5' : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink-invert truncate">{data.client_name || 'Key'}</span>
                          {isSelected && <span className="bg-neon text-ink text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>}
                        </div>
                        <p className="font-mono text-xs text-gray-500 truncate mt-0.5">{keyStr.substring(0, 16)}...</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => copyToClipboard(keyStr, 'key', item.id)} className="p-2 text-gray-400 hover:text-ink-invert transition-colors" title="Copy Full Key">
                          {copiedKeyId === item.id ? <Check size={16} className="text-neon" /> : <Copy size={16} />}
                        </button>
                        <button onClick={() => handleDeleteApiKey(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Delete Key">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm border border-dashed rounded-2xl">No API keys created yet.</div>
            )}
          </div>

          {/* 2. Payload Configuration */}
          <div className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <h2 className="text-lg font-display font-bold flex items-center gap-2 text-ink-invert mb-2">
              <Layers className="text-neon" size={18} /> Request Payload
            </h2>

            {/* Base Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">SVG Template</label>
                <div className="relative">
                  <input
                    type="text"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    list="template-suggestions"
                    placeholder="e.g. default-opengraph"
                    className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-ink-invert focus:outline-none focus:border-neon"
                  />
                  <datalist id="template-suggestions">
                    {templates.map(t => <option key={t.id} value={t.slug} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Format</label>
                <select value={format} onChange={(e: any) => setFormat(e.target.value)} className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-ink-invert focus:outline-none focus:border-neon">
                  <option value="webp">WebP (Optimal)</option>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </div>
            </div>

            {/* Main Image Object */}
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={14} /> Main Image Object
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Platform</label>
                  <select value={platform} onChange={(e: any) => setPlatform(e.target.value)} className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-ink-invert focus:outline-none focus:border-neon">
                    <option value="unsplash">Unsplash</option>
                    <option value="pexels">Pexels</option>
                    <option value="inspowall">InspoWall</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Image ID</label>
                  <input type="text" value={imageId} onChange={(e) => setImageId(e.target.value)} className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-ink-invert focus:outline-none focus:border-neon" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Tera Target Var</label>
                  <input type="text" value={imageTarget} onChange={(e) => setImageTarget(e.target.value)} className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-ink-invert focus:outline-none focus:border-neon" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Blur Radius (Optional)</label>
                  <input type="number" placeholder="e.g. 10" value={blur} onChange={(e) => setBlur(e.target.value)} className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-ink-invert focus:outline-none focus:border-neon" />
                </div>
              </div>
            </div>

            {/* Custom Text Variables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code size={14} /> Text Variables Array
                </h3>
                <button onClick={handleAddVar} className="text-xs text-neon hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add Var
                </button>
              </div>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {customVars.map((v, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="Tera Target (e.g. TITLE)"
                      value={v.target}
                      onChange={(e) => handleUpdateVar(idx, 'target', e.target.value)}
                      className="w-1/3 bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-ink-invert focus:outline-none focus:border-neon"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={v.value}
                      onChange={(e) => handleUpdateVar(idx, 'value', e.target.value)}
                      className="flex-1 bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-2 text-xs text-ink-invert focus:outline-none focus:border-neon"
                    />
                    <button onClick={() => handleRemoveVar(idx)} className="p-2 text-gray-400 hover:text-red-500 transition-colors mt-0.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">{error}</div>}

            <button
              onClick={handleGenerateCard}
              disabled={isGeneratingCard || !selectedKey}
              className="w-full bg-neon text-ink font-bold py-3.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-base shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50 mt-2"
            >
              {isGeneratingCard ? <><RefreshCw size={18} className="animate-spin" /><span>Generating...</span></> : <><Sparkles size={18} /><span>Generate Payload & Preview</span></>}
            </button>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* Live Edge Canvas Preview */}
          <div className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-display font-bold text-ink-invert flex items-center gap-1.5">
                <Globe size={16} className="text-neon" /> Live Result Preview
              </span>
            </div>
            <div className="relative w-full aspect-[1200/630] rounded-2xl border border-border bg-[#0d1117] overflow-hidden flex items-center justify-center shadow-inner group">
              {isGeneratingCard && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 text-white">
                  <RefreshCw size={32} className="animate-spin text-neon" />
                  <span className="text-xs font-mono">Processing payload & rendering edge canvas...</span>
                </div>
              )}
              {generatedPublicUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={generatedPublicUrl} alt="OpenGraph Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-gray-500">
                    <ShieldCheck size={24} />
                  </div>
                  <p className="text-sm text-gray-400">Generate a payload to see the public edge-cached card.</p>
                </div>
              )}
              {generatedPublicUrl && (
                <a href={generatedPublicUrl} target="_blank" rel="noreferrer" className="absolute top-4 right-4 p-3 bg-black/70 hover:bg-black text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur">
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
            
            {/* Meta Tags Output */}
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">HTML Meta Tag</label>
                <button onClick={() => copyToClipboard(metaTag, 'meta')} disabled={!generatedPublicUrl} className="text-xs text-neon hover:underline flex items-center gap-1 disabled:opacity-40">
                  {copiedMeta ? <Check size={14} /> : <Copy size={14} />} Copy
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-[#161b22] border border-black/10 dark:border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all select-all min-h-[42px]">
                {metaTag || '// HTML Meta tag will appear here...'}
              </pre>
            </div>
          </div>

          {/* API Documentation */}
          <div className="bg-surface border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-xl flex-1 flex flex-col">
            <h2 className="text-lg font-display font-bold flex items-center gap-2 text-ink-invert mb-4">
              <BookOpen className="text-neon" size={18} /> Integration Docs
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Use this endpoint to dynamically construct OpenGraph images passing your own raw Tera template data arrays.
            </p>
            
            <div className="bg-black/5 dark:bg-[#161b22] rounded-2xl p-4 border border-black/10 dark:border-white/10 space-y-4 flex-1">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Endpoint</span>
                <code className="text-xs font-mono text-ink-invert bg-black/10 dark:bg-white/10 px-2 py-1 rounded">
                  POST https://inspowall.pages.dev/opengraph
                </code>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Headers</span>
                <pre className="text-[11px] font-mono text-gray-500">
                  Content-Type: application/json{'\n'}
                  <span className="text-neon">x-og-api-key: og_live_your_key_here</span>
                </pre>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">JSON Body Payload</span>
                <pre className="text-[11px] font-mono text-emerald-500 overflow-x-auto">
{`{
  "templateId": "default-opengraph",
  "format": "webp",
  "quality": 85,
  "data": [
    {
      "type": "image",
      "target": "IMAGE_URL",
      "value": "2014422",
      "platform": "pexels",
      "params": { "blur": 15 }
    },
    {
      "type": "text",
      "target": "TITLE",
      "value": "Amazing Landscape"
    }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}