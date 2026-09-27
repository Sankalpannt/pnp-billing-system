import React, { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { formatNPR } from '../utils/formatters';
import { CatalogItem } from '../types/invoice';

export const ItemCatalogModal: React.FC = () => {
  const { catalog, addCatalogItem, deleteCatalogItem, addLineItem, setActiveTab } = useInvoiceStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newItem, setNewItem] = useState({
    description: '',
    category: 'General Products' as CatalogItem['category'],
    unit: 'Pcs',
    price: 0
  });

  const categories = ['all', 'General Products', 'Electronics', 'Hardware', 'Accessories', 'CCTV & Security', 'Photo & Print', 'Framing', 'Printing', 'Services', 'Other'];

  const filtered = catalog.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description.trim() || newItem.price <= 0) return;
    await addCatalogItem(newItem);
    setNewItem({ description: '', category: 'General Products', unit: 'Pcs', price: 0 });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Product & Service Catalog / Price List
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Predefine general products, IT networking, electronics, CCTV hardware, and photo/print services
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product / Item</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service name or particulars..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {item.category}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete preset service ${item.description}?`)) {
                        deleteCatalogItem(item.id);
                      }
                    }}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white">{item.description}</h3>
                
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-slate-400">Unit: <strong className="text-slate-200">{item.unit}</strong></span>
                  <span className="text-lg font-black font-mono text-sky-400">{formatNPR(item.price)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  addLineItem({ description: item.description, unit: item.unit, listPrice: item.price });
                  setActiveTab('create');
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-sky-600/20 text-sky-400 hover:text-white text-xs font-semibold border border-slate-700 hover:border-sky-500/30 transition-all flex items-center justify-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add to Current Invoice</span>
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No preset services found in catalog.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Add Preset Service / Goods</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Item / Service Description *</label>
                <input
                  type="text"
                  required
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="e.g. Wireless Mouse, HDMI Cable, Photo Print 12x18..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium"
                >
                  <option value="General Products">General Products</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Accessories">Accessories</option>
                  <option value="CCTV & Security">CCTV & Security</option>
                  <option value="Photo & Print">Photo & Print</option>
                  <option value="Framing">Framing</option>
                  <option value="Printing">Printing</option>
                  <option value="Services">Services / Installation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Copies">Copies</option>
                    <option value="Sets">Sets</option>
                    <option value="Pkt">Pkt</option>
                    <option value="Sq Ft">Sq Ft</option>
                    <option value="Day">Day</option>
                    <option value="Hrs">Hrs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">List Rate (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                >
                  Save Preset Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
