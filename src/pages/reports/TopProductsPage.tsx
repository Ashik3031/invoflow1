import React, { useState, useEffect } from 'react';
import { Loader2, Download, Package, ArrowRight, Calendar } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Papa from 'papaparse';

export default function TopProductsPage() {
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
      const { data: res } = await api.get('/reports/top-products', { params: range });
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
    link.setAttribute('download', 'top_products.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             Top Selling Products
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Inventory Performance Analysis</p>
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
          <button onClick={exportCSV} className="bg-brand text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-card p-12 h-[500px]">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Revenue by Product</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
            <YAxis 
                type="category" 
                dataKey="productName" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 800, fill: '#475569' }} 
                width={120}
            />
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
            <Bar dataKey="totalRevenue" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty Sold</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></td></tr>
            ) : data.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase text-xs">No records</td></tr>
            ) : data.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-5">
                   <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-lg text-[10px] font-black text-slate-500">#{i+1}</span>
                </td>
                <td className="px-8 py-5">
                  <p className="text-xs font-black text-slate-800">{p.productName}</p>
                </td>
                <td className="px-8 py-5 text-right font-black text-slate-600">{p.totalQtySold}</td>
                <td className="px-8 py-5 text-right font-black text-emerald-600 italic underline decoration-emerald-100 underline-offset-4">{formatCurrency(p.totalRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
