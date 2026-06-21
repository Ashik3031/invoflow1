import React, { useEffect, useState } from 'react';
import { usePayrollStore } from '../../store/usePayrollStore';
import { PayrollRun, PayrollPreview } from '../../types/staff.types';
import { 
  Calendar, CheckCircle, Clock, Banknote, RefreshCw, Send, 
  HelpCircle, AlertTriangle, Eye, ArrowRight, Check, CheckSquare, 
  DollarSign, ChevronRight, Bookmark, ArrowLeft, X
} from 'lucide-react';

export default function StaffPayrollPage() {
  const { 
    history, currentRun, activePreview, loading, error,
    fetchHistory, fetchPayrollRun, calculatePreview, finalizePayroll, 
    markPaid, sendWhatsAppSlip, sendAllWhatsAppSlips 
  } = usePayrollStore();

  const [activeTab, setActiveTab] = useState<'history' | 'new_run' | 'details'>('history');

  // New run input states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Payment popup/form states
  const [payingStaffId, setPayingStaffId] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<'cash' | 'bank_transfer' | 'upi'>('cash');

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleCalculatePreview = async () => {
    try {
      await calculatePreview(selectedMonth, selectedYear);
      setActiveTab('new_run');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize payroll for this month? This will deduction-settle all active advances and establish salary ledger records.')) {
      return;
    }
    try {
      const run = await finalizePayroll(selectedMonth, selectedYear);
      setPayingStaffId(null);
      // View newly created run details directly
      await fetchPayrollRun(run._id);
      setActiveTab('details');
      alert('Payroll finalized successfully! Salaries marked as pending. You can now pay them individually.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to finalize payroll run');
    }
  };

  const handleViewDetails = async (runId: string) => {
    try {
      await fetchPayrollRun(runId);
      setActiveTab('details');
    } catch (err) {
      console.error(err);
    }
  };

  const openMarkPaidDialog = (staffId: string) => {
    setPayingStaffId(staffId);
    setPayMode('cash');
  };

  const handleMarkAsPaidSubmit = async () => {
    if (!currentRun || !payingStaffId) return;
    try {
      await markPaid(currentRun._id, payingStaffId, payMode);
      setPayingStaffId(null);
      alert('Payment recorded. Outstanding amount deducted and posted automatically to global Cash Book!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleSendSlip = async (staffId: string) => {
    if (!currentRun) return;
    try {
      const response = await sendWhatsAppSlip(currentRun._id, staffId);
      window.open(response.whatsappLink, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendAllSlips = async () => {
    if (!currentRun) return;
    if (!confirm('This will update all employees slip dispatch states and generate WhatsApp links. Proceed?')) {
      return;
    }
    try {
      const response = await sendAllWhatsAppSlips(currentRun._id);
      if (response && response.links && response.links.length > 0) {
        alert(`Dispatched successfully! Opening first link on WhatsApp. Total loops: ${response.links.length}.`);
        window.open(response.links[0].whatsappLink, '_blank');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display tracking-tight">Staff Payroll Engine</h1>
          <p className="text-slate-500 mt-1">Run monthly payroll operations, track advances, and dispatch WhatsApp salary slips.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl md:self-end">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'history' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Run Logs History
          </button>
          <button
            onClick={() => {
              calculatePreview(selectedMonth, selectedYear)
                .then(() => setActiveTab('new_run'))
                .catch(() => setActiveTab('new_run'));
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'new_run' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Calculate New Run
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* ---------------------------------------------------------------------
         VIEW: HISTORY LIST
         --------------------------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {history.length === 0 ? (
            <div className="bg-white text-center p-12 rounded-3xl border border-slate-100 shadow-sm">
              <Calendar className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No past payroll runs found</h3>
              <p className="text-slate-400 mt-1">Tap a "Calculate New Run" to start generating salary ledgers for active employees.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 font-display">Historical Payroll Runs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                      <th className="p-6">Payroll Month</th>
                      <th className="p-6">Calculation Date</th>
                      <th className="p-6">Staff Count</th>
                      <th className="p-6">Gross Payout Paid/Owed</th>
                      <th className="p-6">Status State</th>
                      <th className="p-6 text-center">Receipt Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((run) => (
                      <tr key={run._id} className="hover:bg-slate-50/50 transition">
                        <td className="p-6 font-bold text-slate-800 font-display text-base">
                          {monthNames[run.month - 1]} {run.year}
                        </td>
                        <td className="p-6 text-slate-500">
                          {new Date(run.runDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-6 text-slate-600 font-semibold">
                          {run.entries.length} staff
                        </td>
                        <td className="p-6 font-bold text-slate-700">
                          ₹{run.totalPayout.toLocaleString('en-IN')}
                        </td>
                        <td className="p-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            run.status === 'finalized'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="p-6 text-center">
                          <button
                            onClick={() => handleViewDetails(run._id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-150 transition text-xs font-bold text-slate-600"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ledger Logs</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------
         VIEW: NEW RUN WIZARD (DRAFT PREVIEW)
         --------------------------------------------------------------------- */}
      {activeTab === 'new_run' && (
        <div className="space-y-6">
          {/* Calendar Select Row */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              {/* Month Dropdown */}
              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Target Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full md:w-44 px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-sm focus:outline-none"
                >
                  {monthNames.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown */}
              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Target Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full md:w-32 px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-sm focus:outline-none"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleCalculatePreview}
              disabled={loading}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl hover:bg-indigo-700 text-white font-semibold text-sm transition self-end"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              <span>Calculate Draft Preview</span>
            </button>
          </div>

          {activePreview && (
            <div className="space-y-6">
              {/* Warnings Panel */}
              {activePreview.attendanceWarnings && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-800">Attendance Gaps Warning</h4>
                    <p className="text-xs text-amber-700 leading-normal mt-1">{activePreview.attendanceWarnings}</p>
                  </div>
                </div>
              )}

              {/* Calculation Preview Matrix */}
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 font-display">
                    Payroll Calculation Summary — {activePreview.monthLabel}
                  </h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Gross Payout</p>
                    <p className="text-xl font-bold text-indigo-600">₹{activePreview.totalPayout.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                        <th className="p-6">Employee Details</th>
                        <th className="p-6">Attendance (P / A / H / L)</th>
                        <th className="p-6">Payable Days</th>
                        <th className="p-6">Earned Gross</th>
                        <th className="p-6">Deductions (Advances)</th>
                        <th className="p-6">Net Payable</th>
                        <th className="p-6">Alerts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activePreview.entries.map((entry) => (
                        <tr key={entry.staffId} className="hover:bg-slate-50/50 transition">
                          {/* Name & role */}
                          <td className="p-6">
                            <p className="font-bold text-slate-800 font-display">{entry.staffName}</p>
                            <span className="text-xs text-slate-400 font-semibold">{entry.role || 'General'} • {entry.salaryType}</span>
                          </td>

                          {/* Attendance splits */}
                          <td className="p-6 text-xs text-slate-600">
                            <span className="text-emerald-600 font-bold">{entry.presentDays}P</span> /{' '}
                            <span className="text-red-600 font-bold">{entry.absentDays}A</span> /{' '}
                            <span className="text-amber-600 font-bold">{entry.halfDays}H</span> /{' '}
                            <span className="text-indigo-600 font-bold">{entry.paidLeaveDays}L</span>
                          </td>

                          {/* Payable days */}
                          <td className="p-6 font-semibold text-slate-700">
                            {entry.payableDays} / {activePreview.totalDaysInMonth} days
                          </td>

                          {/* Gross Earned */}
                          <td className="p-6 font-semibold text-slate-700">
                            ₹{entry.grossSalary.toLocaleString('en-IN')}
                            <p className="text-[10px] text-slate-400 mt-0.5">Base: ₹{entry.baseSalary}</p>
                          </td>

                          {/* Advances */}
                          <td className="p-6 text-red-600 font-bold">
                            {entry.advanceDeducted > 0 ? `-₹${entry.advanceDeducted.toLocaleString('en-IN')}` : '—'}
                          </td>

                          {/* Net Payable */}
                          <td className="p-6 font-black text-slate-800 text-base">
                            ₹{entry.netSalary.toLocaleString('en-IN')}
                          </td>

                          {/* Warns */}
                          <td className="p-6 text-xs text-slate-500">
                            {entry.warning ? (
                              <span className="text-amber-600 font-semibold gap-1.5 flex items-center">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <span>Gap assumption active</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-semibold gap-1.5 flex items-center">
                                <Check className="w-5 h-5 text-emerald-500" />
                                <span>Active & Verified</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Confirm footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={handleFinalize}
                    disabled={loading}
                    className="flex items-center gap-2 py-3 px-6 bg-indigo-600 rounded-2xl hover:bg-indigo-700 text-white font-semibold text-sm shadow transition"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Finalize & Generate Salary Records</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------
         VIEW: PAYROLL RUN DETAILS (DISBURSEMENT PANEL)
         --------------------------------------------------------------------- */}
      {activeTab === 'details' && currentRun && (
        <div className="space-y-6">
          {/* Upper back title row */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchHistory();
                setActiveTab('history');
              }}
              className="p-2 border border-slate-150 bg-white rounded-xl hover:bg-slate-50 transition text-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-2xl font-bold font-display text-slate-800">
                Disbursement Dashboard — {monthNames[currentRun.month - 1]} {currentRun.year}
              </h3>
              <p className="text-slate-500 text-xs">Finalized on {new Date(currentRun.runDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Quick numbers totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2x flex items-center justify-center rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Run Expense</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">₹{currentRun.totalPayout.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2x flex items-center justify-center rounded-2xl">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Paid Payout State</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">
                  ₹{currentRun.entries.filter(e => e.paymentStatus === 'paid').reduce((sum, e) => sum + e.netSalary, 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2x flex items-center justify-center rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pending Owed Amount</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">
                  ₹{currentRun.entries.filter(e => e.paymentStatus === 'pending').reduce((sum, e) => sum + e.netSalary, 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Disbursement table list */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-bold text-slate-800 font-display">Individual Salary Disbursal & Receipt Slips</h3>
              <button
                onClick={handleSendAllSlips}
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition text-xs font-bold shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>BroadCast All Slips on WhatsApp</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                    <th className="p-6">Employee</th>
                    <th className="p-6">Working Metrics</th>
                    <th className="p-6">Base vs Gross vs Deducts</th>
                    <th className="p-6">Net Payable</th>
                    <th className="p-6 text-center">Settlement Status</th>
                    <th className="p-6 text-center">Receipt Slips</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentRun.entries.map((entry) => (
                    <tr key={entry.staffId} className="hover:bg-slate-50/50 transition">
                      <td className="p-6">
                        <p className="font-bold text-slate-800 font-display">{entry.staffName}</p>
                        <p className="text-xs text-slate-400 font-semibold">{entry.role || 'Staff'} • {entry.salaryType}</p>
                      </td>

                      <td className="p-6 text-slate-600 text-xs">
                        <p className="font-bold">Payable days: {entry.payableDays}/{entry.totalWorkingDays}</p>
                        <p className="mt-1">P:{entry.presentDays} | A:{entry.absentDays} | H:{entry.halfDays} | L:{entry.paidLeaveDays}</p>
                      </td>

                      <td className="p-6 text-slate-600 text-xs space-y-0.5">
                        <p>Base Salary: ₹{entry.baseSalary}</p>
                        <p>Earned Gross: ₹{entry.grossSalary}</p>
                        <p className="text-red-500">Less Advance: -₹{entry.advanceDeducted}</p>
                      </td>

                      <td className="p-6 font-black text-slate-800 text-base">
                        ₹{entry.netSalary.toLocaleString('en-IN')}
                      </td>

                      <td className="p-6 text-center whitespace-nowrap">
                        {entry.paymentStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 font-bold uppercase rounded-full text-[10px] tracking-wider">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Paid ({entry.paymentMode})</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => openMarkPaidDialog(entry.staffId)}
                            className="inline-flex items-center gap-1 py-1.5 px-4 rounded-xl border border-slate-150 hover:border-indigo-600 text-slate-600 hover:text-indigo-600 bg-white transition text-xs font-bold"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                            <span>Mark Paid</span>
                          </button>
                        )}
                      </td>

                      <td className="p-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleSendSlip(entry.staffId)}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-150 hover:bg-slate-50 transition text-xs font-semibold text-slate-500"
                          >
                            <Send className="w-3 h-3 text-slate-400" />
                            <span>WhatsApp Slip</span>
                          </button>
                          {entry.slipSentAt && (
                            <span className="text-[9px] text-emerald-600 font-bold tracking-wider">
                              Sent {new Date(entry.slipSentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MARK AS PAID POPUP DIALOG */}
      {payingStaffId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 font-display">Salary Disbursements Method</h3>
              <button
                onClick={() => setPayingStaffId(null)}
                className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Outstanding Net Salary</p>
                <p className="text-2xl font-black text-slate-800 font-display">
                  ₹{currentRun?.entries.find(e => e.staffId === payingStaffId)?.netSalary.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Recipient: {currentRun?.entries.find(e => e.staffId === payingStaffId)?.staffName}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">Pick Settlement Mode *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayMode('cash')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition uppercase tracking-wider ${
                      payMode === 'cash'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>💸 Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode('bank_transfer')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition uppercase tracking-wider ${
                      payMode === 'bank_transfer'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>🏦 Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode('upi')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition uppercase tracking-wider ${
                      payMode === 'upi'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>📱 UPI</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setPayingStaffId(null)}
                  className="px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-500 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaidSubmit}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition"
                >
                  Record Disbursement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
