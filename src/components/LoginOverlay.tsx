import React, { useState } from 'react';
import { User } from '../types';
import { Boxes, AlertCircle, Clock, LogOut, Cloud, Loader2, Copy, Check } from 'lucide-react';

interface LoginOverlayProps {
  pendingUser: User | null;
  authLoading: boolean;
  onGoogleLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = ({
  pendingUser,
  authLoading,
  onGoogleLogin,
  onLogout,
}) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [unauthorizedHost, setUnauthorizedHost] = useState('');
  const [copiedHost, setCopiedHost] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleCopyHost = async () => {
    if (!unauthorizedHost) return;
    try {
      await navigator.clipboard.writeText(unauthorizedHost);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } catch {
      // ignore clipboard failures
    }
  };

  const handleSignIn = async () => {
    setErrorMsg('');
    setUnauthorizedHost('');
    setSigningIn(true);
    try {
      await onGoogleLogin();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Popup login Google ditutup sebelum proses selesai.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.');
      } else if (code === 'auth/unauthorized-domain' || String(err?.message || '').includes('unauthorized-domain')) {
        setUnauthorizedHost(window.location.hostname);
        setErrorMsg('Domain aplikasi ini belum terdaftar di Authorized Domains Firebase Authentication.');
      } else {
        setErrorMsg(err?.message || 'Gagal masuk dengan akun Google. Silakan coba lagi.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel gold-glow border border-amber-500/30 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/50 shadow-lg shadow-amber-500/20 mb-5">
          <Boxes className="h-10 w-10 text-amber-400" />
        </div>

        <h1 className="text-xl font-bold text-white tracking-tight">
          Sistem Stok & Pengiriman
        </h1>
        <p className="text-sm font-semibold text-amber-400 mt-0.5 tracking-wide">
          PT PANEN INTI MAKMUR
        </p>

        {authLoading ? (
          <div className="py-10 flex flex-col items-center gap-3 text-slate-300">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs">Menghubungkan ke database Firebase real-time...</p>
          </div>
        ) : pendingUser ? (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Menunggu Persetujuan Admin</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Akun Google <strong className="text-white">{pendingUser.email}</strong> sudah
                tercatat, namun belum diaktifkan oleh Admin PT Panen Inti Makmur.
              </p>
              <p className="text-[11px] text-slate-400">
                Hubungi Admin untuk menyetujui akses akun Anda melalui menu{' '}
                <strong className="text-amber-300">Pengaturan Pengguna</strong>. Halaman ini akan
                otomatis terbuka secara real-time begitu disetujui.
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Gunakan Akun Google Lain</span>
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Seluruh data stok, pengiriman, dan forecast tersimpan aman &amp; sinkron secara
              real-time di Firebase Firestore.
            </p>

            {errorMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs space-y-2 text-left">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                {unauthorizedHost && (
                  <div className="pt-2 border-t border-red-500/30 space-y-2">
                    <p className="text-[11px] text-slate-300">
                      Salin domain berikut lalu tambahkan di{' '}
                      <strong className="text-white">
                        Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains
                      </strong>
                      :
                    </p>
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 font-mono text-[11px] text-amber-300">
                      <span className="truncate">{unauthorizedHost}</span>
                      <button
                        type="button"
                        onClick={handleCopyHost}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white shrink-0"
                        title="Salin domain"
                      >
                        {copiedHost ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={signingIn}
              onClick={handleSignIn}
              className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-slate-950 font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.98]"
            >
              {signingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>{signingIn ? 'Memproses Login...' : 'Masuk dengan Google'}</span>
            </button>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Cloud Database (Akses Dari Mana Saja)</span>
            </div>
          </>
        )}

        <p className="mt-6 text-[11px] text-slate-500">
          Powered By <span className="text-slate-400 font-medium">Andi Triyanto</span>
        </p>
      </div>
    </div>
  );
};
