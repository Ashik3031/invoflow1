import { useEffect, useState } from 'react';
import { 
  ShoppingBag, FileText, IndianRupee, TrendingUp, Users, Crown, Zap, Target, 
  ArrowUpRight, ArrowDownRight, Calendar, Search, Filter, Plus, ChevronRight,
  Bell, BellOff, Check, Trash2, AlertTriangle, UserPlus, Info, Wallet, Truck
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
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore, playNotificationSound } from '../store/useNotificationStore';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [gstSummary, setGstSummary] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { notifications, markAsRead, clearAll } = useNotificationStore();
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  // Dynamic filter state variables
  const [performanceRange, setPerformanceRange] = useState('this_month');
  const [revenueView, setRevenueView] = useState<'day' | 'month' | 'year'>('day');
  
  // Custom date selection
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchDashboard();
  }, [performanceRange, revenueView, startDate, endDate]);

  const fetchDashboard = async () => {
     setRefreshing(true);
     try {
       const now = new Date();
       const [dRes, gRes, pRes] = await Promise.all([
         api.get('/billing/dashboard', {
           params: {
             performanceRange,
             revenueView,
             startDate,
             endDate
           }
         }),
         api.get('/billing/gst-summary', { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
         api.get('/accounts/profit-loss', { params: { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] } })
       ]);
       setData(dRes.data);
       setGstSummary(gRes.data);
       setPnl(pRes.data);
     } catch (err) {
       console.error(err);
     } finally {
       setInitialLoading(false);
       setRefreshing(false);
     }
  };

  const chartData = data?.chartData || [
    { name: 'Mon', value: 0, expense: 0 },
    { name: 'Tue', value: 0, expense: 0 },
    { name: 'Wed', value: 0, expense: 0 },
    { name: 'Thu', value: 0, expense: 0 },
    { name: 'Fri', value: 0, expense: 0 },
    { name: 'Sat', value: 0, expense: 0 },
    { name: 'Sun', value: 0, expense: 0 },
  ];

  const pieData = (data?.topProducts || []).map((p, i) => ({
    name: p.name,
    value: p.revenue
  })).slice(0, 5);

  if (initialLoading) return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aggregating Business Intelligence...</p>
    </div>
  );

  const stats = [
    { 
      label: "Today's Sales", 
      value: formatCurrency(data?.todaySales || 0), 
      trend: data?.todayBillCount ? `${data.todayBillCount} Invoices` : "0 Invoices", 
      isUp: (data?.todaySales || 0) > 0, 
      desc: "Processed Today",
      subValue: `Gross Revenue: ${formatCurrency(gstSummary?.totalSales || pnl?.revenue || 0)}`
    },
    { 
      label: "Units Sold Today", 
      value: data?.todayUnitsSold ? `${data.todayUnitsSold.toLocaleString()} Units` : "0 Units", 
      trend: `${data?.lowStockItems || 0} Low Stock`, 
      isUp: (data?.lowStockItems || 0) === 0, 
      desc: "Low Stock Products",
      subValue: `${data?.totalInventoryCount || 0} Products in Inventory`
    },
    { 
      label: "Unpaid / Pending", 
      value: data?.pendingPayments ? `${data.pendingPayments} Bills` : "0 Bills", 
      trend: "Pending Payment", 
      isUp: false, 
      desc: "Outstanding Sales",
      subValue: "Requires Follow-Up"
    },
    { 
      label: "Total Customers", 
      value: data?.totalCustomersCount ? `${data.totalCustomersCount.toLocaleString()}` : "0", 
      trend: "Registered", 
      isUp: true, 
      desc: "Growing Client Base",
      subValue: "Loyal & Returning"
    },
  ];

  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

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
               <h2 className="text-4xl font-extrabold text-white mb-2">Welcome back, {user?.name || 'User'}!</h2>
               <p className="text-indigo-100/70 font-medium">Here's your sales summary for today.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-3 text-white border border-white/10">
               <Calendar className="w-4 h-4" />
               <span className="text-sm font-semibold tracking-tight">{todayStr}</span>
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
               <div className="flex items-center gap-2">
                 <h3 className="font-bold text-slate-800">Sales Performance</h3>
                 {refreshing && <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
               </div>
               <select 
                 value={performanceRange}
                 onChange={(e) => setPerformanceRange(e.target.value)}
                 className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border-none text-[11px] uppercase tracking-widest rounded-xl px-2.5 py-1.5 outline-none transition-colors cursor-pointer"
               >
                  <option value="this_month">This month</option>
                  <option value="last_month">Last month</option>
                  <option value="this_week">This week</option>
                  <option value="all_time">All time</option>
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
                  <p className="text-xl font-black text-slate-800">{formatCurrency(pnl?.revenue || 0)}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Revenue</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-6 border-t border-slate-50 pt-6">
               {pieData.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 min-w-0">
                     <div 
                        className="w-2 rounded-full h-2 shrink-0" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                     />
                     <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-500 truncate" title={p.name}>{p.name}</p>
                        <p className="text-xs font-black text-slate-800">{formatCurrency(p.value)}</p>
                     </div>
                  </div>
               ))}
               {pieData.length === 0 && (
                  <div className="col-span-2 text-center text-xs font-bold text-slate-300 uppercase tracking-widest py-4">
                     No sales recorded yet
                  </div>
               )}
            </div>
         </div>

         {/* Revenue Updates (Bar Chart) */}
         <div className="lg:col-span-2 modern-card shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
               <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">Revenue Updates</h3>
                    {refreshing && <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Sales revenue vs business expenses</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-4">
                  {/* View Presets Group */}
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                     {(['day', 'month', 'year'] as const).map((view) => (
                        <button
                           key={view}
                           onClick={() => setRevenueView(view)}
                           className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                              revenueView === view ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                           )}
                        >
                           {view}
                        </button>
                     ))}
                  </div>

                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />
                        <span className="text-[11px] font-bold text-slate-500">Gross Sale</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-indigo-200 rounded-full" />
                        <span className="text-[11px] font-bold text-slate-500">Expense</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Dynamic Date Pickers if 'day' is selected */}
            {revenueView === 'day' && (
               <div className="flex flex-wrap items-center gap-4 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">From:</span>
                     <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                     />
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">To:</span>
                     <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                     />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold ml-auto uppercase tracking-wider">
                     Showing day trends
                  </p>
               </div>
            )}

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
                     <Bar dataKey="value" name="Gross Sale" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={16} />
                     <Bar dataKey="expense" name="Expense" fill="#C7D2FE" radius={[6, 6, 0, 0]} barSize={16} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Notifications & Recent Activity Feed */}
      <div className="modern-card p-6 border border-slate-100">
         <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600 animate-bounce" />
                  Live Dashboard Alerts Feed
               </h3>
               <p className="text-xs text-slate-400 mt-1">Real-time business activity updates and stock alerts</p>
            </div>
            
            <div className="flex items-center gap-2.5">
               <button 
                  onClick={() => playNotificationSound()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
               >
                  <Bell className="w-3.5 h-3.5" />
                  Test Chime Sound
               </button>
               {safeNotifications.length > 0 && (
                  <button 
                     onClick={() => clearAll()}
                     className="bg-rose-50 hover:bg-rose-100 text-rose-650 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                  >
                     <Trash2 className="w-3.5 h-3.5" /> Clear Feed
                  </button>
               )}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
            {safeNotifications.length === 0 ? (
               <div className="col-span-full py-16 text-center text-slate-300 italic text-[10px] font-black uppercase tracking-widest">
                  <BellOff className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  No live dashboard alerts generated yet
               </div>
            ) : (
               safeNotifications.slice(0, 9).map((n) => {
                  let IconComponent = Info;
                  let iconBg = 'bg-slate-50 text-slate-500 border border-slate-100';
                  let borderStyle = 'border-slate-100';
                  
                  if (n.type === 'sale') {
                     IconComponent = ShoppingBag;
                     iconBg = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                     borderStyle = 'border-emerald-100/30';
                  } else if (n.type === 'expense') {
                     IconComponent = Wallet;
                     iconBg = 'bg-rose-50 text-rose-600 border border-rose-100';
                     borderStyle = 'border-rose-100/30';
                  } else if (n.type === 'purchase') {
                     IconComponent = Truck;
                     iconBg = 'bg-amber-50 text-amber-600 border border-amber-100';
                     borderStyle = 'border-amber-100/30';
                  } else if (n.type === 'low_stock') {
                     IconComponent = AlertTriangle;
                     iconBg = 'bg-rose-100 text-rose-700 border border-rose-200';
                     borderStyle = 'border-rose-200/40';
                  } else if (n.type === 'customer') {
                     IconComponent = UserPlus;
                     iconBg = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
                     borderStyle = 'border-indigo-100/30';
                  }

                  return (
                     <div 
                        key={n.id}
                        className={cn(
                           "flex gap-3.5 p-4 rounded-2xl border transition-all duration-200 hover:shadow-sm relative overflow-hidden",
                           borderStyle,
                           !n.read ? "bg-indigo-50/10 shadow-sm" : "bg-white"
                        )}
                     >
                        {!n.read && (
                           <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                        )}
                        
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm", iconBg)}>
                           <IconComponent className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                                 {n.type}
                              </span>
                              <span className="text-[8px] text-slate-350">•</span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                 {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                           <h4 className={cn("text-xs leading-snug mt-1 text-slate-800", !n.read ? "font-bold" : "font-semibold")}>
                              {n.title}
                           </h4>
                           <p className="text-[10px] text-slate-500 mt-1 leading-relaxed break-words">
                              {n.message}
                           </p>
                           
                           {!n.read && (
                              <button 
                                 onClick={() => markAsRead(n.id)}
                                 className="mt-3 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                              >
                                 <Check className="w-3 h-3" /> Mark Read
                              </button>
                           )}
                        </div>
                     </div>
                  );
               })
            )}
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
                  {data?.topProducts && data.topProducts.length > 0 ? (
                     data.topProducts.slice(0, 5).map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-8 py-4 text-xs font-bold text-slate-400 tracking-tight">PR-{(p.id || '').slice(0, 4).toUpperCase()}</td>
                           <td className="px-8 py-4">
                              <p className="text-sm font-bold text-slate-800">{p.name}</p>
                           </td>
                           <td className="px-8 py-4 text-sm font-medium text-slate-500">{p.category || 'General'}</td>
                           <td className="px-8 py-4 text-sm font-bold font-mono">{p.stock || 0} Units</td>
                           <td className="px-8 py-4 text-sm font-black text-indigo-600">{formatCurrency(p.revenue || 0)}</td>
                           <td className="px-8 py-4">
                              <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", (p.stock || 0) > 10 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                 {(p.stock || 0) > 10 ? 'Available' : 'Low Stock'}
                              </span>
                           </td>
                        </tr>
                     ))
                  ) : (
                     <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest">No detailed records found</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
