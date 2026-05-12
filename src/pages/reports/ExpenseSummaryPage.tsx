import React, { useState, useEffect } from 'react';
import { Loader2, Download, PiggyBank, Calendar, ArrowRight } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';

export default function ExpenseSummaryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/reports/expense-summary', { params: range });
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
    link.setAttribute('download', 'expense_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#475569'];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Expense Breakdown</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Operational Spending Analysis</p>
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
          <button onClick={exportCSV} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-12 h-[500px] flex flex-col justify-center items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 text-center">Category Distribution</h3>
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="total"
                            nameKey="category"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="text-slate-300 font-bold uppercase text-xs italic">No data to display</div>
            )}
        </div>

        <div className="glass-card p-10 flex flex-col gap-6">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Detailed Totals</h3>
            {data.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-10 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.category}</p>
                            <p className="text-sm font-black text-slate-800">{formatCurrency(d.total)}</p>
                        </div>
                    </div>
                    <div className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm italic">
                        {((d.total / data.reduce((acc, x) => acc + x.total, 0)) * 100).toFixed(1)}%
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
