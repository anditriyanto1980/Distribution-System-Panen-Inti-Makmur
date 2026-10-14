import React, { useState, useRef, useEffect } from 'react';
import { Product, HargaPelanggan, CUSTOMERS } from '../types';
import { exportCustomerPricesExcel, parseCustomerPricesExcel } from '../utils/excel';
import { Tags, Save, Download, Upload } from 'lucide-react';

interface PricesViewProps {
  products: Product[];
  customerPrices: HargaPelanggan;
  onSavePrices: (newPrices: HargaPelanggan) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const PricesView: React.FC<PricesViewProps> = ({
  products,
  customerPrices,
  onSavePrices,
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPrices, setLocalPrices] = useState<HargaPelanggan>(customerPrices);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalPrices(customerPrices);
    setHasChanges(false);
  }, [customerPrices]);

  const handlePriceChange = (cust: string, itemName: string, val: string) => {
    const num = parseFloat(val);
    const parsed = isNaN(num) ? 0 : Math.max(0, num);
    setLocalPrices((prev) => ({
      ...prev,
      [cust]: {
        ...(prev[cust] || {}),
        [itemName]: parsed,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSavePrices(localPrices);
    setHasChanges(false);
    onToast('Pengaturan harga per pelanggan berhasil disimpan!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await parseCustomerPricesExcel(file, products, localPrices);
      setLocalPrices(res.newPrices);
      onSavePrices(res.newPrices);
      onToast(`${res.updatedCount} data harga pelanggan berhasil diimpor & disimpan!`);
    } catch (err: any) {
      onToast(`Gagal mengimpor harga: ${err?.message || 'Format tidak valid'}`, true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Pengaturan Harga per Pelanggan (DC)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tarif khusus per SKU untuk setiap Distribution Center / Ekspedisi rekanan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
            title="Impor Harga dari file Excel (.xlsx)"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Impor</span>
          </button>

          <button
            onClick={() => exportCustomerPricesExcel(products, localPrices)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
            title="Ekspor Harga ke file Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition ${
              hasChanges
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/30 animate-pulse'
                : 'bg-amber-500/80 hover:bg-amber-500 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Simpan Harga</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 text-slate-500">
          Belum ada master produk terdaftar.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-amber-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-300 uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 border-r border-slate-800 w-52">
                    Pelanggan (DC)
                  </th>
                  {products.map((p) => (
                    <th key={p.code} className="px-4 py-3.5 text-center font-bold text-amber-300">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-slate-400 normal-case font-mono mt-0.5">
                        Default: Rp {p.harga.toLocaleString('id-ID')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-medium">
                {CUSTOMERS.map((cust) => (
                  <tr key={cust} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 font-bold text-white border-r border-slate-800 whitespace-nowrap">
                      {cust}
                    </td>

                    {products.map((p) => {
                      const currentPrice = localPrices[cust]?.[p.name] ?? p.harga;

                      return (
                        <td key={`${cust}-${p.code}`} className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-slate-500 text-xs font-mono">Rp</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={currentPrice}
                              onChange={(e) => handlePriceChange(cust, p.name, e.target.value)}
                              className="w-36 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-center text-xs focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
