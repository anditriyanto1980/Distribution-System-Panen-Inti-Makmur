import React, { useState } from 'react';
import {
  User,
  InviteRecord,
  Product,
  StockEntry,
  SaleRecord,
  ForecastData,
  DcToGdMap,
  GudangAllocations,
  HargaPelanggan,
} from '../types';
import { downloadFirestoreBackupJson } from '../utils/firestoreService';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Trash2,
  Database,
  Download,
  Upload,
  CheckCircle,
  Mail,
} from 'lucide-react';

interface UsersViewProps {
  users: User[];
  invites: InviteRecord[];
  currentUser: User | null;
  backupState: {
    products: Product[];
    stockEntries: StockEntry[];
    salesData: SaleRecord[];
    forecastData: ForecastData;
    dcToGdMap: DcToGdMap;
    gudangAllocations: GudangAllocations;
    hargaPelanggan: HargaPelanggan;
  };
  onInviteUser: (email: string, role: 'admin' | 'user') => Promise<'created' | 'updated'>;
  onDeleteInvite: (invite: InviteRecord) => Promise<void>;
  onApproveOrUpdateUser: (user: User, role: 'admin' | 'user', status: 'active' | 'pending') => Promise<void>;
  onDeleteUser: (user: User) => void;
  onRequestRestore: () => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  invites,
  currentUser,
  backupState,
  onInviteUser,
  onDeleteInvite,
  onApproveOrUpdateUser,
  onDeleteUser,
  onRequestRestore,
  onToast,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Masukkan alamat email Google yang valid.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === cleanEmail && u.status === 'active')) {
      setError(`Pengguna dengan email "${cleanEmail}" sudah terdaftar aktif.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onInviteUser(cleanEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('user');
      onToast(
        result === 'updated'
          ? `Hak akses undangan untuk "${cleanEmail}" berhasil diperbarui ke ${inviteRole.toUpperCase()}.`
          : `Akses undangan untuk "${cleanEmail}" berhasil ditambahkan ke database.`
      );
    } catch (err: any) {
      let message = err?.message || 'Gagal menambahkan undangan pengguna.';
      try {
        const parsed = JSON.parse(message);
        if (parsed?.error) message = `Gagal menyimpan ke database: ${parsed.error}`;
      } catch {
        // Use raw message
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackup = () => {
    downloadFirestoreBackupJson(backupState);
    onToast('File cadangan database Firebase (.json) berhasil diunduh!');
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white tracking-wide">
          Pengaturan Pengguna &amp; Cadangan Database Firebase
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Undang email Google staf gudang agar bisa mengakses data real-time dari perangkat mana saja
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Form Tambah / Undang Email Staf */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 shadow-xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <UserPlus className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Undang / Otorisasi Email Google Staf</h3>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs break-words">
              {error}
            </div>
          )}

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Akun Google Staf
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                  placeholder="contoh: gudang.surabaya@gmail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hak Akses (Peran)
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
              >
                <option value="user">User (Staf Gudang / Catat Pengiriman)</option>
                <option value="admin">Admin (Akses Penuh Master &amp; Harga)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Menyimpan...' : 'Otorisasi Email Ini'}</span>
            </button>
          </form>

          {/* Pending Invites List */}
          {invites.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Undangan Aktif ({invites.length})
              </h4>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
                  >
                    <div>
                      <p className="text-slate-200 font-medium">{inv.email}</p>
                      <p className="text-[11px] text-amber-400 capitalize">Peran: {inv.role}</p>
                    </div>
                    <button
                      onClick={() => onDeleteInvite(inv)}
                      className="p-1.5 rounded text-red-400 hover:bg-slate-800 transition"
                      title="Batalkan Undangan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daftar Pengguna Terdaftar */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <UsersIcon className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Daftar Pengguna Terdaftar</h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Pengguna</th>
                  <th className="px-3 py-2.5">Peran</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {users.map((u) => {
                  const isCurrent = currentUser?.uid === u.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="text-white font-semibold flex items-center gap-2">
                          <span>{u.displayName}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>

                      <td className="px-3 py-3">
                        {!isCurrent ? (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              onApproveOrUpdateUser(
                                u,
                                e.target.value as 'admin' | 'user',
                                u.status
                              )
                            }
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                            <Shield className="w-3 h-3" />
                            <span>Admin</span>
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`text-[11px] font-semibold ${
                            u.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Aktif' : 'Menunggu'}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        {!isCurrent ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {u.status === 'pending' && (
                              <button
                                onClick={() => onApproveOrUpdateUser(u, u.role, 'active')}
                                className="p-1.5 rounded text-emerald-400 hover:bg-slate-800 transition"
                                title="Setujui Akses"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteUser(u)}
                              className="p-1.5 rounded text-red-400 hover:bg-slate-800 transition"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cadangkan & Pulihkan Data Cloud */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
          <Database className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Cadangkan &amp; Pulihkan Database Cloud</h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1 mb-6">
          Unduh salinan seluruh data dari Firebase Firestore ke file tunggal (.json), atau pulihkan
          data cadangan langsung ke database cloud.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleBackup}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Cadangkan (Backup) Semua Data</span>
          </button>

          <button
            onClick={onRequestRestore}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Upload className="w-4 h-4" />
            <span>Pulihkan (Restore) ke Firebase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
