import React, { useState, useEffect } from 'react';
import { Search, Loader2, ArrowRight, User, ShoppingBag, Receipt, IndianRupee, Save } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function OutstandingPage() {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMode: 'cash', note: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get(`/accounts/${activeTab}`);
      setData(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/accounts/payment', {
        billId: selectedEntry.bill.id,
        billType: activeTab === 'receivables' ? 'sale' : 'purchase',
        amount: parseFloat(paymentForm.amount),
        paymentMode: paymentForm.paymentMode,
        note: paymentForm.note
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', paymentMode: 'cash', note: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = Array.isArray(data) ? data.filter(item => 
    (item.customerName || item.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             Outstanding Credit
            <span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-xs animate-pulse">Action Required</span>
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Accounts Receivable & Payable Management</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base w-full pl-10"
          />
        </div>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'receivables', label: 'Receivables (Incoming)', icon: User },
          { id: 'payables', label: 'Payables (Outgoing)', icon: ShoppingBag }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden h-[600px] flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'receivables' ? 'Customer' : 'Supplier'}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill #</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Total Val.</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Paid</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-500">Balance Due</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-brand uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest h-96">Clean Slate: No {activeTab}</td></tr>
              ) : filtered.map((entry) => (
                <tr key={entry.bill.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-[10px] font-bold text-slate-500 italic pb-1">
                    {new Date(entry.bill.createdAt || entry.bill.billDate).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-slate-800">{entry.customerName || entry.supplierName}</p>
                    <p className="text-[10px] text-slate-400 font-bold italic truncate w-32">{entry.bill.customerPhone || 'Walk-in'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded text-[9px] font-black text-slate-400 group-hover:text-brand border border-slate-100 w-fit transition-colors">
                      <Receipt className="w-3 h-3" />
                      {entry.bill.billNumber}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right text-xs font-bold text-slate-500">{formatCurrency(entry.bill.totalAmount)}</td>
                  <td className="px-8 py-5 text-right text-xs font-bold text-emerald-500">+{formatCurrency(entry.paid)}</td>
                  <td className="px-8 py-5 text-right text-sm font-black text-rose-600 italic underline decoration-rose-100 underline-offset-4">{formatCurrency(entry.balance)}</td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => { setSelectedEntry(entry); setShowPaymentModal(true); setPaymentForm({ ...paymentForm, amount: entry.balance.toString() }); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-100"
                    >
                      Record Payment
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Outstanding</span>
                <span className="text-xl font-black text-slate-900">{formatCurrency(filtered.reduce((acc, i) => acc + i.balance, 0))}</span>
              </div>
           </div>
           <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Accounting Engine (BETA)
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showPaymentModal && selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden p-10 border-t-8 border-brand">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand">
                  <IndianRupee className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Accept Payment</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Against Bill: {selectedEntry.bill.billNumber}</p>
              </div>
              
              <form onSubmit={handlePayment} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Amount (Max: {formatCurrency(selectedEntry.balance)})</label>
                  <input
                    type="number"
                    required
                    max={selectedEntry.balance}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="input-base w-full h-14 text-lg font-black text-slate-900 pr-10"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Channel</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="input-base w-full h-14 font-black uppercase tracking-widest text-[10px] appearance-none"
                  >
                    <option value="cash">💵 Cash in Hand</option>
                    <option value="upi">📱 UPI / GPAY / PHONEPE</option>
                    <option value="bank_transfer">🏦 Direct Bank Transfer</option>
                    <option value="card">💳 Card Payment</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Note</label>
                  <input
                    type="text"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    className="input-base w-full h-14 text-sm font-bold"
                    placeholder="Payment Ref: #88741..."
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Save className="w-4 h-4" />
                  Confirm & Update Balance
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
