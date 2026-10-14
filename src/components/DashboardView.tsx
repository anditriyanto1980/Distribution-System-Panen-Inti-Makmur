import React from 'react';
import { Product, StockEntry, SaleRecord, ForecastData, WAREHOUSES, CUSTOMERS } from '../types';
import { calculateProductStock, formatCurrency, formatNumber } from '../utils/excel';
import {
  Boxes,
  Truck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Warehouse,
  PieChart as PieIcon,
} from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  stockEntries: StockEntry[];
  salesData: SaleRecord[];
  forecastData: ForecastData;
  onNavigateTab: (tab: 'stock' | 'sales' | 'forecast') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  stockEntries,
  salesData,
  forecastData,
  onNavigateTab,
}) => {
  // Global aggregate metrics
  const totalStockAcrossAll = products.reduce((acc, p) => {
    return acc + calculateProductStock(p.code, stockEntries, salesData).finalStock;
  }, 0);

  const totalQuantityShipped = salesData.reduce((acc, s) => acc + s.quantity, 0);
  const totalRevenue = salesData.reduce((acc, s) => acc + s.totalHarga, 0);

  const lowStockCount = products.filter((p) => {
    const stock = calculateProductStock(p.code, stockEntries, salesData).finalStock;
    return stock <= 20;
  }).length;

  // Chart data calculation
  const totalInValues = products.map((p) => ({
    name: p.name,
    code: p.code,
    val: calculateProductStock(p.code, stockEntries, salesData).totalIn,
  }));
  const sumTotalIn = totalInValues.reduce((a, b) => a + b.val, 0) || 1;

  const totalSoldValues = products.map((p) => ({
    name: p.name,
    code: p.code,
    val: calculateProductStock(p.code, stockEntries, salesData).totalSold,
  }));
  const sumTotalSold = totalSoldValues.reduce((a, b) => a + b.val, 0) || 1;

  // Vibrant gold, amber, bronze, slate accents for charts
  const palette = ['#f59e0b', '#fbbf24', '#d97706', '#38bdf8', '#34d399', '#a78bfa', '#f43f5e'];

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Stok Gudang
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {formatNumber(totalStockAcrossAll)}
            </span>
            <span className="text-xs text-slate-400">Unit / Box</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Stok gabungan 7 gudang operasional
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Barang Terkirim
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Truck className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {formatNumber(totalQuantityShipped)}
            </span>
            <span className="text-xs text-slate-400">Unit</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Dari {salesData.length} transaksi pengiriman
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Nilai Pengiriman
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold font-mono text-amber-300">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Total omset distribusi tercatat
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Status Peringatan Stok
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                lowStockCount > 0
                  ? 'bg-red-500/10 border-red-500/40'
                  : 'bg-emerald-500/10 border-emerald-500/40'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 ${
                  lowStockCount > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                lowStockCount > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {lowStockCount} SKU
            </span>
            <span className="text-xs text-slate-400">Menipis (&le; 20)</span>
          </div>
          <button
            onClick={() => onNavigateTab('stock')}
            className="text-[11px] text-amber-400 hover:underline mt-2 inline-block"
          >
            Lihat rincian stok &rarr;
          </button>
        </div>
      </div>

      {/* Main Stock & Forecast Realization Cards per Product */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Dashboard Stok Gudang & Realisasi Forecast
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('forecast')}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
          >
            <span>Buka Matriks Forecast</span>
            <span>&rarr;</span>
          </button>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 text-slate-500">
            Belum ada master produk terdaftar. Silakan tambahkan di tab Laporan Stok.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {products.map((item) => {
              // Calculate per warehouse stocks
              const warehouseStocks = WAREHOUSES.map((wh) => {
                const stockInfo = calculateProductStock(item.code, stockEntries, salesData, wh);
                return {
                  name: wh.replace('Gudang ', ''),
                  fullName: wh,
                  stock: stockInfo.finalStock,
                };
              });

              const overallStock = calculateProductStock(item.code, stockEntries, salesData);

              // Calculate Target Forecast for this product
              let totalForecast = 0;
              CUSTOMERS.forEach((c) => {
                totalForecast += forecastData[c]?.[item.name] || 0;
              });

              const achievementPct =
                totalForecast > 0 ? (overallStock.totalSold / totalForecast) * 100 : 0;

              const maxStock = Math.max(...warehouseStocks.map((w) => w.stock), 1);

              return (
                <div
                  key={item.id}
                  className="glass-panel p-5 rounded-2xl border border-amber-500/20 space-y-4 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {item.code}
                        </span>
                        <h3 className="font-bold text-base text-white">{item.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Satuan: {item.unit} &middot; Harga Default: {formatCurrency(item.harga)}
                      </p>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold ${
                        overallStock.finalStock <= 0
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : overallStock.finalStock <= 20
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {overallStock.finalStock <= 0
                        ? 'Habis'
                        : overallStock.finalStock <= 20
                        ? 'Menipis'
                        : 'Aman'}
                    </span>
                  </div>

                  {/* Realisasi vs Forecast progress banner */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex justify-between items-center mb-1.5 text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        Realisasi Pengiriman vs Target Forecast
                      </span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          achievementPct >= 100
                            ? 'text-emerald-400'
                            : achievementPct >= 70
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {achievementPct.toFixed(1)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${
                          achievementPct >= 100
                            ? 'bg-emerald-500'
                            : achievementPct >= 70
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(achievementPct, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
                      <span>
                        Terkirim:{' '}
                        <strong className="text-slate-200">
                          {formatNumber(overallStock.totalSold)} {item.unit}
                        </strong>
                      </span>
                      <span>
                        Target Forecast:{' '}
                        <strong className="text-slate-200">
                          {formatNumber(totalForecast)} {item.unit}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Distribution per warehouse horizontal bars */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Sebaran Stok per Gudang
                    </span>
                    {warehouseStocks.map((ws) => (
                      <div key={ws.fullName} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-24 text-right truncate text-slate-400 text-[11px]"
                          title={ws.fullName}
                        >
                          {ws.name}
                        </span>
                        <div className="flex-1 bg-slate-800 rounded-full h-3.5 overflow-hidden flex items-center">
                          <div
                            className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                (ws.stock / maxStock) * 100,
                                ws.stock > 0 ? 5 : 0
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="w-16 font-mono font-semibold text-right text-slate-300 text-[11px]">
                          {formatNumber(ws.stock)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Overall 3-Column Stock Summary */}
                  <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-900/60">
                      <p className="text-[11px] text-slate-400">Total Masuk</p>
                      <p className="text-sm sm:text-base font-bold font-mono text-amber-400">
                        {formatNumber(overallStock.totalIn)}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60">
                      <p className="text-[11px] text-slate-400">Total Terkirim</p>
                      <p className="text-sm sm:text-base font-bold font-mono text-sky-400">
                        {formatNumber(overallStock.totalSold)}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60">
                      <p className="text-[11px] text-slate-400">Stok Akhir</p>
                      <p
                        className={`text-sm sm:text-base font-bold font-mono ${
                          overallStock.finalStock <= 20 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatNumber(overallStock.finalStock)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Visual Analytics / Proportion Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
        {/* Total Barang Masuk Breakdown */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">
              Proporsi Total Barang Masuk
            </h3>
          </div>

          <div className="space-y-3">
            {totalInValues.map((item, idx) => {
              const color = palette[idx % palette.length];
              const pct = ((item.val / sumTotalIn) * 100).toFixed(1);
              return (
                <div key={item.code} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-slate-200 font-medium">{item.name}</span>
                    </div>
                    <span className="font-mono text-slate-400">
                      {formatNumber(item.val)} unit ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Persentase Total Kiriman Breakdown */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">
              Proporsi Total Kiriman (Sales)
            </h3>
          </div>

          <div className="space-y-3">
            {totalSoldValues.map((item, idx) => {
              const color = palette[(idx + 2) % palette.length];
              const pct = ((item.val / sumTotalSold) * 100).toFixed(1);
              return (
                <div key={item.code} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-slate-200 font-medium">{item.name}</span>
                    </div>
                    <span className="font-mono text-slate-400">
                      {formatNumber(item.val)} unit ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
