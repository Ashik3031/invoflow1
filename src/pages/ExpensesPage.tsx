import { useState, useEffect } from 'react';
import { Plus, Search, Filter, PieChart, TrendingDown, DollarSign, Loader2, Calendar, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { Expense } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORIES = ['Rent', 'Salary', 'Transport', 'Utilities', 'Marketing', 'Other'];
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#94a3b8'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<{ category: string; total: number }[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filters, setFilters] = useState({ category: '', month: '', year: '' });
  
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: 0,
    category: 'Other' as any,
    note: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [eRes, sRes] = await Promise.all([
        api.get('/purchase/expenses', { params: filters }),
        api.get('/purchase/expenses/summary')
      ]);
      setExpenses(eRes.data);
      setSummary(sRes.data.summary);
      setGrandTotal(sRes.data.grandTotal);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newExpense.title || newExpense.amount <= 0) return alert('Fill required fields');
    try {
      await api.post('/purchase/expense', newExpense);
      setShowAdd(false);
      setNewExpense({ title: '', amount: 0, category: 'Other', note: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand" /></div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Expense Tracker</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Cash Outflow & Operational Costs</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-100"
        >
          <Plus className="w-5 h-5" /> Record Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-8 rounded-3xl text-white col-span-1 sm:col-span-2 lg:col-span-1 relative overflow-hidden group">
          <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Outflow</p>
          <p className="text-4xl font-black">{formatCurrency(grandTotal)}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <TrendingDown className="w-3 h-3" /> System Operational
          </div>
        </div>
        {(summary || []).slice(0, 3).map((item, idx) => (
          <div key={idx} className="glass-card p-8 border-none bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.category}</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
            </div>
            <p className="text-2xl font-black text-slate-800">{formatCurrency(item.total)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Viz */}
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <PieChart className="w-4 h-4" /> Category Distribution
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="total" radius={[8, 8, 8, 8]} barSize={40}>
                  {(summary || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* List Entry */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Recent Cashout</h3>
            <button className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(expenses || []).slice(0, 5).map(e => (
              <div key={e.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-bold text-slate-800">{e.title}</p>
                  <p className="text-sm font-black text-rose-500">-{formatCurrency(e.amount)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{e.category}</span>
                  <span className="text-[10px] text-slate-300 font-bold">{new Date(e.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-10 border-2 border-rose-100 space-y-8 bg-rose-50/10">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Record New Expense</h3>
            <button onClick={() => setShowAdd(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">Dismiss</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="label-micro">Expense Title</label>
              <input 
                type="text" 
                placeholder="e.g. Shop Electricity Bill"
                className="input-base w-full focus:ring-rose-500/20"
                value={newExpense.title}
                onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro">Amount (₹)</label>
              <input 
                type="number" 
                className="input-base w-full focus:ring-rose-500/20"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro">Category</label>
              <select 
                className="input-base w-full focus:ring-rose-500/20"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-micro">Date of Payment</label>
              <input 
                type="date" 
                className="input-base w-full focus:ring-rose-500/20"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="label-micro">Notes / Receipt Ref</label>
            <input 
              type="text" 
              className="input-base w-full"
              value={newExpense.note}
              onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
            />
          </div>

          <button 
            onClick={handleAdd}
            className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-rose-200 active:scale-95 transition-all"
          >
            Authenticate & Log Expense
          </button>
        </motion.div>
      )}
    </div>
  );
}
