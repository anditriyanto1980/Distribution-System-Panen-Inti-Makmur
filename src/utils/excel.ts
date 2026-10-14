import * as XLSX from 'xlsx';
import {
  Product,
  StockEntry,
  SaleRecord,
  ForecastData,
  DcToGdMap,
  GudangAllocations,
  HargaPelanggan,
  WAREHOUSES,
  CUSTOMERS,
  GUDANG_REGIONS,
} from '../types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('id-ID').format(num || 0);
};

export const calculateProductStock = (
  itemCode: string,
  stockEntries: StockEntry[],
  salesData: SaleRecord[],
  warehouse?: string
) => {
  const totalIn = stockEntries
    .filter((e) => e.itemCode === itemCode && (!warehouse || e.warehouse === warehouse))
    .reduce((sum, e) => sum + e.quantity, 0);

  const totalSold = salesData
    .filter((s) => s.itemCode === itemCode && (!warehouse || s.gudang === warehouse))
    .reduce((sum, s) => sum + s.quantity, 0);

  return {
    totalIn,
    totalSold,
    finalStock: totalIn - totalSold,
  };
};

/**
 * Export complete stock spreadsheet:
 * Sheet 1: Daftar Produk
 * Sheet 2: Riwayat Stok Masuk
 * Sheet 3: Ringkasan Stok Akhir Total & per Gudang
 */
