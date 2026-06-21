import React from 'react';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Bill } from '../../types';

interface StepRefundMethodProps {
  originalBill: Bill;
  refundMode: 'cash' | 'upi' | 'store_credit';
  setRefundMode: (val: 'cash' | 'upi' | 'store_credit') => void;
  refundNote: string;
  setRefundNote: (val: string) => void;
  onSubmit: () => void;
  onPrev: () => void;
  loading: boolean;
  error: string | null;
  balanceType: 'refund_to_customer' | 'collect_from_customer' | 'even';
  computedRefundAmount: number;
  computedCollectAmount: number;
}

export const StepRefundMethod: React.FC<StepRefundMethodProps> = ({
  originalBill,
  refundMode,
  setRefundMode,
  refundNote,
  setRefundNote,
  onSubmit,
  onPrev,
  loading,
  error,
  balanceType,
  computedRefundAmount,
  computedCollectAmount
}) => {
  const isWalkIn = !originalBill.customerId || originalBill.customerId === 'walk-in' || originalBill.customerName === 'Walk-in';

  return (
    <div id="step-refund-method" className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Step 4 of 4: Select Reimbursement Method</h3>
        <p className="text-xs text-slate-500">
          Determine how the customer receives the positive refund balance or pays outstanding differences for an exchange.
        </p>
      </div>

      {balanceType === 'refund_to_customer' && computedRefundAmount > 0 ? (
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Choose Refund Method
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              id="ref-cash-btn"
              onClick={() => setRefundMode('cash')}
              className={`flex flex-col p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                refundMode === 'cash'
                  ? 'border-indigo-600 bg-indigo-50/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="font-bold text-slate-900 text-sm">Cash Refund</span>
              <span className="text-slate-500 text-[10.5px] mt-1">Deduct immediately from the cash register layout.</span>
            </button>

            <button
              type="button"
              id="ref-upi-btn"
              onClick={() => setRefundMode('upi')}
              className={`flex flex-col p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                refundMode === 'upi'
                  ? 'border-indigo-600 bg-indigo-50/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="font-bold text-slate-900 text-sm">UPI Transfer</span>
              <span className="text-slate-500 text-[10.5px] mt-1">Record a payout reference number or QR refund.</span>
            </button>

            <button
              type="button"
              id="ref-store-credit-btn"
              disabled={isWalkIn}
              onClick={() => setRefundMode('store_credit')}
              className={`flex flex-col p-4 rounded-2xl border-2 text-left transition-all ${
                isWalkIn 
                  ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                  : refundMode === 'store_credit'
                    ? 'border-indigo-600 bg-indigo-50/20 cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
              }`}
            >
              <span className="font-bold text-slate-900 text-sm">Store Credit</span>
              <span className="text-slate-500 text-[10.5px] mt-1">
                {isWalkIn 
                  ? 'Unavailable for Walk-in profile.' 
                  : `Add value directly to current customer profile.`}
              </span>
            </button>
          </div>

          {isWalkIn && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Note: Store Credit is locked because the original invoice is associated with a Walk-in profile. Complete the return via Cash or UPI, or add customer profile details first.</span>
            </div>
          )}

          <div className="pt-2">
            <label htmlFor="refund-note-box" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Reference Note / ID
            </label>
            <input
              type="text"
              id="refund-note-box"
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              placeholder="UPI Txn ID, Voucher ID or cash drawer remarks..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            />
          </div>
        </div>
      ) : balanceType === 'collect_from_customer' && computedCollectAmount > 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-sm">Collection Required</h4>
          </div>
          <p className="text-xs">
            The exchange replacement items cost more than the original return. Collect **₹{computedCollectAmount.toFixed(2)}** in cash, card, or UPI from the customer to clear invoice differences.
          </p>
          <div className="pt-2">
            <label htmlFor="exchange-ref-note" className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
              Ref Payment Note
            </label>
            <input
              type="text"
              id="exchange-ref-note"
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              placeholder="e.g. UPI transfer received reference ID..."
              className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-slate-800"
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl p-5 text-center py-8">
          <ShieldCheck className="w-10 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="font-bold text-sm">Even Balance Exchange</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            The return value matches the replacement swap items value exactly. No refund or collection is due.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t border-slate-100">
        <button
          onClick={onPrev}
          disabled={loading}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer shadow-md inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Complete Return Page
        </button>
      </div>
    </div>
  );
};
