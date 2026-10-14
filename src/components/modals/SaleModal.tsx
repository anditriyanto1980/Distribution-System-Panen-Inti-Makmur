import React, { useState, useEffect } from 'react';
import { Product, SaleRecord, StockEntry, CUSTOMERS, WAREHOUSES, HargaPelanggan } from '../../types';
import { calculateProductStock, formatCurrency } from '../../utils/excel';
import { X, Truck, Save, AlertTriangle } from 'lucide-react';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: Omit<SaleRecord, 'id'> & { id?: string }) => void;
  products: Product[];
  stockEntries: StockEntry[];
  existingSales: SaleRecord[];
  customerPrices: HargaPelanggan;
  editingSale: SaleRecord | null;
}

export const SaleModal: React.FC<SaleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  products,
  stockEntries,
  existingSales,
  customerPrices,
  editingSale,
}) => {
  const [customer, setCustomer] = useState<string>(CUSTOMERS[0]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nomorSO, setNomorSO] = useState('');
  const [nomorSJ, setNomorSJ] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [warehouse, setWarehouse] = useState<string>(WAREHOUSES[0]);
  const [itemCode, setItemCode] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [error, setError] = useState<string>('');

  // Update default states when modal opens
  useEffect(() => {
    if (editingSale) {
      setCustomer(editingSale.namaPelanggan);
      setDate(editingSale.date.split('T')[0]);
      setNomorSO(editingSale.nomorSO || '');
      setNomorSJ(editingSale.nomorSJ || '');
      setKeterangan(editingSale.keterangan || '');
      setWarehouse(editingSale.gudang);
      setItemCode(editingSale.itemCode);
      setQuantity(editingSale.quantity);
      setUnitPrice(editingSale.hargaSatuan);
      setError('');
    } else {
      setCustomer(CUSTOMERS[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setNomorSO('');
      setNomorSJ('');
      setKeterangan('');
      setWarehouse(WAREHOUSES[0]);
      const defaultItem = products[0]?.code || '';
      setItemCode(defaultItem);
      setQuantity(1);

      // determine default unit price for default item and customer
      const p = products.find((prod) => prod.code === defaultItem);
      if (p) {
        const custPrice = customerPrices[CUSTOMERS[0]]?.[p.name];
        setUnitPrice(custPrice !== undefined && custPrice > 0 ? custPrice : p.harga);
      } else {
        setUnitPrice(0);
      }
      setError('');
    }
  }, [editingSale, isOpen, products, customerPrices]);

  // When customer or product changes (in non-edit mode or deliberate change), update suggested price
  const handleItemChange = (newItemCode: string) => {
    setItemCode(newItemCode);
    const p = products.find((prod) => prod.code === newItemCode);
    if (p) {
      const custPrice = customerPrices[customer]?.[p.name];
      setUnitPrice(custPrice !== undefined && custPrice > 0 ? custPrice : p.harga);
    }
  };

  const handleCustomerChange = (newCustomer: string) => {
    setCustomer(newCustomer);
    const p = products.find((prod) => prod.code === itemCode);
    if (p) {
      const custPrice = customerPrices[newCustomer]?.[p.name];
      setUnitPrice(custPrice !== undefined && custPrice > 0 ? custPrice : p.harga);
    }
  };

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.code === itemCode);

  // Compute live available stock in chosen warehouse
  const rawStock = selectedProduct
    ? calculateProductStock(selectedProduct.code, stockEntries, existingSales, warehouse).finalStock
    : 0;

  // If editing, add back current record's quantity to available
  const availableStock =
    editingSale && editingSale.itemCode === itemCode && editingSale.gudang === warehouse
      ? rawStock + editingSale.quantity
      : rawStock;

  const totalHarga = (quantity || 0) * (unitPrice || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!itemCode) {
      setError('Harap pilih barang yang akan dikirim.');
      return;
    }
    if (!warehouse) {
      setError('Harap pilih gudang asal pengiriman.');
      return;
    }
    if (quantity <= 0) {
      setError('Jumlah (Qty) harus lebih dari 0.');
      return;
    }
    if (quantity > availableStock) {
      setError(
        `Stok di ${warehouse} tidak mencukupi! Stok tersedia saat ini: ${availableStock} ${selectedProduct?.unit || 'Pcs'}`
      );
      return;
    }

    onSave({
      id: editingSale?.id,
      itemCode,
      quantity,
      gudang: warehouse,
      hargaSatuan: unitPrice,
      totalHarga,
      date: new Date(date).toISOString(),
      namaPelanggan: customer,
      nomorSO: nomorSO.trim(),
      nomorSJ: nomorSJ.trim(),
      keterangan: keterangan.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl glass-panel border border-amber-500/30 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              {editingSale ? 'Edit Pengiriman Barang' : 'Catat Pengiriman Barang (Baru)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nama Pelanggan (DC / Tujuan)
              </label>
              <select
                value={customer}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                required
              >
                {CUSTOMERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tanggal Pengiriman
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nomor SO
              </label>
              <input
                type="text"
                value={nomorSO}
                onChange={(e) => setNomorSO(e.target.value)}
                placeholder="SO-2026-..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nomor SJ (Surat Jalan)
              </label>
              <input
                type="text"
                value={nomorSJ}
                onChange={(e) => setNomorSJ(e.target.value)}
                placeholder="SJ-PIM-..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Keterangan / Catatan Pengiriman
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Ekspedisi darat truk colt diesel, driver Pak Rudi..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ambil Dari Gudang
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                required
              >
                {WAREHOUSES.map((wh) => (
                  <option key={wh} value={wh}>
                    {wh}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Pilih Barang
              </label>
              <select
                value={itemCode}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                required
              >
                {products.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time warehouse stock badge */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className="text-slate-400">
              Sisa Stok di <strong className="text-slate-200">{warehouse}</strong>:
            </span>
            <span
              className={`font-mono font-bold ${
                availableStock <= 0
                  ? 'text-red-400'
                  : availableStock <= 20
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {availableStock} {selectedProduct?.unit || 'Pcs'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Harga Satuan (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Jumlah (Qty)
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Total Price Display */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30">
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold block mb-0.5">
              Total Nilai Pengiriman
            </span>
            <span className="text-xl font-bold font-mono text-white">
              {formatCurrency(totalHarga)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
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
              <span>Simpan Pengiriman</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
