/**
 * Xóa toàn bộ dữ liệu local của user (IndexedDB + localStorage) khi đăng xuất hoặc đăng nhập user khác.
 * Sau khi gọi, pullMasterData sẽ đồng bộ lại hàng hóa, khách hàng, đơn hàng... của user mới từ MongoDB.
 */
import Dexie from 'dexie';
import db from '../db/posDB';

const POS_BANK_ACCOUNTS_KEY = 'pos_bank_accounts';
const POS_ORDER_CODE_MIGRATED_KEY = 'pos_order_code_migrated_v1';
const STORE_KEY = 'pos_store_id';

const STORES = ['products', 'customers', 'orders', 'order_items', 'returns', 'settings', 'categories', 'return_items'];

export async function clearLocalAppData() {
  const dbName = db.name;
  try {
    await db.close();
    await Dexie.delete(dbName);
  } catch (_) {
    // delete có thể thất bại nếu connection khác đang mở
  }
  // Luôn mở lại và xóa sạch từng store để chắc chắn không còn dữ liệu user cũ
  try {
    await db.open();
    for (const storeName of STORES) {
      const store = db[storeName];
      if (store && typeof store.clear === 'function') await store.clear();
    }
  } catch (e2) {
    console.warn('clearLocalAppData IndexedDB:', e2);
  }

  try {
    localStorage.removeItem(POS_BANK_ACCOUNTS_KEY);
    localStorage.removeItem(POS_ORDER_CODE_MIGRATED_KEY);
    localStorage.removeItem(STORE_KEY);
  } catch (err) {
    console.warn('clearLocalAppData localStorage:', err);
  }
}
