import { useState, useEffect } from 'react';
import { FileText, Search, Loader2, ArrowRight, CheckCircle2, MoreVertical, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { Bill } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    try {
      const { data } = await api.get('/billing/history');
      setEstimates(data.filter((b: Bill) => b.documentType === 'estimate'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const convertToInvoice = async (id: string) => {
    if (!confirm('Convert this estimate to a final taxable invoice?')) return;
    try {
      setLoading(true);
      await api.post(`/billing/estimate/${id}/convert`);
      alert('Converted successfully! Redirecting to bill history...');
      window.location.href = '/analytics';
    } catch (err: any) {
      alert(err.response?.data?.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const filtered = estimates.filter(e => 
    e.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Quotations & Estimates</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Pending Business Contracts</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            placeholder="Find estimate..."
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
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Number</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-brand">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">No estimates found</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-xs font-bold text-slate-500 italic">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="px-8 py-5 text-xs font-black text-slate-900 group-hover:text-brand transition-colors">#{e.billNumber}</td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-slate-800">{e.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-bold italic">{e.customerPhone}</p>
                  </td>
                  <td className="px-8 py-5 text-right text-sm font-black text-slate-900">{formatCurrency(e.totalAmount)}</td>
                  <td className="px-8 py-5 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      e.isConverted ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                    )}>
                      {e.isConverted ? 'Converted' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {!e.isConverted ? (
                      <button
                        onClick={() => convertToInvoice(e.id)}
                        className="p-2 transition-all hover:bg-emerald-50 text-emerald-500 rounded-xl flex items-center gap-2 ml-auto"
                        title="Convert to Invoice"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest">Convert</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="text-emerald-500 flex items-center justify-end gap-2 pr-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Finalized</span>
                      </div>
                    )}
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
