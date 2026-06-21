import React from 'react';
import { ReturnType, ReturnReason } from '../../types/return.types';

interface StepReturnTypeProps {
  returnType: ReturnType;
  setReturnType: (val: ReturnType) => void;
  returnReason: ReturnReason;
  setReturnReason: (val: ReturnReason) => void;
  returnReasonNote: string;
  setReturnReasonNote: (val: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const StepReturnType: React.FC<StepReturnTypeProps> = ({
  returnType,
  setReturnType,
  returnReason,
  setReturnReason,
  returnReasonNote,
  setReturnReasonNote,
  onNext,
  onPrev
}) => {
  const reasons: { value: ReturnReason; label: string }[] = [
    { value: 'damaged', label: 'Damaged Product' },
    { value: 'wrong_item', label: 'Wrong Item Delivered' },
    { value: 'customer_changed_mind', label: 'Customer Changed Mind' },
    { value: 'quality_issue', label: 'Quality Issue / Refuse' },
    { value: 'expired', label: 'Expired Product' },
    { value: 'other', label: 'Other Reason' }
  ];

  return (
    <div id="step-return-type" className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Step 2 of 4: Select Return Type & Reason</h3>
        <p className="text-xs text-slate-500">
          Decide on full refund, a selective items returns, or an inline exchange. Enter the core driver reason for compliance reporting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label
          className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            returnType === 'full_return'
              ? 'border-indigo-600 bg-indigo-50/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="returnType"
            value="full_return"
            checked={returnType === 'full_return'}
            onChange={() => setReturnType('full_return')}
            className="sr-only"
          />
          <span className="font-bold text-slate-900 text-sm">Full Return</span>
          <span className="text-slate-500 text-[11px] mt-1">Returns all purchased items from the original invoice for a full refund.</span>
        </label>

        <label
          className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            returnType === 'partial_return'
              ? 'border-indigo-600 bg-indigo-50/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="returnType"
            value="partial_return"
            checked={returnType === 'partial_return'}
            onChange={() => setReturnType('partial_return')}
            className="sr-only"
          />
          <span className="font-bold text-slate-900 text-sm">Partial Return</span>
          <span className="text-slate-500 text-[11px] mt-1">Returns only specific selected items and quantities from the invoice.</span>
        </label>

        <label
          className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            returnType === 'exchange'
              ? 'border-indigo-600 bg-indigo-50/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="returnType"
            value="exchange"
            checked={returnType === 'exchange'}
            onChange={() => setReturnType('exchange')}
            className="sr-only"
          />
          <span className="font-bold text-slate-900 text-sm">Exchange</span>
          <span className="text-slate-500 text-[11px] mt-1">Swaps items for alternative products. Calculates the positive or negative price difference.</span>
        </label>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div>
          <label htmlFor="return-reason-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Return Reason
          </label>
          <select
            id="return-reason-select"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            {reasons.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="return-note-input" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Explanation Notes (Optional)
          </label>
          <textarea
            id="return-note-input"
            rows={3}
            value={returnReasonNote}
            onChange={(e) => setReturnReasonNote(e.target.value)}
            placeholder="Type any compliance notes or free text summary of the return reason..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-100">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer"
        >
          Select Items & Continue
        </button>
      </div>
    </div>
  );
};
