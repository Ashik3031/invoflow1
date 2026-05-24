import React, { useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Mail, 
  AlertCircle, 
  Calendar, 
  FileText,
  Loader2,
  Info
} from 'lucide-react';
import { useGstStore } from '../store/useGstStore';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function GSTPage() {
  const { 
    summary, 
    loading, 
    selectedMonth, 
    selectedYear, 
    setMonth, 
    fetchSummary, 
    exportPdf, 
    sendEmail 
  } = useGstStore();

  useEffect(() => {
    fetchSummary();
  }, []);

  const changeMonth = (offset: number) => {
    let newMonth = selectedMonth + offset;
    let newYear = selectedYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setMonth(newMonth, newYear);
  };

  if (loading && !summary) {
    return (
      <div className="py-40 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Preparing GST Report...</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Month Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">GST Summary (GSTR-3B)</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Self-declaration for {summary.tenant.shopName}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <span className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-800 w-32 text-center">
              {summary.period.label}
            </span>
            <button onClick={() => changeMonth(1)} disabled={selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1} className="p-2 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      <DueDateBanner daysRemaining={summary.filingDue.daysRemaining} dueDate={summary.filingDue.date} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Sales Value" value={summary.outwardSupplies.totals.taxableValue} color="blue" />
        <MetricCard label="GST Collected" value={summary.outwardSupplies.totals.totalGst} color="indigo" />
        <MetricCard label="ITC Available" value={summary.inputTaxCredit.total} color="amber" />
        <MetricCard label="Net Payable" value={summary.netPayable.total} color="slate" isBold />
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 italic uppercase tracking-tight">
              <FileText className="w-5 h-5 text-indigo-600" /> Outward Taxable Supplies
            </h3>
            <GstBreakdownTable data={summary.outwardSupplies} />
          </section>

          <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 italic uppercase tracking-tight text-amber-600">
              <AlertCircle className="w-5 h-5" /> Input Tax Credit & Returns
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ItcSection data={summary.inputTaxCredit} />
              <ReturnsSection data={summary.salesReturns} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <NetPayableBox data={summary.netPayable} dueDate={summary.filingDue.date} daysRemaining={summary.filingDue.daysRemaining} />
          
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={exportPdf}
              className="w-full bg-slate-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <Download className="w-4 h-4" /> Export PDF for CA
            </button>
            <button 
              onClick={sendEmail}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              <Mail className="w-4 h-4" /> Send Summary to Email
            </button>
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex items-start gap-4">
            <Info className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
            <p className="text-[11px] font-bold text-indigo-700/70 leading-relaxed italic">
              Verification needed: Ensure all ITC and returns are audited before final filing on the GST portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, isBold }: any) {
  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    amber: 'text-amber-600 bg-amber-50',
    slate: 'text-slate-900 bg-slate-100'
  };

  return (
    <div className={cn("p-6 rounded-[32px] border border-slate-100 bg-white shadow-sm flex flex-col justify-between h-32 relative overflow-hidden", isBold && "border-slate-300 ring-1 ring-slate-100")}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn("text-2xl font-black tracking-tight", colorMap[color]?.split(' ')[0])}>{formatCurrency(value)}</p>
      <div className={cn("absolute right-4 bottom-4 w-12 h-12 rounded-2xl opacity-10 blur-xl", colorMap[color]?.split(' ')[1])} />
    </div>
  );
}

function DueDateBanner({ daysRemaining, dueDate }: any) {
  const isOverdue = daysRemaining < 0;
  const isWarning = daysRemaining <= 10 && daysRemaining >= 0;
  
  let bgClass = "bg-emerald-50 border-emerald-100 text-emerald-800";
  let iconClass = "text-emerald-500";
  
  if (isOverdue) {
    bgClass = "bg-rose-50 border-rose-100 text-rose-800";
    iconClass = "text-rose-500";
  } else if (isWarning) {
    bgClass = "bg-amber-50 border-amber-100 text-amber-800";
    iconClass = "text-amber-500";
  }

  return (
    <div className={cn("p-4 rounded-2xl border flex items-center justify-between gap-4", bgClass)}>
      <div className="flex items-center gap-3">
        <Calendar className={cn("w-5 h-5", iconClass)} />
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest mr-2 opacity-60">Filing Status:</span>
          <span className="text-xs font-black uppercase tracking-tight">GSTR-3B due by {dueDate}</span>
        </div>
      </div>
      <div className="text-[10px] font-black uppercase tracking-widest">
        {isOverdue ? `LATE BY ${Math.abs(daysRemaining)} DAYS` : `${daysRemaining} DAYS REMAINING`}
      </div>
    </div>
  );
}

