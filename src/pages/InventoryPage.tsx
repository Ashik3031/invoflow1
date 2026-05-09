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
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', category: 'General' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/inventory/products');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, price: Number(formData.price), stock: Number(formData.stock) };
      if (editingProduct) {
        await api.put(`/inventory/product/${editingProduct.id}`, payload);
      } else {
        await api.post('/inventory/product', payload);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', price: '', stock: '', category: 'General' });
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

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock Inventory</h2>
          <p className="text-slate-500 text-sm font-medium">Manage your retail items and availability</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setFormData({ name: '', price: '', stock: '', category: 'General' }); setIsModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Product (F4)
        </button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search items by name, category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-base w-full pl-11"
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="label-micro data-cell text-left">Product Detail</th>
                <th className="label-micro data-cell text-left">Category</th>
                <th className="label-micro data-cell text-left">Unit Price</th>
                <th className="label-micro data-cell text-left">Availability</th>
                <th className="label-micro data-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="data-cell text-center py-12"><Loader2 className="animate-spin inline text-brand" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="data-cell text-center py-12 text-slate-400 font-medium">No inventory data found</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="data-row">
                    <td className="data-cell font-bold text-slate-800">{p.name}</td>
                    <td className="data-cell text-slate-500 font-medium">{p.category}</td>
                    <td className="data-cell font-mono text-sm font-bold">{formatCurrency(p.price)}</td>
                    <td className="data-cell font-mono text-sm">
                      <span className={cn("px-2 py-1 rounded-lg font-bold", p.stock < 10 ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600")}>
                        {p.stock} Units
                      </span>
                    </td>
                    <td className="data-cell text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => { setEditingProduct(p); setFormData({ name: p.name, price: String(p.price), stock: String(p.stock), category: p.category }); setIsModalOpen(true); }}
                          className="p-2 border border-slate-100 bg-white shadow-sm hover:bg-slate-50 rounded-xl text-slate-600 transition-all active:scale-90"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-2 border border-rose-100 bg-white shadow-sm hover:bg-rose-50 rounded-xl text-rose-500 transition-all active:scale-90"
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
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-micro block mb-1">Price (₹)</label>
                    <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                  </div>
                  <div>
                    <label className="label-micro block mb-1">Stock</label>
                    <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                  </div>
                </div>
                <div>
                  <label className="label-micro block mb-1">Category</label>
                  <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
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
