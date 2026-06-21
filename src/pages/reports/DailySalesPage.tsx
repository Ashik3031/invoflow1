import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, Download, TrendingUp, ArrowRight, BarChart2, Filter, Eye, X, ShoppingBag, Receipt } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Papa from 'papaparse';

export default function DailySalesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Grouping state
  const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Range preset selection
  const [rangePreset, setRangePreset] = useState<string>('30_days');
  const [range, setRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const [selectedPeriod, setSelectedPeriod] = useState<{ key: string, label: string } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [range, groupBy]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPeriodDetails(selectedPeriod.key);
    } else {
      setDetailData(null);
    }
  }, [selectedPeriod, groupBy]);

  const fetchPeriodDetails = async (key: string) => {
    try {
      setDetailLoading(true);
      const { data: res } = await api.get('/reports/sales-period-details', {
        params: {
          periodKey: key,
          groupBy
        }
      });
      setDetailData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/reports/sales-daily', {
        params: {
          from: range.from || undefined,
          to: range.to || undefined,
          groupBy
        }
      });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset: string) => {
    setRangePreset(preset);
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    if (preset === 'today') {
      setRange({ from: todayStr, to: todayStr });
    } else if (preset === '7_days') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setRange({ from: d.toISOString().split('T')[0], to: todayStr });
    } else if (preset === '30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setRange({ from: d.toISOString().split('T')[0], to: todayStr });
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setRange({ from: startOfMonth.toISOString().split('T')[0], to: todayStr });
    } else if (preset === 'all_time') {
      setRange({ from: '', to: '' });
    }
  };

  const exportCSV = () => {
    const formattedData = data.map(item => ({
      'Period/Date': item.label || item.date,
      'Total Bills': item.billCount,
      'Total Revenue': item.totalSales
    }));
    const csv = Papa.unparse(formattedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `sales_report_${groupBy}_${range.from || 'all'}_to_${range.to || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header and Quick Stats */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Sales Performance Report
            <div className="w-2.5 h-2.5 bg-[#4F46E5] rounded-full animate-pulse" />
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
            Analyze revenue trends, volumes, and billing periods
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* GroupBy Pill Selectors */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            {(['daily', 'weekly', 'monthly'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  groupBy === g 
                    ? "bg-white text-[#4F46E5] shadow-sm font-black" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {g}
              </button>
            ))}
          </div>

          <button 
            onClick={exportCSV}
            className="bg-slate-950 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 flex items-center gap-2 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Control Panel: Ranges and Customs */}
      <div className="glass-card p-6 border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Time Preset:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'today', name: 'Today' },
              { id: '7_days', name: '7 Days' },
              { id: '30_days', name: 'Last 30 Days' },
              { id: 'this_month', name: 'This Month' },
              { id: 'all_time', name: 'All Time' },
              { id: 'custom', name: 'Custom' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer",
                  rangePreset === p.id 
                    ? "bg-[#4F46E5]/10 text-[#4F46E5] border-2 border-[#4F46E5]" 
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-transparent"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date pickers shown when preset is Custom or we just edit custom dates directly */}
        <div className={cn(
          "flex flex-wrap items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/85 transition-opacity duration-200",
          rangePreset === 'custom' ? 'opacity-100' : 'opacity-70'
        )}>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Start Date:</span>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              <input 
                type="date"
                value={range.from}
                onChange={(e) => {
                  setRangePreset('custom');
                  setRange({ ...range, from: e.target.value });
                }}
                className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-300" />
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">End Date:</span>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              <input 
                type="date"
                value={range.to}
                onChange={(e) => {
                  setRangePreset('custom');
                  setRange({ ...range, to: e.target.value });
                }}
                className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-400 ml-auto uppercase tracking-wider">
            {rangePreset === 'custom' ? '📅 Custom range active' : '💡 Presets override manual dates'}
          </span>
         </div>
      </div>

      {/* Visual Charts & In-Depth Data */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Growth Curve Chart */}
        <div className="lg:col-span-12 xl:col-span-7 glass-card p-10 h-[480px] flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              Revenue Growth ({groupBy})
            </h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Total Points: {data.length}
            </span>
          </div>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Total Sales']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="totalSales" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabular summary */}
        <div className="lg:col-span-12 xl:col-span-5 glass-card overflow-hidden flex flex-col h-[480px]">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Sales Data Grid
            </h3>
            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-wide">
              {groupBy} View
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                  <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Bills</th>
                  <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue</th>
                  <th className="px-8 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-24 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Computing Sales Records...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-24 text-center text-slate-300 font-bold uppercase text-[10px] italic">
                      No records found for specified dates
                    </td>
                  </tr>
                ) : data.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-4 text-[10px] font-bold text-slate-600">
                      {d.label || d.date}
                    </td>
                    <td className="px-8 py-4 text-right text-xs font-black text-slate-800">{d.billCount}</td>
                    <td className="px-8 py-4 text-right text-xs font-black text-[#4F46E5]">{formatCurrency(d.totalSales)}</td>
                    <td className="px-8 py-4 text-center">
                      <button 
                        onClick={() => setSelectedPeriod({ key: d.date, label: d.label || d.date })}
                        className="bg-indigo-50 hover:bg-indigo-150 text-[#4F46E5] px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedPeriod && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#4F46E5] bg-indigo-50/80 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                      {groupBy} breakdown
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Sales Period Report
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mt-1">
                    Details for {selectedPeriod.label}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedPeriod(null)}
                  className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-slate-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                {detailLoading ? (
                  <div className="py-24 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                      Parsing Transaction Ledgers...
                    </p>
                  </div>
                ) : !detailData ? (
                  <div className="py-24 text-center text-slate-300 italic uppercase text-xs font-bold">
                    No transaction detail payload received
                  </div>
                ) : (
                  <>
                    {/* Stat Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-50/10 p-5 rounded-2xl border border-indigo-100/50">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Total Sales Revenue</span>
                        <span className="text-2xl font-black text-indigo-850 tracking-tight block mt-1">
                          {formatCurrency(detailData.totalSales)}
                        </span>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50/50 to-emerald-50/10 p-5 rounded-2xl border border-emerald-100/50">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Invoices Generated</span>
                        <span className="text-2xl font-black text-emerald-850 tracking-tight block mt-1">
                          {detailData.billCount} bills
                        </span>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50/50 to-amber-50/10 p-5 rounded-2xl border border-amber-100/50">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">Distinct Items Sold</span>
                        <span className="text-2xl font-black text-amber-850 tracking-tight block mt-1">
                          {detailData.items?.length || 0} unique
                        </span>
                      </div>
                    </div>

                    {/* Master-Detail Partition Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left: Items Breakdown */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                          <ShoppingBag className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                            Sold Items Breakdown
                          </h4>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-100/55">
                                <th className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider">Item Name</th>
                                <th className="px-4 py-3 text-center text-[9px] font-black text-slate-500 uppercase tracking-wider">Qty Sold</th>
                                <th className="px-4 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-wider">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 bg-white">
                              {(!detailData.items || detailData.items.length === 0) ? (
                                <tr>
                                  <td colSpan={3} className="px-4 py-12 text-center text-[10px] uppercase font-bold text-slate-300 italic">
                                    No items sold in this period
                                  </td>
                                </tr>
                              ) : (
                                detailData.items.map((it: any, index: number) => (
                                  <tr key={it.productId || index} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="px-4 py-3">
                                      <p className="text-xs font-bold text-slate-800 break-words line-clamp-1">
                                        {it.productName}
                                      </p>
                                      <span className="text-[9px] font-semibold text-slate-400">
                                        Avg. Rate: {formatCurrency(it.avgPrice)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-xs font-black text-slate-700">
                                      {it.totalQty}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-black text-indigo-600">
                                      {formatCurrency(it.totalRevenue)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right: Invoices List */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                          <Receipt className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                            Invoice Transactions
                          </h4>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30 max-h-[300px] overflow-y-auto">
                          <div className="divide-y divide-slate-100 bg-white">
                            {(!detailData.bills || detailData.bills.length === 0) ? (
                              <div className="px-4 py-12 text-center text-[10px] uppercase font-bold text-slate-300 italic">
                                No invoices in this period
                              </div>
                            ) : (
                              detailData.bills.map((b: any, index: number) => (
                                <div key={b.id || index} className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                                  <div>
                                    <div className="flex items-center gap-1.55">
                                      <p className="text-xs font-black text-slate-800">
                                        #{b.billNumber}
                                      </p>
                                      <span className={cn(
                                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider",
                                        b.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-600" :
                                        b.paymentStatus === 'partial' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                      )}>
                                        {b.paymentStatus}
                                      </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                      {b.customerName}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-black text-slate-800">
                                      {formatCurrency(b.totalAmount)}
                                    </p>
                                    <p className="text-[8px] font-semibold text-slate-400 mt-0.5">
                                      {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
