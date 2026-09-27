import React, { useState } from 'react';
import { 
  Key, ShieldCheck, Eye, EyeOff, Copy, Check, 
  Plus, Search, Star, Trash2, Edit3, Wifi, Camera, 
  CreditCard, Cloud, FileCode, FileText, Sparkles, RefreshCw, X
} from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { PasswordItem } from '../types/invoice';

export const PasswordVaultSection: React.FC = () => {
  const { passwords, addPassword, updatePassword, deletePassword, toggleFavoritePassword } = useInvoiceStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PasswordItem | null>(null);

  // Visible password tracking for eye toggle
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Privacy Blur Masking Toggle
  const [privacyMask, setPrivacyMask] = useState(false);

  // Generator State inside Add/Edit modal
  const [showGenerator, setShowGenerator] = useState(false);
  const [genLength, setGenLength] = useState(14);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genLowercase, setGenLowercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Form State
  const [formData, setFormData] = useState<Omit<PasswordItem, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    category: 'cctv',
    username: '',
    password: '',
    pin: '',
    ipOrUrl: '',
    notes: '',
    favorite: false
  });

  const categories = [
    { id: 'all', label: 'All Passwords', icon: Key },
    { id: 'fav', label: 'Favorites', icon: Star },
    { id: 'cctv', label: 'CCTV & Security', icon: Camera },
    { id: 'network', label: 'WiFi & Routers', icon: Wifi },
    { id: 'banking', label: 'Banking & Wallets', icon: CreditCard },
    { id: 'cloud', label: 'Google & Cloud', icon: Cloud },
    { id: 'software', label: 'Software & Keys', icon: FileCode },
    { id: 'general', label: 'General & Notes', icon: FileText },
  ];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'cctv': return <Camera className="h-4 w-4 text-sky-400" />;
      case 'network': return <Wifi className="h-4 w-4 text-emerald-400" />;
      case 'banking': return <CreditCard className="h-4 w-4 text-amber-400" />;
      case 'cloud': return <Cloud className="h-4 w-4 text-indigo-400" />;
      case 'software': return <FileCode className="h-4 w-4 text-purple-400" />;
      default: return <Key className="h-4 w-4 text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'cctv': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'network': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'banking': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cloud': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'software': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  // Filter passwords
  const filteredPasswords = passwords.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.username.toLowerCase().includes(search.toLowerCase()) ||
      (item.ipOrUrl && item.ipOrUrl.toLowerCase().includes(search.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));

    if (selectedCategory === 'all') return matchesSearch;
    if (selectedCategory === 'fav') return matchesSearch && item.favorite;
    return matchesSearch && item.category === selectedCategory;
  });

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyText = (id: string, field: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedId(null);
      setCopiedField(null);
    }, 2000);
  };

  // Strong Password Generator Logic
  const generateNewPassword = () => {
    let chars = '';
    if (genUppercase) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (genLowercase) chars += 'abcdefghijkmnopqrstuvwxyz';
    if (genNumbers) chars += '23456789';
    if (genSymbols) chars += '!@#$%^&*()_+~|}{[]:;?><,.-=';

    if (!chars) chars = 'abcdefghijkmnopqrstuvwxyz23456789';

    let result = '';
    const array = new Uint32Array(genLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      result += chars[array[i] % chars.length];
    }

    setGeneratedPassword(result);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      category: 'cctv',
      username: '',
      password: '',
      pin: '',
      ipOrUrl: '',
      notes: '',
      favorite: false
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: PasswordItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      username: item.username,
      password: item.password || '',
      pin: item.pin || '',
      ipOrUrl: item.ipOrUrl || '',
      notes: item.notes || '',
      favorite: item.favorite || false
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingItem) {
      await updatePassword(editingItem.id, formData);
    } else {
      await addPassword(formData);
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the credential for "${title}"?`)) {
      await deletePassword(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:hidden animate-fadeIn">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Password & Credentials Vault
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Securely store CCTV NVR passwords, WiFi keys, router logins, merchant portals & customer recovery PINs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {/* Privacy Blur Toggle */}
          <button
            type="button"
            onClick={() => setPrivacyMask(!privacyMask)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
              privacyMask 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Blur passwords on screen for privacy"
          >
            {privacyMask ? <EyeOff className="h-4 w-4 text-amber-400" /> : <Eye className="h-4 w-4" />}
            <span>{privacyMask ? 'Privacy Mask ON' : 'Privacy Mask'}</span>
          </button>

          {/* Add Password Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Password</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service, username, IP/URL, notes..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-sans"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vault Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPasswords.length > 0 ? (
          filteredPasswords.map((item) => {
            const isVisible = visiblePasswords[item.id] || false;
            return (
              <div 
                key={item.id} 
                className="bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 group transition-all"
              >
                {/* Card Top: Title, Category Badge & Star */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="h-9 w-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-extrabold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                          {item.title}
                        </h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-0.5 ${getCategoryBadgeClass(item.category)}`}>
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {/* Star Favorite Button */}
                    <button
                      type="button"
                      onClick={() => toggleFavoritePassword(item.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                      title={item.favorite ? 'Remove Favorite' : 'Mark Favorite'}
                    >
                      <Star className={`h-4 w-4 ${item.favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* Credentials Fields List */}
                  <div className="space-y-2.5 mt-4 text-xs font-mono">
                    
                    {/* Username / Account */}
                    {item.username && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                        <div className="overflow-hidden pr-2">
                          <p className="text-[10px] text-slate-500 font-sans font-semibold uppercase">Username / ID</p>
                          <p className="text-slate-200 font-bold truncate select-all">{item.username}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(item.id, 'username', item.username)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[10px] flex items-center space-x-1 shrink-0"
                          title="Copy Username"
                        >
                          {copiedId === item.id && copiedField === 'username' ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Password Field */}
                    {item.password && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                        <div className="overflow-hidden pr-2">
                          <p className="text-[10px] text-slate-500 font-sans font-semibold uppercase">Password</p>
                          <p className={`font-bold truncate select-all ${
                            privacyMask ? 'blur-sm select-none' : ''
                          } ${isVisible ? 'text-emerald-400' : 'text-slate-400 tracking-widest'}`}>
                            {isVisible ? item.password : '••••••••••••'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(item.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                            title={isVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyText(item.id, 'password', item.password)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                            title="Copy Password"
                          >
                            {copiedId === item.id && copiedField === 'password' ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* IP / URL / Port */}
                    {item.ipOrUrl && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                        <div className="overflow-hidden pr-2">
                          <p className="text-[10px] text-slate-500 font-sans font-semibold uppercase">IP / Web URL</p>
                          <p className="text-sky-400 font-bold truncate select-all">{item.ipOrUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(item.id, 'ipOrUrl', item.ipOrUrl)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                          title="Copy IP/URL"
                        >
                          {copiedId === item.id && copiedField === 'ipOrUrl' ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* PIN / Code */}
                    {item.pin && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                        <div className="overflow-hidden pr-2">
                          <p className="text-[10px] text-slate-500 font-sans font-semibold uppercase">PIN / Verification Key</p>
                          <p className={`text-amber-400 font-bold truncate select-all ${privacyMask ? 'blur-sm select-none' : ''}`}>{item.pin}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(item.id, 'pin', item.pin)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                          title="Copy PIN"
                        >
                          {copiedId === item.id && copiedField === 'pin' ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-sans text-slate-300 leading-relaxed">
                        {item.notes}
                      </div>
                    )}

                  </div>
                </div>

                {/* Card Bottom: Edit & Delete */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors"
                      title="Edit Password"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete Password"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-xs text-slate-500 space-y-3">
            <Key className="h-8 w-8 text-slate-600 mx-auto" />
            <p>No passwords found in this category.</p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Add First Credential
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Password Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-2 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="font-bold text-sm text-white">
                  {editingItem ? 'Edit Credential' : 'Save New Password / Note'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Service / Device Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Shop CCTV 8CH NVR, Office WiFi, IRD Tax Portal..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="cctv">CCTV & Security</option>
                    <option value="network">WiFi & Routers</option>
                    <option value="banking">Banking & Wallets</option>
                    <option value="cloud">Google & Cloud</option>
                    <option value="software">Software & Keys</option>
                    <option value="general">General & Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username / ID
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. admin, user@gmail.com, 98000..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Password Field + Generator Trigger */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGenerator(!showGenerator);
                      generateNewPassword();
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter or generate password..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400"
                />
              </div>

              {/* Embedded Generator Tool */}
              {showGenerator && (
                <div className="p-3.5 bg-slate-950 border border-emerald-500/30 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-300">
                      Generated: <span className="text-emerald-400 font-mono">{generatedPassword}</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={generateNewPassword}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Regenerate"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, password: generatedPassword });
                          setShowGenerator(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                      >
                        Use This
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="text-slate-400">Length: {genLength}</span>
                    <input
                      type="range"
                      min={8}
                      max={32}
                      value={genLength}
                      onChange={(e) => {
                        setGenLength(Number(e.target.value));
                        generateNewPassword();
                      }}
                      className="flex-1 accent-emerald-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genUppercase}
                        onChange={(e) => {
                          setGenUppercase(e.target.checked);
                          generateNewPassword();
                        }}
                        className="rounded accent-emerald-500"
                      />
                      <span>A-Z</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genLowercase}
                        onChange={(e) => {
                          setGenLowercase(e.target.checked);
                          generateNewPassword();
                        }}
                        className="rounded accent-emerald-500"
                      />
                      <span>a-z</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genNumbers}
                        onChange={(e) => {
                          setGenNumbers(e.target.checked);
                          generateNewPassword();
                        }}
                        className="rounded accent-emerald-500"
                      />
                      <span>0-9</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genSymbols}
                        onChange={(e) => {
                          setGenSymbols(e.target.checked);
                          generateNewPassword();
                        }}
                        className="rounded accent-emerald-500"
                      />
                      <span>!@#$%</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    IP Address / Web URL
                  </label>
                  <input
                    type="text"
                    value={formData.ipOrUrl || ''}
                    onChange={(e) => setFormData({ ...formData, ipOrUrl: e.target.value })}
                    placeholder="e.g. 192.168.1.64 or http://..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    PIN / Recovery Code
                  </label>
                  <input
                    type="text"
                    value={formData.pin || ''}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="e.g. 1234, ABCD1234"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Secret Notes & Device Info
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Port number, verification question, customer phone, hardware serial number..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  {editingItem ? 'Update Password' : 'Save to Vault'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

