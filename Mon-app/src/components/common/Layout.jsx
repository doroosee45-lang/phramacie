import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../contexts/authStore';
import { alertService } from '../../services/api';
import { connectSocket, subscribeToAlerts, subscribeToSales } from '../../services/socketService';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, FileText,
  Receipt, BarChart3, Bell, Settings, LogOut, Pill, UserCheck, UserCog,
  ChevronLeft, ChevronRight, Wifi, WifiOff, Zap, Wallet, Archive, Menu, X
} from 'lucide-react';

const NAV = [
  { group: 'Dépôt',
    items: [
      { to: '/',           icon: LayoutDashboard, label: 'Tableau de bord',  exact: true },
      { to: '/stock',      icon: Package,          label: 'Stock & Produits' },
      { to: '/orders',     icon: Truck,            label: 'Commandes',     adminOnly: true },
      { to: '/suppliers',  icon: UserCheck,        label: 'Fournisseurs',  adminOnly: true },
    ]
  },
  { group: 'Pharmacie',
    items: [
      { to: '/pos',           icon: ShoppingCart, label: 'Point de Vente' },
      { to: '/clients',       icon: Users,        label: 'Clients & Fidélité' },
      { to: '/prescriptions', icon: Pill,         label: 'Ordonnances' },
    ]
  },
  { group: 'Gestion',
    items: [
      { to: '/invoices',  icon: Receipt,    label: 'Facturation' },
      { to: '/finance',   icon: Wallet,     label: 'Finance', adminOnly: true },
      { to: '/analytics', icon: BarChart3,  label: 'Analytics IA', adminOnly: true },
      { to: '/alerts',    icon: Bell,       label: 'Alertes', badge: true, adminOnly: true },
      { to: '/archive',   icon: Archive,    label: 'Archivage', superAdminOnly: true },
      { to: '/users',     icon: UserCog,    label: 'Utilisateurs', adminOnly: true },
      { to: '/settings',  icon: Settings,   label: 'Paramètres', adminOnly: true },
    ]
  },
];

export default function Layout() {
  const { user, token, logout, isAdmin, isSuperAdmin } = useAuthStore();
  const admin = isAdmin();
  const superAdmin = isSuperAdmin();
  const visibleNav = NAV
    .map(g => ({ ...g, items: g.items.filter(i => (!i.adminOnly || admin) && (!i.superAdminOnly || superAdmin)) }))
    .filter(g => g.items.length > 0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  const { data: alertsData } = useQuery({
    queryKey: ['alerts-count'],
    queryFn: () => alertService.getAll({ isResolved: false, limit: 1 }),
    refetchInterval: 30_000,
  });
  const alertCount = alertsData?.data?.total || 0;

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);

    const unsubAlerts = subscribeToAlerts((alert) => {
      toast.custom((t) => (
        <div className={`flex items-start gap-3 p-4 bg-slate-800 border border-red-800 rounded-xl shadow-xl max-w-sm ${t.visible ? 'animate-fade-in' : ''}`}>
          <Bell size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-100">{alert.title || 'Nouvelle alerte'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{alert.product || ''}</p>
          </div>
        </div>
      ), { duration: 5000 });
    });

    const unsubSales = subscribeToSales((sale) => {
      toast.success(`Vente ${sale.saleNumber} — ${sale.total?.toLocaleString()} CDF`, { duration: 3000 });
    });

    const handleOnline  = () => { setOnline(true);  toast.success('Connexion rétablie — synchronisation en cours...'); };
    const handleOffline = () => { setOnline(false); toast.error('Mode hors-ligne activé'); };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubAlerts?.();
      unsubSales?.();
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '??';
  const roleLabel = {
    super_admin: 'Super Admin', admin: 'Admin', pharmacist: 'Pharmacien',
  }[user?.role] || user?.role;

  const showLabels = mobileOpen || !collapsed;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 lg:z-20 w-64 ${collapsed ? 'lg:w-16' : 'lg:w-56'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className={`h-14 flex items-center border-b border-slate-800 px-3 gap-2.5 flex-shrink-0`}>
          <div className="w-8 h-8 bg-gradient-to-br from-pharma-DEFAULT to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">OM</div>
          {showLabels && (
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-slate-100 truncate">Omedev Pharma</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">Gestion de votre pharmacie</div>
            </div>
          )}
          {/* Mobile: close drawer */}
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
          {/* Desktop: collapse toggle */}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto hidden lg:block text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
          {visibleNav.map(({ group, items }) => (
            <div key={group} className="mb-1">
              {showLabels && <div className="px-4 py-1.5 text-[10px] font-medium text-slate-600 uppercase tracking-widest">{group}</div>}
              {items.map(({ to, icon: Icon, label, badge, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''} ${!showLabels ? 'justify-center px-0 mx-2' : ''}`
                  }
                  title={!showLabels ? label : undefined}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {showLabels && <span className="flex-1 truncate">{label}</span>}
                  {showLabels && badge && alertCount > 0 && (
                    <span className="ml-auto bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center">{alertCount > 99 ? '99+' : alertCount}</span>
                  )}
                  {!showLabels && badge && alertCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-2 flex-shrink-0">
          {/* Online status */}
          <div className={`flex items-center gap-2 px-2 py-1.5 mb-1 rounded-lg ${online ? 'text-emerald-500' : 'text-amber-500'}`}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {showLabels && <span className="text-xs">{online ? 'En ligne' : 'Hors-ligne'}</span>}
          </div>
          {/* User */}
          <div className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors group ${!showLabels ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">{initials}</div>
            {showLabels && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</div>
                <div className="text-[10px] text-slate-500 truncate">{roleLabel}</div>
              </div>
            )}
            {showLabels && (
              <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-all lg:opacity-0 lg:group-hover:opacity-100" title="Déconnexion">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-3 sm:px-6 gap-3 sm:gap-4 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors flex-shrink-0">
            <Menu size={18} />
          </button>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-slow" />
            <span className="text-xs text-slate-500 font-mono">Données en temps réel</span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {!online && (
              <div className="flex items-center gap-1.5 bg-amber-900/30 border border-amber-800 rounded-lg px-2 sm:px-3 py-1.5">
                <WifiOff size={12} className="text-amber-400" />
                <span className="hidden sm:inline text-xs text-amber-300 font-medium">Mode hors-ligne</span>
              </div>
            )}
            <NavLink to="/alerts" className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100 transition-colors flex-shrink-0">
              <Bell size={15} />
              {alertCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </NavLink>
            <div className="hidden sm:block text-xs text-slate-500 truncate max-w-[140px]">{user?.firstName} {user?.lastName}</div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
