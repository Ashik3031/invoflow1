import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, ArrowUpRight, ArrowDownLeft, IndianRupee } from 'lucide-react';
import api from '../lib/api';
import { CashBook } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function CashBookPage() {
  const [entries, setEntries] = useState<CashBook[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ type: 'in', amount: '', note: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, balanceRes] = await Promise.all([
        api.get('/accounts/cash-book'),
        api.get('/accounts/cash-balance')
      ]);
      setEntries(entriesRes.data.sort((a: CashBook, b: CashBook) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setBalance(balanceRes.data.balance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/accounts/cash', {
        ...newEntry,
        amount: parseFloat(newEntry.amount),
        referenceType: 'manual'
      });
      setShowModal(false);
      setNewEntry({ type: 'in', amount: '', note: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Financial Cash Book</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Real-time Liquidity Tracking</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-brand text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:scale-105 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Manual Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Cash in Hand</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(balance)}</p>
          </div>
          <IndianRupee className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-50 -rotate-12" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">In (₹)</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Out (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">No transactions found</td></tr>
              ) : entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-[11px] font-bold text-slate-500 italic pb-1">
                    {new Date(e.date).toLocaleDateString()}
                    <span className="block text-[9px] text-slate-300 not-italic">{new Date(e.date).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-slate-800">{e.note}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {e.referenceType || 'Manual'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {e.type === 'in' ? (
                      <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-black text-sm">
                        <ArrowUpRight className="w-3 h-3" />
                        {formatCurrency(e.amount)}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-8 py-5 text-right">
                    {e.type === 'out' ? (
                      <div className="flex items-center justify-end gap-1.5 text-rose-500 font-black text-sm">
                        <ArrowDownLeft className="w-3 h-3" />
                        {formatCurrency(e.amount)}
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden p-8">
              <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">New Manual Entry</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {['in', 'out'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewEntry({ ...newEntry, type: t as any })}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        newEntry.type === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                      )}
                    >
                      Cash {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={newEntry.amount}
                      onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                      className="input-base w-full h-12"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Note / Description</label>
                    <input
                      type="text"
                      required
                      value={newEntry.note}
                      onChange={(e) => setNewEntry({ ...newEntry, note: e.target.value })}
                      className="input-base w-full h-12"
                      placeholder="e.g. Received from partner"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-200">Save Entry</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
