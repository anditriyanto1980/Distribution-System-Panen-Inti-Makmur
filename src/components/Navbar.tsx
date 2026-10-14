import React from 'react';
import { ActiveTab, User } from '../types';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  TrendingUp,
  Building2,
  Tags,
  Users,
  LogOut,
  Calendar,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentUser: User | null;
  onLogout: () => void;
  currentDateStr: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  currentDateStr,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const navItems: { tab: ActiveTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { tab: 'stock', label: 'Laporan Stok', icon: <Boxes className="w-4 h-4" /> },
    { tab: 'sales', label: 'Laporan Pengiriman', icon: <Truck className="w-4 h-4" /> },
    { tab: 'forecast', label: 'Forecast', icon: <TrendingUp className="w-4 h-4" /> },
    { tab: 'allocation', label: 'Alokasi Gudang', icon: <Building2 className="w-4 h-4" /> },
    { tab: 'prices', label: 'Pengaturan Harga', icon: <Tags className="w-4 h-4" />, adminOnly: true },
    { tab: 'users', label: 'Pengaturan Pengguna', icon: <Users className="w-4 h-4" />, adminOnly: true },
  ];

  return (
    <header className="no-print border-b border-amber-500/20 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Boxes className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-base sm:text-lg">
                  PT PANEN INTI MAKMUR
                </span>
                <span className="text-xs px-2 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-500/10 font-mono">
                  GUDANG UTAMA
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>{currentDateStr}</span>
              </div>
            </div>
          </div>

          {/* Right Action / User Profile */}
          <div className="flex items-center gap-4 shrink-0">
            {currentUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                ) : (
                  <UserCheck className="w-4 h-4 text-sky-400" />
                )}
                <div className="text-xs text-left">
                  <p className="font-semibold text-slate-200 capitalize">{currentUser.username}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{currentUser.role}</p>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-transparent hover:border-amber-500/30 transition-all flex items-center gap-1.5 text-xs"
              title="Keluar dari sistem"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Zone */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-slate-800 scrollbar-none">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => onTabChange(item.tab)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
