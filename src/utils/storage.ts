import {
  Product,
  StockEntry,
  SaleRecord,
  User,
  ForecastData,
  DcToGdMap,
  GudangAllocations,
  HargaPelanggan,
  CUSTOMERS,
  WAREHOUSES,
  GUDANG_REGIONS,
} from '../types';

export const STORAGE_KEYS = {
  stockData: 'stockData-v4',
  stockEntries: 'stockEntries-v4',
  salesData: 'salesData-v4',
  forecastData: 'forecastData-v4',
  users: 'users-v4',
  dcToGdMap: 'dcToGdMap-v4',
  gudangAllocations: 'gudangAllocations-v4',
  hargaPelanggan: 'hargaPelanggan-v4',
  currentUser: 'currentUser-v4',
};

// Seed realistic initial data if none exists
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-pd-1',
    code: 'PD',
    name: 'Kurma Prime dates 250g',
    unit: 'Box',
    harga: 306000,
  },
  {
    id: 'prod-bm-2',
    code: 'BM',
    name: 'Kurma Bumaan 10kg',
    unit: 'Karton',
    harga: 225000,
  },
  {
    id: 'prod-sk-3',
    code: 'SK',
    name: 'Kurma Sukari Al Qassim 500g',
    unit: 'Box',
    harga: 185000,
  },
];

const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: 'user-staff-2',
    username: 'staff',
    password: 'staff123',
    role: 'user',
  },
];

const INITIAL_STOCK_ENTRIES: StockEntry[] = [
  {
    id: 'entry-1',
    date: '2026-10-01',
    itemCode: 'PD',
    warehouse: 'Gudang Jakarta 136',
    quantity: 450,
  },
  {
    id: 'entry-2',
    date: '2026-10-01',
    itemCode: 'PD',
    warehouse: 'Gudang Jakarta 156',
    quantity: 300,
  },
  {
    id: 'entry-3',
    date: '2026-10-02',
    itemCode: 'PD',
    warehouse: 'Gudang Surabaya',
    quantity: 250,
  },
  {
    id: 'entry-4',
    date: '2026-10-03',
    itemCode: 'BM',
    warehouse: 'Gudang Jakarta 136',
    quantity: 200,
  },
  {
    id: 'entry-5',
    date: '2026-10-03',
    itemCode: 'BM',
    warehouse: 'Gudang Karawang',
    quantity: 180,
  },
  {
    id: 'entry-6',
    date: '2026-10-05',
    itemCode: 'SK',
    warehouse: 'Gudang Jakarta 136',
    quantity: 300,
  },
  {
    id: 'entry-7',
    date: '2026-10-06',
    itemCode: 'SK',
    warehouse: 'Gudang Semarang',
    quantity: 120,
  },
];

