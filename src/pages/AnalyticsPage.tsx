import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Calendar, Download, Filter, Search, ArrowUpRight, ArrowDownRight, 
  TrendingUp, IndianRupee, FileText, ShoppingBag, Loader2 
} from 'lucide-react';
import api from '../lib/api';
import { Bill, Product } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';

const COLORS = ['#6366f1', '#fbbf24', '#10b981', '#f87171', '#8b5cf6', '#f472b6', '#2dd4bf'];

type SortKey = 'date' | 'number' | 'amount';

export default function AnalyticsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [billsRes, productsRes] = await Promise.all([
        api.get('/billing/list'),
        api.get('/inventory/products')
      ]);
      setBills(Array.isArray(billsRes.data) ? billsRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredBills = bills.filter(bill => {
    const billDate = parseISO(bill.createdAt);
    let inRange = true;
    if (dateRange === '7d') {
      inRange = isWithinInterval(billDate, { start: subDays(new Date(), 7), end: new Date() });
    } else if (dateRange === '30d') {
      inRange = isWithinInterval(billDate, { start: subDays(new Date(), 30), end: new Date() });
    }
    
    const matchesSearch = bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    return inRange && matchesSearch;
  }).sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'date') {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    }
    if (sortConfig.key === 'amount') {
      return (a.totalAmount - b.totalAmount) * direction;
    }
    return (a.billNumber.localeCompare(b.billNumber)) * direction;
  });

  const exportToCSV = () => {
    const headers = ['Invoice #', 'Date', 'Amount', 'Status'];
    const rows = filteredBills.map(b => [
      b.billNumber,
      format(parseISO(b.createdAt), 'yyyy-MM-dd HH:mm'),
      b.totalAmount,
      b.paymentStatus
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `billing_history_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // Analytics Calculations
  const totalRevenue = filteredBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const avgBillValue = filteredBills.length > 0 ? totalRevenue / filteredBills.length : 0;
  
  // Daily Sales Data
  const dailyData = Array.from({ length: dateRange === '7d' ? 7 : 30 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'MMM dd');
    const dayBills = filteredBills.filter(b => format(parseISO(b.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    return {
      name: dateStr,
      sales: dayBills.reduce((acc, b) => acc + b.totalAmount, 0),
      count: dayBills.length
    };
  }).reverse();

  // Category Distribution
  const categoryMap = new Map<string, number>();
  filteredBills.forEach(bill => {
    bill.items.forEach(item => {
      const product = Array.isArray(products) ? products.find(p => p.id === item.productId) : null;
      const category = product?.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + (item.price * item.quantity));
    });
  });

  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Shop Analytics</h2>
          <p className="text-slate-500 text-sm font-medium">Insights and billing performance overview</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            {(['7d', '30d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  dateRange === range ? "bg-white text-brand shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            CSV Export
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-brand">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-brand" />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-bold">AUTO-SYNCED</span>
          </div>
          <p className="label-micro">Total Revenue</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{formatCurrency(totalRevenue)}</h3>
            <span className="text-emerald-500 text-xs font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> 8%</span>
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="label-micro">Invoices Generated</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{filteredBills.length}</h3>
            <span className="text-slate-400 text-xs font-medium tracking-tight">Across selected range</span>
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-emerald-400">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="label-micro">Avg. Transaction Value</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{formatCurrency(avgBillValue)}</h3>
            <span className="text-emerald-500 text-xs font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> 12%</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Sales Over Time</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 text-right">
              <div className="flex items-center gap-1.5 justify-end"><div className="w-2 h-2 rounded-full bg-brand" /> Revenue Stream</div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-8">Category Exposure</h3>
          <div className="flex-1 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.length > 0 ? categoryData : [{ name: 'No Data', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.length > 0 ? (
                    categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))
                  ) : (
                    <Cell fill="#f1f5f9" />
                  )}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Inferred from product inventory</p>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="glass-card overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Invoice Logs</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              type="text"
              placeholder="Search Invoice #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th 
                  className="px-8 py-4 label-micro cursor-pointer hover:text-brand transition-colors"
                  onClick={() => handleSort('number')}
                >
                  Invoice ID {sortConfig.key === 'number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-8 py-4 label-micro cursor-pointer hover:text-brand transition-colors"
                  onClick={() => handleSort('date')}
                >
                  Date & Time {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-8 py-4 label-micro text-center">Status</th>
                <th 
                  className="px-8 py-4 label-micro text-right cursor-pointer hover:text-brand transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBills.map(bill => (
                <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-4">
                    <span className="text-sm font-bold text-slate-800">{bill.billNumber}</span>
                  </td>
                  <td className="px-8 py-4">
                    <p className="text-xs font-bold text-slate-600">{format(parseISO(bill.createdAt), 'dd MMM, yyyy')}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{format(parseISO(bill.createdAt), 'hh:mm a')}</p>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      bill.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                    )}>
                      {bill.paymentStatus}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(bill.totalAmount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBills.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto opacity-10 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">No matching records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
