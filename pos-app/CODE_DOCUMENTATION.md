# 📚 Tài Liệu Code - POS Application

## 🏗️ Kiến Trúc Tổng Quan

### Tech Stack
- **React 18+**: UI Framework
- **Material-UI (MUI)**: Component Library
- **Dexie.js**: IndexedDB Wrapper
- **IndexedDB**: Browser Database (Local Storage)
- **React Router**: Navigation

---

## 📁 Cấu Trúc Thư Mục

```
pos-app/src/
├── db/
│   ├── posDB.js          # Database setup & helpers
│   └── seedData.js       # Initial data seeding
├── components/
│   ├── ProductList.jsx           # Danh sách sản phẩm trong hóa đơn
│   ├── ProductSearchDropdown.jsx # Dropdown tìm kiếm sản phẩm
│   ├── PaymentPanel.jsx          # Panel thanh toán bên phải
│   ├── Header.jsx                # Header với search bar
│   └── ...
├── pages/
│   └── PosPage.jsx       # Trang POS chính
└── utils/
    └── searchUtils.js    # Utility functions cho search
```

---

## 🗄️ Database Schema (IndexedDB)

### Bảng `products`
```javascript
{
  localId: string (UUID),      // Primary key
  productCode: string,         // SP0, SP1, SP2...
  barcode: string | null,      // Mã vạch
  name: string,                // Tên sản phẩm
  price: number,               // Giá bán
  costPrice: number,           // Giá vốn
  stock: number,               // Tồn kho
  unit: string,                // Đơn vị (Cái, Cây, ...)
  categoryId: string | null,   // ID nhóm hàng hóa
  allowPoints: boolean,        // Có tích điểm không
  createdAt: number,           // Timestamp
  updatedAt: number,           // Timestamp
  synced: boolean,             // Đã sync với server chưa
  deleted: boolean             // Soft delete flag
}
```

**Indexes**: `localId`, `barcode`, `name`, `synced`, `deleted`

### Bảng `customers`
```javascript
{
  localId: string (UUID),
  name: string,
  phone: string,               // Unique trong thực tế
  points: number,              // Điểm tích lũy
  createdAt: number,
  synced: boolean
}
```

**Indexes**: `localId`, `phone`, `synced`

### Bảng `orders`
```javascript
{
  localId: string (UUID),
  orderCode: string,           // ORD-YYYYMMDD-XXX
  totalAmount: number,
  subtotalAmount: number,
  discount: number,
  discountType: 'vnd' | 'percent',
  paymentMethod: string,
  customerPhone: string | null,
  pointsEarned: number,
  status: string,
  createdAt: number,
  synced: boolean,
  note: string
}
```

**Indexes**: `localId`, `orderCode`, `synced`, `createdAt`

### Bảng `order_items`
```javascript
{
  id: number (auto-increment), // Primary key
  orderLocalId: string,         // Foreign key -> orders
  productLocalId: string,       // Foreign key -> products
  productName: string,
  price: number,
  qty: number,
  subtotal: number
}
```

**Indexes**: `++id`, `orderLocalId`, `productLocalId`

---

## 🔑 Các Khái Niệm Quan Trọng

### 1. Local State vs Parent State

**Local State** (trong component):
- `qtyInputs`: Giá trị đang nhập trong input
- `discountInputs`: Giá trị giảm giá đang nhập
- Mục đích: Cho phép user nhập tự do, validate khi blur

**Parent State** (PosPage):
- `invoices`: State chính của toàn bộ app
- Mục đích: Single source of truth

**Tại sao tách?**
- UX tốt hơn: User có thể xóa và nhập lại
- Performance: Không re-render parent mỗi lần gõ phím
- Validation: Validate khi blur, không validate khi đang gõ

### 2. Controlled vs Uncontrolled Components

**Controlled** (TextField với value + onChange):
```javascript
<TextField
  value={state}
  onChange={(e) => setState(e.target.value)}
/>
```
- State được quản lý bởi React
- Dễ validate, dễ test
- Re-render mỗi lần thay đổi

**Uncontrolled** (ref + defaultValue):
```javascript
const ref = useRef();
<TextField inputRef={ref} defaultValue="..." />
```
- State được quản lý bởi DOM
- Ít re-render hơn
- Khó validate, khó test

**Trong project này**: Dùng Controlled cho hầu hết, Uncontrolled chỉ cho auto-focus

### 3. Debouncing

**Vấn đề**: Mỗi lần user gõ phím → gọi API/search → chậm, tốn tài nguyên

**Giải pháp**: Debounce - Chờ user ngừng gõ 300ms mới search

```javascript
// Trong ProductSearchDropdown.jsx
useEffect(() => {
  const timer = setTimeout(() => {
    loadProducts(searchTerm);
  }, 300);
  
  return () => clearTimeout(timer); // Cleanup
}, [searchTerm]);
```

