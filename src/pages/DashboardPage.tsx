import { useEffect, useState } from 'react';
import { 
  ShoppingBag, FileText, IndianRupee, TrendingUp, Users, Crown, Zap, Target, 
  ArrowUpRight, ArrowDownRight, Calendar, Search, Filter, Plus, ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import { DashboardData } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

import { useNavigate } from 'react-router-dom';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [gstSummary, setGstSummary] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const now = new Date();
      const [dRes, gRes, pRes] = await Promise.all([
        api.get('/billing/dashboard'),
        api.get('/billing/gst-summary', { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
        api.get('/accounts/profit-loss', { params: { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] } })
      ]);
      setData(dRes.data);
      setGstSummary(gRes.data);
      setPnl(pRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 2000 },
    { name: 'Thu', value: 2780 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2390 },
    { name: 'Sun', value: 3490 },
  ];

  const pieData = (data?.topProducts || []).map((p, i) => ({
    name: p.name,
    value: p.revenue
  })).slice(0, 5);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aggregating Business Intelligence...</p>
    </div>
  );

  const stats = [
    { 
      label: "Total Earnings", 
      value: formatCurrency(data?.todaySales || 0), 
      trend: "+11%", 
      isUp: true, 
      desc: "This Week",
      subValue: "₹ 234,189 Total"
    },
    { 
      label: "Products Sold", 
      value: "360.00", 
      trend: "+5%", 
      isUp: true, 
      desc: "Units Issued",
      subValue: "3,200 Inventory"
    },
    { 
      label: "Active Leads", 
      value: "1,258", 
      trend: "+20%", 
      isUp: true, 
      desc: "This Week",
      subValue: "Customer Growth"
    },
    { 
      label: "Total Clients", 
      value: "320.00", 
      trend: "+11%", 
      isUp: true, 
      desc: "This Week",
      subValue: "Returning Users"
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header breadcrumb-like context */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-slate-400">Dashboard</p>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-900 min-h-[400px] p-10 flex flex-col justify-between">
         {/* Background pattern */}
         <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-overlay"></div>
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-transparent to-transparent"></div>
         
         <div className="relative z-10 flex items-start justify-between">
            <div>
               <h2 className="text-4xl font-extrabold text-white mb-2">Welcome back, Ashik!</h2>
               <p className="text-indigo-100/70 font-medium">Here's your property summary for today.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-3 text-white border border-white/10">
               <Calendar className="w-4 h-4" />
               <span className="text-sm font-semibold tracking-tight">01 Nov 2025 - 31 Dec 2026</span>
            </div>
         </div>

         {/* Stats Cards Overlay */}
         <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transform translate-y-16">
            {stats.map((stat, i) => (
               <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="glass-card p-6 border-white/10 bg-white/10"
               >
                  <p className="text-slate-200 text-sm font-bold mb-1">{stat.label}</p>
                  <div className="flex items-center gap-2 mb-4">
                     <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1", stat.isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                        {stat.trend} <span className="opacity-70 font-bold">{stat.desc}</span>
                     </span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight leading-none mb-1">
                     {stat.value}
                  </p>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{stat.subValue}</p>
               </motion.div>
            ))}
         </div>
      </div>

      <div className="mt-20"></div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
         {/* Sales Performance (Pie/Doughnut) */}
         <div className="modern-card">
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-bold text-slate-800">Sales Performance</h3>
               <select className="bg-slate-50 border-none text-[11px] font-bold uppercase tracking-widest rounded-lg px-2 py-1 outline-none">
                  <option>Last month</option>
                  <option>This month</option>
               </select>
            </div>
            <div className="h-64 relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={pieData.length > 0 ? pieData : [{ name: 'Ref', value: 100 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {(pieData.length > 0 ? pieData : [{ name: 'Ref', value: 100 }]).map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-black text-slate-800">₹360k</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-50 pt-6">
               <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                  <div className="flex-1">
                     <p className="text-xs font-bold text-slate-400">Profit</p>
                     <p className="text-sm font-black text-slate-800">$300k</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <div className="flex-1">
                     <p className="text-xs font-bold text-slate-400">Expense</p>
                     <p className="text-sm font-black text-slate-800">$60k</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Revenue Updates (Bar Chart) */}
         <div className="lg:col-span-2 modern-card shadow-soft">
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-bold text-slate-800">Revenue Updates</h3>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                     <span className="text-xs font-bold text-slate-500">Gross Sale</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-indigo-100 rounded-full" />
                     <span className="text-xs font-bold text-slate-500">Expense</span>
                  </div>
               </div>
            </div>
            <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                     <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                        dy={10}
                     />
                     <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                     />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                     />
                     <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Property Management (Data Grid Style) */}
      <div className="modern-card p-0 overflow-hidden">
         <div className="px-8 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <ShoppingBag className="w-5 h-5 text-indigo-600" /> Inventory Management
            </h3>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search..." className="bg-slate-50 border-none rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-100" />
               </div>
               <button className="flex items-center gap-2 bg-slate-50 border-none rounded-xl py-2 px-4 text-xs font-bold uppercase tracking-widest text-slate-600">
                  <Filter className="w-3.5 h-3.5" /> Filter
               </button>
               <button onClick={() => navigate('/billing')} className="btn-primary py-2 px-5 text-xs shadow-none">
                  <Plus className="w-4 h-4" /> Add New Item
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-indigo-50/30 border-b border-slate-100">
                     <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                     <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
                     <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                     <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                     <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</th>
                     <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {(data?.topProducts || []).slice(0, 5).map((p, i) => (
                     <tr key={i} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-4 text-xs font-bold text-slate-400 tracking-tight">PR-{1023 + i}</td>
                        <td className="px-8 py-4">
                           <p className="text-sm font-bold text-slate-800">{p.name}</p>
                        </td>
                        <td className="px-8 py-4 text-sm font-medium text-slate-500">Retail</td>
                        <td className="px-8 py-4 text-sm font-bold font-mono">{p.quantity} Units</td>
                        <td className="px-8 py-4 text-sm font-black text-indigo-600">₹{p.revenue.toLocaleString()}</td>
                        <td className="px-8 py-4">
                           <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", p.quantity > 20 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                              {p.quantity > 10 ? 'Available' : 'Low Stock'}
                           </span>
                        </td>
                     </tr>
                  )) || (
                     <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest">No detailed records found</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
