import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, Package, Users, BarChart3, Gift, ShoppingCart, 
  Truck, Wallet, LogOut, Store, FileText, CornerUpLeft, IndianRupee, 
  Landmark, Activity, FilePieChart, Settings, Monitor, Search, Bell, Menu
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, tenant } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Main Navigation',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/pos', icon: Monitor, label: 'POS Terminal' },
      ]
    },
    {
      title: 'Sales & Billing',
      items: [
        { to: '/billing', icon: Receipt, label: 'New Bill' },
        { to: '/estimates', icon: FileText, label: 'Estimates' },
        { to: '/challans', icon: Truck, label: 'Challans' },
        { to: '/credit-notes', icon: CornerUpLeft, label: 'Returns' },
      ]
    },
    {
      title: 'Finance',
      items: [
        { to: '/outstanding', icon: Activity, label: 'Outstanding' },
        { to: '/cash', icon: IndianRupee, label: 'Cash Book' },
        { to: '/banks', icon: Landmark, label: 'Banks' },
        { to: '/expenses', icon: Wallet, label: 'Expenses' },
      ]
    },
    {
      title: 'Operations',
      items: [
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/purchases', icon: ShoppingCart, label: 'Purchases' },
        { to: '/suppliers', icon: Truck, label: 'Suppliers' },
      ]
    },
    {
      title: 'Growth & Analytics',
      items: [
        { to: '/gst', icon: FileText, label: 'GST Summary' },
        { to: '/marketing', icon: Gift, label: 'Marketing' },
        { to: '/reports', icon: FilePieChart, label: 'Reports' },
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      ]
    },
    {
      title: 'Settings',
      items: [
        { to: '/customers', icon: Users, label: 'Customers' },
        { to: '/settings', icon: Settings, label: 'Global Settings' },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E2E8F0] flex flex-col hidden lg:flex">
        <div className="h-20 flex items-center gap-3 px-8 border-b border-[#F1F5F9]">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-800 leading-tight">Billing Lite</h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              <h2 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">{group.title}</h2>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-semibold",
                        isActive 
                          ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[#F1F5F9]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-sm font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden p-2 text-slate-500">
               <Menu className="w-6 h-6" />
            </button>
            <div className="relative max-w-md w-full hidden md:block">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                  type="text" 
                  placeholder="Search transactions, customers..." 
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
               />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-10 w-px bg-[#E2E8F0] mx-2 hidden sm:block"></div>
            
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-none">{user?.name}</p>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 opacity-70">{tenant?.shopName || 'Admin'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-100 ring-2 ring-indigo-50">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <div className="max-w-7xl mx-auto p-8 w-full">
              {children}
           </div>
        </div>
      </main>
    </div>
  );
}
