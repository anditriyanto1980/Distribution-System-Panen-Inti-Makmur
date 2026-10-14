import React, { useState, useEffect, useRef } from 'react';
import {
  Product,
  StockEntry,
  SaleRecord,
  User,
  ForecastData,
  DcToGdMap,
  GudangAllocations,
  HargaPelanggan,
  ActiveTab,
} from './types';
import {
  loadStoredData,
  persistAllData,
  restoreBackupJson,
  STORAGE_KEYS,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { LoginOverlay } from './components/LoginOverlay';
import { DashboardView } from './components/DashboardView';
import { StockView } from './components/StockView';
import { SalesView } from './components/SalesView';
import { ForecastView } from './components/ForecastView';
import { AllocationView } from './components/AllocationView';
import { PricesView } from './components/PricesView';
import { UsersView } from './components/UsersView';
import { ProductModal } from './components/modals/ProductModal';
import { StockEntryModal } from './components/modals/StockEntryModal';
import { SaleModal } from './components/modals/SaleModal';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Master data states
  const [products, setProducts] = useState<Product[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData>({});
  const [dcToGdMap, setDcToGdMap] = useState<DcToGdMap>({});
  const [gudangAllocations, setGudangAllocations] = useState<GudangAllocations>({});
  const [hargaPelanggan, setHargaPelanggan] = useState<HargaPelanggan>({});

  // App Session states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isStockEntryModalOpen, setIsStockEntryModalOpen] = useState(false);
  const [editingStockEntry, setEditingStockEntry] = useState<StockEntry | null>(null);

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);

  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Toast Notification state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    isError: boolean;
  }>({
    visible: false,
    message: '',
    isError: false,
  });

  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize data on mount
  useEffect(() => {
    const data = loadStoredData();
    setProducts(data.products);
    setStockEntries(data.stockEntries);
    setSalesData(data.salesData);
    setUsers(data.users);
    setForecastData(data.forecastData);
    setDcToGdMap(data.dcToGdMap);
    setGudangAllocations(data.gudangAllocations);
    setHargaPelanggan(data.hargaPelanggan);

    // Check stored user session
    const savedUserJson = sessionStorage.getItem(STORAGE_KEYS.currentUser);
    if (savedUserJson) {
      try {
        const parsedUser = JSON.parse(savedUserJson);
        setCurrentUser(parsedUser);
      } catch {
        setCurrentUser(null);
      }
    } else {
      // By default show login overlay, or if admin exists auto-suggest
      setCurrentUser(null);
    }

    setIsInitialized(true);
  }, []);

  // Save changes to localStorage whenever master data updates
  useEffect(() => {
    if (!isInitialized) return;
    persistAllData({
      products,
      stockEntries,
      salesData,
      users,
      forecastData,
      dcToGdMap,
      gudangAllocations,
      hargaPelanggan,
    });
  }, [
    products,
    stockEntries,
    salesData,
    users,
    forecastData,
    dcToGdMap,
    gudangAllocations,
    hargaPelanggan,
    isInitialized,
  ]);

  const showToast = (message: string, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
  };

  // Auth Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    showToast(`Selamat datang, ${user.username}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(STORAGE_KEYS.currentUser);
    setActiveTab('dashboard');
    showToast('Anda telah keluar dari sistem.');
  };

  // Product Master Handlers
  const handleSaveProduct = (prodData: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    harga: number;
  }) => {
    if (prodData.id) {
      // Edit
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prodData.id
            ? { ...p, unit: prodData.unit, harga: prodData.harga }
            : p
        )
      );
      showToast(`Produk "${prodData.name}" berhasil diperbarui.`);
    } else {
      // Add
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        code: prodData.code,
        name: prodData.name,
        unit: prodData.unit,
        harga: prodData.harga,
      };
      setProducts((prev) => [...prev, newProd]);
      showToast(`Produk baru "${prodData.name}" (${prodData.code}) berhasil ditambahkan.`);
    }
  };

  const handleDeleteProduct = (p: Product) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Master Produk',
      message: `Apakah Anda yakin ingin menghapus produk "${p.name}" (${p.code})? Semua riwayat penerimaan stok dan pengiriman terkait produk ini akan ikut dibersihkan.`,
      confirmLabel: 'Hapus Produk',
      isDestructive: true,
      onConfirm: () => {
        setProducts((prev) => prev.filter((item) => item.id !== p.id));
        setStockEntries((prev) => prev.filter((entry) => entry.itemCode !== p.code));
        setSalesData((prev) => prev.filter((sale) => sale.itemCode !== p.code));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast(`Produk "${p.name}" telah dihapus.`);
      },
    });
  };

  // Stock Entry Handlers
  const handleSaveNewStockEntries = (
    entries: { date: string; itemCode: string; warehouse: string; quantity: number }[]
  ) => {
    const newItems: StockEntry[] = entries.map((e, idx) => ({
      id: `entry-${Date.now()}-${idx}`,
      ...e,
    }));
    setStockEntries((prev) => [...newItems, ...prev]);
    showToast(`${entries.length} penerimaan stok berhasil dicatat.`);
  };

  const handleUpdateStockEntry = (id: string, date: string, quantity: number) => {
    if (quantity <= 0) {
      setStockEntries((prev) => prev.filter((e) => e.id !== id));
      showToast('Entri stok dihapus karena jumlah diubah menjadi 0.');
    } else {
      setStockEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, date, quantity } : e))
      );
      showToast('Entri stok berhasil diperbarui.');
    }
  };

  const handleDeleteStockEntry = (entry: StockEntry) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Entri Pemasukan',
      message: `Apakah Anda yakin ingin menghapus riwayat penerimaan ${entry.quantity} unit ke ${entry.warehouse}?`,
      confirmLabel: 'Hapus Entri',
      isDestructive: true,
      onConfirm: () => {
        setStockEntries((prev) => prev.filter((e) => e.id !== entry.id));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast('Entri stok berhasil dihapus.');
      },
    });
  };

  // Sale / Shipment Handlers
  const handleSaveSale = (saleData: Omit<SaleRecord, 'id'> & { id?: string }) => {
    if (saleData.id) {
      // Edit
      setSalesData((prev) =>
        prev.map((s) => (s.id === saleData.id ? { ...s, ...saleData, id: saleData.id! } : s))
      );
      showToast('Data pengiriman berhasil diperbarui.');
    } else {
      // Add
      const newSale: SaleRecord = {
        id: `sale-${Date.now()}`,
        ...saleData,
      };
      setSalesData((prev) => [newSale, ...prev]);
      showToast('Pengiriman baru berhasil dicatat!');
    }
  };

  const handleDeleteSale = (sale: SaleRecord) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Data Pengiriman',
      message: `Apakah Anda yakin ingin menghapus catatan pengiriman ${sale.itemCode} ke ${sale.namaPelanggan}?`,
      confirmLabel: 'Hapus Pengiriman',
      isDestructive: true,
      onConfirm: () => {
        setSalesData((prev) => prev.filter((s) => s.id !== sale.id));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast('Data pengiriman telah dihapus.');
      },
    });
  };

  const handleSalesImported = (
    updatedSales: SaleRecord[],
    added: number,
    skipped: number
  ) => {
    setSalesData(updatedSales);
    let msg = `${added} data pengiriman berhasil diimpor.`;
    if (skipped > 0) msg += ` (${skipped} baris dilewati karena format tidak sesuai)`;
    showToast(msg, added === 0 && skipped > 0);
  };

  // Forecast & Allocations Handlers
  const handleSaveForecast = (newForecast: ForecastData, newDcToGd: DcToGdMap) => {
    setForecastData(newForecast);
    setDcToGdMap(newDcToGd);
  };

  const handleSaveAllocations = (newAllocations: GudangAllocations) => {
    setGudangAllocations(newAllocations);
  };

  const handleSavePrices = (newPrices: HargaPelanggan) => {
    setHargaPelanggan(newPrices);
  };

  // User Handlers
  const handleAddUser = (newU: {
    username: string;
    password?: string;
    role: 'admin' | 'user';
  }) => {
    const created: User = {
      id: `user-${Date.now()}`,
      username: newU.username,
      password: newU.password,
      role: newU.role,
    };
    setUsers((prev) => [...prev, created]);
  };

  const handleDeleteUser = (u: User) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun pengguna "${u.username}"?`,
      confirmLabel: 'Hapus Pengguna',
      isDestructive: true,
      onConfirm: () => {
        setUsers((prev) => prev.filter((user) => user.id !== u.id));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast(`Pengguna "${u.username}" telah dihapus.`);
      },
    });
  };

  // Restore Handlers
  const handleRequestRestore = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Pulihkan (Restore) Seluruh Data',
      message:
        'PERINGATAN: Memulihkan data dari file JSON cadangan akan MENIMPA seluruh stok, transaksi pengiriman, forecast, dan akun saat ini. Pastikan Anda telah membuat cadangan terbaru. Lanjutkan?',
      confirmLabel: 'Pilih File Cadangan',
      isDestructive: true,
      onConfirm: () => {
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        restoreFileInputRef.current?.click();
      },
    });
  };

  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const ok = restoreBackupJson(text);
        if (ok) {
          showToast('Data berhasil dipulihkan! Memuat ulang sistem...');
          setTimeout(() => {
            const reloaded = loadStoredData();
            setProducts(reloaded.products);
            setStockEntries(reloaded.stockEntries);
            setSalesData(reloaded.salesData);
            setUsers(reloaded.users);
            setForecastData(reloaded.forecastData);
            setDcToGdMap(reloaded.dcToGdMap);
            setGudangAllocations(reloaded.gudangAllocations);
            setHargaPelanggan(reloaded.hargaPelanggan);
          }, 600);
        } else {
          showToast('File JSON cadangan tidak valid atau rusak.', true);
        }
      } catch {
        showToast('Gagal memproses file JSON cadangan.', true);
      } finally {
        if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500/20 selection:text-amber-300">
      {/* Login Screen Overlay when not authenticated */}
      {!currentUser && (
        <LoginOverlay users={users} onLoginSuccess={handleLogin} />
      )}

      {/* Main App Layout */}
      {currentUser && (
        <>
          <Navbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            currentUser={currentUser}
            onLogout={handleLogout}
            currentDateStr={currentDateStr}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {activeTab === 'dashboard' && (
              <DashboardView
                products={products}
                stockEntries={stockEntries}
                salesData={salesData}
                forecastData={forecastData}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'stock' && (
              <StockView
                products={products}
                stockEntries={stockEntries}
                salesData={salesData}
                currentUser={currentUser}
                onOpenAddProduct={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                onOpenEditProduct={(p) => {
                  setEditingProduct(p);
                  setIsProductModalOpen(true);
                }}
                onDeleteProduct={handleDeleteProduct}
                onOpenAddStockEntry={() => {
                  setEditingStockEntry(null);
                  setIsStockEntryModalOpen(true);
                }}
                onOpenEditStockEntry={(entry) => {
                  setEditingStockEntry(entry);
                  setIsStockEntryModalOpen(true);
                }}
                onDeleteStockEntry={handleDeleteStockEntry}
                onOpenRecordSale={() => {
                  setEditingSale(null);
                  setIsSaleModalOpen(true);
                }}
              />
            )}

            {activeTab === 'sales' && (
              <SalesView
                salesData={salesData}
                products={products}
                currentUser={currentUser}
                onOpenRecordSale={() => {
                  setEditingSale(null);
                  setIsSaleModalOpen(true);
                }}
                onOpenEditSale={(sale) => {
                  setEditingSale(sale);
                  setIsSaleModalOpen(true);
                }}
                onDeleteSale={handleDeleteSale}
                onSalesImported={handleSalesImported}
              />
            )}

            {activeTab === 'forecast' && (
              <ForecastView
                products={products}
                salesData={salesData}
                forecastData={forecastData}
                dcToGdMap={dcToGdMap}
                currentUser={currentUser}
                onSaveForecast={handleSaveForecast}
                onToast={showToast}
              />
            )}

            {activeTab === 'allocation' && (
              <AllocationView
                products={products}
                allocations={gudangAllocations}
                forecastData={forecastData}
                dcToGdMap={dcToGdMap}
                currentUser={currentUser}
                onSaveAllocations={handleSaveAllocations}
                onToast={showToast}
              />
            )}

            {activeTab === 'prices' && currentUser.role === 'admin' && (
              <PricesView
                products={products}
                customerPrices={hargaPelanggan}
                onSavePrices={handleSavePrices}
                onToast={showToast}
              />
            )}

            {activeTab === 'users' && currentUser.role === 'admin' && (
              <UsersView
                users={users}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
                onRequestRestore={handleRequestRestore}
                onToast={showToast}
              />
            )}
          </main>

          <footer className="no-print mt-auto py-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
            <p>
              Sistem Manajemen Stok & Pengiriman &middot;{' '}
              <span className="text-amber-400 font-medium">PT Panen Inti Makmur</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Powered By <span className="text-slate-400 font-medium">Andi Triyanto</span>
            </p>
          </footer>
        </>
      )}

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
        existingProducts={products}
      />

      <StockEntryModal
        isOpen={isStockEntryModalOpen}
        onClose={() => {
          setIsStockEntryModalOpen(false);
          setEditingStockEntry(null);
        }}
        onSaveNew={handleSaveNewStockEntries}
        onUpdateExisting={handleUpdateStockEntry}
        products={products}
        editingEntry={editingStockEntry}
      />

      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setEditingSale(null);
        }}
        onSave={handleSaveSale}
        products={products}
        stockEntries={stockEntries}
        existingSales={salesData}
        customerPrices={hargaPelanggan}
        editingSale={editingSale}
      />

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmLabel={confirmModalState.confirmLabel}
        isDestructive={confirmModalState.isDestructive}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Hidden file input for restore JSON */}
      <input
        ref={restoreFileInputRef}
        type="file"
        accept=".json"
        onChange={handleRestoreFileSelected}
        className="hidden"
      />

      {/* Toast Notification */}
      <div
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 transform ${
          toast.visible
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-6 opacity-0 scale-95 pointer-events-none'
        } ${
          toast.isError
            ? 'bg-red-600 text-white shadow-red-500/20'
            : 'bg-emerald-600 text-white shadow-emerald-500/20'
        }`}
      >
        {toast.isError ? (
          <AlertCircle className="w-4 h-4 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        )}
        <span className="text-xs font-semibold">{toast.message}</span>
      </div>
    </div>
  );
}
