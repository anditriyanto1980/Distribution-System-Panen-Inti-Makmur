import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import {
  Product,
  StockEntry,
  SaleRecord,
  User,
  InviteRecord,
  ForecastData,
  DcToGdMap,
  GudangAllocations,
  HargaPelanggan,
  ActiveTab,
} from './types';
import {
  syncUserOnSignIn,
  seedInitialWorkspaceDataIfNeeded,
  subscribeProducts,
  subscribeStockEntries,
  subscribeSales,
  subscribeForecastConfig,
  subscribeAllocationConfig,
  subscribePricesConfig,
  subscribeUsers,
  subscribeInvites,
  subscribeCurrentUserStatus,
  createProductInDb,
  updateProductInDb,
  deleteProductCascadeInDb,
  createStockEntriesInDb,
  updateStockEntryInDb,
  deleteStockEntryInDb,
  createSaleInDb,
  updateSaleInDb,
  deleteSaleInDb,
  importSalesBatchInDb,
  saveForecastConfigInDb,
  saveAllocationConfigInDb,
  savePricesConfigInDb,
  createInviteInDb,
  deleteInviteInDb,
  approveOrUpdateUserInDb,
  deleteUserAndMemberInDb,
  restoreBackupToFirestore,
} from './utils/firestoreService';
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
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  // Real-time Firestore data states (Zero browser storage)
  const [products, setProducts] = useState<Product[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData>({});
  const [dcToGdMap, setDcToGdMap] = useState<DcToGdMap>({});
  const [gudangAllocations, setGudangAllocations] = useState<GudangAllocations>({});
  const [hargaPelanggan, setHargaPelanggan] = useState<HargaPelanggan>({});

  // Auth & loading states
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

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

  const showToast = (message: string, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  };

  // 1. Firebase Auth state listener
  useEffect(() => {
    let statusUnsub: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (statusUnsub) {
        statusUnsub();
        statusUnsub = null;
      }

      if (!fbUser) {
        setCurrentUser(null);
        setProducts([]);
        setStockEntries([]);
        setSalesData([]);
        setUsers([]);
        setInvites([]);
        setForecastData({});
        setDcToGdMap({});
        setGudangAllocations({});
        setHargaPelanggan({});
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      try {
        const syncedUser = await syncUserOnSignIn(fbUser);
        setCurrentUser(syncedUser);

        if (syncedUser.status === 'active' && syncedUser.role === 'admin') {
          await seedInitialWorkspaceDataIfNeeded(syncedUser.uid);
        }

        // Listen to live user status/role updates (for instant approval/revocation)
        statusUnsub = subscribeCurrentUserStatus(fbUser.uid, (updatedUser) => {
          if (updatedUser) {
            setCurrentUser(updatedUser);
          }
        });
      } catch (err: any) {
        showToast(err?.message || 'Gagal sinkronisasi profil pengguna.', true);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (statusUnsub) statusUnsub();
    };
  }, []);

  // 2. Real-time Firestore subscriptions (only when user is active & authenticated)
  useEffect(() => {
    if (!currentUser || currentUser.status !== 'active') return;

    setDataLoading(true);
    let initialLoaded = 0;
    const markLoaded = () => {
      initialLoaded++;
      if (initialLoaded >= 3) {
        setDataLoading(false);
      }
    };

    const unsubProducts = subscribeProducts((items) => {
      setProducts(items);
      markLoaded();
    });

    const unsubEntries = subscribeStockEntries((entries) => {
      setStockEntries(entries);
      markLoaded();
    });

    const unsubSales = subscribeSales((sales) => {
      setSalesData(sales);
      markLoaded();
    });

    const unsubForecast = subscribeForecastConfig((forecast, map) => {
      setForecastData(forecast);
      setDcToGdMap(map);
    });

    const unsubAllocation = subscribeAllocationConfig((alloc) => {
      setGudangAllocations(alloc);
    });

    const unsubPrices = subscribePricesConfig((prices) => {
      setHargaPelanggan(prices);
    });

    let unsubUsers: (() => void) | null = null;
    let unsubInvites: (() => void) | null = null;

    if (currentUser.role === 'admin') {
      unsubUsers = subscribeUsers(setUsers);
      unsubInvites = subscribeInvites(setInvites);
    }

    return () => {
      unsubProducts();
      unsubEntries();
      unsubSales();
      unsubForecast();
      unsubAllocation();
      unsubPrices();
      if (unsubUsers) unsubUsers();
      if (unsubInvites) unsubInvites();
    };
  }, [currentUser?.uid, currentUser?.status, currentUser?.role]);

  // Auth Actions
  const handleGoogleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveTab('dashboard');
    showToast('Anda telah keluar dari sistem.');
  };

  // Product Master Handlers
  const handleSaveProduct = async (prodData: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    harga: number;
  }) => {
    if (!currentUser) return;
    try {
      if (prodData.id) {
        await updateProductInDb(prodData.id, {
          name: prodData.name,
          unit: prodData.unit,
          harga: prodData.harga,
        });
        showToast(`Produk "${prodData.name}" berhasil diperbarui di database.`);
      } else {
        await createProductInDb(
          {
            code: prodData.code,
            name: prodData.name,
            unit: prodData.unit,
            harga: prodData.harga,
          },
          currentUser.uid
        );
        showToast(`Produk baru "${prodData.name}" (${prodData.code}) tersimpan real-time.`);
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan produk.', true);
    }
  };

  const handleDeleteProduct = (p: Product) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Master Produk',
      message: `Apakah Anda yakin ingin menghapus produk "${p.name}" (${p.code})? Semua riwayat penerimaan stok dan pengiriman terkait produk ini akan dihapus permanen dari database.`,
      confirmLabel: 'Hapus Produk',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteProductCascadeInDb(p, stockEntries, salesData);
          showToast(`Produk "${p.name}" telah dihapus dari database.`);
        } catch (err: any) {
          showToast(err?.message || 'Gagal menghapus produk.', true);
        }
      },
    });
  };

  // Stock Entry Handlers
  const handleSaveNewStockEntries = async (
    entries: { date: string; itemCode: string; warehouse: string; quantity: number }[]
  ) => {
    if (!currentUser) return;
    try {
      await createStockEntriesInDb(entries, currentUser.uid);
      showToast(`${entries.length} penerimaan stok tersimpan real-time ke Firebase.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan stok masuk.', true);
    }
  };

  const handleUpdateStockEntry = async (id: string, date: string, quantity: number) => {
    try {
      await updateStockEntryInDb(id, date, quantity);
      showToast(
        quantity <= 0
          ? 'Entri stok dihapus karena jumlah diubah menjadi 0.'
          : 'Entri stok berhasil diperbarui di database.'
      );
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui stok masuk.', true);
    }
  };

  const handleDeleteStockEntry = (entry: StockEntry) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Entri Pemasukan',
      message: `Apakah Anda yakin ingin menghapus riwayat penerimaan ${entry.quantity} unit ke ${entry.warehouse}?`,
      confirmLabel: 'Hapus Entri',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteStockEntryInDb(entry.id);
          showToast('Entri stok berhasil dihapus dari database.');
        } catch (err: any) {
          showToast(err?.message || 'Gagal menghapus entri stok.', true);
        }
      },
    });
  };

  // Sale / Shipment Handlers
  const handleSaveSale = async (saleData: Omit<SaleRecord, 'id'> & { id?: string }) => {
    if (!currentUser) return;
    try {
      if (saleData.id) {
        const { id, ...rest } = saleData;
        await updateSaleInDb(id, rest);
        showToast('Data pengiriman berhasil diperbarui di database.');
      } else {
        await createSaleInDb(saleData, currentUser.uid);
        showToast('Pengiriman baru tersimpan real-time ke Firebase!');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan data pengiriman.', true);
    }
  };

  const handleDeleteSale = (sale: SaleRecord) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Data Pengiriman',
      message: `Apakah Anda yakin ingin menghapus catatan pengiriman ${sale.itemCode} ke ${sale.namaPelanggan}?`,
      confirmLabel: 'Hapus Pengiriman',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteSaleInDb(sale.id);
          showToast('Data pengiriman telah dihapus dari database.');
        } catch (err: any) {
          showToast(err?.message || 'Gagal menghapus data pengiriman.', true);
        }
      },
    });
  };

  const handleSalesImported = async (
    addedItems: SaleRecord[],
    added: number,
    skipped: number
  ) => {
    if (!currentUser) return;
    try {
      if (addedItems.length > 0) {
        await importSalesBatchInDb(addedItems, currentUser.uid);
      }
      let msg = `${added} data pengiriman berhasil diimpor ke database Firebase.`;
      if (skipped > 0) msg += ` (${skipped} baris dilewati karena format tidak sesuai)`;
      showToast(msg, added === 0 && skipped > 0);
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengimpor data ke database.', true);
    }
  };

  // Forecast, Allocations & Prices Handlers
  const handleSaveForecast = async (newForecast: ForecastData, newDcToGd: DcToGdMap) => {
    if (!currentUser) return;
    try {
      await saveForecastConfigInDb(newForecast, newDcToGd, currentUser.uid);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan forecast.', true);
    }
  };

  const handleSaveAllocations = async (newAllocations: GudangAllocations) => {
    if (!currentUser) return;
    try {
      await saveAllocationConfigInDb(newAllocations, currentUser.uid);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan alokasi.', true);
    }
  };

  const handleSavePrices = async (newPrices: HargaPelanggan) => {
    if (!currentUser) return;
    try {
      await savePricesConfigInDb(newPrices, currentUser.uid);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan harga pelanggan.', true);
    }
  };

  // User & Invite Management Handlers
  const handleInviteUser = async (email: string, role: 'admin' | 'user') => {
    if (!currentUser) return 'created' as const;
    return await createInviteInDb(email, role, currentUser.uid);
  };

  const handleDeleteInvite = async (invite: InviteRecord) => {
    try {
      await deleteInviteInDb(invite.id);
      showToast(`Undangan untuk "${invite.email}" dibatalkan.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal membatalkan undangan.', true);
    }
  };

  const handleApproveOrUpdateUser = async (
    u: User,
    role: 'admin' | 'user',
    status: 'active' | 'pending'
  ) => {
    try {
      await approveOrUpdateUserInDb(u.uid, role, status);
      showToast(`Akses untuk "${u.displayName}" diperbarui (${role}, ${status}).`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui peran pengguna.', true);
    }
  };

  const handleDeleteUser = (u: User) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin mencabut akses & menghapus pengguna "${u.displayName}" (${u.email})?`,
      confirmLabel: 'Hapus Pengguna',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteUserAndMemberInDb(u.uid);
          showToast(`Pengguna "${u.displayName}" telah dihapus.`);
        } catch (err: any) {
          showToast(err?.message || 'Gagal menghapus pengguna.', true);
        }
      },
    });
  };

  // Cloud Restore Handlers
  const handleRequestRestore = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Pulihkan (Restore) ke Database Firebase',
      message:
        'PERINGATAN: Memulihkan data dari file JSON cadangan akan MENIMPA seluruh stok, transaksi pengiriman, forecast, dan tarif harga di database cloud saat ini. Lanjutkan?',
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
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const ok = await restoreBackupToFirestore(text, currentUser.uid);
        if (ok) {
          showToast('Data berhasil dipulihkan ke database Firebase secara real-time!');
        } else {
          showToast('File JSON cadangan tidak valid atau rusak.', true);
        }
      } catch (err: any) {
        showToast(err?.message || 'Gagal memulihkan data ke database Firebase.', true);
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

  const isAuthorizedActive = currentUser && currentUser.status === 'active';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500/20 selection:text-amber-300">
      {/* Login / Auth Loading / Pending Approval Overlay */}
      {(authLoading || !isAuthorizedActive) && (
        <LoginOverlay
          pendingUser={currentUser && currentUser.status === 'pending' ? currentUser : null}
          authLoading={authLoading}
          onGoogleLogin={handleGoogleLogin}
          onLogout={handleLogout}
        />
      )}

      {/* Main Authenticated App Layout */}
      {isAuthorizedActive && (
        <>
          <Navbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            currentUser={currentUser}
            onLogout={handleLogout}
            currentDateStr={currentDateStr}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {dataLoading && products.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-xs">Mengambil data real-time dari Firebase Firestore...</p>
              </div>
            ) : (
              <>
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
                    invites={invites}
                    currentUser={currentUser}
                    backupState={{
                      products,
                      stockEntries,
                      salesData,
                      forecastData,
                      dcToGdMap,
                      gudangAllocations,
                      hargaPelanggan,
                    }}
                    onInviteUser={handleInviteUser}
                    onDeleteInvite={handleDeleteInvite}
                    onApproveOrUpdateUser={handleApproveOrUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    onRequestRestore={handleRequestRestore}
                    onToast={showToast}
                  />
                )}
              </>
            )}
          </main>

          <footer className="no-print mt-auto py-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
            <p>
              Sistem Manajemen Stok &amp; Pengiriman &middot;{' '}
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