**Tại sao 300ms?**
- Quá ngắn (< 100ms): Vẫn gọi nhiều lần
- Quá dài (> 500ms): User cảm thấy lag
- 300ms: Balance tốt giữa UX và performance

### 4. useCallback vs useMemo

**useCallback**: Memoize function
```javascript
const loadProducts = useCallback(async (term) => {
  // ...
}, [dependencies]);
```
- Tránh tạo function mới mỗi lần render
- Dùng khi pass function làm prop cho child component

**useMemo**: Memoize value
```javascript
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);
```
- Tránh tính toán lại giá trị đắt
- Dùng cho expensive calculations

**Trong project**: Dùng useCallback cho loadProducts để tránh re-render không cần thiết

### 5. Event Propagation

**Vấn đề**: Click vào button trong dropdown → Trigger cả click outside → Đóng dropdown

**Giải pháp**: `stopPropagation()`
```javascript
onClick={(e) => {
  e.stopPropagation(); // Ngăn event bubble lên parent
  // ...
}}
```

**Event Flow**:
1. Capture phase: Window → Document → ... → Target
2. Target phase: Target element
3. Bubble phase: Target → ... → Document → Window

`stopPropagation()`: Dừng ở target, không bubble lên

---

## 🎯 Best Practices Đã Áp Dụng

### 1. Error Handling
```javascript
try {
  await db.products.add(product);
} catch (error) {
  console.error('Lỗi:', error);
  // Show user-friendly message
  setError('Có lỗi xảy ra. Vui lòng thử lại.');
}
```

### 2. Early Returns
```javascript
if (!barcode) return false; // Early return thay vì if-else lồng nhau
```

### 3. Functional Updates
```javascript
setState(prev => ({ ...prev, newValue })); // Đảm bảo lấy state mới nhất
```

### 4. Optional Chaining
```javascript
item?.product?.name; // Tránh lỗi nếu item hoặc product là null/undefined
```

### 5. Default Parameters
```javascript
function Component({ items = [] }) { // Default empty array
```

---

## ⚠️ Những Điểm Cần Lưu Ý

### 1. Performance Issues

**Vấn đề**: `generateProductCode()` load toàn bộ products
```javascript
const allProducts = await db.products.toArray(); // O(n)
```

**Giải pháp**: 
- Thêm index trên `productCode`
- Hoặc lưu counter trong settings

### 2. Memory Leaks

**Vấn đề**: Event listeners không cleanup
```javascript
useEffect(() => {
  document.addEventListener('click', handler);
  // ❌ Thiếu cleanup
}, []);
```

**Giải pháp**: Luôn cleanup
```javascript
useEffect(() => {
  document.addEventListener('click', handler);
  return () => {
    document.removeEventListener('click', handler); // ✅ Cleanup
  };
}, []);
```

### 3. Race Conditions

**Vấn đề**: Nhiều async operations cùng lúc
```javascript
// User click nhanh 2 lần → 2 requests cùng lúc
```

**Giải pháp**: 
- Disable button khi đang loading
- Hoặc dùng AbortController để cancel request cũ

---

## 🔄 Data Flow

```
User Input
    ↓
Component State (local)
    ↓
Validation (onBlur/onEnter)
    ↓
Parent State (PosPage)
    ↓
Database (IndexedDB)
```

---

## 📦 Dependencies & Alternatives

### Dexie.js
- **Hiện tại**: Dexie.js
- **Ưu điểm**: API đơn giản, Promise-based
- **Nhược điểm**: Bundle size ~50KB
- **Alternative**: 
  - `idb`: Nhẹ hơn nhưng API thấp hơn
  - IndexedDB thuần: Không dependency nhưng phức tạp

### Material-UI
- **Hiện tại**: @mui/material
- **Ưu điểm**: Component đẹp, accessible, theme support
- **Nhược điểm**: Bundle size ~200KB
- **Alternative**:
  - Tailwind CSS: Utility-first, nhẹ hơn
  - Chakra UI: Tương tự MUI nhưng nhẹ hơn
  - Ant Design: Component library khác

### UUID
- **Hiện tại**: uuid v4
- **Ưu điểm**: Unique, không cần server
- **Nhược điểm**: Dài (36 ký tự)
- **Alternative**:
  - nanoid: Ngắn hơn (21 ký tự)
  - ULID: Có thứ tự + unique

---

## 🚀 Optimization Opportunities

1. **Lazy Loading**: Load components khi cần
2. **Code Splitting**: Split routes thành chunks
3. **Memoization**: useMemo cho expensive calculations
4. **Virtual Scrolling**: Cho danh sách dài
5. **Service Worker**: Cache assets, offline support

---

## 📝 Notes

- Tất cả dữ liệu lưu local (IndexedDB)
- Không có backend server
- Có thể sync với server sau (thêm API calls)
- Soft delete: Không xóa thật, chỉ đánh dấu deleted = true