function GstBreakdownTable({ data }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-bold">
        <thead>
          <tr className="text-slate-400 uppercase tracking-widest border-b border-slate-50">
            <th className="text-left py-4 px-2">Supply Type</th>
            <th className="text-right py-4 px-2">Taxable Value</th>
            <th className="text-right py-4 px-2">IGST</th>
            <th className="text-right py-4 px-2">CGST</th>
            <th className="text-right py-4 px-2">SGST</th>
            <th className="text-right py-4 px-2">Total GST</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 italic">
          <SupplyRow label="Intra-state Sales" data={data.intraState} />
          <SupplyRow label="Inter-state Sales" data={data.interState} />
          <tr className="bg-slate-50/50 font-black not-italic text-slate-800">
            <td className="py-4 px-4 text-xs font-black">TOTAL</td>
            <td className="text-right py-4 px-2">{formatCurrency(data.totals.taxableValue)}</td>
            <td className="text-right py-4 px-2">{formatCurrency(data.totals.igst)}</td>
            <td className="text-right py-4 px-2">{formatCurrency(data.totals.cgst)}</td>
            <td className="text-right py-4 px-2">{formatCurrency(data.totals.sgst)}</td>
            <td className="text-right py-4 px-2 bg-indigo-600 text-white rounded-r-xl">
              {formatCurrency(data.totals.totalGst)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SupplyRow({ label, data }: any) {
  return (
    <tr className="text-slate-600 hover:bg-slate-50/30 transition-colors">
      <td className="py-4 px-2">{label}</td>
      <td className="text-right py-4 px-2">{formatCurrency(data.taxableValue)}</td>
      <td className="text-right py-4 px-2">{formatCurrency(data.igst)}</td>
      <td className="text-right py-4 px-2">{formatCurrency(data.cgst)}</td>
      <td className="text-right py-4 px-2">{formatCurrency(data.sgst)}</td>
      <td className="text-right py-4 px-2 font-black text-slate-800">{formatCurrency(data.totalGst)}</td>
    </tr>
  );
}

function ItcSection({ data }: any) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ITC Breakdown (Purchases)</p>
      <div className="grid grid-cols-3 gap-2">
        <SmallBox label="CGST" value={data.cgst} />
        <SmallBox label="SGST" value={data.sgst} />
        <SmallBox label="IGST" value={data.igst} />
      </div>
      <div className="p-4 bg-amber-50 rounded-2xl flex justify-between items-center border border-amber-100">
        <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Total ITC</span>
        <span className="text-sm font-black text-amber-600">{formatCurrency(data.total)}</span>
      </div>
    </div>
  );
}

function ReturnsSection({ data }: any) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Returns (Credit Notes)</p>
      <div className="grid grid-cols-3 gap-2">
        <SmallBox label="CGST" value={data.cgst} />
        <SmallBox label="SGST" value={data.sgst} />
        <SmallBox label="IGST" value={data.igst} />
      </div>
      <div className="p-4 bg-rose-50 rounded-2xl flex justify-between items-center border border-rose-100">
        <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Total Returns</span>
        <span className="text-sm font-black text-rose-600">{formatCurrency(data.total)}</span>
      </div>
    </div>
  );
}

function SmallBox({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs font-black text-slate-800">{formatCurrency(value)}</p>
    </div>
  );
}

function NetPayableBox({ data, dueDate, daysRemaining }: any) {
  return (
    <div className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 italic">Calculated Net Liability</p>
      <h3 className="text-xl font-black tracking-tight mb-8">Net GST Payable</h3>
      
      <div className="space-y-4 mb-10">
        <NetRow label="CGST Payable" value={data.cgst} />
        <NetRow label="SGST Payable" value={data.sgst} />
        <NetRow label="IGST Payable" value={data.igst} />
        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
          <span className="text-xs font-black tracking-tight">TOTAL</span>
          <span className="text-3xl font-black tracking-tighter">{formatCurrency(data.total)}</span>
        </div>
      </div>

      <div className="p-4 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-white/10">
        Due by {dueDate} ({daysRemaining} days)
      </div>

      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
    </div>
  );
}

function NetRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center text-[11px] font-bold">
      <span className="opacity-60">{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
