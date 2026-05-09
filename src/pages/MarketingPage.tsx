import { useEffect, useState } from 'react';
import { Gift, Ticket, Plus, Trash2, Edit2, Loader2, IndianRupee, Percent, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import api from '../lib/api';
import { LoyaltyConfig, Coupon } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function MarketingPage() {
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLoyalty, setSavingLoyalty] = useState(false);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage' as const,
    value: 0,
    minBillAmount: 0,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lRes, cRes] = await Promise.all([
        api.get('/marketing/loyalty/config'),
        api.get('/marketing/coupons')
      ]);
      setLoyaltyConfig(lRes.data);
      setCoupons(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateLoyalty = async () => {
    if (!loyaltyConfig) return;
    setSavingLoyalty(true);
    try {
      await api.post('/marketing/loyalty/config', loyaltyConfig);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLoyalty(false);
    }
  };

  const createCoupon = async () => {
    try {
      await api.post('/marketing/coupons/create', newCoupon);
      setShowAddCoupon(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await api.delete(`/marketing/coupons/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand" /></div>;

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Growth & Marketing</h2>
        <p className="text-slate-500 font-medium">Tools to increase customer retention and sales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Loyalty Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Loyalty Program</h3>
          </div>

          <div className="glass-card p-8 border-l-4 border-amber-400 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Status</p>
                <p className="text-xs text-slate-400 font-medium">Enable points across all transactions</p>
              </div>
              <button 
                onClick={() => setLoyaltyConfig(prev => prev ? { ...prev, enabled: !prev.enabled } : null)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20",
                  loyaltyConfig?.enabled ? "bg-amber-500" : "bg-slate-200"
                )}
              >
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", loyaltyConfig?.enabled ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label-micro">Points per Rupee (Earn)</label>
                <input 
                  type="number"
                  value={loyaltyConfig?.pointsPerRupee}
                  onChange={(e) => setLoyaltyConfig(prev => prev ? { ...prev, pointsPerRupee: parseFloat(e.target.value) } : null)}
                  className="input-base w-full"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <label className="label-micro">Inr Value per Point (Redeem)</label>
                <input 
                  type="number"
                  value={loyaltyConfig?.valuePerPoint}
                  onChange={(e) => setLoyaltyConfig(prev => prev ? { ...prev, valuePerPoint: parseFloat(e.target.value) } : null)}
                  className="input-base w-full"
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-500 mt-1" />
              <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-wider">
                Tip: Recommend 0.05 points per ₹1 (approx 5% cashback).
              </p>
            </div>

            <button 
              disabled={savingLoyalty}
              onClick={updateLoyalty}
              className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 hover:shadow-xl hover:shadow-amber-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {savingLoyalty ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Loyalty Settings'}
            </button>
          </div>
        </section>

        {/* Coupons Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Ticket className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Active Coupons</h3>
            </div>
            <button 
              onClick={() => setShowAddCoupon(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Coupon
            </button>
          </div>

          <div className="space-y-4">
            {showAddCoupon && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-2 border-dashed border-indigo-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="label-micro">Coupon Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. WELCOME10"
                      className="input-base w-full uppercase"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-micro">Type</label>
                    <select 
                      className="input-base w-full"
                      value={newCoupon.discountType}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, discountType: e.target.value as any }))}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="label-micro">Discount Value</label>
                    <input 
                      type="number" 
                      className="input-base w-full"
                      value={newCoupon.value}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-micro">Min Bill Amount</label>
                    <input 
                      type="number" 
                      className="input-base w-full"
                      value={newCoupon.minBillAmount}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, minBillAmount: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={createCoupon} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest">Create</button>
                  <button onClick={() => setShowAddCoupon(false)} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                </div>
              </motion.div>
            )}

            {coupons.length === 0 ? (
              <div className="p-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                <Ticket className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No active coupons</p>
              </div>
            ) : (
              coupons.map(coupon => (
                <div key={coupon.id} className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-indigo-100 transition-all relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      {coupon.discountType === 'percentage' ? <Percent className="w-6 h-6" /> : <IndianRupee className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-800 tracking-tight">{coupon.code}</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black uppercase tracking-widest">ACTIVE</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {coupon.discountType === 'percentage' ? `${coupon.value}% off` : `₹${coupon.value} off`} 
                        {' '}on orders above ₹{coupon.minBillAmount}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expires</p>
                      <p className="text-xs font-bold text-slate-600">{coupon.expiryDate}</p>
                    </div>
                    <button 
                      onClick={() => deleteCoupon(coupon.id)}
                      className="p-3 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 -mr-12 -mt-12 rounded-full -z-10 group-hover:scale-150 transition-all opacity-0 group-hover:opacity-100" />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
