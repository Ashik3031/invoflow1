import { useEffect, useState } from 'react';
import { Users, Search, Loader2, ArrowRight, User, ShoppingBag, CreditCard, History, Save, X, Phone, MessageSquare } from 'lucide-react';
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
      .then(res => setCustomers(res.data))
      .catch(err => console.error(err))
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
    <div className="space-y-8 flex items-start gap-8">
      {/* List Section */}
      <div className={cn("space-y-8 flex-1 transition-all", selectedCustomer ? 'hidden lg:block' : 'w-full')}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Customer Database</h2>
            <p className="text-slate-500 text-sm font-medium">Record of all registered buyers</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Lookup by customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base w-full pl-11"
          />
        </div>

        <div className="glass-card overflow-hidden shadow-xl shadow-slate-200/50">
          <div className="overflow-x-auto">
            <table className="data-grid">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="label-micro data-cell text-left py-5">Full Identity</th>
                  <th className="label-micro data-cell text-left py-5">Contact Details</th>
                  <th className="label-micro data-cell text-right py-5">Points</th>
                  <th className="label-micro data-cell text-right py-5 text-transparent">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="data-cell text-center py-12"><Loader2 className="animate-spin inline text-brand" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="data-cell text-center py-12 text-slate-400 font-medium italic">Empty database</td></tr>
                ) : (
                  filtered.map(c => (
                    <tr 
                      key={c.id} 
                      className={cn(
                        "data-row group cursor-pointer transition-colors", 
                        selectedCustomer?.id === c.id ? "bg-slate-50" : "hover:bg-slate-50/50"
                      )}
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <td className="data-cell font-bold text-slate-800">{c.name}</td>
                      <td className="data-cell text-slate-500 font-mono text-sm tracking-wide">{c.phone}</td>
                      <td className="data-cell text-right">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand/5 text-brand rounded-full text-[10px] font-bold">
                          ★ {c.loyaltyPoints || 0}
                        </span>
                      </td>
                      <td className="data-cell text-right">
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand transition-all" />
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
            className="w-full lg:w-[480px] h-[calc(100vh-160px)] sticky top-24 glass-card overflow-y-auto flex flex-col p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-slate-100 rounded-xl lg:hidden text-slate-400"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex-1" />
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-6 mb-10">
              <div className="w-20 h-20 bg-brand rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-100">
                {selectedCustomer.name[0]}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedCustomer.name}</h3>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <Phone className="w-3 h-3" />
                  <span className="text-xs font-mono font-bold">{selectedCustomer.phone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="label-micro flex items-center gap-1.5"><ShoppingBag className="w-3 h-3" /> Orders</p>
                <p className="text-xl font-bold text-slate-800">{selectedCustomer.totalOrders || 0}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="label-micro flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> Total Spent</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(selectedCustomer.totalSpent || 0)}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <History className="w-3 h-3" />
                    Last Visit
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    {selectedCustomer.lastPurchaseDate ? format(parseISO(selectedCustomer.lastPurchaseDate), 'dd MMM yyyy') : 'Never'}
                  </span>
                </div>
                <div className="h-px bg-slate-100 w-full" />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                  <MessageSquare className="w-3 h-3" />
                  CRM Notes
                </h4>
                <div className="relative">
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add special requests, preferences..."
                    className="w-full min-h-[120px] p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all resize-none"
                  />
                  <button 
                    disabled={savingNotes}
                    onClick={saveNotes}
                    className="absolute bottom-3 right-3 p-2 bg-brand text-white rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                  <History className="w-3 h-3" />
                  Purchase History
                </h4>
                <div className="space-y-3">
                  {loadingHistory ? (
                    <div className="py-4 text-center"><Loader2 className="animate-spin text-brand mx-auto" /></div>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic">No transactions found</p>
                  ) : (
                    history.map(bill => (
                      <div key={bill.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between group hover:border-brand transition-all">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{bill.billNumber}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{format(parseISO(bill.createdAt), 'dd MMM, HH:mm')}</p>
                        </div>
                        <p className="text-sm font-black text-slate-800">{formatCurrency(bill.totalAmount)}</p>
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
