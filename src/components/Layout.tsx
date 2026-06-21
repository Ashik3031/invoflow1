import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, Package, Users, BarChart3, Gift, ShoppingCart, 
  Truck, Wallet, LogOut, Store, FileText, CornerUpLeft, IndianRupee, 
  Landmark, Activity, FilePieChart, Settings, Monitor, Search, Bell, Menu,
  Check, Trash2, AlertTriangle, UserPlus, Info, BellOff, ShoppingBag
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, tenant } = useAuthStore();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, fetchNotifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Setup polling every 8 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.read).length;

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
      title: 'Staff & Payroll',
      items: [
        { to: '/staff', icon: Users, label: 'Staff Directory' },
        { to: '/staff/attendance', icon: Check, label: 'Attendance' },
        { to: '/staff/payroll', icon: IndianRupee, label: 'Payroll' },
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
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                  "relative p-2.5 hover:bg-[#F8FAFC] rounded-xl transition-all cursor-pointer inline-flex items-center justify-center",
                  isOpen ? "bg-[#F1F5F9] text-indigo-600" : "text-slate-400 hover:text-slate-650"
                )}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white px-0.5 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isOpen && (
                <div 
                  className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-[24px] border border-slate-100 shadow-2xl z-50 overflow-hidden"
                  style={{ top: '100%' }}
                >
                  {/* Header */}
                  <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Alerts Feed</span>
                      {unreadCount > 0 && (
                        <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => { markAllAsRead(); }}
                          className="text-[9px] font-black text-indigo-600 hover:text-indigo-850 uppercase tracking-widest bg-indigo-50/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      {safeNotifications.length > 0 && (
                        <button 
                          onClick={() => { clearAll(); }}
                          className="p-1 px-1.5 text-[9px] font-black text-slate-440 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1"
                          title="Clear all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-50">
                    {safeNotifications.length === 0 ? (
                      <div className="py-12 px-6 text-center">
                        <BellOff className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-slate-450 uppercase tracking-wider">No notifications</p>
                        <p className="text-xs text-slate-400 mt-1">Updates on sales, low stocks & expenses will stream here.</p>
                      </div>
                    ) : (
                      safeNotifications.map((n) => {
                        let IconComponent = Info;
                        let iconBg = 'bg-slate-50 text-slate-500';
                        
                        if (n.type === 'sale') {
                          IconComponent = ShoppingBag;
                          iconBg = 'bg-emerald-50 text-emerald-600';
                        } else if (n.type === 'expense') {
                          IconComponent = Wallet;
                          iconBg = 'bg-rose-50 text-rose-600';
                        } else if (n.type === 'purchase') {
                          IconComponent = Truck;
                          iconBg = 'bg-amber-50 text-amber-600';
                        } else if (n.type === 'low_stock') {
                          IconComponent = AlertTriangle;
                          iconBg = 'bg-rose-100 text-rose-700';
                        } else if (n.type === 'customer') {
                          IconComponent = UserPlus;
                          iconBg = 'bg-indigo-50 text-indigo-600';
                        }
                        
                        return (
                          <div 
                            key={n.id} 
                            className={cn(
                              "p-4 flex items-start gap-3 transition-colors hover:bg-slate-50/30 relative",
                              !n.read && "bg-indigo-50/10"
                            )}
                          >
                            {!n.read && (
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                            )}
                            
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm", iconBg)}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0 pr-2 pl-1.5">
                              <p className={cn("text-xs leading-snug text-slate-800", !n.read ? "font-bold" : "font-semibold")}>
                                {n.title}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed break-words">
                                {n.message}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            
                            {!n.read && (
                              <button 
                                onClick={() => markAsRead(n.id)}
                                className="p-1 hover:bg-indigo-100/55 rounded-lg text-indigo-600 hover:text-indigo-750 transition-all shrink-0 cursor-pointer"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            
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
