const XLSX = require('xlsx');
const multer = require('multer');
const crypto = require('crypto');
const Customer = require('../models/Customer');
const { buildStoreFilter } = require('./customerController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname || '');
    cb(null, ok);
  },
});

/** Thứ tự cột giống mẫu Excel (hình 1–3) */
const TEMPLATE_HEADERS = [
  'Loại khách',
  'Mã khách hàng',
  'Tên khách hàng',
  'Điện thoại',
  'Địa chỉ',
  'Khu vực giao hàng',
  'Phường/Xã',
  'Công ty',
  'Mã số thuế',
  'Số CMND/CCCD',
  'Ngày sinh',
  'Giới tính',
  'Email',
  'Facebook',
  'Nhóm khách hàng',
  'Ghi chú',
  'Ngày giao dịch cuối',
  'Điểm hiện tại',
  'Nợ cần thu hiện tại',
  'Tổng bán (Không import)',
  'Trạng thái',
];

const TEMPLATE_SAMPLE = [
  'Cá nhân',
  'KH000008',
  'Nguyễn Hoàng Mai',
  '06253512',
  'Thụy Khuê',
  'Hà Nội - Quận Tây Hồ',
  'Phường Thụy Khuê',
  '',
  '3242342',
  '',
  '04/05/1950',
  'Nam',
  'nguyenhoangmai@gmail.com',
  'https://facebook.com',
  'Nhóm 1 | Nhóm 2',
  'Ghi chú',
  '10/01/2017',
  10,
  '100000',
  '',
  '1',
];

const MATCHERS = [
  { key: 'customerType', test: (h) => /^loại khách$/i.test(h) },
  { key: 'customerCode', test: (h) => /^mã khách hàng$/i.test(h) },
  { key: 'name', test: (h) => /^tên khách hàng$/i.test(h) },
  { key: 'phone', test: (h) => /^điện thoại$/i.test(h) },
  { key: 'address', test: (h) => /^địa chỉ$/i.test(h) },
  { key: 'area', test: (h) => /^khu vực giao hàng$/i.test(h) },
  { key: 'ward', test: (h) => /^phường\/xã$/i.test(h) || /^phường\s*\/\s*xã$/i.test(h) },
  { key: 'company', test: (h) => /^công ty$/i.test(h) },
  { key: 'taxId', test: (h) => /^mã số thuế$/i.test(h) },
  { key: 'citizenId', test: (h) => /^số cmnd\/cccd$/i.test(h) },
  { key: 'dateOfBirth', test: (h) => /^ngày sinh$/i.test(h) },
  { key: 'gender', test: (h) => /^giới tính$/i.test(h) },
  { key: 'email', test: (h) => /^email$/i.test(h) },
  { key: 'facebook', test: (h) => /^facebook$/i.test(h) },
  { key: 'group', test: (h) => /^nhóm khách hàng$/i.test(h) },
  { key: 'note', test: (h) => /^ghi chú$/i.test(h) },
  { key: 'lastTransactionAt', test: (h) => /^ngày giao dịch cuối$/i.test(h) },
  { key: 'points', test: (h) => /^điểm hiện tại$/i.test(h) },
  { key: 'debt', test: (h) => /^nợ cần thu hiện tại$/i.test(h) },
  { key: 'skipTotalSales', test: (h) => /tổng bán/i.test(h) && /không import/i.test(h) },
  { key: 'status', test: (h) => /^trạng thái$/i.test(h) },
];

function normalizePhone(p) {
  if (p === null || p === undefined) return '';
  return String(p).trim().replace(/\s+/g, '');
}

function strVal(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
  return String(v).trim();
}

function parseVietnameseNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const s = String(v).trim().replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function parseDMYDisplay(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const d = v;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
  }
  return s;
}

function parseDMYToTs(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getTime();
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  return new Date(y, mo, d, 12, 0, 0, 0).getTime();
}

function parseStatus(v) {
  if (v === null || v === undefined || v === '') return 'active';
  const s = String(v).trim().toLowerCase();
  if (s === '0' || s === 'ngừng' || s === 'inactive' || s === 'off') return 'inactive';
  return 'active';
}

function buildFieldIndex(headerRow) {
  const idx = {};
  headerRow.forEach((cell, i) => {
    const h = String(cell || '').trim();
    if (!h) return;
    const found = MATCHERS.find((x) => x.test(h));
    if (found && idx[found.key] === undefined) idx[found.key] = i;
  });
  return idx;
}

function rowToFields(row, fieldIdx) {
  const o = {};
  Object.keys(fieldIdx).forEach((key) => {
    if (key === 'skipTotalSales') return;
    const i = fieldIdx[key];
    o[key] = row[i];
  });
  return o;
}

function sanitizeLocalId(code) {
  const s = strVal(code);
  if (!s) return '';
  if (/^[a-zA-Z0-9_-]+$/.test(s)) return s;
  return '';
}

