import React from 'react';
import { NavLink } from 'react-router-dom';
import { TrendingUp, Package, Users, PieChart, Landmark, FileText, ArrowRight, Zap, Target, Crown } from 'lucide-react';
import { motion } from 'motion/react';

export default function ReportsPage() {
  const reports = [
    {
      title: 'Daily Sales',
      desc: 'Day-wise revenue and bill count summary.',
      to: '/reports/sales-daily',
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-600',
      tag: 'FINANCIAL'
    },
    {
      title: 'Top Products',
      desc: 'Ranked list of best selling items by quantity.',
      to: '/reports/top-products',
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600',
      tag: 'INVENTORY'
    },
    {
      title: 'Monthly Revenue',
      desc: 'Monthly growth and revenue trend analysis.',
      to: '/reports/revenue-trend',
      icon: Zap,
      color: 'bg-amber-50 text-amber-600',
      tag: 'GROWTH'
    },
    {
      title: 'Expense Summary',
      desc: 'Categorical breakdown of business spending.',
      to: '/reports/expense-summary',
      icon: PieChart,
      color: 'bg-rose-50 text-rose-600',
      tag: 'FINANCIAL'
    },
    {
      title: 'GST Report',
      desc: 'Monthly tax summary for GSTR filing.',
      to: '/reports/gst-summary',
      icon: Target,
      color: 'bg-blue-50 text-blue-600',
      tag: 'TAX'
    },
    {
      title: 'Stock Ledger',
      desc: 'In-out history for individual items.',
      to: '/reports/stock-ledger',
      icon: FileText,
      color: 'bg-slate-50 text-slate-600',
      tag: 'DETAILED'
    },
    {
      title: 'Inventory Valuation',
      desc: 'Current stock value and holding cost.',
      to: '/reports/valuation',
      icon: Landmark,
      color: 'bg-cyan-50 text-cyan-600',
      tag: 'ASSETS'
    },
    {
      title: 'Customer Loyalty',
      desc: 'Tier list of most loyal club members.',
      to: '/reports/loyalty',
      icon: Crown,
      color: 'bg-yellow-50 text-yellow-600',
      tag: 'CRM'
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Business Intelligence</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Select a report to analyze your data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, idx) => (
          <motion.div
            key={report.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <NavLink
              to={report.to}
              className="group block bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100 transition-all relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-4 rounded-2xl ${report.color}`}>
                    <report.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{report.tag}</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-brand transition-colors">{report.title}</h3>
                <p className="text-xs font-bold text-slate-400 leading-relaxed italic">{report.desc}</p>
                
                <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                  Generate Report <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
            </NavLink>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
