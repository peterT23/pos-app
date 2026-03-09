/**
 * DATABASE SETUP - posDB.js
 * 
 * File này khởi tạo và cấu hình IndexedDB cho ứng dụng POS
 * Sử dụng Dexie.js - một wrapper library giúp làm việc với IndexedDB dễ dàng hơn
 */

// Import Dexie: Thư viện wrapper cho IndexedDB
// Ưu điểm: API đơn giản, Promise-based, dễ sử dụng hơn IndexedDB thuần
// Nhược điểm: Thêm một dependency, bundle size tăng ~50KB
// Alternative: Có thể dùng IDB (idb) hoặc IndexedDB thuần nhưng phức tạp hơn
import Dexie from 'dexie';

// Import uuid v4: Tạo unique identifier
// Ưu điểm: Đảm bảo unique, không cần server, phân tán được
// Nhược điểm: UUID dài (36 ký tự), không có thứ tự
// Alternative: Có thể dùng nanoid (nhỏ hơn) hoặc timestamp + random
import { v4 as uuidv4 } from 'uuid';

/**
 * Khởi tạo database với tên 'pos_db'
 * 
 * Dexie tự động:
 * - Tạo IndexedDB database nếu chưa có
 * - Mở connection khi cần
 * - Quản lý version và migration
 * 
 * Tại sao dùng Dexie thay vì IndexedDB thuần:
 * - IndexedDB API rất phức tạp, callback-based
 * - Dexie cung cấp Promise-based API, dễ đọc hơn
 * - Hỗ trợ query builder (where, equals, etc.)
 */
export const db = new Dexie('pos_db');

/**
 * ĐỊNH NGHĨA SCHEMA (Cấu trúc database)
 * 
 * db.version(1): Định nghĩa version 1 của database
 * - Khi thay đổi schema, cần tăng version (2, 3, ...)
 * - Dexie tự động chạy migration khi version thay đổi
 * 
 * Syntax stores:
 * - 'field1, field2': field1 là primary key, field2 là index
 * - '++id': Auto-increment primary key
 * - 'field1, field2, field3': field1 là primary key, field2 và field3 là indexes
 * 
 * Index giúp query nhanh hơn:
 * - Không có index: Phải scan toàn bộ bảng (O(n))
 * - Có index: Query trực tiếp (O(log n))
 */
db.version(1).stores({
  /**
   * Bảng products: Lưu thông tin sản phẩm
   * 
   * Primary key: localId (UUID)
   * Indexes:
   *   - barcode: Để tìm kiếm nhanh theo barcode (quét mã vạch)
   *   - name: Để tìm kiếm theo tên sản phẩm
   *   - synced: Để lọc sản phẩm đã/chưa sync với server (nếu có)
   *   - deleted: Để lọc sản phẩm đã xóa (soft delete)
   * 
   * Tại sao dùng soft delete (deleted flag):
   * - Giữ lại lịch sử đơn hàng đã bán
   * - Có thể khôi phục nếu xóa nhầm
   * - Không mất dữ liệu liên quan
   */
  products: 'localId, barcode, name, synced, deleted',
  
  /**
   * Bảng customers: Lưu thông tin khách hàng
   * 
   * Primary key: localId
   * Indexes:
   *   - phone: Để tìm kiếm nhanh theo số điện thoại (unique trong thực tế)
   *   - customerCode: Để tìm kiếm nhanh theo mã khách hàng (unique)
   *   - synced: Để sync với server
   * 
   * Lưu ý: phone và customerCode không được set unique trong schema vì có thể có nhiều record
   * nhưng logic validation sẽ đảm bảo unique
   */
  customers: 'localId, phone, customerCode, synced',
  
  /**
   * Bảng orders: Lưu đơn hàng
   * 
   * Primary key: localId
   * Indexes:
   *   - orderCode: Mã đơn hàng (VD: ORD-20241201-001) - để tìm kiếm
   *   - synced: Để sync với server
   *   - createdAt: Để sắp xếp theo thời gian, lọc theo ngày
   */
  orders: 'localId, orderCode, synced, createdAt',
  
  /**
   * Bảng order_items: Lưu chi tiết đơn hàng (quan hệ many-to-many)
   * 
   * Primary key: ++id (auto-increment)
   * Indexes:
   *   - orderLocalId: Để lấy tất cả items của một đơn hàng
   *   - productLocalId: Để lấy tất cả đơn hàng có sản phẩm này
   * 
   * Tại sao tách riêng order_items:
   * - Một đơn hàng có nhiều sản phẩm (1-n)
   * - Tránh duplicate data, dễ query
   * - Normalize database (3NF)
   */
  order_items: '++id, orderLocalId, productLocalId',
  
  /**
   * Bảng returns: Lưu đơn trả hàng
   * 
   * Primary key: localId
   * Indexes:
   *   - orderLocalId: Liên kết với đơn hàng gốc
   *   - synced: Để sync với server
   */
  returns: 'localId, orderLocalId, synced',
  
  /**
   * Bảng settings: Lưu cấu hình ứng dụng
   * 
   * Primary key: key (string)
   * 
   * Tại sao dùng key-value store:
   * - Cấu hình thường là key-value đơn giản
   * - Dễ thêm/sửa/xóa setting mới
   * - Không cần migration khi thêm setting
   * 
   * Alternative: Có thể dùng một object trong một record duy nhất
   */
  settings: 'key',
  
  /**
   * Bảng categories: Lưu nhóm hàng hóa
   * 
   * Primary key: localId
   * Index: name - Để tìm kiếm theo tên nhóm
   */
  categories: 'localId, name'
});

