import { useState, useEffect } from 'react';
import { Calendar, Loader2, TrendingUp, TrendingDown, Target, FileText, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface PLData {
  period: { from: string; to: string };
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  profitMargin: string;
}

export default function ProfitLossPage() {
  const [data, setData] = useState<PLData | null>(null);
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
      const { data: res } = await api.get('/accounts/profit-loss', { params: range });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!data && loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Financial P&L Report</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Net Earnings & Operational Efficiency</p>
        </div>
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
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="Total Revenue" value={data.revenue} icon={TrendingUp} color="indigo" />
            <StatCard label="Cost of Goods" value={data.costOfGoods} icon={TrendingDown} color="rose" />
            <StatCard label="Gross Profit" value={data.grossProfit} icon={Target} color="amber" />
            <StatCard label="Expenses" value={data.operatingExpenses} icon={Target} color="slate" />
          </div>

          <div className="bg-slate-900 rounded-[48px] p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Net Bottom Line Profit</p>
                <p className="text-6xl font-black tracking-tighter">{formatCurrency(data.netProfit)}</p>
                <div className="mt-6 flex items-center gap-3">
                    <span className="px-4 py-1.5 bg-brand text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                        {data.profitMargin} Margin
                    </span>
                    <span className="text-white/40 text-[10px] font-bold italic">Calculated based on paid invoices & purchases.</span>
                </div>
              </div>
              
              <div className="w-full md:w-64 space-y-4">
                 <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                        <span>Efficiency Ratio</span>
                        <span className="text-brand">{data.profitMargin}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: data.profitMargin }} className="h-full bg-brand" />
                    </div>
                 </div>
              </div>
            </div>
            
            <div className="absolute top-0 right-0 p-12 opacity-5">
                 <FileText className="w-64 h-64 rotate-12" />
            </div>
          </div>

          <div className="glass-card p-10">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-3">
                <div className="w-2 h-8 bg-brand rounded-full" /> Financial Breakdown
             </h3>
             <div className="space-y-6">
                <BreakdownRow label="Operating Revenue (Sales)" amount={data.revenue} total={data.revenue} />
                <BreakdownRow label="Direct Costs (Purchases)" amount={data.costOfGoods} total={data.revenue} color="rose" />
                <BreakdownRow label="Operating Expenses (Bills)" amount={data.operatingExpenses} total={data.revenue} color="slate" />
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Net Realized Profit</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(data.netProfit)}</p>
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
    const colors: any = {
        indigo: 'bg-indigo-50 text-indigo-600',
        rose: 'bg-rose-50 text-rose-600',
        amber: 'bg-amber-50 text-amber-600',
        slate: 'bg-slate-50 text-slate-600'
    };
    return (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", colors[color])}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(value)}</p>
        </div>
    );
}

function BreakdownRow({ label, amount, total, color = 'emerald' }: any) {
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    const colors: any = {
        emerald: 'bg-emerald-500',
        rose: 'bg-rose-500',
        slate: 'bg-slate-400'
    };
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-600">{label}</span>
                <span className="text-xs font-black text-slate-900">{formatCurrency(amount)}</span>
            </div>
            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${Math.min(100, percentage)}%` }} 
                    className={cn("h-full", colors[color])} 
                />
            </div>
        </div>
    );
}
