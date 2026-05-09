import { useEffect, useState } from 'react';
import { ShoppingBag, FileText, AlertTriangle, IndianRupee, ArrowRight, Loader2, TrendingUp, Users, Crown, Zap } from 'lucide-react';
import api from '../lib/api';
import { DashboardData } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand" /></div>;

  const stats = [
    { label: "Today's Gross", value: formatCurrency(data?.todaySales || 0), icon: IndianRupee, trend: '↑ 12%', color: 'border-indigo-100' },
    { label: "Growth Points", value: `${(data?.todaySales || 0) * 0.05} Pts`, icon: Zap, trend: 'Calculated', color: 'border-amber-100' },
    { label: "Retained Cust.", value: `${data?.bestCustomers?.length || 0} Growth`, icon: Users, trend: 'High Value', color: 'border-emerald-100' },
    { label: "Efficiency", value: '94%', icon: TrendingUp, trend: 'Optimal', color: 'border-blue-100' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Business Intelligence</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Live Store Performance & Growth Matrix</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className={cn("bg-white p-8 rounded-3xl border-2 shadow-sm flex flex-col gap-4 group hover:scale-[1.02] transition-all", stat.color)}
          >
            <div className="flex items-center justify-between">
              <stat.icon className="w-5 h-5 text-slate-300" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{stat.trend}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-brand transition-colors">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Products */}
        <div className="lg:col-span-2 glass-card flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Bestselling Inventory
            </h3>
            <button onClick={() => window.location.href='/analytics'} className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline">Full Report</button>
          </div>
          <div className="p-4 space-y-2">
            {data?.topProducts?.map((product, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 rounded-2xl transition-all flex items-center gap-6 group">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs group-hover:bg-brand group-hover:text-white transition-all">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{product.name}</p>
                  <p className="label-micro">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">₹{product.revenue.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{product.quantity} Units</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="glass-card flex flex-col overflow-hidden border-amber-100">
          <div className="px-8 py-6 border-b border-amber-100 bg-amber-50/30">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
              <Crown className="w-4 h-4" /> Growth Champions
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {data?.bestCustomers?.map((cust, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center text-amber-600 font-black text-lg shadow-sm">
                  {cust.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{cust.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{cust.totalOrders} Transactions</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-slate-800 font-black">
                    <IndianRupee className="w-3 h-3" />
                    <span>{cust.totalSpent.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] font-bold text-amber-500">Tier: Platinum</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
