# POS — Hệ thống bán hàng & quản trị

Monorepo gồm **ứng dụng POS** (bán hàng tại quầy), **pos-admin** (quản trị web) và **API backend** (Node.js + MongoDB).

| Thư mục        | Mô tả |
|----------------|--------|
| `pos-app/`     | Giao diện bán hàng (React + Vite + MUI), IndexedDB offline, đồng bộ với server |
| `pos-admin/`   | Quản trị: hàng hóa, đơn hàng, khách hàng, nhập Excel KH, báo cáo… |
| `pos-backend/` | REST API Express, JWT, MongoDB (Mongoose), sync dữ liệu POS |

## Yêu cầu

- **Node.js** 18+ (khuyến nghị LTS)
- **MongoDB** (local hoặc Atlas)
- **npm** hoặc **yarn**

## Cài đặt nhanh

```bash
cd pos-backend && npm install
cd ../pos-app && npm install
cd ../pos-admin && npm install
```

Tạo thủ công file **`.env`** trong `pos-backend/`, `pos-app/`, `pos-admin/` (theo bảng biến bên dưới). File `.env` / `.env.example` local đã được git ignore.

## Biến môi trường

### `pos-backend/.env`

| Biến | Mô tả |
|------|--------|
| `PORT` | Cổng API (mặc định `5000`) |
| `MONGODB_URI` | Chuỗi kết nối MongoDB (**bắt buộc**) |
| `JWT_SECRET` | Secret ký access token (**bắt buộc**) |
| `JWT_REFRESH_SECRET` | Secret refresh token (**bắt buộc**) |
| `CLIENT_ORIGIN` | Origin CORS (VD: `http://localhost:5173,http://localhost:5174`) |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Thời hạn token (mặc định `2h` / `7d`) |
| `BODY_LIMIT` / `RATE_LIMIT_*` | Giới hạn body & rate limit (API) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Dùng cho `npm run seed:admin` |

### `pos-app/.env` & `pos-admin/.env`

| Biến | Mô tả |
|------|--------|
| `VITE_API_BASE_URL` | URL API (VD: `http://localhost:5000`) |
| `VITE_DEFAULT_STORE_ID` | Mã cửa hàng mặc định (thường `default`) |
| `VITE_POS_APP_URL` | (Admin) Link mở POS bán hàng |
| `VITE_POS_ADMIN_URL` | (POS app) Link mở admin |

**pos-admin** thường cần thêm `VITE_POS_APP_URL` (ví dụ `http://localhost:5173/pos`).

## Chạy môi trường dev

Mở **3 terminal**:

```bash
# 1) API
cd pos-backend && npm run dev
# → http://localhost:5000 (hoặc PORT trong .env)

# 2) POS bán hàng
cd pos-app && npm run dev
# → http://localhost:5173

# 3) Admin
cd pos-admin && npm run dev
# → http://localhost:5174
```

Tạo tài khoản admin lần đầu (sau khi cấu hình `.env`):

```bash
cd pos-backend && npm run seed:admin
```

## Build production

```bash
cd pos-app && npm run build
cd ../pos-admin && npm run build
cd ../pos-backend && npm start
```

Phục vụ static `dist/` của Vite bằng nginx/caddy hoặc host tĩnh tùy hạ tầng.

## Tính năng chính (tóm tắt)

- Đăng nhập / refresh token, phân quyền
- Đồng bộ đơn hàng, trả hàng, khách hàng, sản phẩm… giữa POS và server
- **pos-admin**: danh sách khách, lọc, **import Excel** (mẫu + tùy chọn cập nhật nợ/điểm/trùng email-SĐT), dừng import
- Báo cáo, hàng hóa, nhà cung cấp, đơn mua hàng (tuỳ phiên bản code)

## Scripts hữu ích

| Lệnh | Thư mục | Mô tả |
|------|---------|--------|
| `npm run dev` | `pos-app`, `pos-admin` | Dev server Vite |
| `npm run dev` | `pos-backend` | Nodemon API |
| `npm run build` | `pos-app`, `pos-admin` | Build production |
| `npm run seed:admin` | `pos-backend` | Tạo user admin |
| `npm run lint` | `pos-app`, `pos-admin` | ESLint |

## Cấu trúc repo

```
POS/
├── pos-app/          # Frontend POS
├── pos-admin/        # Frontend quản trị
├── pos-backend/      # API
└── README.md
```

## License

Private — chỉ dùng nội bộ / theo thỏa thuận chủ sở hữu.

---

**Lưu ý:** Không commit file `.env` chứa secret. File `.env` và `.env.example` cục bộ được đưa vào `.gitignore` — không đẩy lên GitHub.
