import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Landmark, QrCode, ArrowRight, CreditCard, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { BankAccount, BankTransaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function BanksPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [statement, setStatement] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAcc, setNewAcc] = useState({ bankName: '', accountNumber: '', ifsc: '', upiId: '', openingBalance: '' });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/accounts/banks');
      setAccounts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatement = async (id: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/accounts/bank/${id}/statement`);
      setStatement(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/accounts/bank', {
        ...newAcc,
        openingBalance: parseFloat(newAcc.openingBalance || '0')
      });
      setShowModal(false);
      setNewAcc({ bankName: '', accountNumber: '', ifsc: '', upiId: '', openingBalance: '' });
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Banking & Ledgers</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Manage Bank Accounts & Statements</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-brand text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:scale-105 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Bank Account
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Account Cards */}
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">My Accounts</p>
          {loading && accounts.length === 0 ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-brand" /></div>
          ) : accounts.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[32px] text-slate-300 font-bold text-xs">No accounts added</div>
          ) : accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => { setSelectedAccount(acc); fetchStatement(acc.id); }}
              className={cn(
                "w-full p-6 h-48 rounded-[32px] text-left transition-all relative overflow-hidden group shadow-lg",
                selectedAccount?.id === acc.id ? "bg-slate-900 text-white shadow-slate-300" : "bg-white text-slate-600 hover:border-brand border border-slate-100"
              )}
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Landmark className={cn("w-6 h-6", selectedAccount?.id === acc.id ? "text-brand" : "text-slate-300")} />
                    <CreditCard className="w-4 h-4 opacity-20" />
                  </div>
                  <p className="mt-4 font-black uppercase tracking-widest text-[11px] opacity-60 italic">{acc.bankName}</p>
                  <p className="text-xs font-mono font-bold tracking-widest opacity-80 mt-1">
                    **** **** {acc.accountNumber?.slice(-4) || '0000'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Available Balance</p>
                  <p className="text-2xl font-black tracking-tighter">{formatCurrency(acc.balance || 0)}</p>
                </div>
              </div>
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors" />
            </button>
          ))}
        </div>

        {/* Statement Section */}
        <div className="lg:col-span-2">
          {selectedAccount ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Mini Statement: {selectedAccount.bankName}</h3>
                <div className="flex items-center gap-4">
                  {selectedAccount.upiId && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-[9px] font-black uppercase tracking-widest">
                      <QrCode className="w-3 h-3" />
                      {selectedAccount.upiId}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Debit (₹)</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></td></tr>
                    ) : statement.length === 0 ? (
                      <tr><td colSpan={4} className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">No transactions in this period</td></tr>
                    ) : statement.map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-[10px] font-bold text-slate-500 italic">{new Date(txn.date).toLocaleDateString()}</td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-black text-slate-800">{txn.note}</p>
                          <span className="text-[9px] font-black text-brand uppercase tracking-widest opacity-60">{txn.referenceType || 'Direct'}</span>
                        </td>
                        <td className="px-8 py-5 text-right text-rose-500 text-sm font-black">
                         {txn.type === 'debit' ? `-${formatCurrency(txn.amount)}` : '-'}
                        </td>
                        <td className="px-8 py-5 text-right text-emerald-600 text-sm font-black">
                          {txn.type === 'credit' ? `+${formatCurrency(txn.amount)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-96 border-2 border-dashed border-slate-100 rounded-[48px] flex flex-col items-center justify-center text-slate-300 text-sm font-bold uppercase tracking-widest italic animate-pulse">
              Select an account to view statement
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden p-8">
              <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tight">Link Bank Account</h3>
              
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                    <input type="text" required value={newAcc.bankName} onChange={e => setNewAcc({ ...newAcc, bankName: e.target.value })} className="input-base w-full h-12" placeholder="e.g. HDFC Bank" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account No.</label>
                    <input type="text" value={newAcc.accountNumber} onChange={e => setNewAcc({ ...newAcc, accountNumber: e.target.value })} className="input-base w-full h-12" placeholder="X X X X X X X X" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                    <input type="text" value={newAcc.ifsc} onChange={e => setNewAcc({ ...newAcc, ifsc: e.target.value.toUpperCase() })} className="input-base w-full h-12" placeholder="HDFC0001234" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand uppercase tracking-widest ml-1 italic">UPI ID / VPA</label>
                    <input type="text" value={newAcc.upiId} onChange={e => setNewAcc({ ...newAcc, upiId: e.target.value })} className="input-base w-full h-12 border-brand/20 bg-indigo-50/30" placeholder="shopname@okhdfc" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Balance (₹)</label>
                  <input type="number" required value={newAcc.openingBalance} onChange={e => setNewAcc({ ...newAcc, openingBalance: e.target.value })} className="input-base w-full h-12" placeholder="0.00" />
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Discard</button>
                  <button type="submit" className="flex-1 py-4 bg-brand text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">Link Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
