import React, { useState } from 'react';
import { Product, StockEntry, SaleRecord, User } from '../types';
import { calculateProductStock, formatNumber, exportStockExcel } from '../utils/excel';
import {
  Search,
  PlusCircle,
  ArrowDownToLine,
  Truck,
  Download,
  Printer,
  Edit2,
  Trash2,
  AlertTriangle,
  History,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface StockViewProps {
  products: Product[];
  stockEntries: StockEntry[];
  salesData: SaleRecord[];
  currentUser: User | null;
  onOpenAddProduct: () => void;
  onOpenEditProduct: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
  onOpenAddStockEntry: () => void;
  onOpenEditStockEntry: (e: StockEntry) => void;
  onDeleteStockEntry: (e: StockEntry) => void;
  onOpenRecordSale: () => void;
}

type SortKey = 'code' | 'name' | 'totalIn' | 'totalSold' | 'finalStock';

export const StockView: React.FC<StockViewProps> = ({
  products,
  stockEntries,
  salesData,
  currentUser,
  onOpenAddProduct,
  onOpenEditProduct,
  onDeleteProduct,
  onOpenAddStockEntry,
  onOpenEditStockEntry,
  onDeleteStockEntry,
  onOpenRecordSale,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Stock table pagination
  const [stockPage, setStockPage] = useState(1);
  const [stockRowsPerPage, setStockRowsPerPage] = useState<number | 'all'>(10);

  // History table filter & pagination
  const [historyFilterCode, setHistoryFilterCode] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState<number | 'all'>(10);

  // Filter & calculate products
  const computedProducts = products.map((p) => {
    const { totalIn, totalSold, finalStock } = calculateProductStock(
      p.code,
      stockEntries,
      salesData
    );
    return { ...p, totalIn, totalSold, finalStock };
  });

  const filteredProducts = computedProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort
  filteredProducts.sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const order = sortOrder === 'asc' ? 1 : -1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * order;
    }
    return ((aVal as number) - (bVal as number)) * order;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Stock Pagination calculations
  const totalStockRows = filteredProducts.length;
  const effectiveStockRowsPerPage =
    stockRowsPerPage === 'all' ? totalStockRows || 1 : stockRowsPerPage;
  const totalStockPages = Math.ceil(totalStockRows / effectiveStockRowsPerPage) || 1;
  const currentSafeStockPage = Math.min(Math.max(stockPage, 1), totalStockPages);
  const stockStartIndex = (currentSafeStockPage - 1) * effectiveStockRowsPerPage;
  const stockEndIndex = Math.min(stockStartIndex + effectiveStockRowsPerPage, totalStockRows);
  const displayedProducts = filteredProducts.slice(stockStartIndex, stockEndIndex);

  // History Data & Sorting
  let filteredHistory = [...stockEntries];
  if (historyFilterCode) {
    filteredHistory = filteredHistory.filter((e) => e.itemCode === historyFilterCode);
  }
  filteredHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalHistoryRows = filteredHistory.length;
  const effectiveHistoryRowsPerPage =
    historyRowsPerPage === 'all' ? totalHistoryRows || 1 : historyRowsPerPage;
  const totalHistoryPages = Math.ceil(totalHistoryRows / effectiveHistoryRowsPerPage) || 1;
  const currentSafeHistoryPage = Math.min(Math.max(historyPage, 1), totalHistoryPages);
  const historyStartIndex = (currentSafeHistoryPage - 1) * effectiveHistoryRowsPerPage;
  const historyEndIndex = Math.min(
    historyStartIndex + effectiveHistoryRowsPerPage,
    totalHistoryRows
  );
  const displayedHistory = filteredHistory.slice(historyStartIndex, historyEndIndex);

  const filterItemName = products.find((p) => p.code === historyFilterCode)?.name;

  return (
    <div className="space-y-8">
      {/* Action Toolbar */}
      <div className="no-print flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setStockPage(1);
            }}
            placeholder="Cari nama atau kode barang..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={onOpenAddProduct}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Produk Baru</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onOpenAddStockEntry}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-semibold text-xs transition"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Stok Masuk</span>
            </button>
          )}

          <button
            onClick={onOpenRecordSale}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Catat Pengiriman</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => exportStockExcel(products, stockEntries, salesData)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
              title="Ekspor seluruh laporan stok ke Excel (.xlsx)"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Stok</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
            title="Cetak laporan stok"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="glass-panel rounded-2xl border border-amber-500/20 overflow-hidden print-area">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Laporan Stok Barang (Total Semua Gudang)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan akumulasi penerimaan, pengiriman, dan sisa stok akhir
            </p>
          </div>

          {/* Rows per page selector */}
          <div className="no-print flex items-center gap-2 text-xs text-slate-400">
            <span>Tampilkan</span>
            <select
              value={stockRowsPerPage}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                setStockRowsPerPage(val);
                setStockPage(1);
              }}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:border-amber-400 focus:outline-none"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="all">Semua</option>
            </select>
            <span>entri</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-amber-400 transition"
                  onClick={() => handleSort('code')}
                >
                  Kode {sortKey === 'code' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="px-6 py-3 cursor-pointer hover:text-amber-400 transition"
                  onClick={() => handleSort('name')}
                >
                  Nama Barang {sortKey === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:text-amber-400 transition"
                  onClick={() => handleSort('totalIn')}
                >
                  Total Masuk {sortKey === 'totalIn' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:text-amber-400 transition"
                  onClick={() => handleSort('totalSold')}
                >
                  Total Keluar {sortKey === 'totalSold' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:text-amber-400 transition"
                  onClick={() => handleSort('finalStock')}
                >
                  Total Stok Akhir {sortKey === 'finalStock' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-3">Satuan</th>
                {isAdmin && <th className="px-4 py-3 text-center no-print">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada barang yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                displayedProducts.map((p, idx) => {
                  const rowNumber = stockStartIndex + idx + 1;
                  const isLow = p.finalStock <= 20 && p.finalStock > 0;
                  const isOut = p.finalStock <= 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isLow ? 'bg-amber-500/5' : isOut ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center font-mono text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-amber-400">{p.code}</td>
                      <td className="px-6 py-3.5 text-white font-semibold whitespace-nowrap">
                        {p.name}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono group">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{formatNumber(p.totalIn)}</span>
                          <button
                            onClick={() => {
                              setHistoryFilterCode(p.code);
                              setHistoryPage(1);
                              document
                                .getElementById('history-section')
                                ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="no-print p-1 rounded hover:bg-slate-700 text-sky-400 hover:text-sky-300 opacity-70 group-hover:opacity-100 transition"
                            title={`Filter riwayat masuk untuk ${p.name}`}
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-300">
                        {formatNumber(p.totalSold)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold">
                        <div className="flex items-center justify-center gap-1.5">
                          {isLow && (
                            <span title="Stok Menipis">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            </span>
                          )}
                          {isOut && (
                            <span title="Stok Habis">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            </span>
                          )}
                          <span
                            className={
                              isOut
                                ? 'text-red-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            {formatNumber(p.finalStock)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{p.unit}</td>

                      {isAdmin && (
                        <td className="px-4 py-3.5 text-center no-print">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onOpenEditProduct(p)}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-slate-800 transition"
                              title="Edit Master Produk"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteProduct(p)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-slate-800 transition"
                              title="Hapus Master Produk"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Stock Pagination Controls */}
        <div className="no-print p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Menampilkan {totalStockRows > 0 ? stockStartIndex + 1 : 0} sampai {stockEndIndex} dari{' '}
            {totalStockRows} entri
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setStockPage((prev) => Math.max(prev - 1, 1))}
              disabled={stockPage <= 1}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-bold text-slate-200">
              {currentSafeStockPage} / {totalStockPages}
            </span>
            <button
              onClick={() => setStockPage((prev) => Math.min(prev + 1, totalStockPages))}
              disabled={stockPage >= totalStockPages}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stock Entry History Table */}
      <div
        id="history-section"
        className="glass-panel rounded-2xl border border-amber-500/20 overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Riwayat Pemasukan Stok
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Log catatan penerimaan barang masuk ke gudang-gudang operasional
            </p>
          </div>

          <div className="flex items-center gap-3">
            {historyFilterCode && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-950/80 border border-sky-500/40 text-sky-300 text-xs">
                <span>Filter: {filterItemName || historyFilterCode}</span>
                <button
                  onClick={() => setHistoryFilterCode(null)}
                  className="hover:text-white"
                  title="Hapus filter riwayat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="no-print flex items-center gap-2 text-xs text-slate-400">
              <span>Tampilkan</span>
              <select
                value={historyRowsPerPage}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                  setHistoryRowsPerPage(val);
                  setHistoryPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:border-amber-400 focus:outline-none"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="all">Semua</option>
              </select>
              <span>entri</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-4 py-3">Kode Barang</th>
                <th className="px-6 py-3">Nama Barang</th>
                <th className="px-6 py-3">Gudang</th>
                <th className="px-4 py-3 text-center">Jumlah Masuk</th>
                {isAdmin && <th className="px-4 py-3 text-center no-print">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {displayedHistory.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500">
                    Belum ada riwayat pemasukan stok.
                  </td>
                </tr>
              ) : (
                displayedHistory.map((entry, idx) => {
                  const rowNumber = historyStartIndex + idx + 1;
                  const item = products.find((p) => p.code === entry.itemCode);

                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-center font-mono text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-300">
                        {new Date(entry.date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">
                        {entry.itemCode}
                      </td>
                      <td className="px-6 py-3 text-white font-semibold whitespace-nowrap">
                        {item ? item.name : 'N/A'}
                      </td>
                      <td className="px-6 py-3 text-slate-300">{entry.warehouse}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400">
                        {formatNumber(entry.quantity)} {item?.unit || ''}
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-3 text-center no-print">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onOpenEditStockEntry(entry)}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-slate-800 transition"
                              title="Edit Entri Stok"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteStockEntry(entry)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-slate-800 transition"
                              title="Hapus Entri Stok"
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

        {/* History Pagination */}
        <div className="no-print p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Menampilkan {totalHistoryRows > 0 ? historyStartIndex + 1 : 0} sampai{' '}
            {historyEndIndex} dari {totalHistoryRows} entri
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
              disabled={historyPage <= 1}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-bold text-slate-200">
              {currentSafeHistoryPage} / {totalHistoryPages}
            </span>
            <button
              onClick={() => setHistoryPage((prev) => Math.min(prev + 1, totalHistoryPages))}
              disabled={historyPage >= totalHistoryPages}
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
