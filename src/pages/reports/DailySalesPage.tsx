import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, Download, TrendingUp, ArrowRight } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Papa from 'papaparse';

export default function DailySalesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/reports/sales-daily', { params: range });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `daily_sales_${range.from}_to_${range.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             Daily Sales Summary
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Day-wise Revenue Analysis</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
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
          <button 
            onClick={exportCSV}
            className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-10 h-[450px] flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Revenue Growth Curve</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="totalSales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card overflow-hidden flex flex-col h-[450px]">
          <div className="p-8 border-b border-slate-50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabular Summary</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Bills</th>
                  <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={3} className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] italic">No records found</td></tr>
                ) : data.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-4 text-[10px] font-bold text-slate-600">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="px-8 py-4 text-right text-xs font-black text-slate-800">{d.billCount}</td>
                    <td className="px-8 py-4 text-right text-xs font-black text-brand">{formatCurrency(d.totalSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