function buildPayload(raw, fieldIdx) {
  const f = rowToFields(raw, fieldIdx);
  const email = strVal(f.email);
  const groupRaw = strVal(f.group).replace(/\s*\|\s*/g, '|');
  const pts = parseVietnameseNumber(f.points);
  const debt = parseVietnameseNumber(f.debt);
  return {
    customerType: strVal(f.customerType),
    customerCode: strVal(f.customerCode),
    name: strVal(f.name),
    phone: normalizePhone(f.phone),
    address: strVal(f.address),
    area: strVal(f.area),
    ward: strVal(f.ward),
    company: strVal(f.company),
    taxId: strVal(f.taxId),
    citizenId: strVal(f.citizenId),
    dateOfBirth: parseDMYDisplay(f.dateOfBirth),
    gender: strVal(f.gender),
    email,
    facebook: strVal(f.facebook),
    group: groupRaw,
    note: strVal(f.note),
    lastTransactionAt: parseDMYToTs(f.lastTransactionAt),
    points: pts !== null ? Math.round(pts) : null,
    debt: debt !== null ? debt : null,
    status: parseStatus(f.status),
  };
}

function isRowEmpty(p) {
  return !p.name && !p.phone && !p.customerCode;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Thứ tự: mã KH → email → SĐT.
 * matchType: 'code' | 'email' | 'phone' — dùng để biết có được phép ghi đè hay không.
 */
async function findExistingCustomerDetailed(userId, storeId, code, phone, email) {
  const c = sanitizeLocalId(code);
  const ph = normalizePhone(phone);
  const em = strVal(email);
  if (c) {
    const doc = await Customer.findOne({
      userId,
      storeId,
      $or: [{ localId: c }, { customerCode: c }],
    }).lean();
    if (doc) return { doc, matchType: 'code' };
  }
  if (em) {
    const doc = await Customer.findOne({
      userId,
      storeId,
      email: { $regex: new RegExp(`^${escapeRegex(em)}$`, 'i') },
    }).lean();
    if (doc) return { doc, matchType: 'email' };
  }
  if (ph) {
    const doc = await Customer.findOne({ userId, storeId, phone: ph }).lean();
    if (doc) return { doc, matchType: 'phone' };
  }
  return { doc: null, matchType: null };
}

async function emailConflict(userId, storeId, email, excludeId) {
  if (!email) return null;
  const em = strVal(email);
  const q = {
    userId,
    storeId,
    email: { $regex: new RegExp(`^${escapeRegex(em)}$`, 'i') },
  };
  if (excludeId) q._id = { $ne: excludeId };
  return Customer.findOne(q).lean();
}

function resolveStoreId(req, storeFilter) {
  return req.body.storeId
    || (storeFilter.storeId && (typeof storeFilter.storeId === 'string'
      ? storeFilter.storeId
      : req.user?.storeIds?.[0]))
    || 'default';
}

function boolFrom(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'on' || s === 'yes';
}

async function downloadCustomerTemplate(req, res) {
  try {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CustomerTemplate');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="MauFileKhachHang.xlsx"');
    res.send(buf);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: 'Không tạo được file mẫu' });
  }
}