export const exportStockExcel = (
  products: Product[],
  stockEntries: StockEntry[],
  salesData: SaleRecord[]
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Master Produk
  const productsRows = products.map((p, idx) => ({
    No: idx + 1,
    'Kode Barang': p.code,
    'Nama Barang': p.name,
    Satuan: p.unit,
    'Harga Default (Rp)': p.harga,
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productsRows);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Daftar Produk');

  // Sheet 2: Riwayat Stok Masuk
  const entriesRows = stockEntries.map((e, idx) => {
    const p = products.find((prod) => prod.code === e.itemCode);
    return {
      No: idx + 1,
      Tanggal: e.date,
      'Kode Barang': e.itemCode,
      'Nama Barang': p ? p.name : 'N/A',
      Gudang: e.warehouse,
      'Jumlah Masuk': e.quantity,
    };
  });
  const wsEntries = XLSX.utils.json_to_sheet(entriesRows);
  XLSX.utils.book_append_sheet(wb, wsEntries, 'Riwayat Stok Masuk');

  // Sheet 3: Ringkasan Stok Akhir
  const summaryRows = products.map((p, idx) => {
    const overall = calculateProductStock(p.code, stockEntries, salesData);
    const rowObj: Record<string, any> = {
      No: idx + 1,
      'Kode Barang': p.code,
      'Nama Barang': p.name,
      'Total Masuk': overall.totalIn,
      'Total Keluar': overall.totalSold,
      'Stok Akhir': overall.finalStock,
      Satuan: p.unit,
    };
    WAREHOUSES.forEach((wh) => {
      rowObj[wh] = calculateProductStock(p.code, stockEntries, salesData, wh).finalStock;
    });
    return rowObj;
  });
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Stok Akhir');

  XLSX.writeFile(wb, `Laporan_Stok_PT_Panen_Inti_Makmur_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Export Sales / Shipments to Excel
 */
export const exportSalesExcel = (salesData: SaleRecord[], products: Product[]) => {
  const exportRows = salesData.map((sale, idx) => {
    const item = products.find((p) => p.code === sale.itemCode);
    return {
      No: idx + 1,
      Tanggal: sale.date.split('T')[0],
      'No SO': sale.nomorSO,
      'No SJ': sale.nomorSJ,
      Pelanggan: sale.namaPelanggan,
      Gudang: sale.gudang,
      'Kode Barang': sale.itemCode,
      'Nama Barang': item ? item.name : sale.itemCode,
      Keterangan: sale.keterangan,
      'Harga Satuan': sale.hargaSatuan,
      Qty: sale.quantity,
      'Total Harga': sale.totalHarga,
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pengiriman');
  XLSX.writeFile(wb, `Laporan_Pengiriman_PIM_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Import Sales from Excel
 */
export const parseSalesExcel = async (
  file: File,
  products: Product[],
  existingSales: SaleRecord[]
): Promise<{ added: number; skipped: number; updatedList: SaleRecord[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

        let added = 0;
        let skipped = 0;
        const newSales: SaleRecord[] = [...existingSales];
        const productMap = new Map(products.map((p) => [p.code.toUpperCase(), p]));

        jsonData.forEach((row) => {
          const rawCode = (row['Kode Barang'] || row['Kode'] || '')?.toString().trim().toUpperCase();
          const quantity = parseInt(row['Qty'] || row['Jumlah'] || 0, 10);
          const rawDate = row['Tanggal'];
          let dateStr = new Date().toISOString();
          if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
            dateStr = rawDate.toISOString();
          } else if (typeof rawDate === 'string' && rawDate.trim()) {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) dateStr = parsed.toISOString();
          }

          const customer = (row['Pelanggan'] || row['Nama Pelanggan'] || '')?.toString().trim();
          const warehouse = (row['Gudang'] || row['Ambil Dari Gudang'] || '')?.toString().trim();

          const product = productMap.get(rawCode);
          if (!product || isNaN(quantity) || quantity <= 0) {
            skipped++;
            return;
          }

          const unitPrice = parseFloat(row['Harga Satuan'] || product.harga || 0);
          const total = unitPrice * quantity;

          newSales.push({
            id: `sale-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            itemCode: product.code,
            quantity,
            gudang: warehouse || 'Gudang Jakarta 136',
            hargaSatuan: unitPrice,
            totalHarga: total,
            date: dateStr,
            namaPelanggan: customer || 'Gudang Ps Kemis',
            nomorSO: (row['No SO'] || row['No PO'] || row['Nomor SO'] || '')?.toString().trim(),
            nomorSJ: (row['No SJ'] || row['Nomor SJ'] || '')?.toString().trim(),
            keterangan: (row['Keterangan'] || row['Catatan'] || '')?.toString().trim(),
          });
          added++;
        });

        resolve({ added, skipped, updatedList: newSales });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Export Forecast Excel
 */
export const exportForecastExcel = (
  products: Product[],
  forecastData: ForecastData,
  dcToGdMap: DcToGdMap
) => {
  const wb = XLSX.utils.book_new();
  const rows: any[] = [];

  CUSTOMERS.forEach((customer) => {
    products.forEach((p) => {
      rows.push({
        'Lokasi (DC)': customer,
        'Nama Barang': p.name,
        'Kode Barang': p.code,
        'Wilayah Gudang': dcToGdMap[customer]?.[p.name] || 'Gd Jakarta',
        Forecast: forecastData[customer]?.[p.name] || 0,
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Forecast Pengiriman');
  XLSX.writeFile(wb, `Forecast_PIM_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Import Forecast Excel
 */
export const parseForecastExcel = async (
  file: File,
  products: Product[],
  currentForecast: ForecastData,
  currentDcToGd: DcToGdMap
): Promise<{ updatedCount: number; newForecast: ForecastData; newDcToGd: DcToGdMap }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

        const newForecast = { ...currentForecast };
        const newDcToGd = { ...currentDcToGd };
        let updatedCount = 0;

        jsonData.forEach((row) => {
          const customer = (row['Lokasi (DC)'] || row['Pelanggan'] || '')?.toString().trim();
          const itemName = (row['Nama Barang'] || '')?.toString().trim();
          const forecastQty = parseInt(row['Forecast'] || row['Target'] || 0, 10);
          const region = (row['Wilayah Gudang'] || '')?.toString().trim();

          if (customer && itemName) {
            if (!newForecast[customer]) newForecast[customer] = {};
            newForecast[customer][itemName] = isNaN(forecastQty) ? 0 : forecastQty;

            if (region) {
              if (!newDcToGd[customer]) newDcToGd[customer] = {};
              newDcToGd[customer][itemName] = region;
            }
            updatedCount++;
          }
        });

        resolve({ updatedCount, newForecast, newDcToGd });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Export Warehouse Allocation Excel
 */
export const exportAllocationExcel = (
  products: Product[],
  allocations: GudangAllocations
) => {
  const rows = GUDANG_REGIONS.map((gd) => {
    const rowObj: Record<string, any> = { 'Wilayah Gudang': gd };
    products.forEach((p) => {
      rowObj[p.name] = allocations[gd]?.[p.name] || 0;
    });
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alokasi Gudang');
  XLSX.writeFile(wb, `Alokasi_Gudang_PIM_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Import Warehouse Allocation Excel
 */
export const parseAllocationExcel = async (
  file: File,
  products: Product[],
  currentAllocations: GudangAllocations
): Promise<{ updatedCount: number; newAllocations: GudangAllocations }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

        const newAllocations = { ...currentAllocations };
        let updatedCount = 0;

        jsonData.forEach((row) => {
          const gd = (row['Wilayah Gudang'] || '')?.toString().trim();
          if (gd && GUDANG_REGIONS.includes(gd as any)) {
            if (!newAllocations[gd]) newAllocations[gd] = {};
            products.forEach((p) => {
              if (row[p.name] !== undefined) {
                const val = parseInt(row[p.name], 10);
                newAllocations[gd][p.name] = isNaN(val) ? 0 : val;
                updatedCount++;
              }
            });
          }
        });

        resolve({ updatedCount, newAllocations });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Export Customer Prices Excel
 */
export const exportCustomerPricesExcel = (
  products: Product[],
  prices: HargaPelanggan
) => {
  const rows = CUSTOMERS.map((cust) => {
    const rowObj: Record<string, any> = { 'Pelanggan (DC)': cust };
    products.forEach((p) => {
      rowObj[p.name] = prices[cust]?.[p.name] || p.harga;
    });
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Harga Pelanggan');
  XLSX.writeFile(wb, `Harga_Pelanggan_PIM_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Import Customer Prices Excel
 */
export const parseCustomerPricesExcel = async (
  file: File,
  products: Product[],
  currentPrices: HargaPelanggan
): Promise<{ updatedCount: number; newPrices: HargaPelanggan }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

        const newPrices = { ...currentPrices };
        let updatedCount = 0;

        jsonData.forEach((row) => {
          const cust = (row['Pelanggan (DC)'] || '')?.toString().trim();
          if (cust) {
            if (!newPrices[cust]) newPrices[cust] = {};
            products.forEach((p) => {
              if (row[p.name] !== undefined) {
                const val = parseFloat(row[p.name]);
                newPrices[cust][p.name] = isNaN(val) ? p.harga : val;
                updatedCount++;
              }
            });
          }
        });

        resolve({ updatedCount, newPrices });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
