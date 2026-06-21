import React, { useEffect, useState } from 'react';
import { useStaffStore } from '../../store/useStaffStore';
import { Staff, Advance } from '../../types/staff.types';
import { 
  Plus, Users, Search, Phone, Briefcase, Calendar, CreditCard, Banknote, 
  RefreshCw, TrendingUp, ChevronRight, User, X, Check, Clock, AlertCircle, Edit2, Trash2
} from 'lucide-react';

export default function StaffDirectoryPage() {
  const { staffList, loading, fetchStaff, createStaff, updateStaff, deleteStaff, giveAdvance, fetchAdvances } = useStaffStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  // Form States - Create/Edit Staff
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'General Staff',
    salaryType: 'monthly' as 'monthly' | 'daily',
    monthlySalary: 0,
    dailyWage: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    bankDetails: {
      accountNumber: '',
      ifsc: '',
      upiId: ''
    }
  });

  // Form States - Advance Payment
  const [advanceForm, setAdvanceForm] = useState({
    staffId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Ledger and calendar history for the profile view
  const [staffLedger, setStaffLedger] = useState<Advance[]>([]);
  const [staffOutstanding, setStaffOutstanding] = useState(0);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);

  // Stats calculation
  const totalStaff = staffList.length;
  const activeStaffCount = staffList.filter(s => s.status === 'active').length;
  const totalMonthlyPayrollEst = staffList
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.salaryType === 'monthly' ? s.monthlySalary : s.dailyWage * 26), 0);

  // Filter staff
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      staff.phone.includes(searchTerm) || 
      staff.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || staff.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle open modal for create
  const handleOpenCreateModal = () => {
    setEditingStaffId(null);
    setFormData({
      name: '',
      phone: '',
      role: 'General Staff',
      salaryType: 'monthly',
      monthlySalary: 0,
      dailyWage: 0,
      joiningDate: new Date().toISOString().split('T')[0],
      bankDetails: {
        accountNumber: '',
        ifsc: '',
        upiId: ''
      }
    });
    setIsCreateModalOpen(true);
  };

  // Handle edit click
  const handleEditClick = (staff: Staff, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStaffId(staff._id);
    setFormData({
      name: staff.name,
      phone: staff.phone,
      role: staff.role || 'General Staff',
      salaryType: staff.salaryType,
      monthlySalary: staff.monthlySalary || 0,
      dailyWage: staff.dailyWage || 0,
      joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      bankDetails: {
        accountNumber: staff.bankDetails?.accountNumber || '',
        ifsc: staff.bankDetails?.ifsc || '',
        upiId: staff.bankDetails?.upiId || ''
      }
    });
    setIsCreateModalOpen(true);
  };

  // Handle delete staff
  const handleDeleteClick = async (staffId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to deactivate this staff member?')) {
      await deleteStaff(staffId);
    }
  };

  // Submit Staff Form (Create or Edit)
  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaffId) {
        await updateStaff(editingStaffId, formData);
      } else {
        await createStaff(formData);
      }
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Open Advance Modal
  const handleOpenAdvanceModal = (staffId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdvanceForm({
      staffId,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    setIsAdvanceModalOpen(true);
  };

  // Submit Advance Form
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceForm.amount || Number(advanceForm.amount) <= 0) {
      alert('Please enter a valid advance amount');
      return;
    }
    try {
      await giveAdvance({
        staffId: advanceForm.staffId,
        amount: Number(advanceForm.amount),
        date: advanceForm.date,
        note: advanceForm.note
      });
      setIsAdvanceModalOpen(false);
      alert('Cash advance recorded and posted to Cash Book successfully!');
      // Update drawer if opened
      if (selectedStaff && selectedStaff._id === advanceForm.staffId) {
        loadStaffProfileDetails(selectedStaff);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // View Staff Profile Drawer
  const handleViewProfile = async (staff: Staff) => {
    setSelectedStaff(staff);
    await loadStaffProfileDetails(staff);
    setIsProfileDrawerOpen(true);
  };

  const loadStaffProfileDetails = async (staff: Staff) => {
    const advances = await fetchAdvances(staff._id);
    setStaffLedger(advances);
    const unsettled = advances.filter((a: any) => !a.deductedInPayrollRun);
    setStaffOutstanding(unsettled.reduce((sum, a) => sum + a.amount, 0));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Upper Title and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display tracking-tight">Staff Directory</h1>
          <p className="text-slate-500 mt-1">Manage shop team profiles, track cash advances, and register ledger details.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Staff Registered</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalStaff}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Shop Staff</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{activeStaffCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Est. Monthly Payout</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">₹{totalMonthlyPayrollEst.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or role..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Status Toggle Buttons */}
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition ${statusFilter === 'active' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition ${statusFilter === 'inactive' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Inactive
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition ${statusFilter === 'all' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            All Staff
          </button>
        </div>
      </div>

      {/* Staff Grid/List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white text-center p-12 rounded-3xl border border-slate-100 shadow-sm">
          <Users className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No staff members found</h3>
          <p className="text-slate-400 mt-1">Try refining your search terms or add a new team member to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((staff) => (
            <div
              key={staff._id}
              onClick={() => handleViewProfile(staff)}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Upper row header */}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {staff.name.charAt(0)}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${staff.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-150 text-slate-500'}`}>
                    {staff.status}
                  </span>
                </div>

                {/* Profile info */}
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition tracking-tight">{staff.name}</h3>
                  <p className="text-slate-400 text-xs font-semibold gap-1.5 flex items-center mt-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{staff.role}</span>
                  </p>
                  <p className="text-slate-400 text-xs font-semibold gap-1.5 flex items-center mt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{staff.phone}</span>
                  </p>
                </div>

                {/* Compensation details */}
                <div className="mt-5 pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Salary Type</p>
                    <p className="text-sm font-bold text-slate-700 capitalize mt-0.5">{staff.salaryType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Base Salary</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">
                      ₹{staff.salaryType === 'monthly' ? staff.monthlySalary.toLocaleString('en-IN') : `${staff.dailyWage}/day`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => handleOpenAdvanceModal(staff._id, e)}
                  disabled={staff.status === 'inactive'}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-150 hover:bg-slate-50 transition text-xs font-bold text-slate-600 disabled:opacity-50"
                >
                  <Banknote className="w-3.5 h-3.5 text-slate-400" />
                  <span>Give Advance</span>
                </button>

                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => handleEditClick(staff, e)}
                    className="p-2.5 rounded-xl border border-slate-150 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {staff.status === 'active' && (
                    <button
                      onClick={(e) => handleDeleteClick(staff._id, e)}
                      className="p-2.5 rounded-xl border border-slate-150 hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODEL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 font-display">
                {editingStaffId ? 'Edit Staff Profile' : 'Add New Staff Member'}
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-50 transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStaffFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              {/* Role & Joining Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Role / Designation</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                    placeholder="e.g. Sales Executive, Cashier"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Salary Structure selection */}
              <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-xs font-bold text-slate-600 block">Payout Frequency</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="salaryType"
                      checked={formData.salaryType === 'monthly'}
                      onChange={() => setFormData({ ...formData, salaryType: 'monthly' })}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Monthly Fixed Salary</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="salaryType"
                      checked={formData.salaryType === 'daily'}
                      onChange={() => setFormData({ ...formData, salaryType: 'daily' })}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Daily Wages</span>
                  </label>
                </div>

                <div className="mt-4">
                  {formData.salaryType === 'monthly' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Monthly Compensation (INR)</label>
                      <input
                        type="number"
                        value={formData.monthlySalary || ''}
                        onChange={(e) => setFormData({ ...formData, monthlySalary: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                        placeholder="e.g. 15000"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Daily Labor Rate (INR/day)</label>
                      <input
                        type="number"
                        value={formData.dailyWage || ''}
                        onChange={(e) => setFormData({ ...formData, dailyWage: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                        placeholder="e.g. 500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Details section */}
              <div className="space-y-3.5 pt-2">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Settlement Bank Details</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Account Number</label>
                    <input
                      type="text"
                      placeholder="Enter Bank Account No"
                      value={formData.bankDetails?.accountNumber || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Bank IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={formData.bankDetails?.ifsc || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, ifsc: e.target.value.toUpperCase() }
                      })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">UPI Address ID</label>
                  <input
                    type="text"
                    placeholder="e.g. name@upi"
                    value={formData.bankDetails?.upiId || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, upiId: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-500 font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow font-semibold text-sm hover:bg-indigo-700 transition"
                >
                  {editingStaffId ? 'Update Settings' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD ADVANCE MODAL */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
                <Banknote className="w-5 h-5 text-indigo-600" />
                <span>Give Salary Advance</span>
              </h2>
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-50 transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-50 flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800 font-display">
                    {staffList.find(s => s._id === advanceForm.staffId)?.name}
                  </h4>
                  <p className="text-xs text-slate-500">{staffList.find(s => s._id === advanceForm.staffId)?.role}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Advance Amount (INR) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  placeholder="₹ Enter amount to pay"
                  className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Payment Date</label>
                <input
                  type="date"
                  value={advanceForm.date}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Optional Ledger Notes</label>
                <textarea
                  placeholder="e.g. Personal emergency, medical expense"
                  value={advanceForm.note}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, note: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-500 font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow font-semibold text-sm hover:bg-indigo-700 transition"
                >
                  Pay & Post Cashbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL PROFILE SLIDE-OVER DRAWER */}
      {isProfileDrawerOpen && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl relative flex flex-col border-l border-slate-100 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-xl font-display">
                  {selectedStaff.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 font-display leading-tight">{selectedStaff.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedStaff.role} • {selectedStaff.status}</p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileDrawerOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Core summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Comp Structure</p>
                  <p className="text-base font-bold text-slate-800 mt-1 capitalize">
                    {selectedStaff.salaryType === 'monthly' ? `₹${selectedStaff.monthlySalary.toLocaleString('en-IN')}/mo` : `₹${selectedStaff.dailyWage}/day`}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-50">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Outstanding Advance</p>
                  <p className="text-base font-bold text-indigo-600 mt-1">₹{staffOutstanding.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Profile details details */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Contact & Employment Information</h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-semibold">Phone Contact:</span>
                    <span>{selectedStaff.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Joining Date:</span>
                    <span>{new Date(selectedStaff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Bank Account:</span>
                    <span>{selectedStaff.bankDetails?.accountNumber || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Bank IFSC Code:</span>
                    <span>{selectedStaff.bankDetails?.ifsc || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">UPI ID Wallet:</span>
                    <span className="text-indigo-600 font-bold">{selectedStaff.bankDetails?.upiId || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Advance logs Ledger */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Advance Payments Ledger</h4>
                  <button
                    onClick={(e) => {
                      setIsProfileDrawerOpen(false);
                      handleOpenAdvanceModal(selectedStaff._id, e);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + Register Outflow
                  </button>
                </div>

                {staffLedger.length === 0 ? (
                  <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-xs">No recorded advances for this employee.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-50 text-sm">
                    {staffLedger.map((adv) => (
                      <div key={adv._id} className="p-4 bg-white flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-700">₹{adv.amount.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(adv.date).toLocaleDateString('en-IN')} {adv.note ? `• ${adv.note}` : ''}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${adv.deductedInPayrollRun ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600'}`}>
                          {adv.deductedInPayrollRun ? 'Deducted/Settled' : 'outstanding'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
