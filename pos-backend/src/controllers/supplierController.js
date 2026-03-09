const Supplier = require('../models/Supplier');
const SupplierGroup = require('../models/SupplierGroup');

function validatePhone(value) {
  if (!value || !String(value).trim()) return { valid: true };
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) return { valid: false, message: 'Số điện thoại phải có 10–11 chữ số' };
  if (!/^0|84/.test(digits)) return { valid: false, message: 'Số điện thoại Việt Nam thường bắt đầu bằng 0 hoặc 84' };
  return { valid: true };
}

function validateEmail(value) {
  if (!value || !String(value).trim()) return { valid: true };
  const email = String(value).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: 'Email không đúng định dạng' };
  }
  return { valid: true };
}

function normalizePhoneForCompare(value) {
  if (!value || !String(value).trim()) return '';
  const digits = String(value).trim().replace(/\D/g, '');
  if (digits.length === 9 && !digits.startsWith('0')) return `0${digits}`;
  return digits.length > 0 ? (digits.startsWith('84') ? digits : digits.startsWith('0') ? digits : `0${digits}`) : '';
}

// Nhà cung cấp dùng chung cho toàn bộ cửa hàng của owner — chỉ lọc theo userId
async function listSuppliers(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const suppliers = await Supplier.find({ userId: effectiveUserId })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ suppliers });
}

async function getNextSupplierCode(userId) {
  const last = await Supplier.findOne({ userId, code: /^NCC\d+$/ })
    .sort({ code: -1 })
    .select('code')
    .lean();
  const n = last && last.code ? parseInt(last.code.replace(/\D/g, ''), 10) : 0;
  return `NCC${String(n + 1).padStart(6, '0')}`;
}

