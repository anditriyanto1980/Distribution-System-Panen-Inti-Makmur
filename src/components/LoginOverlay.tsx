import React, { useState } from 'react';
import { User } from '../types';
import { Boxes, Lock, User as UserIcon, LogIn, AlertCircle } from 'lucide-react';

interface LoginOverlayProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = ({ users, onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === trimmedUser.toLowerCase() && u.password === password
    );

    if (foundUser) {
      onLoginSuccess(foundUser);
    } else {
      setErrorMsg('Username atau password salah. Silakan coba lagi.');
    }
  };

  const handleQuickFill = (role: 'admin' | 'user') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('staff');
      setPassword('staff123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel gold-glow border border-amber-500/30 text-center relative overflow-hidden">
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Brand Icon */}
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/50 shadow-lg shadow-amber-500/20 mb-5">
          <Boxes className="h-10 w-10 text-amber-400" />
        </div>

        <h1 className="text-xl font-bold text-white tracking-tight">
          Sistem Stok & Pengiriman
        </h1>
        <p className="text-sm font-semibold text-amber-400 mt-0.5 tracking-wide">
          PT PANEN INTI MAKMUR
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Masuk ke portal operasional inventaris & distribusi gudang
        </p>

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                placeholder="Masukkan username..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                placeholder="Masukkan password..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk ke Sistem</span>
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
          <p className="mb-2 font-medium text-slate-300">Akun Cepat (Quick Fill):</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700 text-[11px]"
            >
              Admin (admin / admin123)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('user')}
              className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-sky-400 border border-slate-700 text-[11px]"
            >
              User (staff / staff123)
            </button>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-500">
          Powered By <span className="text-slate-400 font-medium">Andi Triyanto</span>
        </p>
      </div>
    </div>
  );
};
