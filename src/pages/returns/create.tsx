import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReturnStore } from '../../store/useReturnStore';
import { StepFindBill } from '../../components/returns/StepFindBill';
import { StepReturnType } from '../../components/returns/StepReturnType';
import { StepSelectItems } from '../../components/returns/StepSelectItems';
import { StepRefundMethod } from '../../components/returns/StepRefundMethod';
import { ReturnType, ReturnReason } from '../../types/return.types';
import { Product } from '../../types';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function CreateReturnPage() {
  const navigate = useNavigate();
  const { 
    retrieveInvoiceByNumber, 
    createReturn, 
    loading, 
    error,
    selectedInvoice,
    selectInvoice
  } = useReturnStore();

  const [step, setStep] = useState(1);
  const [returnType, setReturnType] = useState<ReturnType>('partial_return');
  const [returnReason, setReturnReason] = useState<ReturnReason>('other');
  const [returnReasonNote, setReturnReasonNote] = useState('');
  
  // Mapping of ProductId to returning quantity
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  
  // Array of picked replacements
  const [exchangeItems, setExchangeItems] = useState<{ product: Product; quantity: number }[]>([]);
  
  const [refundMode, setRefundMode] = useState<'cash' | 'upi' | 'store_credit'>('cash');
  const [refundNote, setRefundNote] = useState('');

  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [completedCN, setCompletedCN] = useState<any>(null);

  // Calculates pricing before submitting for side visual sync
  const calculateTotals = () => {
    let returnVal = 0;
    if (selectedInvoice) {
      selectedInvoice.items.forEach(item => {
        const qty = returnItems[item.productId] || 0;
        if (qty > 0) {
          const lineVal = item.price * qty * (1 + (item.gstRate || 0) / 100);
          returnVal += lineVal;
        }
      });
    }

    let exchangeVal = 0;
    exchangeItems.forEach(item => {
      const lineVal = item.product.price * item.quantity * (1 + (item.product.gstRate || 0) / 100);
      exchangeVal += lineVal;
    });

    const diff = returnVal - exchangeVal;
    let balanceType: 'refund_to_customer' | 'collect_from_customer' | 'even' = 'even';
    let refundAmt = 0;
    let collectAmt = 0;

    if (returnType === 'exchange') {
      if (diff > 0) {
        refundAmt = diff;
        balanceType = 'refund_to_customer';
      } else if (diff < 0) {
        collectAmt = Math.abs(diff);
        balanceType = 'collect_from_customer';
      } else {
        balanceType = 'even';
      }
    } else {
      refundAmt = returnVal;
      balanceType = 'refund_to_customer';
    }

    return {
      returnVal,
      exchangeVal,
      balanceType,
      refundAmt,
      collectAmt
    };
  };

  const { returnVal, exchangeVal, balanceType, refundAmt, collectAmt } = calculateTotals();

  const handleSelectInvoice = (bill: any) => {
    selectInvoice(bill);
    setStep(2);
  };

  const handleNextStep = () => {
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    if (step === 1) {
      navigate('/returns');
    } else {
      setStep((prev) => prev - 1);
    }
  };

  const handleSubmitReturn = async () => {
    if (!selectedInvoice) return;

    try {
      const payload = {
        originalBillId: selectedInvoice.id,
        returnType,
        returnReason,
        returnReasonNote,
        returnItems: Object.entries(returnItems).map(([productId, quantity]) => ({
          productId,
          quantity: quantity as number
        })),
        exchangeItems: returnType === 'exchange' ? exchangeItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })) : [],
        refundMode: balanceType === 'refund_to_customer' ? refundMode : undefined,
        refundNote
      };

      const result = await createReturn(payload);
      setCompletedCN(result.creditNote);
      setResultMessage(result.message || 'Operation processed successfully.');
      setStep(5); // Complete Success screen!
    } catch (err) {
      // Error is set in the Zustand store and displayed in StepRefundMethod component
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            selectInvoice(null);
            navigate('/returns');
          }}
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Process Product Return & Replacement</h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Sales return interface · Audit Compliant Invoice Adjustment
          </p>
        </div>
      </div>

      {/* Progress Wizard header block */}
      {step < 5 && (
        <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-xl text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
          <div className={`py-2 rounded-lg ${step === 1 ? 'bg-indigo-600 text-white shadow-xs font-black' : ''}`}>
            1. Invoice
          </div>
          <div className={`py-2 rounded-lg ${step === 2 ? 'bg-indigo-600 text-white shadow-xs font-black' : 'opacity-80'}`}>
            2. Type & Reason
          </div>
          <div className={`py-2 rounded-lg ${step === 3 ? 'bg-indigo-600 text-white shadow-xs font-black' : 'opacity-80'}`}>
            3. Items Selected
          </div>
          <div className={`py-2 rounded-lg ${step === 4 ? 'bg-indigo-600 text-white shadow-xs font-black' : 'opacity-80'}`}>
            4. Refund
          </div>
        </div>
      )}

      {/* Main Form content step router */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        {step === 1 && (
          <StepFindBill
            onSelect={handleSelectInvoice}
            retrieveInvoiceByNumber={retrieveInvoiceByNumber}
            loading={loading}
            error={error}
          />
        )}

        {step === 2 && selectedInvoice && (
          <StepReturnType
            returnType={returnType}
            setReturnType={setReturnType}
            returnReason={returnReason}
            setReturnReason={setReturnReason}
            returnReasonNote={returnReasonNote}
            setReturnReasonNote={setReturnReasonNote}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        )}

        {step === 3 && selectedInvoice && (
          <StepSelectItems
            originalBill={selectedInvoice}
            returnType={returnType}
            returnItems={returnItems}
            setReturnItems={setReturnItems}
            exchangeItems={exchangeItems}
            setExchangeItems={setExchangeItems}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        )}

        {step === 4 && selectedInvoice && (
          <StepRefundMethod
            originalBill={selectedInvoice}
            refundMode={refundMode}
            setRefundMode={setRefundMode}
            refundNote={refundNote}
            setRefundNote={setRefundNote}
            onSubmit={handleSubmitReturn}
            onPrev={handlePrevStep}
            loading={loading}
            error={error}
            balanceType={balanceType}
            computedRefundAmount={refundAmt}
            computedCollectAmount={collectAmt}
          />
        )}

        {step === 5 && (
          <div className="text-center py-12 space-y-6 max-w-md mx-auto animate-fadeIn">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800">Return Processed Perfectly</h3>
              <p className="text-xs text-slate-500 line-clamp-3">
                {resultMessage}
              </p>
              {completedCN && (
                <div className="bg-indigo-50 border border-indigo-100/50 p-3 rounded-xl mt-3 text-xs flex justify-between font-bold text-indigo-950">
                  <span>Generated Credit Note No:</span>
                  <span className="font-black text-indigo-700">#{completedCN.billNumber}</span>
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  selectInvoice(null);
                  navigate('/returns');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest cursor-pointer"
              >
                Go back to Returns List
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  selectInvoice(null);
                  setReturnItems({});
                  setExchangeItems([]);
                  setRefundNote('');
                  setResultMessage(null);
                  setCompletedCN(null);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest cursor-pointer"
              >
                Process Another Return
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
