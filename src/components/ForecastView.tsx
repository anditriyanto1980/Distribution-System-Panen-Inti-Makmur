import React, { useState, useRef } from 'react';
import {
  Product,
  SaleRecord,
  ForecastData,
  DcToGdMap,
  User,
  CUSTOMERS,
  GUDANG_REGIONS,
} from '../types';
import {
  formatNumber,
  exportForecastExcel,
  parseForecastExcel,
} from '../utils/excel';
import {
  TrendingUp,
  Save,
  Download,
  Upload,
  Building2,
  CheckCircle2,
} from 'lucide-react';

interface ForecastViewProps {
  products: Product[];
  salesData: SaleRecord[];
  forecastData: ForecastData;
  dcToGdMap: DcToGdMap;
  currentUser: User | null;
  onSaveForecast: (newForecast: ForecastData, newDcToGd: DcToGdMap) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const ForecastView: React.FC<ForecastViewProps> = ({
  products,
  salesData,
  forecastData,
  dcToGdMap,
  currentUser,
  onSaveForecast,
  onToast,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for inline edits
  const [localForecast, setLocalForecast] = useState<ForecastData>(forecastData);
  const [localDcToGd, setLocalDcToGd] = useState<DcToGdMap>(dcToGdMap);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when prop updates
  React.useEffect(() => {
    setLocalForecast(forecastData);
    setLocalDcToGd(dcToGdMap);
    setHasChanges(false);
  }, [forecastData, dcToGdMap]);

  const handleForecastChange = (cust: string, itemName: string, val: string) => {
    const num = parseInt(val, 10);
    const parsed = isNaN(num) ? 0 : Math.max(0, num);
    setLocalForecast((prev) => ({
      ...prev,
      [cust]: {
        ...(prev[cust] || {}),
        [itemName]: parsed,
      },
    }));
    setHasChanges(true);
  };

  const handleRegionChange = (cust: string, itemName: string, region: string) => {
    setLocalDcToGd((prev) => ({
      ...prev,
      [cust]: {
        ...(prev[cust] || {}),
        [itemName]: region,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSaveForecast(localForecast, localDcToGd);
    setHasChanges(false);
    onToast('Data forecast dan alokasi wilayah berhasil disimpan!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await parseForecastExcel(file, products, localForecast, localDcToGd);
      setLocalForecast(res.newForecast);
      setLocalDcToGd(res.newDcToGd);
      onSaveForecast(res.newForecast, res.newDcToGd);
      onToast(`${res.updatedCount} data forecast berhasil diimpor & disimpan!`);
    } catch (err: any) {
      onToast(`Gagal mengimpor forecast: ${err?.message || 'Format tidak valid'}`, true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Toolbar */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Forecast Pengiriman per Lokasi (DC)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Perencanaan kuota kirim, relasi wilayah gudang penyangga, dan target pencapaian
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
              title="Impor Forecast dari file Excel (.xlsx)"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Impor Forecast</span>
            </button>
          )}

          <button
            onClick={() => exportForecastExcel(products, localForecast, localDcToGd)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
            title="Ekspor Forecast ke file Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor Forecast</span>
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
              <span>Simpan Forecast</span>
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
          Belum ada master produk terdaftar. Silakan tambahkan produk di tab Laporan Stok.
        </div>
      ) : (
        <>
          {/* Main Forecast Matrix */}
          <div className="glass-panel rounded-2xl border border-amber-500/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-300 uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 align-bottom border-r border-slate-800 w-44">
                      Lokasi (DC)
                    </th>
                    {products.map((p) => (
                      <th
                        key={p.code}
                        colSpan={5}
                        className="px-4 py-3 text-center border-b border-l border-slate-800 font-bold text-amber-300"
                      >
                        {p.name} ({p.code})
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-900/60 text-[10px] text-slate-400">
                    {products.map((p) => (
                      <React.Fragment key={`sub-${p.code}`}>
                        <th className="px-3 py-2 text-center border-l border-slate-800">
                          Wilayah Gudang
                        </th>
                        <th className="px-2 py-2 text-center">Forecast</th>
                        <th className="px-2 py-2 text-center">Terkirim</th>
                        <th className="px-2 py-2 text-center">Sisa</th>
                        <th className="px-4 py-2 text-center border-r border-slate-800">
                          Pencapaian
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {CUSTOMERS.map((customer) => (
                    <tr key={customer} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-4 font-bold text-white border-r border-slate-800 whitespace-nowrap">
                        {customer}
                      </td>

                      {products.map((p) => {
                        const forecastVal = localForecast[customer]?.[p.name] || 0;
                        const terkirim = salesData
                          .filter(
                            (s) => s.namaPelanggan === customer && s.itemCode === p.code
                          )
                          .reduce((sum, s) => sum + s.quantity, 0);

                        const sisa = forecastVal - terkirim;
                        const pencapaian =
                          forecastVal > 0 ? (terkirim / forecastVal) * 100 : 0;
                        const region = localDcToGd[customer]?.[p.name] || 'Gd Jakarta';

                        return (
                          <React.Fragment key={`${customer}-${p.code}`}>
                            {/* Region selector */}
                            <td className="px-2 py-3 border-l border-slate-800">
                              <select
                                value={region}
                                disabled={!isAdmin}
                                onChange={(e) =>
                                  handleRegionChange(customer, p.name, e.target.value)
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:border-amber-400 focus:outline-none disabled:opacity-60"
                              >
                                {GUDANG_REGIONS.map((gd) => (
                                  <option key={gd} value={gd}>
                                    {gd}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Forecast Input */}
                            <td className="px-2 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={forecastVal}
                                disabled={!isAdmin}
                                onChange={(e) =>
                                  handleForecastChange(customer, p.name, e.target.value)
                                }
                                className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-center text-xs focus:border-amber-400 focus:outline-none disabled:opacity-60"
                              />
                            </td>

                            {/* Terkirim */}
                            <td className="px-2 py-3 text-center font-mono text-slate-300">
                              {formatNumber(terkirim)}
                            </td>

                            {/* Sisa */}
                            <td
                              className={`px-2 py-3 text-center font-mono font-bold ${
                                sisa < 0 ? 'text-red-400' : 'text-emerald-400'
                              }`}
                            >
                              {formatNumber(sisa)}
                            </td>

                            {/* Pencapaian % and bar */}
                            <td className="px-4 py-3 border-r border-slate-800 min-w-[140px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      pencapaian >= 100
                                        ? 'bg-emerald-500'
                                        : pencapaian >= 70
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(pencapaian, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-slate-300 w-12 text-right">
                                  {pencapaian.toFixed(1)}%
                                </span>
                              </div>
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

          {/* Regional Summary Table (Total Forecast per Wilayah Gudang) */}
          <div className="glass-panel rounded-2xl border border-amber-500/20 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Total Forecast per Wilayah Gudang
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Agregasi kebutuhan stok yang dipasok dari masing-masing wilayah
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 align-bottom border-r border-slate-800 w-48">
                      Wilayah Gudang
                    </th>
                    {products.map((p) => (
                      <th
                        key={p.code}
                        colSpan={3}
                        className="px-4 py-3 text-center border-b border-l border-slate-800 font-bold text-amber-300"
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-900/60 text-[10px]">
                    {products.map((p) => (
                      <React.Fragment key={`sum-${p.code}`}>
                        <th className="px-3 py-2 text-center border-l border-slate-800">
                          Total Forecast
                        </th>
                        <th className="px-3 py-2 text-center">Total Terkirim</th>
                        <th className="px-3 py-2 text-center border-r border-slate-800">
                          Total Sisa
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {GUDANG_REGIONS.map((gd) => (
                    <tr key={gd} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-bold text-white border-r border-slate-800">
                        {gd}
                      </td>

                      {products.map((p) => {
                        let totalForecast = 0;
                        let totalTerkirim = 0;

                        CUSTOMERS.forEach((cust) => {
                          if (localDcToGd[cust]?.[p.name] === gd) {
                            totalForecast += localForecast[cust]?.[p.name] || 0;
                            totalTerkirim += salesData
                              .filter(
                                (s) => s.namaPelanggan === cust && s.itemCode === p.code
                              )
                              .reduce((sum, s) => sum + s.quantity, 0);
                          }
                        });

                        const totalSisa = totalForecast - totalTerkirim;

                        return (
                          <React.Fragment key={`${gd}-${p.code}`}>
                            <td className="px-3 py-3.5 text-center font-mono font-bold text-slate-200 border-l border-slate-800">
                              {formatNumber(totalForecast)}
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-sky-400">
                              {formatNumber(totalTerkirim)}
                            </td>
                            <td
                              className={`px-3 py-3.5 text-center font-mono font-bold border-r border-slate-800 ${
                                totalSisa < 0 ? 'text-red-400' : 'text-emerald-400'
                              }`}
                            >
                              {formatNumber(totalSisa)}
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
        </>
      )}
    </div>
  );
};
