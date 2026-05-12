import { useState, useEffect } from 'react';
import { FileText, Search, Loader2, ArrowRight, CornerUpLeft, MessageCircle } from 'lucide-react';
import api from '../lib/api';
import { Bill } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function CreditNotesPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const { data } = await api.get('/billing/history');
      setBills(data.filter((b: Bill) => b.documentType === 'credit_note'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = bills.filter(b => 
    b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.originalBillNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Credit Notes</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Returns, Corrections & Financial Adjustments</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base w-full pl-10"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">CN Number</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Against Invoice</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Amount</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-brand">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">No credit notes found</td></tr>
              ) : filtered.map((b) => (
                <tr key={b.id} className="hover:bg-rose-50/30 transition-colors group">
                  <td className="px-8 py-5 text-xs font-bold text-slate-500 italic">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <CornerUpLeft className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-xs font-black text-slate-900 group-hover:text-rose-500 transition-colors">#{b.billNumber}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-black text-brand italic">#{b.originalBillNumber || 'N/A'}</td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-slate-800">{b.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-bold italic">{b.customerPhone}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-sm font-black text-rose-600">-{formatCurrency(b.totalAmount)}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 transition-all hover:bg-slate-100 text-slate-400 hover:text-brand rounded-xl">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
