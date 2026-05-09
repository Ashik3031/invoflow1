import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Package, Users, BarChart3, Gift, LogOut, Store } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/billing', icon: Receipt, label: 'Billing' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/marketing', icon: Gift, label: 'Marketing' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col hidden md:flex">
        <div className="p-8 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Store className="text-white w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block">Xyraco</span>
            <span className="text-[11px] font-bold text-brand uppercase tracking-wider -mt-1 block">Billing Lite</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold",
                  isActive 
                    ? "bg-slate-100 text-brand" 
                    : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-5 h-5", isActive ? "text-brand" : "text-slate-400")} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-semibold text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8">
          <div>
            <h1 className="text-sm font-bold text-slate-400 md:hidden flex items-center gap-2">
              <div className="w-6 h-6 bg-brand rounded flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              Xyraco Lite
            </h1>
            <div className="hidden md:block">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Active Store</p>
              <p className="text-sm font-bold text-slate-800">Balaji General Store</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end hidden sm:flex">
              <p className="text-xs font-bold text-slate-800">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-medium">Tenant ID: {user?.tenantId?.slice(0, 8)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shadow-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden h-20 border-t border-slate-200 bg-white flex items-center justify-around px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1.5 p-3 transition-colors",
                  isActive ? "text-brand" : "text-slate-400"
                )
              }
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}
