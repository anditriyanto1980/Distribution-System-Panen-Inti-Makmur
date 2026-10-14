import React, { useState, useRef } from 'react';
import { Product, SaleRecord, User } from '../types';
import { formatCurrency, formatNumber, exportSalesExcel, parseSalesExcel } from '../utils/excel';
import {
  Upload,
  Download,
  Printer,
  PlusCircle,
  Edit2,
  Trash2,
  DollarSign,
  Truck,
  FileSpreadsheet,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SalesViewProps {
  salesData: SaleRecord[];
  products: Product[];
  currentUser: User | null;
  onOpenRecordSale: () => void;
  onOpenEditSale: (sale: SaleRecord) => void;
  onDeleteSale: (sale: SaleRecord) => void;
  onSalesImported: (updatedSales: SaleRecord[], added: number, skipped: number) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  salesData,
  products,
  currentUser,
  onOpenRecordSale,
  onOpenEditSale,
  onDeleteSale,
  onSalesImported,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Pagination states
  const [productFilterCode, setProductFilterCode] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(10);

  // Sorting
  const [sortKey, setSortKey] = useState<keyof SaleRecord>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // KPI Calculations
  const totalRevenue = salesData.reduce((sum, s) => sum + s.totalHarga, 0);
  const totalItemsSold = salesData.reduce((sum, s) => sum + s.quantity, 0);
  const totalTransactions = salesData.length;

  // Find top product
  const productQuantityMap: Record<string, number> = {};
  salesData.forEach((s) => {
    productQuantityMap[s.itemCode] = (productQuantityMap[s.itemCode] || 0) + s.quantity;
  });
  const topProductEntry = Object.entries(productQuantityMap).sort((a, b) => b[1] - a[1])[0];
  const topProductObj = topProductEntry ? products.find((p) => p.code === topProductEntry[0]) : null;
  const topProductName = topProductObj
    ? `${topProductObj.name} (${formatNumber(topProductEntry[1])} unit)`
    : 'Belum ada data';

  // Filtered sales
  let filtered = [...salesData];
  if (productFilterCode) {
    filtered = filtered.filter((s) => s.itemCode === productFilterCode);
  }

  // Sorting
  filtered.sort((a, b) => {
    let aVal: any = a[sortKey];
    let bVal: any = b[sortKey];
    if (sortKey === 'date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    const order = sortOrder === 'asc' ? 1 : -1;
    if (typeof aVal === 'string') {
      return aVal.localeCompare(bVal) * order;
    }
    return (aVal - bVal) * order;
  });

  const handleSort = (key: keyof SaleRecord) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // Pagination
  const totalRows = filtered.length;
  const effectiveRowsPerPage = rowsPerPage === 'all' ? totalRows || 1 : rowsPerPage;
  const totalPages = Math.ceil(totalRows / effectiveRowsPerPage) || 1;
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * effectiveRowsPerPage;
  const endIndex = Math.min(startIndex + effectiveRowsPerPage, totalRows);
  const displayedSales = filtered.slice(startIndex, endIndex);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseSalesExcel(file, products, salesData);
      onSalesImported(result.updatedList, result.added, result.skipped);
    } catch (err: any) {
      alert(`Gagal membaca file Excel: ${err?.message || 'Format tidak valid'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            Laporan Distribusi & Pengiriman
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Riwayat logistik, nomor surat jalan (SJ), dan pesanan (SO)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
              title="Impor data pengiriman dari file Excel (.xlsx)"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Impor Pengiriman</span>
            </button>
          )}

          <button
            onClick={() => exportSalesExcel(salesData, products)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
            title="Ekspor seluruh data pengiriman ke file Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor Pengiriman</span>
          </button>

          <button
            onClick={onOpenRecordSale}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Pengiriman</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Cetak</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="glass-panel p-4 rounded-xl border border-amber-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Total Pendapatan</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-white mt-2">
            {formatCurrency(totalRevenue)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Omset dari seluruh pengiriman
          </span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Total Terkirim</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-white mt-2">
            {formatNumber(totalItemsSold)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Akumulasi kuantitas barang
          </span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Jumlah Transaksi</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-white mt-2">
            {formatNumber(totalTransactions)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Surat jalan & pengiriman selesai
          </span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Produk Terlaris</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-amber-300 mt-2 truncate" title={topProductName}>
            {topProductName}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Berdasarkan volume unit terkirim
          </span>
        </div>
      </div>

      {/* Filter & Rows Bar */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span>Tampilkan</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
              setRowsPerPage(val);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="all">Semua</option>
          </select>
          <span>entri per halaman</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 shrink-0">Filter Barang:</span>
          <select
            value={productFilterCode}
            onChange={(e) => {
              setProductFilterCode(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-60 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            <option value="">Semua Barang</option>
            {products.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="glass-panel rounded-2xl border border-amber-500/20 overflow-hidden print-area">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3 w-10 text-center">No</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-amber-400"
                  onClick={() => handleSort('date')}
                >
                  Tanggal {sortKey === 'date' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-3">No. SO</th>
                <th className="px-4 py-3">No. SJ</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-amber-400"
                  onClick={() => handleSort('namaPelanggan')}
                >
                  Pelanggan {sortKey === 'namaPelanggan' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-3 py-3">Kode</th>
                <th
                  className="px-6 py-3 cursor-pointer hover:text-amber-400"
                  onClick={() => handleSort('itemCode')}
                >
                  Nama Barang {sortKey === 'itemCode' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3 text-right">Harga Satuan</th>
                <th
                  className="px-3 py-3 text-center cursor-pointer hover:text-amber-400"
                  onClick={() => handleSort('quantity')}
                >
                  Qty {sortKey === 'quantity' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-amber-400"
                  onClick={() => handleSort('totalHarga')}
                >
                  Total Harga {sortKey === 'totalHarga' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                {isAdmin && <th className="px-3 py-3 text-center no-print">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {displayedSales.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 13 : 12} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data pengiriman yang dicatat.
                  </td>
                </tr>
              ) : (
                displayedSales.map((sale, idx) => {
                  const rowNumber = startIndex + idx + 1;
                  const item = products.find((p) => p.code === sale.itemCode);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-3.5 text-center font-mono text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300 whitespace-nowrap">
                        {new Date(sale.date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-amber-400/90 whitespace-nowrap">
                        {sale.nomorSO || '-'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sky-400/90 whitespace-nowrap">
                        {sale.nomorSJ || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-white font-semibold whitespace-nowrap">
                        {sale.namaPelanggan}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                        {sale.gudang.replace('Gudang ', '')}
                      </td>
                      <td className="px-3 py-3.5 font-mono font-bold text-amber-400">
                        {sale.itemCode}
                      </td>
                      <td className="px-6 py-3.5 text-slate-100 whitespace-nowrap">
                        {item ? item.name : sale.itemCode}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs max-w-xs truncate" title={sale.keterangan}>
                        {sale.keterangan || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                        {formatCurrency(sale.hargaSatuan)}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-white">
                        {formatNumber(sale.quantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-300">
                        {formatCurrency(sale.totalHarga)}
                      </td>

                      {isAdmin && (
                        <td className="px-3 py-3.5 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onOpenEditSale(sale)}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-slate-800 transition"
                              title="Edit Pengiriman"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteSale(sale)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-slate-800 transition"
                              title="Hapus Pengiriman"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="no-print p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Menampilkan {totalRows > 0 ? startIndex + 1 : 0} sampai {endIndex} dari {totalRows} entri
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-bold text-slate-200">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