db.version(2).stores({
  products: 'localId, barcode, name, synced, deleted',
  customers: 'localId, phone, customerCode, synced',
  orders: 'localId, orderCode, customerLocalId, synced, createdAt',
  order_items: '++id, orderLocalId, productLocalId',
  returns: 'localId, orderLocalId, synced',
  settings: 'key',
  categories: 'localId, name'
});

db.version(3).stores({
  products: 'localId, barcode, name, synced, deleted',
  customers: 'localId, phone, customerCode, synced',
  orders: 'localId, orderCode, customerLocalId, synced, createdAt',
  order_items: '++id, orderLocalId, productLocalId',
  returns: 'localId, returnCode, orderLocalId, orderCode, synced, createdAt',
  return_items: '++id, returnLocalId, productLocalId',
  settings: 'key',
  categories: 'localId, name'
});

/**
 * HELPER FUNCTION: Tạo localId mới
 * 
 * UUID v4: Random UUID (Universally Unique Identifier)
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * 
 * Ưu điểm:
 * - Đảm bảo unique (xác suất trùng cực thấp)
 * - Không cần server để generate
 * - Phân tán được (nhiều client có thể generate cùng lúc)
 * 
 * Nhược điểm:
 * - Dài (36 ký tự)
 * - Không có thứ tự (không sort được theo thời gian tạo)
 * - Không human-readable
 * 
 * Alternative:
 * - nanoid: Ngắn hơn (21 ký tự), nhanh hơn
 * - timestamp + random: Có thứ tự, nhưng có thể trùng nếu nhiều request cùng lúc
 * - ULID: Có thứ tự + unique, nhưng dài hơn UUID
 */
export const generateLocalId = () => uuidv4();

/**
 * HELPER FUNCTION: Tạo mã đơn hàng
 * Format: ORD-YYYYMMDD-XXX (VD: ORD-20241201-001)
 * 
 * Logic:
 * 1. Lấy ngày hiện tại: new Date()
 * 2. Format thành YYYYMMDD: toISOString() -> split('T')[0] -> replace('-', '')
 *    - toISOString(): "2024-12-01T10:30:00.000Z"
 *    - split('T')[0]: "2024-12-01"
 *    - replace(/-/g, ''): "20241201"
 * 3. Random 3 số: Math.floor(Math.random() * 1000) -> padStart(3, '0')
 *    - Math.random(): 0-1
 *    - * 1000: 0-999
 *    - padStart(3, '0'): "001", "042", "999"
 * 
 * Ưu điểm:
 * - Human-readable (có ngày, dễ nhớ)
 * - Có thứ tự (sort được theo ngày)
 * - Ngắn gọn
 * 
 * Nhược điểm:
 * - Có thể trùng nếu tạo > 1000 đơn/ngày (xác suất thấp)
 * - Phụ thuộc vào timezone của client
 * 
 * Alternative:
 * - ULID: Có timestamp + random, nhưng dài hơn
 * - Sequential number: Đơn giản hơn nhưng cần lưu counter
 */
