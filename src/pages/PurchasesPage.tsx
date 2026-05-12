import { useState, useEffect } from 'react';
import { Plus, Search, FileText, CheckCircle2, ChevronRight, ShoppingBag, Loader2, IndianRupee, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { PurchaseBill, Supplier, Product } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function PurchasesPage() {
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  
  // New Purchase State
  const [newPurchase, setNewPurchase] = useState({
    supplierId: '',
    items: [] as { productId: string; quantity: number; purchasePrice: number }[],
    notes: '',
    paymentStatus: 'unpaid' as const
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bRes, sRes, pRes] = await Promise.all([
        api.get('/purchase/bills'),
        api.get('/purchase/suppliers'),
        api.get('/inventory/products')
      ]);
      setBills(bRes.data);
      setSuppliers(sRes.data);
      setProducts(pRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setNewPurchase({
      ...newPurchase,
      items: [...newPurchase.items, { productId: '', quantity: 1, purchasePrice: 0 }]
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...newPurchase.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setNewPurchase({ ...newPurchase, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    setNewPurchase({
      ...newPurchase,
      items: newPurchase.items.filter((_, i) => i !== index)
    });
  };

  const handleCreate = async () => {
    if (newPurchase.items.length === 0) return alert('Add at least one item');
    try {
      await api.post('/purchase/bill/create', newPurchase);
      setShowAdd(false);
      setNewPurchase({ supplierId: '', items: [], notes: '', paymentStatus: 'unpaid' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredBills = bills.filter(b => 
    b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Purchase Inventory</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Stock Procurement & Supplier Invoicing</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-brand text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> New Procurement
        </button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 border-2 border-brand/20 bg-slate-50/30">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">Procurement Order</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-rose-500 font-bold uppercase text-[10px] tracking-widest">Discard Entry</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-2">
              <label className="label-micro">Select Supplier</label>
              <select 
                className="input-base w-full"
                value={newPurchase.supplierId}
                onChange={(e) => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}
              >
                <option value="">Walk-in Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-micro">Payment Status</label>
              <select 
                className="input-base w-full"
                value={newPurchase.paymentStatus}
                onChange={(e) => setNewPurchase({ ...newPurchase, paymentStatus: e.target.value as any })}
              >
                <option value="unpaid">Unpaid / Credit</option>
                <option value="paid">Paid Full</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <label className="label-micro text-brand">Stock Items</label>
              <button 
                onClick={handleAddItem}
                className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add Product Line
              </button>
            </div>
            {newPurchase.items.map((item, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap gap-4 items-end bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Product</label>
                  <select 
                    className="input-base w-full bg-slate-50 border-none"
                    value={item.productId}
                    onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                  >
                    <option value="">Select SKU...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</label>
                  <input 
                    type="number" 
                    className="input-base w-full bg-slate-50 border-none"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))}
                  />
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Price</label>
                  <input 
                    type="number" 
                    className="input-base w-full bg-slate-50 border-none"
                    value={item.purchasePrice}
                    onChange={(e) => handleUpdateItem(idx, 'purchasePrice', parseFloat(e.target.value))}
                  />
                </div>
                <button 
                  onClick={() => handleRemoveItem(idx)}
                  className="p-3 text-slate-200 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-8">
            <label className="label-micro">Procurement Notes</label>
            <textarea 
              className="input-base w-full min-h-[80px]"
              placeholder="e.g. Received partial stock, next batch on Monday..."
              value={newPurchase.notes}
              onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
            />
          </div>

          <button 
            onClick={handleCreate}
            className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-brand/20 active:scale-95 transition-all"
          >
            Create Purchase Bill & Update Inventory
          </button>
        </motion.div>
      )}

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
        <input 
          type="text" 
          placeholder="Search by Bill # or Supplier..."
          className="input-base w-full pl-12 py-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Details</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Procured Items</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Grand Total</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map(bill => (
              <tr key={bill.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                <td className="px-8 py-6">
                  <p className="text-sm font-black text-slate-800">{bill.billNumber}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(bill.billDate).toLocaleDateString()}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">V</div>
                    <p className="text-sm font-bold text-slate-600">{bill.supplierName}</p>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <p className="text-sm font-bold text-slate-800">{bill.items.length} Products</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{bill.items.reduce((acc, i) => acc + i.quantity, 0)} Units Procured</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <p className="text-lg font-black text-slate-800">{formatCurrency(bill.totalAmount)}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      bill.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {bill.paymentStatus}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBills.length === 0 && (
          <div className="py-20 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No procurement records</p>
          </div>
        )}
      </div>
    </div>
  );
}