async function createSupplier(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { userId: queryUserId } = req.query || {};
  const {
    code,
    name,
    phone,
    email,
    address,
    area,
    ward,
    group,
    groupId,
    notes,
    companyName,
    taxCode,
    currentDebt,
    totalPurchase,
    status,
  } = req.body || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập tên nhà cung cấp' });
  }
  const phoneStr = String(phone || '').trim();
  const emailStr = String(email || '').trim();
  if (!phoneStr && !emailStr) {
    return res.status(400).json({
      message: 'Nhà cung cấp cần ít nhất một thông tin liên lạc: số điện thoại hoặc email',
    });
  }
  if (phoneStr) {
    const pr = validatePhone(phoneStr);
    if (!pr.valid) return res.status(400).json({ message: pr.message });
  }
  if (emailStr) {
    const er = validateEmail(emailStr);
    if (!er.valid) return res.status(400).json({ message: er.message });
  }

  let finalCode = String(code || '').trim();
  if (!finalCode) {
    finalCode = await getNextSupplierCode(effectiveUserId);
  }

  let groupName = String(group || '').trim();
  if (groupId) {
    const groupDoc = await SupplierGroup.findOne({
      _id: groupId,
      userId: effectiveUserId,
    }).lean();
    if (groupDoc && groupDoc.name) {
      groupName = groupDoc.name;
    }
  }

  if (finalCode) {
    const existingByCode = await Supplier.findOne({
      userId: effectiveUserId,
      code: { $regex: new RegExp(`^${String(finalCode).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();
    if (existingByCode) {
      return res.status(400).json({ message: 'Mã nhà cung cấp đã tồn tại.' });
    }
  }
  if (phoneStr) {
    const norm = normalizePhoneForCompare(phoneStr);
    if (norm) {
      const existing = await Supplier.find({ userId: effectiveUserId }).lean();
      const hasSamePhone = existing.some((s) => normalizePhoneForCompare(s.phone) === norm);
      if (hasSamePhone) {
        return res.status(400).json({ message: 'Số điện thoại nhà cung cấp đã tồn tại.' });
      }
    }
  }

  const created = await Supplier.create({
    userId: effectiveUserId,
    storeId: '',
    code: finalCode,
    name: String(name).trim(),
    phone: phoneStr,
    email: emailStr,
    address: String(address || '').trim(),
    area: String(area || '').trim(),
    ward: String(ward || '').trim(),
    group: groupName,
    notes: String(notes || '').trim(),
    companyName: String(companyName || '').trim(),
    taxCode: String(taxCode || '').trim(),
    currentDebt: Number(currentDebt) || 0,
    totalPurchase: Number(totalPurchase) || 0,
    status: status === 'inactive' ? 'inactive' : 'active',
  });

  return res.status(201).json({ supplier: created });
}

async function updateSupplier(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const { userId: queryUserId } = req.query || {};
  const body = req.body || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const supplier = await Supplier.findOne({ _id: id, userId: effectiveUserId });
  if (!supplier) {
    return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
  }

  const allowed = [
    'name', 'phone', 'email', 'address', 'area', 'ward', 'group', 'groupId', 'notes',
    'companyName', 'taxCode', 'currentDebt', 'totalPurchase', 'status', 'code',
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === 'groupId' && body[key]) {
        const groupDoc = await SupplierGroup.findOne({
          _id: body[key],
          userId: effectiveUserId,
        }).lean();
        if (groupDoc && groupDoc.name) {
          supplier.group = groupDoc.name;
        }
      } else if (key !== 'groupId') {
        if (key === 'name') supplier.name = String(body[key] || '').trim();
        else if (key === 'phone') supplier.phone = String(body[key] || '').trim();
        else if (key === 'email') supplier.email = String(body[key] || '').trim();
        else if (key === 'code') supplier.code = String(body[key] || '').trim();
        else if (key === 'address') supplier.address = String(body[key] || '').trim();
        else if (key === 'area') supplier.area = String(body[key] || '').trim();
        else if (key === 'ward') supplier.ward = String(body[key] || '').trim();
        else if (key === 'group') supplier.group = String(body[key] || '').trim();
        else if (key === 'notes') supplier.notes = String(body[key] || '').trim();
        else if (key === 'companyName') supplier.companyName = String(body[key] || '').trim();
        else if (key === 'taxCode') supplier.taxCode = String(body[key] || '').trim();
        else if (key === 'currentDebt') supplier.currentDebt = Number(body[key]) || 0;
        else if (key === 'totalPurchase') supplier.totalPurchase = Number(body[key]) || 0;
        else if (key === 'status') supplier.status = body[key] === 'inactive' ? 'inactive' : 'active';
      }
    }
  }

  const phoneStr = (supplier.phone || '').trim();
  const emailStr = (supplier.email || '').trim();
  if (!phoneStr && !emailStr) {
    return res.status(400).json({
      message: 'Nhà cung cấp cần ít nhất một thông tin liên lạc: số điện thoại hoặc email',
    });
  }
  if (phoneStr) {
    const pr = validatePhone(phoneStr);
    if (!pr.valid) return res.status(400).json({ message: pr.message });
  }
  if (emailStr) {
    const er = validateEmail(emailStr);
    if (!er.valid) return res.status(400).json({ message: er.message });
  }
  if (!supplier.name) {
    return res.status(400).json({ message: 'Vui lòng nhập tên nhà cung cấp' });
  }

  if (supplier.code) {
    const existingCode = await Supplier.findOne({
      userId: effectiveUserId,
      _id: { $ne: id },
      code: { $regex: new RegExp(`^${String(supplier.code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();
    if (existingCode) {
      return res.status(400).json({ message: 'Mã nhà cung cấp đã tồn tại.' });
    }
  }
  if (phoneStr) {
    const norm = normalizePhoneForCompare(phoneStr);
    if (norm) {
      const others = await Supplier.find({ userId: effectiveUserId, _id: { $ne: id } }).lean();
      const hasSamePhone = others.some((s) => normalizePhoneForCompare(s.phone) === norm);
      if (hasSamePhone) {
        return res.status(400).json({ message: 'Số điện thoại nhà cung cấp đã tồn tại.' });
      }
    }
  }

  await supplier.save();
  return res.json({ supplier });
}

async function deleteSupplier(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { id } = req.params;
  const { userId: queryUserId } = req.query || {};

  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  const deleted = await Supplier.findOneAndDelete({
    _id: id,
    userId: effectiveUserId,
  });
  if (!deleted) {
    return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
  }
  return res.json({ message: 'Đã xóa nhà cung cấp' });
}

module.exports = {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