export const generateOrderCode = async () => {
  try {
    await db.open();
    const orders = await db.orders.toArray();
    let maxNumber = -1;
    orders.forEach(order => {
      const code = (order.orderCode || '').trim();
      const match = code.match(/^HD(\d+)$/i);
      if (match) {
        const number = Number(match[1]);
        if (!Number.isNaN(number)) {
          maxNumber = Math.max(maxNumber, number);
        }
      }
    });
    return `HD${maxNumber + 1}`;
  } catch (error) {
    console.error('Lỗi tạo mã hóa đơn:', error);
    return `HD${Date.now()}`;
  }
};

export const generateReturnCode = async () => {
  try {
    await db.open();
    const returns = await db.returns.toArray();
    let maxNumber = -1;
    returns.forEach(returnItem => {
      const code = (returnItem.returnCode || '').trim();
      const match = code.match(/^TH(\d+)$/i);
      if (match) {
        const number = Number(match[1]);
        if (!Number.isNaN(number)) {
          maxNumber = Math.max(maxNumber, number);
        }
      }
    });
    return `TH${maxNumber + 1}`;
  } catch (error) {
    console.error('Lỗi tạo mã trả hàng:', error);
    return `TH${Date.now()}`;
  }
};

export const migrateOrderCodes = async () => {
  try {
    await db.open();
    await db.transaction('rw', db.orders, async () => {
      const orders = await db.orders.toArray();
      let maxNumber = -1;

      orders.forEach(order => {
        const code = (order.orderCode || '').trim();
        const match = code.match(/^HD(\d+)$/i);
        if (match) {
          const number = Number(match[1]);
          if (!Number.isNaN(number)) {
            maxNumber = Math.max(maxNumber, number);
          }
        }
      });

      const needUpdate = orders
        .filter(order => !/^HD\d+$/i.test((order.orderCode || '').trim()))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      let nextNumber = maxNumber + 1;
      for (const order of needUpdate) {
        await db.orders.update(order.localId, {
          orderCode: `HD${nextNumber}`
        });
        nextNumber += 1;
      }
    });
  } catch (error) {
    console.error('Lỗi migrate mã hóa đơn:', error);
  }
};

/**
 * HELPER FUNCTION: Kiểm tra barcode có trùng không
 * 
 * @param {string} barcode - Mã barcode cần kiểm tra
 * @param {string|null} excludeLocalId - LocalId của sản phẩm cần loại trừ (khi update)
 * @returns {Promise<boolean>} - true nếu barcode đã tồn tại
 * 
 * Logic:
 * 1. Kiểm tra barcode có giá trị không
 * 2. Mở database (await db.open())
 * 3. Query theo index 'barcode' (nhanh hơn scan toàn bộ)
 * 4. Nếu excludeLocalId: Loại trừ sản phẩm hiện tại (khi update)
 * 5. Chỉ tính sản phẩm chưa bị xóa (!p.deleted)
 * 
 * Tại sao dùng async/await:
 * - IndexedDB operations là asynchronous
 * - await giúp code dễ đọc hơn Promise.then()
 * 
 * Tại sao dùng .where().equals():
 * - Sử dụng index 'barcode' đã tạo trong schema
 * - Nhanh hơn nhiều so với .filter() (O(log n) vs O(n))
 * 
 * Alternative query methods:
 * - .filter(): Chậm hơn nhưng linh hoạt hơn (có thể dùng logic phức tạp)
 * - .get(): Chỉ lấy 1 record, nhanh nhất nếu biết primary key
 */
export const checkBarcodeExists = async (barcode, excludeLocalId = null) => {
  // Early return: Nếu không có barcode thì không cần check
  if (!barcode) return false;
  
  try {
    // Mở database connection (Dexie tự quản lý, nhưng nên gọi để đảm bảo)
    await db.open();
    
    // Query theo index 'barcode' - sử dụng index để query nhanh
    // .where('barcode'): Sử dụng index 'barcode' đã tạo trong schema
    // .equals(barcode): Tìm chính xác giá trị barcode
    let query = db.products.where('barcode').equals(barcode);
    
    if (excludeLocalId) {
      // Khi update sản phẩm: Loại trừ sản phẩm hiện tại
      // .toArray(): Lấy tất cả kết quả (có thể có nhiều nếu có duplicate)
      const products = await query.toArray();
      // .some(): Kiểm tra có ít nhất 1 sản phẩm khác (không phải sản phẩm hiện tại) và chưa bị xóa
      return products.some(p => p.localId !== excludeLocalId && !p.deleted);
    } else {
      // Khi thêm mới: Chỉ cần check có tồn tại không
      // .first(): Lấy record đầu tiên (nhanh hơn .toArray() vì chỉ cần 1 record)
      const product = await query.first();
      // Kiểm tra có tồn tại và chưa bị xóa
      return product && !product.deleted;
    }
  } catch (error) {
    // Log lỗi nhưng return false để không block flow
    console.error('Lỗi kiểm tra barcode:', error);
    return false;
  }
};

