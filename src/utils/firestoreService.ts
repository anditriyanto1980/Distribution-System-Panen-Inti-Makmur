import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
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
  WORKSPACE_ID,
  BOOTSTRAPPED_ADMIN_EMAIL,
} from '../types';

// --- Helper Utilities (matching firebase-blueprint.json constraints) ---

const sanitizeString = (val: unknown, maxLen: number): string => {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
};

const sanitizeCode = (val: unknown): string => {
  const clean = sanitizeString(val, 32).replace(/[^A-Za-z0-9_-]/g, '');
  return clean || 'SKU';
};

const sanitizeDocId = (prefix: string): string => {
  const random = Math.random().toString(36).substring(2, 9);
  const raw = `${prefix}_${Date.now()}_${random}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
};

export const emailToDocId = (email: string): string => {
  const normalized = email.trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 128);
};

// --- Initial Seed Data (only inserted on first Admin login when workspaceConfigs/meta does not exist) ---

const SEED_PRODUCTS = [
  { id: 'prod_pd', code: 'PD', name: 'Kurma Prime dates 250g', unit: 'Box', harga: 306000 },
  { id: 'prod_bm', code: 'BM', name: 'Kurma Bumaan 10kg', unit: 'Karton', harga: 225000 },
  { id: 'prod_sk', code: 'SK', name: 'Kurma Sukari Al Qassim 500g', unit: 'Box', harga: 185000 },
];

const SEED_STOCK_ENTRIES = [
  { id: 'entry_1', date: '2026-10-01', itemCode: 'PD', warehouse: 'Gudang Jakarta 136', quantity: 450 },
  { id: 'entry_2', date: '2026-10-01', itemCode: 'PD', warehouse: 'Gudang Jakarta 156', quantity: 300 },
  { id: 'entry_3', date: '2026-10-02', itemCode: 'PD', warehouse: 'Gudang Surabaya', quantity: 250 },
  { id: 'entry_4', date: '2026-10-03', itemCode: 'BM', warehouse: 'Gudang Jakarta 136', quantity: 200 },
  { id: 'entry_5', date: '2026-10-03', itemCode: 'BM', warehouse: 'Gudang Karawang', quantity: 180 },
  { id: 'entry_6', date: '2026-10-05', itemCode: 'SK', warehouse: 'Gudang Jakarta 136', quantity: 300 },
  { id: 'entry_7', date: '2026-10-06', itemCode: 'SK', warehouse: 'Gudang Semarang', quantity: 120 },
];

const SEED_SALES = [
  {
    id: 'sale_1',
    date: '2026-10-04T08:30:00.000Z',
    itemCode: 'PD',
    quantity: 120,
    gudang: 'Gudang Jakarta 136',
    hargaSatuan: 306000,
    totalHarga: 36720000,
    namaPelanggan: 'Gudang Ps Kemis',
    nomorSO: 'SO-2026-001',
    nomorSJ: 'SJ-PIM-081',
    keterangan: 'Pengiriman batch 1 via Truk Wingbox',
  },
  {
    id: 'sale_2',
    date: '2026-10-06T10:15:00.000Z',
    itemCode: 'BM',
    quantity: 80,
    gudang: 'Gudang Jakarta 136',
    hargaSatuan: 225000,
    totalHarga: 18000000,
    namaPelanggan: 'Gudang Ekspedisi',
    nomorSO: 'SO-2026-002',
    nomorSJ: 'SJ-PIM-082',
    keterangan: 'Ekspedisi jalur laut via Port Tanjung Perak',
  },
  {
    id: 'sale_3',
    date: '2026-10-08T14:00:00.000Z',
    itemCode: 'PD',
    quantity: 100,
    gudang: 'Gudang Jakarta 156',
    hargaSatuan: 306000,
    totalHarga: 30600000,
    namaPelanggan: 'Gudang Ps Kemis',
    nomorSO: 'SO-2026-003',
    nomorSJ: 'SJ-PIM-083',
    keterangan: 'Restock mingguan DC Tangerang',
  },
  {
    id: 'sale_4',
    date: '2026-10-10T11:20:00.000Z',
    itemCode: 'SK',
    quantity: 50,
    gudang: 'Gudang Jakarta 136',
    hargaSatuan: 185000,
    totalHarga: 9250000,
    namaPelanggan: 'Gudang Ekspedisi',
    nomorSO: 'SO-2026-004',
    nomorSJ: 'SJ-PIM-084',
    keterangan: 'Order express kurir',
  },
];

const SEED_FORECAST: ForecastData = {
  'Gudang Ps Kemis': {
    'Kurma Prime dates 250g': 350,
    'Kurma Bumaan 10kg': 150,
    'Kurma Sukari Al Qassim 500g': 100,
  },
  'Gudang Ekspedisi': {
    'Kurma Prime dates 250g': 250,
    'Kurma Bumaan 10kg': 200,
    'Kurma Sukari Al Qassim 500g': 150,
  },
};

const SEED_DC_TO_GD: DcToGdMap = {
  'Gudang Ps Kemis': {
    'Kurma Prime dates 250g': 'Gd Jakarta',
    'Kurma Bumaan 10kg': 'Gd Kerawang',
    'Kurma Sukari Al Qassim 500g': 'Gd Jakarta',
  },
  'Gudang Ekspedisi': {
    'Kurma Prime dates 250g': 'Gd Surabaya',
    'Kurma Bumaan 10kg': 'Gd Jakarta',
    'Kurma Sukari Al Qassim 500g': 'Gd Semarang',
  },
};

const SEED_ALLOCATIONS: GudangAllocations = {
  'Gd Jakarta': {
    'Kurma Prime dates 250g': 400,
    'Kurma Bumaan 10kg': 220,
    'Kurma Sukari Al Qassim 500g': 120,
  },
  'Gd Kerawang': {
    'Kurma Prime dates 250g': 100,
    'Kurma Bumaan 10kg': 150,
    'Kurma Sukari Al Qassim 500g': 50,
  },
  'Gd Semarang': {
    'Kurma Prime dates 250g': 150,
    'Kurma Bumaan 10kg': 80,
    'Kurma Sukari Al Qassim 500g': 150,
  },
  'Gd Surabaya': {
    'Kurma Prime dates 250g': 250,
    'Kurma Bumaan 10kg': 100,
    'Kurma Sukari Al Qassim 500g': 80,
  },
  'Gd Medan': {
    'Kurma Prime dates 250g': 50,
    'Kurma Bumaan 10kg': 40,
    'Kurma Sukari Al Qassim 500g': 30,
  },
};

const SEED_PRICES: HargaPelanggan = {
  'Gudang Ps Kemis': {
    'Kurma Prime dates 250g': 306000,
    'Kurma Bumaan 10kg': 225000,
    'Kurma Sukari Al Qassim 500g': 185000,
  },
  'Gudang Ekspedisi': {
    'Kurma Prime dates 250g': 300000,
    'Kurma Bumaan 10kg': 220000,
    'Kurma Sukari Al Qassim 500g': 180000,
  },
};

// --- Auth & User Profile Sync ---

export async function syncUserOnSignIn(fbUser: FirebaseUser): Promise<User> {
  const uid = fbUser.uid;
  const email = (fbUser.email || '').trim();
  const displayName = sanitizeString(fbUser.displayName || email.split('@')[0] || 'Pengguna', 100);
  const isBootAdmin = email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  const userRef = doc(db, 'users', uid);
  const memberRef = doc(db, 'authorizedMembers', uid);
  const inviteId = email ? emailToDocId(email) : '';
  const inviteRef = inviteId ? doc(db, 'invites', inviteId) : null;

  try {
    const [userSnap, memberSnap, inviteSnap] = await Promise.all([
      getDoc(userRef),
      getDoc(memberRef),
      inviteRef ? getDoc(inviteRef) : Promise.resolve(null),
    ]);

    // Case 1: Bootstrapped admin (always active admin)
    if (isBootAdmin) {
      if (!userSnap.exists() || !memberSnap.exists() || userSnap.data()?.role !== 'admin' || userSnap.data()?.status !== 'active') {
        const batch = writeBatch(db);
        if (!userSnap.exists()) {
          batch.set(userRef, {
            uid,
            email: sanitizeString(email, 150),
            displayName,
            role: 'admin',
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.update(userRef, {
            role: 'admin',
            status: 'active',
            displayName,
            updatedAt: serverTimestamp(),
          });
        }

        if (!memberSnap.exists()) {
          batch.set(memberRef, {
            uid,
            role: 'admin',
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.update(memberRef, {
            role: 'admin',
            status: 'active',
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }

      return {
        id: uid,
        uid,
        email,
        displayName,
        username: displayName,
        role: 'admin',
        status: 'active',
      };
    }

    // Case 2: Already an active authorized member
    if (memberSnap.exists() && memberSnap.data()?.status === 'active') {
      const memberRole = memberSnap.data()?.role === 'admin' ? 'admin' : 'user';
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid,
          email: sanitizeString(email, 150),
          displayName,
          role: memberRole,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return {
        id: uid,
        uid,
        email,
        displayName: userSnap.exists() ? userSnap.data()?.displayName || displayName : displayName,
        username: displayName,
        role: memberRole,
        status: 'active',
      };
    }

    // Case 3: Has a valid admin-created invite matching their verified email
    if (inviteSnap && inviteSnap.exists() && inviteRef) {
      const invitedRole = inviteSnap.data()?.role === 'admin' ? 'admin' : 'user';
      const batch = writeBatch(db);

      batch.set(memberRef, {
        uid,
        role: invitedRole,
        status: 'active',
        inviteId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (!userSnap.exists()) {
        batch.set(userRef, {
          uid,
          email: sanitizeString(email, 150),
          displayName,
          role: invitedRole,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(userRef, {
          role: invitedRole,
          status: 'active',
          displayName,
          updatedAt: serverTimestamp(),
        });
      }

      batch.delete(inviteRef);
      await batch.commit();

      return {
        id: uid,
        uid,
        email,
        displayName,
        username: displayName,
        role: invitedRole,
        status: 'active',
      };
    }

    // Case 4: New uninvited user -> register as pending
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        email: sanitizeString(email, 150),
        displayName,
        role: 'user',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: uid,
        uid,
        email,
        displayName,
        username: displayName,
        role: 'user',
        status: 'pending',
      };
    }

    const uData = userSnap.data();
    return {
      id: uid,
      uid,
      email: uData?.email || email,
      displayName: uData?.displayName || displayName,
      username: uData?.displayName || displayName,
      role: uData?.role === 'admin' ? 'admin' : 'user',
      status: uData?.status === 'active' ? 'active' : 'pending',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function seedInitialWorkspaceDataIfNeeded(uid: string): Promise<void> {
  const metaRef = doc(db, 'workspaceConfigs', 'meta');
  try {
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) return;

    const batch = writeBatch(db);

    SEED_PRODUCTS.forEach((p) => {
      batch.set(doc(db, 'products', p.id), {
        code: p.code,
        name: p.name,
        unit: p.unit,
        harga: p.harga,
        workspaceId: WORKSPACE_ID,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    SEED_STOCK_ENTRIES.forEach((entry) => {
      batch.set(doc(db, 'stockEntries', entry.id), {
        date: entry.date,
        itemCode: entry.itemCode,
        warehouse: entry.warehouse,
        quantity: entry.quantity,
        workspaceId: WORKSPACE_ID,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    SEED_SALES.forEach((sale) => {
      batch.set(doc(db, 'sales', sale.id), {
        date: sale.date,
        itemCode: sale.itemCode,
        quantity: sale.quantity,
        gudang: sale.gudang,
        hargaSatuan: sale.hargaSatuan,
        totalHarga: sale.totalHarga,
        namaPelanggan: sale.namaPelanggan,
        nomorSO: sale.nomorSO,
        nomorSJ: sale.nomorSJ,
        keterangan: sale.keterangan,
        workspaceId: WORKSPACE_ID,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    batch.set(doc(db, 'workspaceConfigs', 'forecast'), {
      workspaceId: WORKSPACE_ID,
      forecastData: SEED_FORECAST,
      dcToGdMap: SEED_DC_TO_GD,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'workspaceConfigs', 'allocation'), {
      workspaceId: WORKSPACE_ID,
      allocations: SEED_ALLOCATIONS,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'workspaceConfigs', 'prices'), {
      workspaceId: WORKSPACE_ID,
      prices: SEED_PRICES,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    batch.set(metaRef, {
      workspaceId: WORKSPACE_ID,
      seeded: true,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workspaceConfigs/meta');
  }
}

// --- Real-Time Listeners (onSnapshot) ---

export function subscribeProducts(onData: (items: Product[]) => void): Unsubscribe {
  const path = 'products';
  const q = query(collection(db, path), where('workspaceId', '==', WORKSPACE_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Product[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          code: String(data.code || ''),
          name: String(data.name || ''),
          unit: String(data.unit || 'Box'),
          harga: Number(data.harga || 0),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeStockEntries(onData: (entries: StockEntry[]) => void): Unsubscribe {
  const path = 'stockEntries';
  const q = query(collection(db, path), where('workspaceId', '==', WORKSPACE_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StockEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: String(data.date || ''),
          itemCode: String(data.itemCode || ''),
          warehouse: String(data.warehouse || ''),
          quantity: Number(data.quantity || 0),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeSales(onData: (sales: SaleRecord[]) => void): Unsubscribe {
  const path = 'sales';
  const q = query(collection(db, path), where('workspaceId', '==', WORKSPACE_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SaleRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: String(data.date || ''),
          itemCode: String(data.itemCode || ''),
          quantity: Number(data.quantity || 0),
          gudang: String(data.gudang || ''),
          hargaSatuan: Number(data.hargaSatuan || 0),
          totalHarga: Number(data.totalHarga || 0),
          namaPelanggan: String(data.namaPelanggan || ''),
          nomorSO: String(data.nomorSO || ''),
          nomorSJ: String(data.nomorSJ || ''),
          keterangan: String(data.keterangan || ''),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeForecastConfig(
  onData: (forecastData: ForecastData, dcToGdMap: DcToGdMap) => void
): Unsubscribe {
  const path = 'workspaceConfigs/forecast';
  return onSnapshot(
    doc(db, 'workspaceConfigs', 'forecast'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onData(
          (data.forecastData as ForecastData) || {},
          (data.dcToGdMap as DcToGdMap) || {}
        );
      } else {
        onData({}, {});
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeAllocationConfig(
  onData: (allocations: GudangAllocations) => void
): Unsubscribe {
  const path = 'workspaceConfigs/allocation';
  return onSnapshot(
    doc(db, 'workspaceConfigs', 'allocation'),
    (snap) => {
      if (snap.exists()) {
        onData((snap.data().allocations as GudangAllocations) || {});
      } else {
        onData({});
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribePricesConfig(
  onData: (prices: HargaPelanggan) => void
): Unsubscribe {
  const path = 'workspaceConfigs/prices';
  return onSnapshot(
    doc(db, 'workspaceConfigs', 'prices'),
    (snap) => {
      if (snap.exists()) {
        onData((snap.data().prices as HargaPelanggan) || {});
      } else {
        onData({});
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeUsers(onData: (users: User[]) => void): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: User[] = snapshot.docs.map((d) => {
        const data = d.data();
        const displayName = String(data.displayName || data.email || 'Pengguna');
        return {
          id: d.id,
          uid: String(data.uid || d.id),
          email: String(data.email || ''),
          displayName,
          username: displayName,
          role: data.role === 'admin' ? 'admin' : 'user',
          status: data.status === 'active' ? 'active' : 'pending',
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeInvites(onData: (invites: InviteRecord[]) => void): Unsubscribe {
  const path = 'invites';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: InviteRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          email: String(data.email || ''),
          role: data.role === 'admin' ? 'admin' : 'user',
          createdBy: String(data.createdBy || ''),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeCurrentUserStatus(
  uid: string,
  onData: (user: User | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      const displayName = String(data.displayName || data.email || 'Pengguna');
      onData({
        id: snap.id,
        uid: String(data.uid || snap.id),
        email: String(data.email || ''),
        displayName,
        username: displayName,
        role: data.role === 'admin' ? 'admin' : 'user',
        status: data.status === 'active' ? 'active' : 'pending',
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// --- CRUD Operations ---

export async function createProductInDb(
  prod: { code: string; name: string; unit: string; harga: number },
  uid: string
): Promise<void> {
  const docId = sanitizeDocId(`prod_${prod.code}`);
  const path = `products/${docId}`;
  try {
    await setDoc(doc(db, 'products', docId), {
      code: sanitizeCode(prod.code),
      name: sanitizeString(prod.name, 150) || 'Produk',
      unit: sanitizeString(prod.unit, 32) || 'Pcs',
      harga: Math.max(0, Number(prod.harga) || 0),
      workspaceId: WORKSPACE_ID,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProductInDb(
  id: string,
  prod: { name: string; unit: string; harga: number }
): Promise<void> {
  const path = `products/${id}`;
  try {
    await updateDoc(doc(db, 'products', id), {
      name: sanitizeString(prod.name, 150) || 'Produk',
      unit: sanitizeString(prod.unit, 32) || 'Pcs',
      harga: Math.max(0, Number(prod.harga) || 0),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProductCascadeInDb(
  product: Product,
  stockEntries: StockEntry[],
  salesData: SaleRecord[]
): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'products', product.id));

    stockEntries
      .filter((e) => e.itemCode === product.code)
      .forEach((e) => {
        batch.delete(doc(db, 'stockEntries', e.id));
      });

    salesData
      .filter((s) => s.itemCode === product.code)
      .forEach((s) => {
        batch.delete(doc(db, 'sales', s.id));
      });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createStockEntriesInDb(
  entries: { date: string; itemCode: string; warehouse: string; quantity: number }[],
  uid: string
): Promise<void> {
  const path = 'stockEntries';
  try {
    const batch = writeBatch(db);
    entries.forEach((e) => {
      const docId = sanitizeDocId('entry');
      batch.set(doc(db, 'stockEntries', docId), {
        date: sanitizeString(e.date, 32),
        itemCode: sanitizeCode(e.itemCode),
        warehouse: sanitizeString(e.warehouse, 64),
        quantity: Math.max(0, Number(e.quantity) || 0),
        workspaceId: WORKSPACE_ID,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStockEntryInDb(
  id: string,
  date: string,
  quantity: number
): Promise<void> {
  const path = `stockEntries/${id}`;
  try {
    if (quantity <= 0) {
      await deleteDoc(doc(db, 'stockEntries', id));
    } else {
      await updateDoc(doc(db, 'stockEntries', id), {
        date: sanitizeString(date, 32),
        quantity: Math.max(0, Number(quantity) || 0),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStockEntryInDb(id: string): Promise<void> {
  const path = `stockEntries/${id}`;
  try {
    await deleteDoc(doc(db, 'stockEntries', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createSaleInDb(
  sale: Omit<SaleRecord, 'id'>,
  uid: string
): Promise<void> {
  const docId = sanitizeDocId('sale');
  const path = `sales/${docId}`;
  try {
    await setDoc(doc(db, 'sales', docId), {
      date: sanitizeString(sale.date, 40),
      itemCode: sanitizeCode(sale.itemCode),
      quantity: Math.max(1, Number(sale.quantity) || 1),
      gudang: sanitizeString(sale.gudang, 64),
      hargaSatuan: Math.max(0, Number(sale.hargaSatuan) || 0),
      totalHarga: Math.max(0, Number(sale.totalHarga) || 0),
      namaPelanggan: sanitizeString(sale.namaPelanggan, 80),
      nomorSO: sanitizeString(sale.nomorSO, 64),
      nomorSJ: sanitizeString(sale.nomorSJ, 64),
      keterangan: sanitizeString(sale.keterangan, 300),
      workspaceId: WORKSPACE_ID,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSaleInDb(
  id: string,
  sale: Omit<SaleRecord, 'id'>
): Promise<void> {
  const path = `sales/${id}`;
  try {
    await updateDoc(doc(db, 'sales', id), {
      date: sanitizeString(sale.date, 40),
      itemCode: sanitizeCode(sale.itemCode),
      quantity: Math.max(1, Number(sale.quantity) || 1),
      gudang: sanitizeString(sale.gudang, 64),
      hargaSatuan: Math.max(0, Number(sale.hargaSatuan) || 0),
      totalHarga: Math.max(0, Number(sale.totalHarga) || 0),
      namaPelanggan: sanitizeString(sale.namaPelanggan, 80),
      nomorSO: sanitizeString(sale.nomorSO, 64),
      nomorSJ: sanitizeString(sale.nomorSJ, 64),
      keterangan: sanitizeString(sale.keterangan, 300),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSaleInDb(id: string): Promise<void> {
  const path = `sales/${id}`;
  try {
    await deleteDoc(doc(db, 'sales', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function importSalesBatchInDb(
  newSales: SaleRecord[],
  uid: string
): Promise<void> {
  const path = 'sales';
  try {
    // Firestore batch limit is 500 writes
    const chunks: SaleRecord[][] = [];
    for (let i = 0; i < newSales.length; i += 400) {
      chunks.push(newSales.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach((sale) => {
        const docId = sanitizeDocId('sale_imp');
        batch.set(doc(db, 'sales', docId), {
          date: sanitizeString(sale.date, 40),
          itemCode: sanitizeCode(sale.itemCode),
          quantity: Math.max(1, Number(sale.quantity) || 1),
          gudang: sanitizeString(sale.gudang, 64),
          hargaSatuan: Math.max(0, Number(sale.hargaSatuan) || 0),
          totalHarga: Math.max(0, Number(sale.totalHarga) || 0),
          namaPelanggan: sanitizeString(sale.namaPelanggan, 80),
          nomorSO: sanitizeString(sale.nomorSO, 64),
          nomorSJ: sanitizeString(sale.nomorSJ, 64),
          keterangan: sanitizeString(sale.keterangan, 300),
          workspaceId: WORKSPACE_ID,
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Workspace Config Matrix Operations ---

export async function saveForecastConfigInDb(
  forecastData: ForecastData,
  dcToGdMap: DcToGdMap,
  uid: string
): Promise<void> {
  const path = 'workspaceConfigs/forecast';
  try {
    await setDoc(doc(db, 'workspaceConfigs', 'forecast'), {
      workspaceId: WORKSPACE_ID,
      forecastData,
      dcToGdMap,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAllocationConfigInDb(
  allocations: GudangAllocations,
  uid: string
): Promise<void> {
  const path = 'workspaceConfigs/allocation';
  try {
    await setDoc(doc(db, 'workspaceConfigs', 'allocation'), {
      workspaceId: WORKSPACE_ID,
      allocations,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function savePricesConfigInDb(
  prices: HargaPelanggan,
  uid: string
): Promise<void> {
  const path = 'workspaceConfigs/prices';
  try {
    await setDoc(doc(db, 'workspaceConfigs', 'prices'), {
      workspaceId: WORKSPACE_ID,
      prices,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- User & Invite Management ---

export async function createInviteInDb(
  email: string,
  role: 'admin' | 'user',
  adminUid: string
): Promise<'created' | 'updated'> {
  const cleanEmail = sanitizeString(email.toLowerCase(), 150);
  const inviteId = emailToDocId(cleanEmail);
  const path = `invites/${inviteId}`;
  const inviteRef = doc(db, 'invites', inviteId);
  try {
    const existingSnap = await getDoc(inviteRef);
    if (existingSnap.exists()) {
      await updateDoc(inviteRef, { role });
      return 'updated';
    }
    await setDoc(inviteRef, {
      email: cleanEmail,
      role,
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
    return 'created';
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteInviteInDb(inviteId: string): Promise<void> {
  const path = `invites/${inviteId}`;
  try {
    await deleteDoc(doc(db, 'invites', inviteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function approveOrUpdateUserInDb(
  targetUid: string,
  role: 'admin' | 'user',
  status: 'active' | 'pending'
): Promise<void> {
  const path = `users/${targetUid}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUid), {
      role,
      status,
      updatedAt: serverTimestamp(),
    });

    const memberRef = doc(db, 'authorizedMembers', targetUid);
    if (status === 'active') {
      const existingMember = await getDoc(memberRef);
      if (existingMember.exists()) {
        batch.update(memberRef, {
          role,
          status: 'active',
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(memberRef, {
          uid: targetUid,
          role,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      batch.delete(memberRef);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserAndMemberInDb(targetUid: string): Promise<void> {
  const path = `users/${targetUid}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', targetUid));
    batch.delete(doc(db, 'authorizedMembers', targetUid));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Cloud JSON Backup & Restore (Directly synced with Firestore, zero localStorage) ---

export function downloadFirestoreBackupJson(state: {
  products: Product[];
  stockEntries: StockEntry[];
  salesData: SaleRecord[];
  forecastData: ForecastData;
  dcToGdMap: DcToGdMap;
  gudangAllocations: GudangAllocations;
  hargaPelanggan: HargaPelanggan;
}): void {
  const payload = {
    version: 'firebase-v1',
    exportedAt: new Date().toISOString(),
    ...state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `backup_cloud_pim_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function restoreBackupToFirestore(jsonString: string, uid: string): Promise<boolean> {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') return false;

  // Support both new firebase-v1 format and legacy v4 localStorage export format
  const rawProducts: Product[] = Array.isArray(parsed.products)
    ? parsed.products
    : typeof parsed['stockData-v4'] === 'string'
    ? JSON.parse(parsed['stockData-v4'])
    : Array.isArray(parsed['stockData-v4'])
    ? parsed['stockData-v4']
    : [];

  const rawEntries: StockEntry[] = Array.isArray(parsed.stockEntries)
    ? parsed.stockEntries
    : typeof parsed['stockEntries-v4'] === 'string'
    ? JSON.parse(parsed['stockEntries-v4'])
    : Array.isArray(parsed['stockEntries-v4'])
    ? parsed['stockEntries-v4']
    : [];

  const rawSales: SaleRecord[] = Array.isArray(parsed.salesData)
    ? parsed.salesData
    : typeof parsed['salesData-v4'] === 'string'
    ? JSON.parse(parsed['salesData-v4'])
    : Array.isArray(parsed['salesData-v4'])
    ? parsed['salesData-v4']
    : [];

  const forecastData: ForecastData =
    parsed.forecastData ||
    (typeof parsed['forecastData-v4'] === 'string'
      ? JSON.parse(parsed['forecastData-v4'])
      : parsed['forecastData-v4']) ||
    {};

  const dcToGdMap: DcToGdMap =
    parsed.dcToGdMap ||
    (typeof parsed['dcToGdMap-v4'] === 'string'
      ? JSON.parse(parsed['dcToGdMap-v4'])
      : parsed['dcToGdMap-v4']) ||
    {};

  const gudangAllocations: GudangAllocations =
    parsed.gudangAllocations ||
    (typeof parsed['gudangAllocations-v4'] === 'string'
      ? JSON.parse(parsed['gudangAllocations-v4'])
      : parsed['gudangAllocations-v4']) ||
    {};

  const hargaPelanggan: HargaPelanggan =
    parsed.hargaPelanggan ||
    (typeof parsed['hargaPelanggan-v4'] === 'string'
      ? JSON.parse(parsed['hargaPelanggan-v4'])
      : parsed['hargaPelanggan-v4']) ||
    {};

  try {
    // Delete existing collections first, then insert restored records
    const [existingProds, existingEntries, existingSales] = await Promise.all([
      getDocs(query(collection(db, 'products'), where('workspaceId', '==', WORKSPACE_ID))),
      getDocs(query(collection(db, 'stockEntries'), where('workspaceId', '==', WORKSPACE_ID))),
      getDocs(query(collection(db, 'sales'), where('workspaceId', '==', WORKSPACE_ID))),
    ]);

    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    existingProds.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
    existingEntries.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
    existingSales.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));

    rawProducts.forEach((p) => {
      const id = (p.id || sanitizeDocId(`prod_${p.code}`)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
      ops.push((b) =>
        b.set(doc(db, 'products', id), {
          code: sanitizeCode(p.code),
          name: sanitizeString(p.name, 150) || 'Produk',
          unit: sanitizeString(p.unit, 32) || 'Box',
          harga: Math.max(0, Number(p.harga) || 0),
          workspaceId: WORKSPACE_ID,
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    rawEntries.forEach((e) => {
      const id = (e.id || sanitizeDocId('entry')).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
      ops.push((b) =>
        b.set(doc(db, 'stockEntries', id), {
          date: sanitizeString(e.date, 32),
          itemCode: sanitizeCode(e.itemCode),
          warehouse: sanitizeString(e.warehouse, 64),
          quantity: Math.max(0, Number(e.quantity) || 0),
          workspaceId: WORKSPACE_ID,
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    rawSales.forEach((s) => {
      const id = (s.id || sanitizeDocId('sale')).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
      ops.push((b) =>
        b.set(doc(db, 'sales', id), {
          date: sanitizeString(s.date, 40),
          itemCode: sanitizeCode(s.itemCode),
          quantity: Math.max(1, Number(s.quantity) || 1),
          gudang: sanitizeString(s.gudang, 64),
          hargaSatuan: Math.max(0, Number(s.hargaSatuan) || 0),
          totalHarga: Math.max(0, Number(s.totalHarga) || 0),
          namaPelanggan: sanitizeString(s.namaPelanggan, 80),
          nomorSO: sanitizeString(s.nomorSO || '', 64),
          nomorSJ: sanitizeString(s.nomorSJ || '', 64),
          keterangan: sanitizeString(s.keterangan || '', 300),
          workspaceId: WORKSPACE_ID,
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    ops.push((b) =>
      b.set(doc(db, 'workspaceConfigs', 'forecast'), {
        workspaceId: WORKSPACE_ID,
        forecastData,
        dcToGdMap,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      })
    );
    ops.push((b) =>
      b.set(doc(db, 'workspaceConfigs', 'allocation'), {
        workspaceId: WORKSPACE_ID,
        allocations: gudangAllocations,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      })
    );
    ops.push((b) =>
      b.set(doc(db, 'workspaceConfigs', 'prices'), {
        workspaceId: WORKSPACE_ID,
        prices: hargaPelanggan,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      })
    );
    ops.push((b) =>
      b.set(doc(db, 'workspaceConfigs', 'meta'), {
        workspaceId: WORKSPACE_ID,
        seeded: true,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      })
    );

    // Commit in chunks of 400
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      ops.slice(i, i + 400).forEach((fn) => fn(batch));
      await batch.commit();
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'restore');
  }
}
