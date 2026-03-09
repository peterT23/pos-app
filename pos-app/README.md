# POS Web Application (PWA)

Hệ thống bán hàng offline-first với React + MUI + IndexedDB

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy development server
```bash
npm run dev
```

Mở trình duyệt tại: `http://localhost:5173`

### 3. Build production
```bash
npm run build
```

## 📁 Cấu trúc thư mục

```
src/
├── db/
│   ├── posDB.js          # Database IndexedDB với Dexie
│   └── seedData.js       # Dữ liệu mẫu để test
├── components/
│   ├── SearchBar.jsx     # Thanh tìm kiếm/quét barcode
│   ├── ProductGrid.jsx   # Grid hiển thị sản phẩm
│   └── Cart.jsx          # Giỏ hàng
├── pages/
│   └── PosPage.jsx       # Trang POS chính
├── App.jsx
└── main.jsx
```

## ✨ Tính năng hiện tại

- ✅ Tìm kiếm sản phẩm
- ✅ Thêm sản phẩm vào giỏ hàng
- ✅ Tăng/giảm số lượng
- ✅ Xóa sản phẩm khỏi giỏ
- ✅ Thanh toán và lưu đơn hàng vào IndexedDB
- ✅ Quản lý tồn kho tự động
- ✅ Tích điểm khách hàng
- ✅ Hoạt động offline 100%

## 🔄 Tính năng sắp tới

- [ ] Quét barcode bằng camera
- [ ] In hóa đơn
- [ ] Trả/đổi hàng
- [ ] Sync dữ liệu lên server
- [ ] Đóng gói PWA cho Android

## 🗄️ Database Schema

### Products
- localId, barcode, name, price, stock, synced, deleted

### Customers
- localId, name, phone, points, synced

### Orders
- localId, orderCode, totalAmount, paymentMethod, synced

### Order Items
- orderLocalId, productLocalId, price, qty

## 📝 Ghi chú

- Dữ liệu được lưu trong IndexedDB (trình duyệt)
- Tất cả hoạt động offline
- Chưa có sync lên server (sẽ làm ở giai đoạn sau)