/**
 * HELPER FUNCTION: Kiểm tra số điện thoại có trùng không
 * 
 * @param {string} phone - Số điện thoại cần kiểm tra
 * @param {string|null} excludeLocalId - LocalId của khách hàng cần loại trừ (khi update)
 * @returns {Promise<boolean>} - true nếu số điện thoại đã tồn tại
 * 
 * Logic tương tự checkBarcodeExists nhưng cho bảng customers
 * 
 * Lưu ý: Số điện thoại thường là unique trong thực tế
 * nhưng không enforce unique constraint trong schema
 * vì có thể có edge cases (số điện thoại chung, etc.)
 */
export const checkPhoneExists = async (phone, excludeLocalId = null) => {
  if (!phone) return false;
  
  try {
    await db.open();
    // Query theo index 'phone' - nhanh hơn scan toàn bộ
    let query = db.customers.where('phone').equals(phone);
    
    if (excludeLocalId) {
      // Khi update: Loại trừ khách hàng hiện tại
      const customers = await query.toArray();
      return customers.some(c => c.localId !== excludeLocalId);
    } else {
      // Khi thêm mới: Chỉ cần check có tồn tại không
      const customer = await query.first();
      // !! để convert sang boolean (customer có thể là object hoặc undefined)
      return !!customer;
    }
  } catch (error) {
    console.error('Lỗi kiểm tra số điện thoại:', error);
    return false;
  }
};

/**
 * HELPER FUNCTION: Kiểm tra localId có trùng không trong bất kỳ bảng nào
 * 
 * @param {string} localId - LocalId cần kiểm tra
 * @param {string} tableName - Tên bảng (products, customers, orders, etc.)
 * @returns {Promise<boolean>} - true nếu localId đã tồn tại
 * 
 * Generic function: Có thể dùng cho bất kỳ bảng nào
 * 
 * Logic:
 * 1. Kiểm tra input hợp lệ
 * 2. Lấy table từ db[tableName] (dynamic table access)
 * 3. .get(localId): Query theo primary key - nhanh nhất (O(1))
 * 
 * Tại sao dùng .get() thay vì .where():
 * - .get() query theo primary key - nhanh nhất
 * - .where() query theo index - cần index đã tạo
 * 
 * Ưu điểm:
 * - Generic, có thể dùng cho nhiều bảng
 * - Nhanh (query theo primary key)
 * 
 * Nhược điểm:
 * - Phải truyền tableName, dễ nhầm lẫn
 * - Không type-safe (TypeScript sẽ giúp)
 */
export const checkLocalIdExists = async (localId, tableName) => {
  // Early return: Validate input
  if (!localId || !tableName) return false;
  
  try {
    await db.open();
    // Dynamic table access: db[tableName] - lấy table theo tên
    // Ví dụ: db['products'], db['customers']
    const table = db[tableName];
    if (!table) return false; // Table không tồn tại
    
    // .get(localId): Query theo primary key - nhanh nhất
    // Trả về object nếu tìm thấy, undefined nếu không
    const item = await table.get(localId);
    // !! để convert sang boolean
    return !!item;
  } catch (error) {
    console.error('Lỗi kiểm tra localId:', error);
    return false;
  }
};

