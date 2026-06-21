import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useReturnStore } from '../../store/useReturnStore';
import { Loader2, ArrowLeft, TrendingUp, AlertTriangle, Coins, RefreshCcw } from 'lucide-react';

export default function ReturnsAnalyticsPage() {
  const navigate = useNavigate();
  const { analytics, fetchAnalytics, loading, error } = useReturnStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compiling returns analytics...</span>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-md mx-auto text-center py-24 space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-black text-slate-800 text-lg">Failed to load analytics</h3>
        <p className="text-xs text-slate-400">{error || 'Could not assemble statistical reports from the database.'}</p>
        <button
          onClick={fetchAnalytics}
          className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // Formatting reasons data for charts
  const rawReasons = analytics.reasonsBreakdown;
  const reasonsData = [
    { name: 'Damaged', val: rawReasons.damaged || 0, color: '#f43f5e' },
    { name: 'Quality Issue', val: rawReasons.quality_issue || 0, color: '#f59e0b' },
    { name: 'Wrong Item', val: rawReasons.wrong_item || 0, color: '#3b82f6' },
    { name: 'Changed Mind', val: rawReasons.customer_changed_mind || 0, color: '#8b5cf6' },
    { name: 'Expired', val: rawReasons.expired || 0, color: '#10b981' },
    { name: 'Other', val: rawReasons.other || 0, color: '#64748b' }
  ].filter(item => item.val > 0);

  // Fallback if empty reasons
  const displayReasonsData = reasonsData.length > 0 ? reasonsData : [
    { name: 'No Returns', val: 0, color: '#e2e8f0' }
  ];

  // Map high defect risk classes
  const riskStyles = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/returns')}
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Returns Analytics</h2>
          <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mt-1">
            Analyze defect counts, primary reasons, and product return ratios
          </p>
        </div>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <RefreshCcw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-black uppercase tracking-wider">Total Returns Handled</span>
            <span className="text-2xl font-black text-slate-805 block mt-0.5">{analytics.totalReturnsCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold italic mt-0.5 block">{analytics.period}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-black uppercase tracking-wider">Refund Capital Cleared</span>
            <span className="text-2xl font-black text-slate-805 block mt-0.5">₹{analytics.totalRefundsIssued.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-semibold italic mt-0.5 block">Excluding swap collects</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-black uppercase tracking-wider">High Risk Defected Items</span>
            <span className="text-2xl font-black text-slate-850 block mt-0.5">
              {analytics.topReturnedProducts.filter(p => p.risk === 'high').length}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold italic mt-0.5 block">Requires quality verification</span>
          </div>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reasons Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Return Reasons Distribution (Quantity-wise)</h3>
          <div className="h-64 flex items-center justify-center">
            {reasonsData.length === 0 ? (
              <div className="text-slate-300 italic text-xs">No return reasons logged yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayReasonsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="val"
                  >
                    {displayReasonsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Units`, 'Quantity']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Action Ratio Column Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-sans">Damages vs Customer Mind Ratios</h3>
          <p className="text-[11px] text-slate-400 font-medium">
            Visual comparison of defect/damaged items vs simple buyer remorse exchanges. High defective ratios warrant supplier audits.
          </p>
          <div className="h-60">
            {reasonsData.length === 0 ? (
              <div className="text-slate-300 italic text-xs flex items-center justify-center h-full">No distribution data logged yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayReasonsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v} Units`, 'Quantity']} />
                  <Bar dataKey="val" radius={[8, 8, 0, 0]}>
                    {displayReasonsData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Product Risk audit spreadsheet */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-sans">Product Return Ratio Audit</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Identifies specific products returned in disproportionate numbers relative to overall billing orders. Includes dynamic risk score assignments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-rose-50/50">
                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Product SKU/Name</th>
                <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sold (Units)</th>
                <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Returned</th>
                <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Return Ratio (%)</th>
                <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Factor</th>
                <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Defect reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {analytics.topReturnedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-350 font-bold uppercase tracking-wider text-[10.5px]">
                    No items returned in this period. Ratios are normal.
                  </td>
                </tr>
              ) : (
                analytics.topReturnedProducts.map((prod) => (
                  <tr key={prod.productId} className="hover:bg-slate-50/40">
                    <td className="px-5 py-4 font-black text-slate-800">{prod.productName}</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-500">{prod.totalSold}</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-800">{prod.totalReturned}</td>
                    <td className="px-5 py-4 text-center font-black text-indigo-600">{prod.returnRate}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${riskStyles(prod.risk)}`}>
                        {prod.risk}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right capitalize font-bold text-slate-500">
                      {prod.topReason.replace('_', ' ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
