import React, { useState } from 'react';
import { Plus, Search, Trash2, Phone, MapPin, UserCheck } from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';

export const CustomerDirectory: React.FC = () => {
  const { customers, addCustomer, deleteCustomer, selectCustomer, setActiveTab } = useInvoiceStore();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newCust, setNewCust] = useState({
    name: '',
    address: '',
    phone: '',
    panVatNo: '',
    email: ''
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.panVatNo && c.panVatNo.includes(search))
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim()) return;
    await addCustomer(newCust);
    setNewCust({ name: '', address: '', phone: '', panVatNo: '', email: '' });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Customer Directory & Party List
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage repeat clients, commercial accounts, and party contact details
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or PAN..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
          />
        </div>
      </div>

      {/* Grid of Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length > 0 ? (
          filtered.map((cust) => (
            <div key={cust.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{cust.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-500" />
                        <span>{cust.phone || 'No Phone'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete customer ${cust.name}?`)) {
                        deleteCustomer(cust.id);
                      }
                    }}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {cust.address && (
                  <p className="text-xs text-slate-300 flex items-center space-x-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>{cust.address}</span>
                  </p>
                )}

                {cust.panVatNo && (
                  <div className="text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded inline-block">
                    PAN/VAT: {cust.panVatNo}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  selectCustomer(cust);
                  setActiveTab('create');
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-sky-600/20 text-sky-400 hover:text-white text-xs font-semibold border border-slate-700 hover:border-sky-500/30 transition-all flex items-center justify-center space-x-1"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Create Invoice for Customer</span>
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No customers found in directory.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Add New Party / Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  placeholder="Ram Kumar / Company"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  placeholder="9856012345"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  placeholder="New Road, Pokhara"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">PAN / VAT No.</label>
                <input
                  type="text"
                  value={newCust.panVatNo}
                  onChange={(e) => setNewCust({ ...newCust, panVatNo: e.target.value })}
                  placeholder="617322405"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