/**
 * HELPER FUNCTION: Tạo mã sản phẩm tự động (SP000001, SP000002...)
 * 
 * @returns {Promise<string>} - Mã sản phẩm tiếp theo (VD: "SP000001", "SP000002")
 * 
 * Logic:
 * 1. Lấy tất cả sản phẩm từ database
 * 2. Filter: Chỉ lấy sản phẩm có productCode và chưa bị xóa
 * 3. Extract số từ productCode (SP0 -> 0, SP1 -> 1, ...)
 * 4. Tìm số lớn nhất
 * 5. Tăng lên 1 và tạo mã mới
 * 
 * Regex explanation:
 * - /^SP\d{6}$/: Bắt đầu bằng "SP", theo sau là 6 số, kết thúc
 * - /^SP(\d{6})$/: Capture group để lấy số
 * 
 * Ưu điểm:
 * - Human-readable (SP000001, SP000002...)
 * - Có thứ tự (dễ nhớ, dễ sort)
 * - Ngắn gọn
 * 
 * Nhược điểm:
 * - Phải load toàn bộ products để tìm max (chậm nếu có nhiều sản phẩm)
 * - Có thể có gap nếu xóa sản phẩm (SP000001, SP000002, SP000005...)
 * 
 * Optimization:
 * - Có thể lưu counter trong settings để không phải scan toàn bộ
 * - Hoặc dùng index trên productCode và query max
 * 
 * Alternative:
 * - ULID: Có timestamp + random, unique nhưng dài hơn
 * - Sequential counter: Đơn giản nhưng cần lưu state
 */
export const generateProductCode = async () => {
  try {
    await db.open();
    // Lấy tất cả sản phẩm - O(n) nhưng cần để tìm max
    // TODO: Optimize bằng cách lưu counter hoặc query max từ index
    const allProducts = await db.products.toArray();
    
    // Lấy tất cả productCode hiện có và extract số
    const existingCodes = allProducts
      // Filter: Chỉ lấy sản phẩm có productCode và chưa bị xóa
      .filter(p => p.productCode && !p.deleted)
      // Map: Lấy productCode
      .map(p => p.productCode)
      // Filter: Chỉ lấy mã dạng SP000001... (bỏ qua mã tùy chỉnh)
      // /^SP\d{6}$/: Regex kiểm tra bắt đầu bằng "SP" và theo sau là 6 số
      .filter(code => /^SP\d{6}$/.test(code))
      // Map: Extract số từ mã (SP000001 -> 1, ...)
      .map(code => {
        // Match regex để lấy số: /^SP(\d{6})$/ - capture group là số
        const match = code.match(/^SP(\d{6})$/);
        // Nếu match được thì parse số, không thì -1
        return match ? parseInt(match[1]) : -1;
      })
      // Filter: Bỏ các số không hợp lệ (-1)
      .filter(num => num >= 0);
    
    // Tìm số tiếp theo
    let nextNumber = 1;
    if (existingCodes.length > 0) {
      // Tìm số lớn nhất trong danh sách
      // Math.max(...array): Spread operator để truyền array vào Math.max
      const maxNumber = Math.max(...existingCodes);
      // Số tiếp theo = max + 1
      nextNumber = maxNumber + 1;
    }
    // Nếu không có mã nào thì bắt đầu từ 1
    
    // Tạo mã mới: SP + số (VD: SP000001)
    return `SP${String(nextNumber).padStart(6, '0')}`;
  } catch (error) {
    console.error('Lỗi generate productCode:', error);
    // Fallback: Dùng timestamp nếu có lỗi (đảm bảo unique nhưng không đẹp)
    return `SP${String(Date.now()).slice(-6)}`;
  }
};

/**
 * HELPER FUNCTION: Kiểm tra productCode có trùng không
 * 
 * @param {string} productCode - Mã sản phẩm cần kiểm tra
 * @param {string|null} excludeLocalId - LocalId của sản phẩm cần loại trừ (khi update)
 * @returns {Promise<boolean>} - true nếu productCode đã tồn tại
 * 
 * Lưu ý: Không dùng index vì productCode không có index trong schema
 * Phải scan toàn bộ products - O(n)
 * 
 * TODO: Thêm index 'productCode' vào schema để query nhanh hơn:
 * products: 'localId, barcode, name, productCode, synced, deleted'
 * 
 * Tại sao dùng .some() thay vì .find():
 * - .some() return boolean ngay khi tìm thấy (short-circuit)
 * - .find() return object, phải check truthy
 * - .some() semantic hơn cho việc "kiểm tra tồn tại"
 */
