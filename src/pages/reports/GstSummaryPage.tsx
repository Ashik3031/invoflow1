import React, { useState, useEffect } from 'react';
import { Loader2, Download, Target, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import Papa from 'papaparse';

export default function GstSummaryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/reports/gst-summary', { params: { month, year } });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
      const d = new Date(date);
      d.setMonth(d.getMonth() + offset);
      setDate(d);
  };

  const exportCSV = () => {
    if (!data) return;
    const csv = Papa.unparse([data]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `gst_summary_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">GST Compliance Summary</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Tax Liability & GSTR Preview</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
            <span className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-800">
                {date.toLocaleString('default', { month: 'long' })} {year}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
          </div>
          <button onClick={exportCSV} className="bg-brand text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2">
            <Download className="w-4 h-4" /> GSTR-1 CSV
          </button>
        </div>
      </div>

      {loading ? (
          <div className="py-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand" /></div>
      ) : data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900 rounded-[48px] p-12 text-white relative overflow-hidden shadow-2xl">
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Total Output Tax Due</p>
                   <p className="text-6xl font-black tracking-tighter mb-12">{formatCurrency(data.totalTaxDue)}</p>
                   
                   <div className="grid grid-cols-3 gap-8">
                       <GstBox label="CGST" value={data.cgst} />
                       <GstBox label="SGST" value={data.sgst} />
                       <GstBox label="IGST" value={data.igst} />
                   </div>
                   
                   <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
              </div>

              <div className="glass-card p-12 flex flex-col justify-between">
                  <div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Turnover Details</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 italic">Based on taxable sales value</p>
                      
                      <div className="space-y-6">
                           <div className="flex justify-between items-center py-4 border-b border-slate-50">
                               <span className="text-xs font-bold text-slate-500">Taxable Turnover</span>
                               <span className="text-xl font-black text-slate-900">{formatCurrency(data.taxableSales)}</span>
                           </div>
                           <div className="flex justify-between items-center py-4 border-b border-slate-50">
                               <span className="text-xs font-bold text-slate-500">Total Bill Value (Incl. Tax)</span>
                               <span className="text-xl font-black text-brand">{formatCurrency(data.taxableSales + data.totalTaxDue)}</span>
                           </div>
                      </div>
                  </div>
                  
                  <div className="mt-12 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                      <Target className="w-5 h-5 text-amber-600 mt-1" />
                      <div>
                          <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Filing Status</p>
                          <p className="text-[11px] font-bold text-amber-700/70 mt-1 leading-relaxed">Ensure all b2b invoices have correct GSTIN for input tax credit claiming by customers.</p>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

function GstBox({ label, value }: any) {
    return (
        <div>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 italic">{label}</p>
            <p className="text-xl font-black text-white">{formatCurrency(value)}</p>
        </div>
    );
}
