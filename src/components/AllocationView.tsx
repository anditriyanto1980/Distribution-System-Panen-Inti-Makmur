import React, { useState, useRef, useEffect } from 'react';
import {
  Product,
  GudangAllocations,
  ForecastData,
  DcToGdMap,
  User,
  GUDANG_REGIONS,
  CUSTOMERS,
} from '../types';
import {
  formatNumber,
  exportAllocationExcel,
  parseAllocationExcel,
} from '../utils/excel';
import { Building2, Save, Download, Upload } from 'lucide-react';

interface AllocationViewProps {
  products: Product[];
  allocations: GudangAllocations;
  forecastData: ForecastData;
  dcToGdMap: DcToGdMap;
  currentUser: User | null;
  onSaveAllocations: (newAllocations: GudangAllocations) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const AllocationView: React.FC<AllocationViewProps> = ({
  products,
  allocations,
  forecastData,
  dcToGdMap,
  currentUser,
  onSaveAllocations,
  onToast,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localAllocations, setLocalAllocations] = useState<GudangAllocations>(allocations);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalAllocations(allocations);
    setHasChanges(false);
  }, [allocations]);

  const handleAllocationChange = (gd: string, itemName: string, val: string) => {
    const num = parseInt(val, 10);
    const parsed = isNaN(num) ? 0 : Math.max(0, num);
    setLocalAllocations((prev) => ({
      ...prev,
      [gd]: {
        ...(prev[gd] || {}),
        [itemName]: parsed,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSaveAllocations(localAllocations);
    setHasChanges(false);
    onToast('Alokasi stok gudang wilayah berhasil disimpan!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await parseAllocationExcel(file, products, localAllocations);
      setLocalAllocations(res.newAllocations);
      onSaveAllocations(res.newAllocations);
      onToast(`${res.updatedCount} data alokasi berhasil diimpor & disimpan!`);
    } catch (err: any) {
      onToast(`Gagal mengimpor alokasi: ${err?.message || 'Format tidak valid'}`, true);
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
            <Building2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Alokasi Stok Gudang Wilayah
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Komparasi kebutuhan target forecast vs alokasi penerimaan stok masuk
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
              title="Impor Alokasi dari file Excel (.xlsx)"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Impor Alokasi</span>
            </button>
          )}

          <button
            onClick={() => exportAllocationExcel(products, localAllocations)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
            title="Ekspor Alokasi ke file Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor Alokasi</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition ${
                hasChanges
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/30 animate-pulse'
                  : 'bg-amber-500/80 hover:bg-amber-500 text-slate-950 shadow-amber-500/20'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Simpan Alokasi</span>
            </button>
          )}

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
                  <th rowSpan={2} className="px-5 py-3.5 align-bottom border-r border-slate-800 w-48">
                    Wilayah Gudang
                  </th>
                  {products.map((p) => (
                    <th
                      key={p.code}
                      colSpan={2}
                      className="px-4 py-3 text-center border-b border-l border-slate-800 font-bold text-amber-300"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-900/60 text-[10px] text-slate-400">
                  {products.map((p) => (
                    <React.Fragment key={`sub-${p.code}`}>
                      <th className="px-4 py-2 text-center border-l border-slate-800">
                        Kebutuhan Forecast
                      </th>
                      <th className="px-4 py-2 text-center border-r border-slate-800">
                        Alokasi Masuk
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-medium">
                {GUDANG_REGIONS.map((gd) => (
                  <tr key={gd} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 font-bold text-white border-r border-slate-800 whitespace-nowrap">
                      {gd}
                    </td>

                    {products.map((p) => {
                      // Total forecast needed for this region
                      let totalForecastNeed = 0;
                      CUSTOMERS.forEach((c) => {
                        if (dcToGdMap[c]?.[p.name] === gd) {
                          totalForecastNeed += forecastData[c]?.[p.name] || 0;
                        }
                      });

                      const allocVal = localAllocations[gd]?.[p.name] || 0;
                      const isDeficit = allocVal < totalForecastNeed;

                      return (
                        <React.Fragment key={`${gd}-${p.code}`}>
                          <td className="px-4 py-3 text-center border-l border-slate-800 font-mono font-bold text-amber-400">
                            {formatNumber(totalForecastNeed)}
                          </td>
                          <td className="px-4 py-3 text-center border-r border-slate-800">
                            <input
                              type="number"
                              min="0"
                              value={allocVal}
                              disabled={!isAdmin}
                              onChange={(e) => handleAllocationChange(gd, p.name, e.target.value)}
                              className={`w-28 px-3 py-1.5 rounded-lg bg-slate-900 border font-mono text-center text-xs focus:outline-none disabled:opacity-60 ${
                                isDeficit && totalForecastNeed > 0
                                  ? 'border-red-500/60 text-red-300 focus:border-red-400'
                                  : 'border-slate-700 text-slate-100 focus:border-amber-400'
                              }`}
                            />
                          </td>
                        </React.Fragment>
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