const INITIAL_SALES: SaleRecord[] = [
  {
    id: 'sale-1',
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
    id: 'sale-2',
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
    id: 'sale-3',
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
    id: 'sale-4',
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

const INITIAL_FORECAST: ForecastData = {
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

const INITIAL_DC_TO_GD: DcToGdMap = {
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

const INITIAL_ALLOCATIONS: GudangAllocations = {
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

const INITIAL_PRICES: HargaPelanggan = {
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

export const loadStoredData = () => {
  let products: Product[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stockData);
    products = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
    if (!products || products.length === 0) products = INITIAL_PRODUCTS;
  } catch {
    products = INITIAL_PRODUCTS;
  }

  let stockEntries: StockEntry[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stockEntries);
    stockEntries = raw ? JSON.parse(raw) : INITIAL_STOCK_ENTRIES;
  } catch {
    stockEntries = INITIAL_STOCK_ENTRIES;
  }

  let salesData: SaleRecord[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.salesData);
    if (raw) {
      const parsed = JSON.parse(raw);
      // migrate nomorPO to nomorSO if exists
      salesData = parsed.map((s: any) => ({
        ...s,
        nomorSO: s.nomorSO ?? s.nomorPO ?? '',
        nomorSJ: s.nomorSJ ?? '',
        keterangan: s.keterangan ?? '',
      }));
    } else {
      salesData = INITIAL_SALES;
    }
  } catch {
    salesData = INITIAL_SALES;
  }

  let users: User[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.users);
    users = raw ? JSON.parse(raw) : INITIAL_USERS;
    if (!users.some((u) => u.username === 'admin')) {
      users.unshift(INITIAL_USERS[0]);
    }
  } catch {
    users = INITIAL_USERS;
  }

  let forecastData: ForecastData = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.forecastData);
    forecastData = raw ? JSON.parse(raw) : INITIAL_FORECAST;
  } catch {
    forecastData = INITIAL_FORECAST;
  }

  let dcToGdMap: DcToGdMap = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dcToGdMap);
    dcToGdMap = raw ? JSON.parse(raw) : INITIAL_DC_TO_GD;
  } catch {
    dcToGdMap = INITIAL_DC_TO_GD;
  }

  let gudangAllocations: GudangAllocations = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.gudangAllocations);
    gudangAllocations = raw ? JSON.parse(raw) : INITIAL_ALLOCATIONS;
  } catch {
    gudangAllocations = INITIAL_ALLOCATIONS;
  }

  let hargaPelanggan: HargaPelanggan = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.hargaPelanggan);
    hargaPelanggan = raw ? JSON.parse(raw) : INITIAL_PRICES;
  } catch {
    hargaPelanggan = INITIAL_PRICES;
  }

  // Ensure default customers exist in forecast and prices
  CUSTOMERS.forEach((c) => {
    if (!forecastData[c]) forecastData[c] = {};
    if (!hargaPelanggan[c]) hargaPelanggan[c] = {};
    if (!dcToGdMap[c]) dcToGdMap[c] = {};
    products.forEach((p) => {
      if (forecastData[c][p.name] === undefined) forecastData[c][p.name] = 0;
      if (hargaPelanggan[c][p.name] === undefined) hargaPelanggan[c][p.name] = p.harga;
    });
  });

  return {
    products,
    stockEntries,
    salesData,
    users,
    forecastData,
    dcToGdMap,
    gudangAllocations,
    hargaPelanggan,
  };
};

export const persistAllData = (data: {
  products: Product[];
  stockEntries: StockEntry[];
  salesData: SaleRecord[];
  users: User[];
  forecastData: ForecastData;
  dcToGdMap: DcToGdMap;
  gudangAllocations: GudangAllocations;
  hargaPelanggan: HargaPelanggan;
}) => {
  localStorage.setItem(STORAGE_KEYS.stockData, JSON.stringify(data.products));
  localStorage.setItem(STORAGE_KEYS.stockEntries, JSON.stringify(data.stockEntries));
  localStorage.setItem(STORAGE_KEYS.salesData, JSON.stringify(data.salesData));
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(data.users));
  localStorage.setItem(STORAGE_KEYS.forecastData, JSON.stringify(data.forecastData));
  localStorage.setItem(STORAGE_KEYS.dcToGdMap, JSON.stringify(data.dcToGdMap));
  localStorage.setItem(STORAGE_KEYS.gudangAllocations, JSON.stringify(data.gudangAllocations));
  localStorage.setItem(STORAGE_KEYS.hargaPelanggan, JSON.stringify(data.hargaPelanggan));
};

export const downloadBackupJson = () => {
  const backup: Record<string, any> = {};
  Object.values(STORAGE_KEYS).forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        backup[key] = JSON.parse(raw);
      } catch {
        backup[key] = raw;
      }
    }
  });

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `backup_stok_pim_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const restoreBackupJson = (jsonString: string): boolean => {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') return false;

  Object.values(STORAGE_KEYS).forEach((key) => {
    if (parsed[key] !== undefined) {
      localStorage.setItem(key, typeof parsed[key] === 'string' ? parsed[key] : JSON.stringify(parsed[key]));
    }
  });
  return true;
};
