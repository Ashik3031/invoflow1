import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { 
  ShieldAlert, Users, Server, Lock, Unlock, Search, PlusCircle, 
  RefreshCw, Building2, BarChart3, Receipt, Package, UserCheck, AlertTriangle,
  Edit2, X, Plus, Key, CheckSquare, Globe
} from 'lucide-react';

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalBills: number;
  totalProducts: number;
}

interface TenantMetadata {
  id: string;
  shopName: string;
  slug: string;
  ownerId: string;
  gstin?: string;
  state?: string;
  status: 'active' | 'suspended';
  membersCount: number;
  productsCount: number;
  billsCount: number;
  ownerName: string;
  ownerEmail: string;
}

export default function SuperAdminPanel() {
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [tenants, setTenants] = useState<TenantMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Create Shop Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newState, setNewState] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Shop Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantMetadata | null>(null);
  const [editShopName, setEditShopName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editOwnerPassword, setEditOwnerPassword] = useState(''); // Empty means unchanged
  const [editGstin, setEditGstin] = useState('');
  const [editState, setEditState] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Super Admin creation form state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Active status toggle operations map
  const [updatingIds, setUpdatingIds] = useState<{ [id: string]: boolean }>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/tenants')
      ]);

      setStats(statsRes.data);
      setTenants(tenantsRes.data);
    } catch (err: any) {
      console.error('Error fetching superadmin data:', err);
      setError(err.response?.data?.message || 'Failed to authorize or fetch system records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (tenantId: string, currentStatus: 'active' | 'suspended') => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const msg = currentStatus === 'active' 
      ? `Are you sure you want to SUSPEND access for this shop? This will immediately lock all billing, POS, and accounting operations for this business.`
      : `Are you sure you want to ACTIVATE access for this shop? This will unlock full cloud ledger operations.`;

    if (!confirm(msg)) return;

    setUpdatingIds(prev => ({ ...prev, [tenantId]: true }));
    try {
      await api.put(`/superadmin/tenants/${tenantId}/status`, { status: nextStatus });
      
      // Update local state
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: nextStatus } : t));
      
      // Update aggregates locally
      if (stats) {
        setStats({
          ...stats,
          activeTenants: stats.activeTenants + (nextStatus === 'active' ? 1 : -1),
          suspendedTenants: stats.suspendedTenants + (nextStatus === 'suspended' ? 1 : -1)
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to modify tenant access status.');
    } finally {
      setUpdatingIds(prev => ({ ...prev, [tenantId]: false }));
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError(null);

    try {
      await api.post('/superadmin/tenants', {
        shopName: newShopName,
        slug: newSlug || undefined,
        ownerName: newOwnerName,
        ownerEmail: newOwnerEmail,
        ownerPassword: newOwnerPassword,
        gstin: newGstin || undefined,
        state: newState || undefined
      });

      // Reset and close
      setNewShopName('');
      setNewSlug('');
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewOwnerPassword('');
      setNewGstin('');
      setNewState('');
      setIsCreateModalOpen(false);

      // Refresh data
      await fetchData();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create shop. Please check email uniqueness.');
    } finally {
      setCreateSaving(false);
    }
  };

  const openEditModal = (tenant: TenantMetadata) => {
    setSelectedTenant(tenant);
    setEditShopName(tenant.shopName);
    setEditOwnerName(tenant.ownerName);
    setEditOwnerEmail(tenant.ownerEmail);
    setEditOwnerPassword(''); // empty by default
    setEditGstin(tenant.gstin || '');
    setEditState(tenant.state || '');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setEditSaving(true);
    setEditError(null);

    try {
      await api.put(`/superadmin/tenants/${selectedTenant.id}`, {
        shopName: editShopName,
        ownerName: editOwnerName,
        ownerEmail: editOwnerEmail,
        ownerPassword: editOwnerPassword || undefined,
        gstin: editGstin || undefined,
        state: editState || undefined
      });

      // Clear, Close and Refresh
      setIsEditModalOpen(false);
      setSelectedTenant(null);
      await fetchData();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update shop. Inspect email parameter.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSaving(true);
    setAdminSuccess(null);
    setAdminError(null);

    try {
      const { data } = await api.post('/superadmin/create-superadmin', {
        name: adminName,
        email: adminEmail,
        password: adminPassword
      });

      setAdminSuccess(data.message || 'Super administrator created successfully.');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      fetchData(); // reload statistics
    } catch (err: any) {
      setAdminError(err.response?.data?.message || 'Failed to create secondary super admin.');
    } finally {
      setAdminSaving(false);
    }
  };

  // Search logic
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || 
      t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-display tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            <span>Super Admin Headquarters</span>
          </h1>
          <p className="text-slate-500 mt-1">
            Global monitoring cockpit. Provision client shops, tweak ownership rules, reset login configurations, and lock/unlock ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition text-sm font-bold shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Shop</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition text-sm font-semibold shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh Cockpit</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-3xl flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Access Violation</h4>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Tenants</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold text-slate-800 font-display">{stats.totalTenants}</p>
              <Building2 className="w-5 h-5 text-indigo-205" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Active Shops</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold text-emerald-600 font-display">{stats.activeTenants}</p>
              <UserCheck className="w-5 h-5 text-emerald-100" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-red-505 tracking-wider">Suspended Shops</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold text-red-600 font-display">{stats.suspendedTenants}</p>
              <Lock className="w-5 h-5 text-red-100" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Global Users</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold text-slate-800 font-display">{stats.totalUsers}</p>
              <Users className="w-5 h-5 text-indigo-150" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bills Logged</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold text-slate-800 font-display">{stats.totalBills}</p>
              <Receipt className="w-5 h-5 text-indigo-150" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Inventory Items</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold text-slate-800 font-display">{stats.totalProducts}</p>
              <Package className="w-5 h-5 text-indigo-150" />
            </div>
          </div>
        </div>
      )}

      {/* Main split work area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Tenant grid (Left, spans 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            
            {/* Table toolbar */}
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-800 font-display self-start">Registered Tenant Companies</h3>
              
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tenant or owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-56 pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs font-semibold"
                  />
                </div>

                {/* Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-105 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs font-semibold"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>
            </div>

            {/* List Table */}
            {loading ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <h4 className="text-slate-600 font-bold">No tenants found</h4>
                <p className="text-xs text-slate-450 mt-1">No business matching your filter criteria are logged in the database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                      <th className="p-6">Business Details</th>
                      <th className="p-6">Primary Owner</th>
                      <th className="p-6">Activity metrics</th>
                      <th className="p-6">Current Access</th>
                      <th className="p-6 text-center">Action Handlers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/20 transition">
                        {/* Business details */}
                        <td className="p-6">
                          <p className="font-bold text-slate-800 font-display text-base">{t.shopName}</p>
                          <code className="text-[10px] text-slate-400 block mt-0.5 select-all">slug: {t.slug}</code>
                          {t.gstin && <span className="text-[10px] text-slate-500 block mt-0.5">GSTIN: {t.gstin}</span>}
                          {t.state && <span className="text-[10px] text-slate-500 block mt-0.5">State: {t.state}</span>}
                        </td>

                        {/* Owner details */}
                        <td className="p-6">
                          <p className="font-semibold text-slate-700">{t.ownerName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{t.ownerEmail}</p>
                        </td>

                        {/* Activity logs */}
                        <td className="p-6 text-xs text-slate-600 space-y-1">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="text-slate-400">👥</span>
                            <span>{t.membersCount} staff members</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="text-slate-400">📦</span>
                            <span>{t.productsCount} products registered</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="text-slate-400">🧾</span>
                            <span>{t.billsCount} GST sales bills</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-6">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            t.status === 'suspended'
                              ? 'bg-rose-50 border border-rose-100 text-rose-600'
                              : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'suspended' ? 'bg-rose-550' : 'bg-emerald-550'}`} />
                            <span>{t.status || 'active'}</span>
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="p-6">
                          <div className="flex flex-col gap-2 items-center justify-center">
                            {/* Edit Shop Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(t)}
                              className="w-36 py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50/80 bg-white text-slate-750 transition font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-505" />
                              <span>Edit Configuration</span>
                            </button>

                            {/* Suspension toggle button */}
                            <button
                              type="button"
                              disabled={updatingIds[t.id]}
                              onClick={() => handleToggleStatus(t.id, t.status || 'active')}
                              className={`w-36 py-1.5 px-3 rounded-xl transition font-bold text-xs flex items-center justify-center gap-1.5 border shadow-sm ${
                                t.status === 'suspended'
                                  ? 'bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50/50 hover:bg-rose-100/50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {updatingIds[t.id] ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : t.status === 'suspended' ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Un-Suspend Shop</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Suspend Shop</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Administration Config Panel (Right, spans 1 column) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-650" />
                <span>Add Super Administrator</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Promote additional engineers or co-owners to the Super Admin crew with unrestricted access.
              </p>
            </div>

            {adminSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold">
                ✅ {adminSuccess}
              </div>
            )}

            {adminError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold">
                ❌ {adminError}
              </div>
            )}

            <form onSubmit={handleCreateSuperAdmin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ashik Co-Admin"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Login Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@gmail.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Login Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={adminSaving}
                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {adminSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                <span>Establish Super Account</span>
              </button>
            </form>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-3xl p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-amber-800">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <h4 className="font-bold text-sm">Super Admin Notice</h4>
            </div>
            <p className="text-xs text-amber-900 leading-normal">
              Suspending a client's business ledger prevents any staff or tenant administrator from fetching inventory, recording purchase logs, issuing invoices, or logging in entirely.
            </p>
            <div className="bg-amber-150/50 p-3 rounded-xl">
              <p className="text-[11px] text-amber-850 font-black tracking-wider uppercase">Default Access Credentials:</p>
              <p className="text-xs text-slate-705 mt-1 font-mono">
                Email: <b>superadmin@gmail.com</b><br />
                Password: <b>superadmin123</b>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* CREATE NEW SHOP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-600">
                <Building2 className="w-6 h-6" />
                <h3 className="text-xl font-bold font-display text-slate-800">Establish New Client Shop</h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="p-6 space-y-5">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Shop / Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Hypermarket"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    URL Slug <span className="text-slate-350 italic font-medium">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="apex-hypermarket"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-50 pt-3">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-3">Owner / Primary Admin User</p>
                
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ashik Chowdhury"
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Primary Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="owner@gmail.com"
                        value={newOwnerEmail}
                        onChange={(e) => setNewOwnerEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Admin Login Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Must be 6+ characters"
                        value={newOwnerPassword}
                        onChange={(e) => setNewOwnerPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-50 pt-3">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-2">Shop Regional & Compliance (Optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">State Code / Region</label>
                    <input
                      type="text"
                      placeholder="e.g. West Bengal"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 19AAAAA1111A1Z1"
                      value={newGstin}
                      onChange={(e) => setNewGstin(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-620 hover:bg-indigo-700 bg-indigo-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  {createSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckSquare className="w-3.5 h-3.5" />
                  )}
                  <span>Create Shop Database</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXISTENT SHOP MODAL */}
      {isEditModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-600">
                <Edit2 className="w-5 h-5 animate-pulse" />
                <h3 className="text-xl font-bold font-display text-slate-800">Edit Shop & Owner Settings</h3>
              </div>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedTenant(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditShop} className="p-6 space-y-5">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Shop / Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Apex Luxury Store"
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="19AAAAA1111A1Z1"
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-bold">State / Region</label>
                  <input
                    type="text"
                    placeholder="West Bengal"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex items-center gap-1.5 text-indigo-550 text-xs font-black uppercase tracking-wider">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admin Credentials / Password Reset</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Primary Owner Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Name"
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Administrator Email</label>
                    <input
                      type="email"
                      required
                      placeholder="email@gmail.com"
                      value={editOwnerEmail}
                      onChange={(e) => setEditOwnerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Change Login Password <span className="text-slate-400 font-medium italic">(Blank to keep current)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Type new secure password"
                      value={editOwnerPassword}
                      onChange={(e) => setEditOwnerPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedTenant(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-505 text-slate-500 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-620 hover:bg-indigo-700 bg-indigo-650 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  {editSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckSquare className="w-3.5 h-3.5" />
                  )}
                  <span>Save Updated Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