export const checkProductCodeExists = async (productCode, excludeLocalId = null) => {
  if (!productCode) return false;
  
  try {
    await db.open();
    // Lấy tất cả sản phẩm - O(n) vì không có index trên productCode
    // TODO: Thêm index 'productCode' vào schema để query nhanh hơn
    const allProducts = await db.products.toArray();
    
    if (excludeLocalId) {
      // Khi update: Loại trừ sản phẩm hiện tại
      // .some(): Kiểm tra có ít nhất 1 sản phẩm khác có cùng productCode và chưa bị xóa
      return allProducts.some(p => 
        p.productCode === productCode && 
        p.localId !== excludeLocalId && 
        !p.deleted
      );
    } else {
      // Khi thêm mới: Chỉ cần check có tồn tại không
      return allProducts.some(p => 
        p.productCode === productCode && 
        !p.deleted
      );
    }
  } catch (error) {
    console.error('Lỗi kiểm tra productCode:', error);
    return false;
  }
};

/**
 * HELPER FUNCTION: Tạo mã khách hàng tự động (KH000001, KH000002...)
 * 
 * @returns {Promise<string>} - Mã khách hàng tiếp theo (VD: "KH000001", "KH000002")
 * 
 * Logic tương tự generateProductCode nhưng cho khách hàng
 */
export const generateCustomerCode = async () => {
  try {
    await db.open();
    // Lấy tất cả khách hàng - O(n) nhưng cần để tìm max
    const allCustomers = await db.customers.toArray();
    
    // Lấy tất cả customerCode hiện có và extract số
    const existingCodes = allCustomers
      // Filter: Chỉ lấy khách hàng có customerCode
      .filter(c => c.customerCode)
      // Map: Lấy customerCode
      .map(c => c.customerCode)
      // Filter: Chỉ lấy mã dạng KH000001... (bỏ qua mã tùy chỉnh)
      .filter(code => /^KH\d{6}$/.test(code))
      // Map: Extract số từ mã (KH000001 -> 1, ...)
      .map(code => {
        const match = code.match(/^KH(\d{6})$/);
        return match ? parseInt(match[1]) : -1;
      })
      // Filter: Bỏ các số không hợp lệ (-1)
      .filter(num => num >= 0);
    
    // Tìm số tiếp theo
    let nextNumber = 1;
    if (existingCodes.length > 0) {
      const maxNumber = Math.max(...existingCodes);
      nextNumber = maxNumber + 1;
    }
    
    // Tạo mã mới: KH + số (VD: KH000001)
    return `KH${String(nextNumber).padStart(6, '0')}`;
  } catch (error) {
    console.error('Lỗi generate customerCode:', error);
    // Fallback: Dùng timestamp nếu có lỗi
    return `KH${String(Date.now()).slice(-6)}`;
  }
};

/**
 * HELPER FUNCTION: Kiểm tra customerCode có trùng không
 * 
 * @param {string} customerCode - Mã khách hàng cần kiểm tra
 * @param {string|null} excludeLocalId - LocalId của khách hàng cần loại trừ (khi update)
 * @returns {Promise<boolean>} - true nếu customerCode đã tồn tại
 */
export const checkCustomerCodeExists = async (customerCode, excludeLocalId = null) => {
  if (!customerCode) return false;
  
  try {
    await db.open();
    const allCustomers = await db.customers.toArray();
    
    if (excludeLocalId) {
      // Khi update: Loại trừ khách hàng hiện tại
      return allCustomers.some(c => 
        c.customerCode === customerCode && 
        c.localId !== excludeLocalId
      );
    } else {
      // Khi thêm mới: Chỉ cần check có tồn tại không
      return allCustomers.some(c => c.customerCode === customerCode);
    }
  } catch (error) {
    console.error('Lỗi kiểm tra customerCode:', error);
    return false;
  }
};

/**
 * EXPORT DATABASE INSTANCE
 * 
 * Export default để các component khác có thể import và sử dụng:
 * import db from './db/posDB';
 * 
 * Cách sử dụng:
 * - await db.products.add({...})  // Thêm sản phẩm
 * - await db.products.get(localId)  // Lấy sản phẩm theo ID
 * - await db.products.where('barcode').equals('123').first()  // Query theo barcode
 * - await db.products.toArray()  // Lấy tất cả
 * - await db.products.update(localId, {...})  // Cập nhật
 * - await db.products.delete(localId)  // Xóa (hard delete)
 */
export default db;