async function importCustomers(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Thiếu file Excel (.xlsx)' });
    }

    const { userId, role, storeFilter } = await buildStoreFilter(req);
    if (!userId) return res.status(400).json({ message: 'Thiếu thông tin người dùng' });

    const effectiveUserId = role === 'system_admin' && (req.query.userId || req.body.userId)
      ? String(req.query.userId || req.body.userId)
      : userId;

    const storeId = resolveStoreId(req, storeFilter);
    const updateDebt = boolFrom(req.body.updateDebt, true);
    const updatePoints = boolFrom(req.body.updatePoints, true);
    const allowDuplicateEmail = boolFrom(req.body.allowDuplicateEmail, false);
    /** Có tích mới ghi đè khi khớp theo email / SĐT (không khớp theo mã) */
    const updateOnDuplicateEmail = boolFrom(req.body.updateOnDuplicateEmail, false);
    const updateOnDuplicatePhone = boolFrom(req.body.updateOnDuplicatePhone, false);

    let clientClosed = false;
    const onReqClose = () => {
      clientClosed = true;
    };
    req.on('close', onReqClose);

    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = wb.SheetNames.includes('CustomerTemplate')
      ? 'CustomerTemplate'
      : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return res.status(400).json({ message: 'File không có sheet dữ liệu' });

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!rows.length) return res.status(400).json({ message: 'File trống' });

    const fieldIdx = buildFieldIndex(rows[0]);
    if (Object.keys(fieldIdx).length < 3) {
      return res.status(400).json({
        message: 'Không nhận diện được dòng tiêu đề. Dùng file mẫu (tải từ hệ thống).',
      });
    }

    const errors = [];
    const MAX_ERROR_ROWS = 200;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    /** Dòng bỏ qua do trùng email (không bật cập nhật / trùng với khách khác) */
    let skippedDuplicateEmail = 0;
    /** Dòng bỏ qua do trùng SĐT (không bật cập nhật) */
    let skippedDuplicatePhone = 0;

    const pushErr = (row, message) => {
      if (errors.length < MAX_ERROR_ROWS) errors.push({ row, message });
    };

    try {
      for (let r = 1; r < rows.length; r += 1) {
        if (clientClosed) break;

        const excelRow = r + 1;
        const raw = rows[r];
        if (!raw || !raw.length) {
          skipped += 1;
          // eslint-disable-next-line no-continue
          continue;
        }

        const payload = buildPayload(raw, fieldIdx);
        if (isRowEmpty(payload)) {
          skipped += 1;
          // eslint-disable-next-line no-continue
          continue;
        }

        try {
          const { doc: existing, matchType } = await findExistingCustomerDetailed(
            effectiveUserId,
            storeId,
            payload.customerCode,
            payload.phone,
            payload.email,
          );

          if (existing && matchType === 'email' && !updateOnDuplicateEmail) {
            skipped += 1;
            skippedDuplicateEmail += 1;
            pushErr(
              excelRow,
              'Bỏ qua: trùng email đã có — bật ô "Cập nhật khi trùng email" để ghi đè',
            );
            // eslint-disable-next-line no-continue
            continue;
          }
          if (existing && matchType === 'phone' && !updateOnDuplicatePhone) {
            skipped += 1;
            skippedDuplicatePhone += 1;
            pushErr(
              excelRow,
              'Bỏ qua: trùng số điện thoại — bật ô "Cập nhật khi trùng SĐT" để ghi đè',
            );
            // eslint-disable-next-line no-continue
            continue;
          }

          if (payload.email && !allowDuplicateEmail) {
            const other = await emailConflict(
              effectiveUserId,
              storeId,
              payload.email,
              existing?._id,
            );
            if (other && String(other._id) !== String(existing?._id)) {
              skipped += 1;
              skippedDuplicateEmail += 1;
              pushErr(
                excelRow,
                `Bỏ qua: email "${payload.email}" đã dùng cho khách khác — bật "Cho phép trùng email" để nhập`,
              );
              // eslint-disable-next-line no-continue
              continue;
            }
          }

          const now = Date.now();
          const code = sanitizeLocalId(payload.customerCode);
          const localId = code || `cust_${crypto.randomBytes(8).toString('hex')}`;

          if (!existing) {
            await Customer.create({
              userId: effectiveUserId,
              storeId,
              localId,
              customerCode: payload.customerCode || localId,
              name: payload.name,
              phone: payload.phone,
              address: payload.address,
              area: payload.area,
              ward: payload.ward,
              group: payload.group,
              email: payload.email,
              note: payload.note,
              gender: payload.gender,
              dateOfBirth: payload.dateOfBirth,
              facebook: payload.facebook,
              customerType: payload.customerType,
              company: payload.company,
              taxId: payload.taxId,
              citizenId: payload.citizenId,
              lastTransactionAt: payload.lastTransactionAt,
              status: payload.status,
              points: payload.points !== null ? payload.points : 0,
              debt: payload.debt !== null ? payload.debt : 0,
              createdAt: now,
              updatedAt: now,
            });
            created += 1;
          } else {
            const patch = {
              name: payload.name,
              phone: payload.phone,
              address: payload.address,
              area: payload.area,
              ward: payload.ward,
              group: payload.group,
              email: payload.email,
              note: payload.note,
              gender: payload.gender,
              dateOfBirth: payload.dateOfBirth,
              facebook: payload.facebook,
              customerType: payload.customerType,
              company: payload.company,
              taxId: payload.taxId,
              citizenId: payload.citizenId,
              lastTransactionAt: payload.lastTransactionAt,
              status: payload.status,
              customerCode: payload.customerCode || existing.customerCode,
              updatedAt: now,
            };
            if (updatePoints) patch.points = payload.points !== null ? payload.points : existing.points;
            else patch.points = existing.points;
            if (updateDebt) patch.debt = payload.debt !== null ? payload.debt : existing.debt;
            else patch.debt = existing.debt;

            await Customer.findByIdAndUpdate(existing._id, { $set: patch });
            updated += 1;
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          pushErr(excelRow, err.message || 'Lỗi ghi CSDL');
          skipped += 1;
        }
      }
    } finally {
      req.removeListener('close', onReqClose);
    }

    if (clientClosed) {
      return res.json({
        ok: false,
        cancelled: true,
        created,
        updated,
        skipped,
        skippedDuplicateEmail,
        skippedDuplicatePhone,
        errors,
        message: `Đã dừng theo yêu cầu. Đã xử lý: tạo ${created}, cập nhật ${updated}, bỏ qua ${skipped}.`,
      });
    }

    return res.json({
      ok: true,
      created,
      updated,
      skipped,
      skippedDuplicateEmail,
      skippedDuplicatePhone,
      errors,
      message: `Tạo mới ${created}, cập nhật ${updated}, bỏ qua ${skipped}.`,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: e.message || 'Lỗi import khách hàng' });
  }
}

module.exports = {
  upload,
  downloadCustomerTemplate,
  importCustomers,
};
