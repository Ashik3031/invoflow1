import React from 'react';
import { Gift, Check } from 'lucide-react';

interface StoreCreditBannerProps {
  creditAmount: number;
  customerName: string;
  applyStoreCredit: boolean;
  setApplyStoreCredit: (apply: boolean) => void;
}

export const StoreCreditBanner: React.FC<StoreCreditBannerProps> = ({
  creditAmount,
  customerName,
  applyStoreCredit,
  setApplyStoreCredit
}) => {
  if (!creditAmount || creditAmount <= 0) return null;

  return (
    <div id="store-credit-banner" className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fadeIn">
      <div className="flex gap-2.5 items-start">
        <Gift className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-indigo-950">Store Credit Available</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Customer **{customerName}** has an active store credit balance of **₹{creditAmount.toFixed(2)}**. Would you like to apply it as deductions to this invoice?
          </p>
        </div>
      </div>

      <div className="flex gap-2 w-full md:w-auto">
        <button
          type="button"
          id="apply-credit-yes"
          onClick={() => setApplyStoreCredit(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer w-full md:w-auto justify-center ${
            applyStoreCredit 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'bg-white text-indigo-700 hover:bg-slate-50 border border-indigo-200'
          }`}
        >
          {applyStoreCredit && <Check className="w-3.5 h-3.5" />}
          Yes, Apply
        </button>
        <button
          type="button"
          id="apply-credit-no"
          onClick={() => setApplyStoreCredit(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold w-full md:w-auto justify-center cursor-pointer ${
            !applyStoreCredit 
              ? 'bg-slate-300 text-slate-700 font-bold' 
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          No, Skip
        </button>
      </div>
    </div>
  );
};
