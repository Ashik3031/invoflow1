import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, Trash2, Edit2, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { Product } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', category: 'General', hsnCode: '', gstRate: '18', barcode: '', purchasePrice: '' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/inventory/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        price: Number(formData.price), 
        stock: Number(formData.stock),
        gstRate: Number(formData.gstRate),
        purchasePrice: Number(formData.purchasePrice)
      };
      if (editingProduct) {
        await api.put(`/inventory/product/${editingProduct.id}`, payload);
      } else {
        await api.post('/inventory/product', payload);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', price: '', stock: '', category: 'General', hsnCode: '', gstRate: '18', barcode: '', purchasePrice: '' });
      fetchProducts();
    } catch (err) {
      alert('Failed to save product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/inventory/product/${id}`);
      fetchProducts();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const filtered = Array.isArray(products) ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) : [];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">Inventory Management</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Stock Oversight & Asset Tracking</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setFormData({ name: '', price: '', stock: '', category: 'General', hsnCode: '', gstRate: '18', barcode: '', purchasePrice: '' }); setIsModalOpen(true); }}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          Add New Product
        </button>
      </div>

      <div className="modern-card p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
           <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory by name, category, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
              />
           </div>
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Items: {filtered.length}</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-50/30 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Detail</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HSN/Barcode</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Level</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center"><Loader2 className="animate-spin inline text-indigo-600" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest">No inventory records found</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5">
                       <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{p.name}</p>
                       <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest opacity-60">Gst: {p.gstRate}%</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <code className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 font-mono italic">{p.barcode || p.hsnCode || 'NO-SCAN'}</code>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-sm font-medium text-slate-600">{p.category}</span>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-sm font-black text-slate-800">{formatCurrency(p.price)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", p.stock < 10 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600 shadow-sm")}>
                          {p.stock} Units
                        </span>
                        {p.stock < 10 && <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingProduct(p); setFormData({ name: p.name, price: String(p.price), stock: String(p.stock), category: p.category, hsnCode: p.hsnCode || '', gstRate: String(p.gstRate || 0), barcode: p.barcode || '', purchasePrice: String(p.purchasePrice || 0) }); setIsModalOpen(true); }}
                          className="p-2 border border-slate-100 bg-white shadow-sm hover:border-indigo-200 hover:text-indigo-600 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-2 border border-slate-100 bg-white shadow-sm hover:border-rose-200 hover:text-rose-600 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl relative z-10 p-6"
            >
              <h3 className="text-xl font-bold mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-micro block mb-1">Product Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-base w-full" />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-micro block mb-1">Sale Price (₹)</label>
                    <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="input-base w-full" />
                  </div>
                  <div>
                    <label className="label-micro block mb-1">Pur. Price (₹)</label>
                    <input type="number" required value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className="input-base w-full" />
                  </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-micro block mb-1">Stock</label>
                    <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="input-base w-full" />
                  </div>
                  <div>
                    <label className="label-micro block mb-1">GST Rate (%)</label>
                    <select value={formData.gstRate} onChange={e => setFormData({...formData, gstRate: e.target.value})} className="input-base w-full">
                      {[0, 5, 12, 18, 28].map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                    </select>
                  </div>
                </div>
                 <div>
                  <label className="label-micro block mb-1">HSN Code</label>
                  <input value={formData.hsnCode} onChange={e => setFormData({...formData, hsnCode: e.target.value})} className="input-base w-full" placeholder="e.g. 0901" />
                </div>
                <div>
                  <label className="label-micro block mb-1">Barcode (EAN/UPC)</label>
                  <input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="input-base w-full" placeholder="Scan or type barcode..." />
                </div>
                <div>
                  <label className="label-micro block mb-1">Category</label>
                  <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="input-base w-full" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors">Save Product</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
