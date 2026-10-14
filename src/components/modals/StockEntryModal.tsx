import React, { useState, useEffect } from 'react';
import { Product, StockEntry, WAREHOUSES } from '../../types';
import { X, ArrowDownToLine, Save } from 'lucide-react';

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNew: (entries: { date: string; itemCode: string; warehouse: string; quantity: number }[]) => void;
  onUpdateExisting: (id: string, date: string, quantity: number) => void;
  products: Product[];
  editingEntry: StockEntry | null;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveNew,
  onUpdateExisting,
  products,
  editingEntry,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemCode, setItemCode] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.date.split('T')[0]);
      setItemCode(editingEntry.itemCode);
      setQuantities({ [editingEntry.warehouse]: editingEntry.quantity });
      setError('');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setItemCode(products[0]?.code || '');
      const initQ: Record<string, number> = {};
      WAREHOUSES.forEach((wh) => (initQ[wh] = 0));
      setQuantities(initQ);
      setError('');
    }
  }, [editingEntry, isOpen, products]);

  if (!isOpen) return null;

  const handleQtyChange = (wh: string, val: string) => {
    const num = parseInt(val, 10);
    setQuantities((prev) => ({
      ...prev,
      [wh]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!itemCode) {
      setError('Silakan pilih produk yang akan dimasukkan stoknya.');
      return;
    }

    if (editingEntry) {
      const q = quantities[editingEntry.warehouse] || 0;
      onUpdateExisting(editingEntry.id, date, q);
      onClose();
      return;
    }

    // Creating new entries per warehouse with qty > 0
    const entriesToSave = Object.entries(quantities)
      .filter(([_, q]) => q > 0)
      .map(([warehouse, q]) => ({
        date,
        itemCode,
        warehouse,
        quantity: q,
      }));

    if (entriesToSave.length === 0) {
      setError('Masukkan minimal 1 jumlah stok masuk pada salah satu gudang.');
      return;
    }

    onSaveNew(entriesToSave);
    onClose();
  };

  const selectedProduct = products.find((p) => p.code === itemCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl glass-panel border border-amber-500/30 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              {editingEntry ? 'Edit Riwayat Stok Masuk' : 'Tambah Stok Masuk (Pemasukan)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-red-950/60 border border-red-500/40 text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tanggal Penerimaan
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Pilih Produk
              </label>
              {editingEntry ? (
                <input
                  type="text"
                  disabled
                  value={`${selectedProduct?.name || editingEntry.itemCode} (${editingEntry.itemCode})`}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-400 text-sm cursor-not-allowed"
                />
              ) : (
                <select
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                  required
                >
                  {products.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.code}) - {p.unit}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Quantities per Warehouse Section */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                {editingEntry
                  ? `Jumlah Masuk ke: ${editingEntry.warehouse}`
                  : `Jumlah Masuk per Gudang (${selectedProduct?.unit || 'Pcs'})`}
              </span>
            </div>

            {editingEntry ? (
              <div className="max-w-xs">
                <label className="block text-xs text-slate-400 mb-1">
                  {editingEntry.warehouse}
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantities[editingEntry.warehouse] || 0}
                  onChange={(e) => handleQtyChange(editingEntry.warehouse, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-amber-500/50 text-slate-100 text-sm font-mono font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {WAREHOUSES.map((wh) => (
                  <div key={wh} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <label className="block text-[11px] text-slate-400 font-medium mb-1 truncate" title={wh}>
                      {wh.replace('Gudang ', '')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quantities[wh] === 0 ? '' : quantities[wh]}
                      placeholder="0"
                      onChange={(e) => handleQtyChange(wh, e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono text-center focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Penerimaan Stok</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
