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
      setBills(Array.isArray(bRes.data) ? bRes.data : []);
      setSuppliers(Array.isArray(sRes.data) ? sRes.data : []);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
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

  if (loading) return <div className="flex flex-col items-center justify-center h-full gap-4">
    <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Procurement...</p>
  </div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">Inventory Sourcing</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Stock Procurement & Supplier Interaction</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="btn-primary shadow-indigo-100"
        >
          <Plus className="w-5 h-5" /> New Procurement
        </button>
      </div>

      <div className="modern-card p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
           <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Bill # or Supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
              />
           </div>
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sourcing: {filteredBills.length}</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-50/30 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Identity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Items</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBills.map(bill => (
                <tr key={bill.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800 leading-tight mb-1">{bill.billNumber}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(bill.billDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[11px] font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                         {bill.supplierName[0]}
                      </div>
                      <p className="text-sm font-bold text-slate-600">{bill.supplierName}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <p className="text-xs font-black text-slate-800">{bill.items.length} SKU</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{bill.items.reduce((acc, i) => acc + i.quantity, 0)} Total Units</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-base font-black text-slate-900 tracking-tight">{formatCurrency(bill.totalAmount)}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className={cn(
                      "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border",
                      bill.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {bill.paymentStatus === 'paid' ? 'Settled' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBills.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic leading-relaxed">No procurement records<br/>found in the ledger</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
            >
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Create Sourcing Voucher</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Updates inventory levels upon authentication</p>
                </div>
                <button 
                  onClick={() => setShowAdd(false)} 
                  className="p-4 bg-white text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100 shadow-sm"
                >
                   <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vendor Identity</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all outline-none"
                      value={newPurchase.supplierId}
                      onChange={(e) => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}
                    >
                      <option value="">Walk-in Supplier (Cash)</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Status</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all outline-none"
                      value={newPurchase.paymentStatus}
                      onChange={(e) => setNewPurchase({ ...newPurchase, paymentStatus: e.target.value as any })}
                    >
                      <option value="unpaid">Unpaid / Term Credit</option>
                      <option value="paid">Settled Full</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Sourcing Manifest</h4>
                    <button 
                      onClick={handleAddItem}
                      className="group flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 p-0.5 bg-indigo-50 rounded group-hover:bg-indigo-100 transition-colors" />
                      Append Row
                    </button>
                  </div>

                  <div className="space-y-4">
                    {newPurchase.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-4 items-end bg-slate-50/50 p-5 rounded-3xl border border-slate-100 relative group animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="col-span-12 md:col-span-5 space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Item SKU</label>
                          <select 
                            className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-50 transition-all outline-none"
                            value={item.productId}
                            onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                          >
                            <option value="">Search Inventory SKUs...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty</label>
                          <input 
                            type="number" 
                            className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-indigo-50 transition-all outline-none"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="col-span-5 md:col-span-3 space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Purchase Rate (₹)</label>
                          <input 
                            type="number" 
                            className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-indigo-50 transition-all outline-none"
                            value={item.purchasePrice}
                            onChange={(e) => handleUpdateItem(idx, 'purchasePrice', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2 flex justify-end pb-1">
                          <button 
                            onClick={() => handleRemoveItem(idx)}
                            className="p-3 bg-white text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 hover:border-rose-100 shadow-sm transition-all active:scale-90"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {newPurchase.items.length === 0 && (
                       <button 
                        onClick={handleAddItem}
                        className="w-full py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-400 transition-all"
                       >
                          <ShoppingBag className="w-10 h-10 opacity-40" />
                          <span className="text-[10px] font-black uppercase tracking-widest">No entries added to sourcing warrant</span>
                       </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Documented Notes</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-5 text-sm font-medium focus:ring-4 focus:ring-indigo-50 transition-all outline-none min-h-[100px] resize-none"
                    placeholder="Document special procurement terms, lot numbers, or arrival conditions..."
                    value={newPurchase.notes}
                    onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                 <button 
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-5 bg-white text-slate-600 rounded-[2rem] font-black uppercase tracking-widest text-xs border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={newPurchase.items.length === 0}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                  Authenticate & File Bill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
