import React, { useState, useEffect } from 'react';
import { Product, PREDEFINED_PRODUCTS } from '../../types';
import { X, PackagePlus, Save } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: { id?: string; code: string; name: string; unit: string; harga: number }) => void;
  editingProduct: Product | null;
  existingProducts: Product[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct,
  existingProducts,
}) => {
  const [selectedCode, setSelectedCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Box');
  const [harga, setHarga] = useState(0);
  const [isCustomCode, setIsCustomCode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setSelectedCode(editingProduct.code);
      setName(editingProduct.name);
      setUnit(editingProduct.unit);
      setHarga(editingProduct.harga);
      setIsCustomCode(false);
      setError('');
    } else {
      setSelectedCode('PD');
      const predefined = PREDEFINED_PRODUCTS['PD'];
      setName(predefined ? predefined.name : '');
      setUnit('Box');
      setHarga(predefined ? predefined.price : 0);
      setIsCustomCode(false);
      setError('');
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleCodeChange = (codeVal: string) => {
    if (codeVal === '__CUSTOM__') {
      setIsCustomCode(true);
      setSelectedCode('');
      setName('');
      setHarga(0);
    } else {
      setIsCustomCode(false);
      setSelectedCode(codeVal);
      const predefined = PREDEFINED_PRODUCTS[codeVal];
      if (predefined) {
        setName(predefined.name);
        setHarga(predefined.price);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalCode = (isCustomCode ? customCode : selectedCode).trim().toUpperCase();
    const finalName = name.trim();

    if (!finalCode) {
      setError('Kode barang harus diisi.');
      return;
    }
    if (!finalName) {
      setError('Nama barang harus diisi.');
      return;
    }

    // Check duplicate code if creating new
    if (!editingProduct) {
      const exists = existingProducts.some(
        (p) => p.code.toUpperCase() === finalCode
      );
      if (exists) {
        setError(`Kode produk "${finalCode}" sudah terdaftar.`);
        return;
      }
    }

    onSave({
      id: editingProduct?.id,
      code: finalCode,
      name: finalName,
      unit: unit.trim() || 'Pcs',
      harga: Math.max(0, harga),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl glass-panel border border-amber-500/30 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              {editingProduct ? 'Edit Master Produk' : 'Tambah Produk Baru'}
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
            <div className="p-3 text-xs rounded-lg bg-red-950/60 border border-red-500/40 text-red-300">
              {error}
            </div>
          )}

          {/* Product Code Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Kode Barang
            </label>
            {editingProduct ? (
              <input
                type="text"
                value={editingProduct.code}
                disabled
                className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-400 text-sm font-mono cursor-not-allowed"
              />
            ) : !isCustomCode ? (
              <div className="space-y-2">
                <select
                  value={selectedCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {Object.keys(PREDEFINED_PRODUCTS).map((code) => (
                    <option key={code} value={code}>
                      {code} - {PREDEFINED_PRODUCTS[code].name}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Masukkan Kode Kustom Lainnya...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: AJ, MD, KL..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:border-amber-400 focus:outline-none uppercase"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCode(false)}
                  className="px-2.5 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg shrink-0"
                >
                  Batal Kustom
                </button>
              </div>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nama Barang
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              readOnly={!isCustomCode && !editingProduct}
              className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-200 focus:outline-none ${
                !isCustomCode && !editingProduct
                  ? 'bg-slate-900/60 border-slate-700/80 text-slate-300'
                  : 'bg-slate-900 border-slate-700 focus:border-amber-400'
              }`}
              placeholder="Contoh: Kurma Khalas 1kg..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Satuan Kemasan
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:border-amber-400 focus:outline-none"
                placeholder="Box, Karton, Kg..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Harga Jual Default (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={harga}
                onChange={(e) => setHarga(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
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
              <span>Simpan Master Produk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
