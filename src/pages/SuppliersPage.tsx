import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, MapPin, Trash2, Loader2, Users } from 'lucide-react';
import api from '../lib/api';
import { Supplier } from '../types';
import { motion } from 'motion/react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/purchase/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      await api.post('/purchase/supplier', newSupplier);
      setShowAdd(false);
      setNewSupplier({ name: '', phone: '', email: '', address: '' });
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/purchase/supplier/${id}`);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.phone.includes(searchTerm)
  );

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Suppliers</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Vendor Network & Contact Management</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add Supplier
        </button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
        <input 
          type="text" 
          placeholder="Search vendors..."
          className="input-base w-full pl-12 py-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 border-2 border-brand/20 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="label-micro text-brand">Supplier / Company Name</label>
              <input 
                type="text" 
                className="input-base w-full"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro">Phone Number</label>
              <input 
                type="tel" 
                className="input-base w-full"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro">Email Address</label>
              <input 
                type="email" 
                className="input-base w-full"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro">Office Address</label>
              <input 
                type="text" 
                className="input-base w-full"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} className="flex-1 py-4 bg-brand text-white rounded-2xl font-bold uppercase tracking-widest text-xs">Save Supplier</button>
            <button onClick={() => setShowAdd(false)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase tracking-widest text-xs">Cancel</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(supplier => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={supplier.id} 
            className="glass-card p-6 flex flex-col gap-6 group hover:border-brand/30 transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand group-hover:text-white transition-all text-xl font-black">
                {supplier.name[0]}
              </div>
              <button 
                onClick={() => handleDelete(supplier.id)}
                className="p-2 text-slate-200 hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-800">{supplier.name}</h3>
              <p className="text-[10px] font-black text-brand uppercase tracking-widest mt-1">Verified Vendor</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-slate-500">
                <Phone className="w-4 h-4" />
                <span className="text-sm font-bold">{supplier.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-bold truncate">{supplier.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-bold truncate">{supplier.address || 'N/A'}</span>
              </div>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No suppliers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
