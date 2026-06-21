import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Loader2, RefreshCw, BarChart2, CornerUpLeft, 
  ChevronRight, Calendar, ArrowUpRight, ArrowDownLeft, X, 
  ShoppingBag, Shield, CheckCircle2, Ticket
} from 'lucide-react';
import { useReturnStore } from '../../store/useReturnStore';
import { ReturnBadge } from '../../components/returns/ReturnBadge';
import { Bill } from '../../types';

export default function ReturnsPage() {
  const navigate = useNavigate();
  const { returnsList, fetchReturns, loading, error } = useReturnStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCN, setSelectedCN] = useState<Bill | null>(null);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const filteredCNs = returnsList.filter(cn => 
    cn.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cn.linkedBillNumber && cn.linkedBillNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sales Returns & Exchanges</h2>
          <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mt-1">
            Manage product returns, partial refunds, customer credit & inventory restorations
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/returns/analytics')}
            id="btn-nav-analytics"
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-sm"
          >
            <BarChart2 className="w-4 h-4 text-slate-500" />
            Return Analytics
          </button>
          
          <button
            onClick={() => navigate('/returns/create')}
            id="btn-nav-create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Process Return / Swap
          </button>
        </div>
      </div>

      {/* Toolbar / Searchbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            id="cn-search-bar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Credit Notes, Customers, or Invoices..."
            className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white text-xs text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        <button
          onClick={fetchReturns}
          disabled={loading}
          className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer self-start md:self-auto flex items-center justify-center"
          title="Refresh Returns"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Grid View */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="glass-card overflow-hidden border border-slate-100 rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100/80">
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Note</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Invoice</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Refunded Total</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : filteredCNs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <CornerUpLeft className="w-12 h-12 text-slate-200 mx-auto" />
                      <div className="text-slate-700 font-bold text-sm uppercase tracking-wider">No Returns Logged</div>
                      <p className="text-xs text-slate-400">
                        Invoices returned or exchanged will generate credit notes to balance inventory logs and fiscal books.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCNs.map((cn) => (
                  <tr key={cn.id} className="hover:bg-slate-50/50 transition duration-75">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">
                      {new Date(cn.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                        <CornerUpLeft className="w-3.5 h-3.5 text-rose-500" />
                        #{cn.billNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700">
                      {cn.linkedBillNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-black text-slate-800">{cn.customerName}</div>
                      {cn.customerPhone && (
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{cn.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ReturnBadge type={cn.returnType || 'full_return'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-black text-slate-900">
                        ₹{(cn.refundAmount || cn.totalAmount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedCN(cn)}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        Details
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Note Detail Slide-over / Modal Panel */}
      {selectedCN && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-[400] animate-fadeIn">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Modal Header */}
            <div>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Return Credit Note Info</span>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <CornerUpLeft className="w-4 h-4 text-indigo-600" />
                    #{selectedCN.billNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCN(null)}
                  className="p-1 px-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Merchant Stamp / Date</span>
                    <span className="font-bold text-slate-800 mt-1 block">
                      {new Date(selectedCN.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Reference Source</span>
                    <span className="font-bold text-slate-850 mt-1 block">
                      Original Invoice: <span className="text-indigo-600 underline font-black">{selectedCN.linkedBillNumber || 'N/A'}</span>
                    </span>
                  </div>
                </div>

                {/* Customer stamp */}
                <div className="border border-slate-150 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Customer Beneficiary</span>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{selectedCN.customerName}</div>
                      {selectedCN.customerPhone && <div className="text-xs text-slate-500 mt-0.5 font-semibold">{selectedCN.customerPhone}</div>}
                    </div>
                    <ReturnBadge type={selectedCN.returnType || 'full_return'} />
                  </div>
                </div>

                {/* Returned Items List */}
                <div className="space-y-2">
                  <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider block">Products Returned & Stocked</span>
                  <div className="space-y-2">
                    {selectedCN.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-red-50/10 border border-red-100/50 rounded-xl text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{item.productName}</div>
                          <div className="text-[10.5px] text-slate-400 mt-0.5">
                            Returned Qty: {item.quantity} · Rate: ₹{item.price.toFixed(2)}
                          </div>
                        </div>
                        <span className="font-bold text-slate-700">₹{item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Swap replacements list (if exchange) */}
                {selectedCN.exchangeItems && selectedCN.exchangeItems.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10.5px] font-black text-indigo-400 uppercase tracking-wider block">Exchange Swap Replacements Taken</span>
                    <div className="space-y-22">
                      {selectedCN.exchangeItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-sky-50/10 border border-sky-100/50 rounded-xl text-xs">
                          <div>
                            <div className="font-bold text-slate-800">{item.productName}</div>
                            <div className="text-[10.5px] text-slate-400 mt-0.5">
                              Exchanged Qty: {item.quantity} · Rate: ₹{item.price.toFixed(2)}
                            </div>
                          </div>
                          <span className="font-bold text-slate-700">₹{item.lineTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reason Notes */}
                <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wide text-[9.5px]">Reason Code & Compliance Notes</span>
                  <p className="text-slate-700 mt-1 font-semibold block capitalize">
                    Reason: **{selectedCN.returnReason ? selectedCN.returnReason.replace('_', ' ') : 'Other'}**
                  </p>
                  {selectedCN.returnReasonNote && (
                    <p className="text-slate-500 italic mt-1 block">"{selectedCN.returnReasonNote}"</p>
                  )}
                </div>
              </div>
            </div>

            {/* Financial math block */}
            <div className="bg-indigo-950 p-6 text-white space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-indigo-800 text-sm">
                <span className="text-indigo-200">Reimbursement Method:</span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">
                  {selectedCN.payments && selectedCN.payments[0] ? selectedCN.payments[0].mode : 'N/A'}
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs">
                {selectedCN.returnType === 'exchange' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-indigo-200">Returns Subtotal value:</span>
                      <span>₹{(selectedCN.subTotal || 0).toFixed(2)}</span>
                    </div>
                    {selectedCN.collectAmount > 0 && (
                      <div className="flex justify-between text-rose-300 font-semibold">
                        <span>Balance collected from Customer:</span>
                        <span>₹{selectedCN.collectAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between text-base font-black pt-2 border-t border-indigo-900/50">
                  <span>Refund / Total impact:</span>
                  <span className="text-xl text-emerald-400">₹{(selectedCN.refundAmount || selectedCN.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCN(null)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-center cursor-pointer font-sans transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
