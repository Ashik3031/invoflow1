import { useState, useEffect } from 'react';
import { Truck, Search, Loader2, ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import api from '../lib/api';
import { Bill } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function ChallansPage() {
  const [challans, setChallans] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    try {
      const { data } = await api.get('/billing/list');
      if (Array.isArray(data)) {
        setChallans(data.filter((b: Bill) => b.documentType === 'challan' && !b.convertedToInvoice));
      } else {
        setChallans([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const convertToInvoice = async (id: string) => {
    if (!confirm('Convert this delivery challan to a final taxable invoice?')) return;
    try {
      setLoading(true);
      await api.post(`/billing/convert/challan/${id}`);
      alert('Challan converted to Invoice successfully!');
      fetchChallans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const filtered = challans.filter(c => 
    c.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && challans.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Challans...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">Delivery Challans</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Goods Movement & Dispatch Tracking</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search challans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-medium shadow-sm"
          />
        </div>
      </div>

      <div className="modern-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-50/10 border-b border-slate-100 font-mono">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Issuance Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Challan No.</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Entity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Value</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-right">Inventory Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-24 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No active challans in transit</p>
                </td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6 text-[11px] font-black text-slate-400 italic">
                      {new Date(c.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400 opacity-40" />
                        <span className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">#{c.billNumber}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-800 leading-none mb-1">{c.customerName}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono opacity-80">{c.customerPhone}</p>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-slate-900 tracking-tight text-right text-mono">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all",
                        c.convertedToInvoice ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                      )}>
                        {c.convertedToInvoice ? 'Lifecycle Ended' : 'Internal Transit'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {!c.convertedToInvoice ? (
                        <button
                          onClick={() => convertToInvoice(c.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ml-auto shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                        >
                          Convert to Invoice
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="text-emerald-500 flex items-center justify-end gap-2 pr-2">
                          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Billed</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
