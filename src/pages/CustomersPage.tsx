import { useEffect, useState } from 'react';
import { Users, Search, Loader2, ArrowRight, User, ShoppingBag, CreditCard, History, Save, X, Phone, MessageSquare, Receipt } from 'lucide-react';
import api from '../lib/api';
import { Customer, Bill } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Bill[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = () => {
    api.get('/customer/list')
      .then(res => setCustomers(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        console.error(err);
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  };

  const handleSelectCustomer = async (c: Customer) => {
    setSelectedCustomer(c);
    setNotes(c.notes || '');
    setLoadingHistory(true);
    try {
      const res = await api.get(`/customer/${c.id}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedCustomer) return;
    setSavingNotes(true);
    try {
      await api.put(`/customer/${selectedCustomer.id}/notes`, { notes });
      fetchCustomers();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-12 flex items-start gap-8">
      {/* List Section */}
      <div className={cn("space-y-8 flex-1 transition-all", selectedCustomer ? 'hidden lg:block' : 'w-full')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">Customer Database</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">CRM & Loyalty Relationship Management</p>
          </div>
        </div>

        <div className="modern-card p-0 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
             <div className="relative max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lookup by customer name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
                />
             </div>
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Champions: {filtered.length}</span>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-50/10 border-b border-slate-100 font-mono">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Identity</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Details</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Loyalty Points</th>
                  <th className="px-8 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-right">Relationship</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="animate-spin inline text-indigo-600" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest">Empty database</td></tr>
                ) : (
                  filtered.map(c => (
                    <tr 
                      key={c.id} 
                      className={cn(
                        "hover:bg-slate-50 transition-all cursor-pointer group", 
                        selectedCustomer?.id === c.id ? "bg-indigo-50/50" : ""
                      )}
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
                               {c.name[0]}
                            </div>
                            <span className="text-sm font-bold text-slate-800">{c.name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-500 font-mono tracking-tight">{c.phone}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-100 shadow-sm">
                          ★ {c.loyaltyPoints || 0}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end">
                           <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                              <ArrowRight className="w-4 h-4" />
                           </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Profile Detail Panel */}
      <AnimatePresence>
        {selectedCustomer && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full lg:w-[480px] h-[calc(100vh-160px)] sticky top-24 modern-card shadow-lg bg-white overflow-y-auto flex flex-col p-8 custom-scrollbar"
          >
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-slate-50 rounded-2xl lg:hidden text-slate-400"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex-1" />
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2.5 hover:bg-rose-50 hover:text-rose-600 rounded-2xl text-slate-400 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-6 mb-10">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-4xl flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50/50">
                {selectedCustomer.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1 leading-none">Customer Profile</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-2">{selectedCustomer.name}</h3>
                <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl w-fit border border-slate-100">
                  <Phone className="w-3.5 h-3.5 opacity-40" />
                  <span className="text-xs font-mono font-black tracking-tight">{selectedCustomer.phone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="p-6 bg-slate-50/50 rounded-4xl border border-white/80 shadow-sm backdrop-blur-sm">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm">
                  <ShoppingBag className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Engagements</p>
                <p className="text-3xl font-black text-slate-900 leading-none">{selectedCustomer.totalOrders || 0}</p>
                <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase tracking-widest leading-none">Total Invoices</p>
              </div>
              <div className="p-6 bg-indigo-600 rounded-4xl shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700" />
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-md">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] uppercase tracking-widest font-black text-indigo-200 mb-1">Contribution</p>
                <p className="text-3xl font-black text-white leading-none tracking-tight">{formatCurrency(selectedCustomer.totalSpent || 0)}</p>
                <p className="text-[9px] font-bold text-indigo-300 mt-2 uppercase tracking-widest leading-none">Net Revenue</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    Last Activity
                  </h4>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {selectedCustomer.lastPurchaseDate ? format(parseISO(selectedCustomer.lastPurchaseDate), 'dd MMM yyyy') : 'Inactive'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  CRM Insights & Notes
                </h4>
                <div className="relative group">
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add special requests, delivery preferences, or relationship context..."
                    className="w-full min-h-[140px] p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[2rem] text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none placeholder:text-slate-300"
                  />
                  <button 
                    disabled={savingNotes}
                    onClick={saveNotes}
                    className="absolute bottom-4 right-4 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingNotes ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pb-8">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-5">
                  <History className="w-4 h-4 text-indigo-400" />
                  Recent Invoices
                </h4>
                <div className="space-y-4">
                  {loadingHistory ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                       <Loader2 className="animate-spin text-indigo-600 w-6 h-6" />
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Retrieving ledger...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="p-8 bg-slate-50 rounded-[2rem] text-center border border-dashed border-slate-200">
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic opacity-60">No transactions recorded</p>
                    </div>
                  ) : (
                    history.slice(0, 10).map(bill => (
                      <div key={bill.id} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              <Receipt className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="text-xs font-black text-slate-800 tracking-tight">{bill.billNumber}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{format(parseISO(bill.createdAt), 'dd MMM, HH:mm')}</p>
                           </div>
                        </div>
                        <p className="text-sm font-black text-slate-800 bg-slate-50 px-3 py-1.5 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all">{formatCurrency(bill.totalAmount)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
