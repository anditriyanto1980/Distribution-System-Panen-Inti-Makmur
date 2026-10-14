import React, { useState, useRef } from 'react';
import { User } from '../types';
import { downloadBackupJson, restoreBackupJson } from '../utils/storage';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Trash2,
  Database,
  Download,
  Upload,
} from 'lucide-react';

interface UsersViewProps {
  users: User[];
  currentUser: User | null;
  onAddUser: (user: { username: string; password?: string; role: 'admin' | 'user' }) => void;
  onDeleteUser: (user: User) => void;
  onRequestRestore: () => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onDeleteUser,
  onRequestRestore,
  onToast,
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = newUsername.trim();
    if (!trimmedUser || !newPassword) {
      setError('Username dan Password wajib diisi.');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
      setError(`Username "${trimmedUser}" sudah digunakan.`);
      return;
    }

    onAddUser({
      username: trimmedUser,
      password: newPassword,
      role: newRole,
    });

    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
    onToast(`Pengguna baru "${trimmedUser}" berhasil ditambahkan.`);
  };

  const handleBackup = () => {
    downloadBackupJson();
    onToast('File cadangan (backup JSON) berhasil diunduh!');
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white tracking-wide">
          Pengaturan Pengguna & Cadangan Sistem
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Kelola hak akses operator, peran sistem, dan backup berkala seluruh basis data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Form Tambah Pengguna */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <UserPlus className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Tambah Pengguna Baru</h3>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username Baru
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                placeholder="misal: ahmad_gudang"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password Baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                placeholder="******"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hak Akses (Peran)
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
              >
                <option value="user">User (Staff Operasional)</option>
                <option value="admin">Admin (Akses Penuh)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftarkan Pengguna</span>
            </button>
          </form>
        </div>

        {/* Daftar Pengguna */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <UsersIcon className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Daftar Pengguna Aktif</h3>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Username</th>
                  <th className="px-4 py-2.5">Peran</th>
                  <th className="px-4 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {users.map((u) => {
                  const isCurrent = currentUser?.username === u.username;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-white font-semibold flex items-center gap-2">
                        <span>{u.username}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Anda
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            u.role === 'admin' ? 'text-amber-400' : 'text-sky-400'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span className="capitalize">{u.role}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isCurrent && users.length > 1 ? (
                          <button
                            onClick={() => onDeleteUser(u)}
                            className="p-1 rounded text-red-400 hover:bg-slate-800 transition"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Cadangkan & Pulihkan Data Section */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
          <Database className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Cadangkan & Pulihkan Data</h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1 mb-6">
          Simpan seluruh data sistem (master barang, mutasi stok masuk, riwayat pengiriman,
          forecast, alokasi gudang, dan tarif harga) ke file cadangan tunggal (.json), atau
          pulihkan kapan saja.
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
            <span>Pulihkan (Restore) Semua Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
