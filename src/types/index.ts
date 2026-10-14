export interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  harga: number;
}

export interface StockEntry {
  id: string;
  date: string;
  itemCode: string;
  warehouse: string;
  quantity: number;
}

export interface SaleRecord {
  id: string;
  date: string;
  itemCode: string;
  itemId?: string;
  quantity: number;
  gudang: string;
  hargaSatuan: number;
  totalHarga: number;
  namaPelanggan: string;
  nomorSO: string;
  nomorSJ: string;
  keterangan: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'user';
}

export type ForecastData = Record<string, Record<string, number>>; // customer -> item -> qty
export type DcToGdMap = Record<string, Record<string, string>>; // customer -> item -> gdRegion
export type GudangAllocations = Record<string, Record<string, number>>; // gdRegion -> item -> qty
export type HargaPelanggan = Record<string, Record<string, number>>; // customer -> item -> price

export const WAREHOUSES = [
  'Gudang Jakarta 136',
  'Gudang Jakarta 156',
  'Gudang Karawang',
  'Gudang Semarang',
  'Gudang Surabaya',
  'Gudang Medan',
  'Gudang Luar',
] as const;

export type WarehouseName = typeof WAREHOUSES[number];

export const GUDANG_REGIONS = [
  'Gd Jakarta',
  'Gd Kerawang',
  'Gd Semarang',
  'Gd Surabaya',
  'Gd Medan',
] as const;

export type GudangRegion = typeof GUDANG_REGIONS[number];

export const CUSTOMERS = ['Gudang Ps Kemis', 'Gudang Ekspedisi'] as const;

export const LOW_STOCK_THRESHOLD = 20;

export const PREDEFINED_PRODUCTS: Record<string, { name: string; price: number }> = {
  PD: { name: 'Kurma Prime dates 250g', price: 306000 },
  BM: { name: 'Kurma Bumaan 10kg', price: 225000 },
};

export type ActiveTab = 'dashboard' | 'stock' | 'sales' | 'forecast' | 'allocation' | 'prices' | 'users';
