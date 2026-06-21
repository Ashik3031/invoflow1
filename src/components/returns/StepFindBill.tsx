import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, ShoppingBag } from 'lucide-react';
import { Bill } from '../../types';

interface StepFindBillProps {
  onSelect: (bill: Bill) => void;
  retrieveInvoiceByNumber: (num: string) => Promise<Bill>;
  loading: boolean;
  error: string | null;
}

export const StepFindBill: React.FC<StepFindBillProps> = ({
  onSelect,
  retrieveInvoiceByNumber,
  loading,
  error
}) => {
  const [billNumber, setBillNumber] = useState('');
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [foundBill, setFoundBill] = useState<Bill | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber.trim()) return;
    setSearchErr(null);
    setFoundBill(null);

    try {
      const bill = await retrieveInvoiceByNumber(billNumber.trim());
      setFoundBill(bill);
    } catch (err: any) {
      setSearchErr(err.message || 'Invoice not found or could not be loaded.');
    }
  };

  return (
    <div id="step-find-bill" className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Step 1 of 4: Find Original Invoice</h3>
        <p className="text-xs text-slate-500">
          Enter the invoice number (e.g., INV-2026-0001) of the completed purchase. Checks will verify the tenant ownership and that no return was previously processed.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            id="bill-search-input"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            placeholder="Enter Invoice Number (e.g. INV-2026-0001)"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
        </div>
        <button
          type="submit"
          id="btn-search-bill"
          disabled={loading}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Search
        </button>
      </form>

      {searchErr && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{searchErr}</span>
        </div>
      )}

      {error && !searchErr && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {foundBill && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex justify-between items-start pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Found</div>
              <div className="text-lg font-black text-slate-800">{foundBill.billNumber}</div>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-emerald-100">
              {foundBill.paymentStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Customer</span>
              <span className="text-slate-800 font-bold">{foundBill.customerName}</span>
              {foundBill.customerPhone && <span className="text-slate-500 block text-[10px]">{foundBill.customerPhone}</span>}
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Purchase Date</span>
              <span className="text-slate-800 font-bold">
                {new Date(foundBill.createdAt).toLocaleDateString(undefined, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
              Purchased Items ({foundBill.items.length})
            </div>
            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
              {foundBill.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-800">{item.productName}</span>
                    <span className="text-slate-500 block text-[10px]">
                      Qty: {item.quantity} × ₹{item.price.toFixed(2)} (GST: {item.gstRate}%)
                    </span>
                  </div>
                  <span className="font-bold text-slate-700 align-middle">₹{item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-100 pt-4 bg-indigo-50/30 -mx-5 -mb-5 p-5 rounded-b-2xl">
            <div>
              <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total Bill Amount</div>
              <div className="text-xl font-black text-slate-900">₹{foundBill.totalAmount.toFixed(2)}</div>
            </div>
            <button
              onClick={() => onSelect(foundBill)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl cursor-pointer shadow-sm shadow-indigo-100"
            >
              Select Invoice & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
