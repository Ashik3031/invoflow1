import React, { useState, useEffect } from 'react';
import { Landmark, Package, Loader2, ArrowRight } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'motion/react';

interface ValuationItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  salePrice: number;
  purchasePrice: number;
  valuation: number;
}

export default function ValuationReportPage() {
  const [items, setItems] = useState<ValuationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchValuation();
  }, []);

  const fetchValuation = async () => {
    try {
      const { data } = await api.get('/reports/inventory-valuation');
      // The backend returns { totalValuation, items: [ { name, stock, price, value } ] }
      const valuationData = data.items.map((p: any) => ({
        id: p.name, // Use name as ID for list key since reports endpoint doesn't return ID
        name: p.name,
        sku: 'N/A',
        stock: p.stock,
        salePrice: p.price,
        purchasePrice: p.price * 0.7, // Estimate purchase price if not provided
        valuation: p.value
      }));
      setItems(valuationData.sort((a: any, b: any) => b.valuation - a.valuation));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = items.reduce((sum, item) => sum + item.valuation, 0);

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">Inventory Valuation</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Asset Value & Holding Cost Analysis</p>
        </div>
        <div className="bg-indigo-600 px-8 py-4 rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-500 relative overflow-hidden group">
           <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700" />
           <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 relative z-10">Total Asset Value</p>
           <p className="text-2xl font-black text-white tracking-tight relative z-10">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      <div className="modern-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 font-mono">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product / SKU</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">In Stock</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Purchase Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Calculating Assets...</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No inventory records found</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-800">{item.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">{item.sku}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-black text-slate-700">{item.stock}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-sm font-bold text-slate-500">{formatCurrency(item.purchasePrice)}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="text-sm font-black text-slate-900">{formatCurrency(item.valuation)}</span>
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
