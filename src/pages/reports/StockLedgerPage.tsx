import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download, Package, ArrowRight, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../../lib/api';
import { Product } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import Papa from 'papaparse';

export default function StockLedgerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/inventory');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/reports/stock-ledger/${id}`, { params: range });
      setLedger(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) fetchLedger(selectedProductId);
  }, [range, selectedProductId]);

  const exportCSV = () => {
    const csv = Papa.unparse(ledger);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `stock_ledger_${selectedProductId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Product Stock Ledger</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Detailed Item In-Out History</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <select 
             value={selectedProductId}
             onChange={(e) => setSelectedProductId(e.target.value)}
             className="input-base px-6 h-12 text-[10px] font-black uppercase tracking-widest"
           >
             <option value="">Select Product...</option>
             {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
           </select>
           
           <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 pl-2">
              <Calendar className="w-4 h-4 text-slate-300" />
              <input 
                type="date"
                value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
                className="text-[10px] font-black uppercase tracking-widest outline-none bg-transparent"
              />
            </div>
            <ArrowRight className="w-3 h-3 text-slate-200" />
            <input 
              type="date"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
              className="text-[10px] font-black uppercase tracking-widest outline-none bg-transparent pr-4"
            />
          </div>
          
          <button onClick={exportCSV} disabled={!selectedProductId} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-30 disabled:cursor-not-allowed">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Ref</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></td></tr>
            ) : !selectedProductId ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] italic">Please select a product above</td></tr>
            ) : ledger.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] italic">No movements recorded in this period</td></tr>
            ) : ledger.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 text-[10px] font-bold text-slate-500 italic">{new Date(item.date).toLocaleDateString()}</td>
                <td className="px-8 py-5">
                   <span className={cn(
                       "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                       item.type === 'purchase_in' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                   )}>
                       {item.type === 'purchase_in' ? 'Purchase (IN)' : 'Sale (OUT)'}
                   </span>
                </td>
                <td className="px-8 py-5">
                   <p className="text-xs font-black text-slate-800">Bill Ref: {item.reference}</p>
                </td>
                <td className={cn(
                    "px-8 py-5 text-right text-sm font-black",
                    item.qty > 0 ? "text-emerald-600" : "text-rose-500"
                )}>
                   <div className="flex items-center justify-end gap-1.5">
                       {item.qty > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                       {item.qty > 0 ? `+${item.qty}` : item.qty}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
