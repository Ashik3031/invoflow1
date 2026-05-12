import React, { useState, useEffect } from 'react';
import { Loader2, Download, TrendingUp, Calendar } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

export default function RevenueTrendPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: res } = await api.get('/reports/revenue-trend', { params: { months: 12 } });
      setData(res.map((d: any) => ({
          ...d,
          monthName: new Date(d.year, d.month - 1).toLocaleString('default', { month: 'short' }) + ' ' + d.year
      })));
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
    link.setAttribute('download', 'revenue_trend.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Revenue Trend Analysis</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Multi-month growth trajectory</p>
        </div>
        <button onClick={exportCSV} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="glass-card p-12 h-[500px]">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Monthly Performance Curve</h3>
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
              <Area type="stepAfter" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#trendGradient)" />
            </AreaChart>
         </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.slice(-3).reverse().map((d, i) => (
             <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{d.monthName}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(d.revenue)}</p>
                <div className="absolute right-6 top-6 w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
             </div>
          ))}
      </div>
    </div>
  );
}
