import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, Loader2, MessageCircle, Share2, Search, MapPin, Phone } from 'lucide-react';
import axios from 'axios';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function PublicStorePage() {
  const { slug } = useParams();
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStore();
  }, [slug]);

  const fetchStore = async () => {
    try {
      const { data } = await axios.get(`/api/store/${slug}`);
      setStoreData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const shareStore = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Store link copied to clipboard!');
  };

  const orderViaWhatsApp = (productName: string) => {
    const phone = '919876543210'; // In a real app, this would come from tenant data
    const text = encodeURIComponent(`Hi, I want to order ${productName} from your store.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
    </div>
  );

  if (!storeData) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-12 bg-white rounded-[48px] shadow-xl border border-slate-100">
        <ShoppingBag className="w-20 h-20 text-slate-200 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-slate-800">Store Not Found</h2>
        <p className="text-slate-500 mt-2 font-bold italic">The store you are looking for does not exist.</p>
      </div>
    </div>
  );

  const filteredProducts = storeData.products.filter((p: any) => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pb-20 pt-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="w-24 h-24 bg-indigo-500 rounded-[32px] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-indigo-200">
            <ShoppingBag className="w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 uppercase">{storeData.shopName}</h1>
          <div className="flex items-center justify-center gap-6 text-slate-400">
             <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                <MapPin className="w-3 h-3" /> Digital Storefront
             </div>
             <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                <Phone className="w-3 h-3" /> Online Support
             </div>
          </div>
        </div>

        {/* Backdrop decorations */}
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-50 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10">
         <div className="bg-white p-4 rounded-[40px] shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
               <input 
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-[32px] h-16 pl-16 pr-8 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
               />
            </div>
            <button 
              onClick={shareStore}
              className="w-full md:w-auto bg-slate-900 text-white h-16 px-10 rounded-[32px] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all"
            >
               <Share2 className="w-5 h-5" /> Share Store
            </button>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20">
         <div className="mb-12">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Catalogue</h2>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((p: any) => (
               <motion.div 
                 key={p.id}
                 layout
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="group bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all"
               >
                  <div className="aspect-square bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 mb-8 overflow-hidden relative">
                     <ShoppingBag className="w-16 h-16 group-hover:scale-110 transition-transform duration-500" />
                     <div className="absolute top-6 left-6 bg-indigo-500 text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">
                        {p.category}
                     </div>
                  </div>
                  
                  <div className="mb-8">
                     <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                     <p className="text-xs font-bold text-slate-400 mt-2 italic">Standard Pack / Unit</p>
                  </div>

                  <div className="flex items-center justify-between">
                     <p className="text-2xl font-black text-slate-900">{formatCurrency(p.price)}</p>
                     <button 
                       onClick={() => orderViaWhatsApp(p.name)}
                       className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-400 transition-all flex items-center gap-2 group/btn"
                     >
                        <MessageCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block">Order</span>
                     </button>
                  </div>
               </motion.div>
            ))}
         </div>

         {filteredProducts.length === 0 && (
            <div className="text-center py-40">
               <p className="text-xl font-black text-slate-300 uppercase italic">No products matched your search</p>
            </div>
         )}
      </div>

      <footer className="bg-white border-t border-slate-100 py-12 px-6">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Powered by Xyraco Building Lite</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2026 {storeData.shopName}</p>
         </div>
      </footer>
    </div>
  );
}
