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
      setLoading(true);
      const [eRes, sRes] = await Promise.all([
        api.get('/purchase/expenses', { params: filters }),
        api.get('/purchase/expenses/summary', { params: filters })
      ]);
      setExpenses(Array.isArray(eRes.data) ? eRes.data : []);
      setSummary(sRes.data?.summary && Array.isArray(sRes.data.summary) ? sRes.data.summary : []);
      setGrandTotal(sRes.data?.grandTotal || 0);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setExpenses([]);
      setSummary([]);
      setGrandTotal(0);
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

  if (loading) return <div className="flex flex-col items-center justify-center h-full gap-4">
    <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Treasury...</p>
  </div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">Expense Analytics</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cash Flow Oversight & Cost Management</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <select 
              className="bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-slate-100" />
            <select 
              className="bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            >
              <option value="">Full Year</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2022, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="btn-primary bg-rose-600 hover:bg-rose-700 shadow-rose-100 px-6"
          >
            <Plus className="w-5 h-5" /> Record Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-1 relative overflow-hidden group shadow-xl shadow-slate-200">
          <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Gross Outflow</p>
          <p className="text-4xl font-black tracking-tighter">{formatCurrency(grandTotal)}</p>
          <div className="mt-6 flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-white/5 w-fit px-3 py-1.5 rounded-xl">
            <TrendingDown className="w-3.5 h-3.5" /> 12% vs last month
          </div>
        </div>
        {(summary || []).slice(0, 4).map((item, idx) => (
          <div key={idx} className="modern-card p-8 flex flex-col justify-between group hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">{item.category}</span>
              <div className="w-3 h-3 rounded-full shadow-sm ring-4 ring-slate-50" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            </div>
            <div>
               <p className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(item.total)}</p>
               <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">Share: {((item.total / (grandTotal || 1)) * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Viz */}
        <div className="lg:col-span-2 modern-card p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-600" /> Operational Spread
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Breakdown of monthly cash drainage</p>
            </div>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary || []} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="total" radius={[12, 12, 12, 12]} barSize={48}>
                  {(summary || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* List Entry */}
        <div className="modern-card flex flex-col overflow-hidden p-0">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
               <TrendingDown className="w-4 h-4 text-rose-500" /> Recent Cashout
            </h3>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">Live</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {expenses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
                  <TrendingDown className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">No financial leaks<br/>detected in this cycle</p>
              </div>
            ) : (
              expenses.slice(0, 10).map(e => (
                <div key={e.id} className="p-5 hover:bg-slate-50 rounded-3xl transition-all group flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-rose-500 group-hover:bg-rose-50 transition-colors">
                       <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 leading-tight mb-1">{e.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{e.category}</span>
                        <span className="text-slate-200">•</span>
                        <span className="text-[9px] text-slate-300 font-bold font-mono">{new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl group-hover:bg-white transition-colors">-{formatCurrency(e.amount)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl space-y-10 border border-slate-100"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Record New Expense</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction will be logged to treasury</p>
                </div>
                <button onClick={() => setShowAdd(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                   <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expense Identity</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Shop Electricity Bill"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-rose-50 focus:border-rose-300 transition-all outline-none"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Value (₹)</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-black focus:ring-4 focus:ring-rose-50 focus:border-rose-300 transition-all outline-none"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cost Center</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-rose-50 focus:border-rose-300 transition-all outline-none"
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Settlement Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-rose-50 focus:border-rose-300 transition-all outline-none"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Evidence / Notes</label>
                <input 
                  type="text" 
                  placeholder="Receipt number or specific notes..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-rose-50 focus:border-rose-300 transition-all outline-none"
                  value={newExpense.note}
                  onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                 <button 
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-[2] py-5 bg-rose-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all"
                >
                  Authenticate & Log Expense
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
