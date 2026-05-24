import React, { useState, useEffect } from 'react';
import { Crown, Users, Loader2, Star, TrendingUp } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
  totalSpent: number;
  totalOrders: number;
}

export default function LoyaltyReportPage() {
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      const { data } = await api.get('/reports/customer-loyalty');
      // Backend returns array of { name, phone, points, value }
      const loyaltyData = data.map((c: any) => ({
        id: c.phone,
        name: c.name,
        phone: c.phone,
        loyaltyPoints: c.points,
        totalSpent: c.value * 10, // Approximate since value is points * factor
        totalOrders: 0
      }));
      setCustomers(loyaltyData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTier = (points: number) => {
    if (points > 1000) return { label: 'Platinum Elite', color: 'bg-slate-900 text-white border-slate-900' };
    if (points > 500) return { label: 'Gold Club', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    if (points > 200) return { label: 'Silver Member', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    return { label: 'Bronze Status', color: 'bg-orange-50 text-orange-600 border-orange-100' };
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">Customer Loyalty Club</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Membership Tier & Engagement Analytics</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Members</p>
            <p className="text-xl font-black text-slate-800">{customers.length}</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Tiers</p>
            <p className="text-xl font-black text-indigo-600">4 Levels</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top 3 Leaders */}
        {customers.slice(0, 3).map((customer, idx) => (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="modern-card relative overflow-hidden group"
          >
            <div className="absolute top-4 right-4">
               {idx === 0 && <Crown className="w-8 h-8 text-yellow-400 opacity-20 rotate-12" />}
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg",
                idx === 0 ? "bg-yellow-400 text-white shadow-yellow-100" :
                idx === 1 ? "bg-slate-300 text-white shadow-slate-100" :
                "bg-orange-300 text-white shadow-orange-100"
              )}>
                {idx + 1}
              </div>
              <div>
                <h4 className="font-black text-slate-800">{customer.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 italic">#{customer.phone}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loyalty Points</span>
                <span className="text-sm font-black text-indigo-600">{customer.loyaltyPoints || 0} PTS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Value</span>
                <span className="text-sm font-bold text-slate-600">{formatCurrency(customer.totalSpent || 0)}</span>
              </div>
            </div>
            <div className={cn(
              "mt-6 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border text-center",
              getTier(customer.loyaltyPoints).color
            )}>
              {getTier(customer.loyaltyPoints).label}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="modern-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 font-mono">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Identity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Reward Points</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lifetime Spent</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Membership Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Auditing CRM Club...</p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No customer records found</p>
                  </td>
                </tr>
              ) : (
                customers.slice(3).map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-800">{customer.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono italic">{customer.phone}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">
                        <Star className="w-3 h-3 fill-indigo-600" />
                        {customer.loyaltyPoints || 0}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="text-sm font-black text-slate-700">{formatCurrency(customer.totalSpent || 0)}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                        getTier(customer.loyaltyPoints).color
                      )}>
                        {getTier(customer.loyaltyPoints).label}
                      </span>
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
