const XLSX = require('xlsx');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');

function parseNum(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const s = String(val).trim().replace(/\s/g, '');
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function colIndex(headers, names) {
  for (const name of names) {
    const i = headers.findIndex((h) => String(h || '').trim().toLowerCase().includes(name.toLowerCase()));
    if (i >= 0) return i;
  }
  return -1;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build pathKey -> categoryId from existing categories (path = "Cha>>Con", pathKey = lowercase). */
function buildCategoryPathMap(categories) {
  const idToCat = new Map();
  categories.forEach((c) => idToCat.set(c._id.toString(), c));
  const getPath = (catId) => {
    const c = idToCat.get(catId);
    if (!c) return '';
    const parentPath = c.parentId ? getPath(c.parentId) + '>>' : '';
    return parentPath + (c.name || '');
  };
  const pathKeyToId = new Map();
  categories.forEach((c) => {
    const path = getPath(c._id.toString());
    if (path) pathKeyToId.set(path.trim().toLowerCase(), c._id.toString());
  });
  return pathKeyToId;
}

/** Find or create category path (e.g. ["Dịch vụ", "Gói quà"]), max 4 levels. Returns leaf category id. */
async function getOrCreateCategoryPath(userId, storeId, segments, pathKeyToId, Category) {
  let parentId = '';
  let pathKeySoFar = '';
  for (const segment of segments) {
    const name = String(segment).trim();
    if (!name) continue;
    pathKeySoFar = (pathKeySoFar ? pathKeySoFar + '>>' : '') + name.toLowerCase();
    if (pathKeyToId.has(pathKeySoFar)) {
      parentId = pathKeyToId.get(pathKeySoFar);
      continue;
    }
    const existing = await Category.findOne({
      userId,
      storeId,
      parentId,
      name: new RegExp('^' + escapeRegex(name) + '$', 'i'),
    }).lean();
    if (existing) {
      const idStr = existing._id.toString();
      pathKeyToId.set(pathKeySoFar, idStr);
      parentId = idStr;
      continue;
    }
    let level = 1;
    if (parentId) {
      const parent = await Category.findById(parentId).lean();
      if (parent) level = Math.min((parent.level || 1) + 1, 4);
    }
    const created = await Category.create({
      userId,
      storeId,
      name,
      parentId,
      level,
    });
    const idStr = created._id.toString();
    pathKeyToId.set(pathKeySoFar, idStr);
    parentId = idStr;
  }
  return parentId;
}

async function importProducts(req, res) {
  const userId = req.user?.sub;
  const role = req.user?.role;
  const { storeId, userId: queryUserId } = req.query || {};
  const effectiveUserId = role === 'system_admin' && queryUserId ? queryUserId : userId;
  if (!effectiveUserId) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
  }

  let resolvedStoreId = '';
  if (storeId) {
    resolvedStoreId = storeId;
  } else if (Array.isArray(req.user?.storeIds) && req.user.storeIds.length > 0 && role !== 'system_admin') {
    resolvedStoreId = req.user.storeIds[0];
  } else {
    return res.status(400).json({ message: 'Thiếu thông tin cửa hàng' });
  }

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'Vui lòng chọn file Excel' });
  }

  let options = {};
  try {
    options = typeof req.body.importOptions === 'string' ? JSON.parse(req.body.importOptions) : req.body.importOptions || {};
  } catch {
    options = {};
  }
  const duplicateCodeName = options.duplicateCodeName === 'replace_name' ? 'replace_name' : 'error';
  const duplicateBarcodeCode = options.duplicateBarcodeCode === 'replace_code' ? 'replace_code' : 'error';
  const updateStock = options.updateStock === true;
  const updateCost = options.updateCost === true;
  const updateDescription = options.updateDescription === true;

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!data.length) {
    return res.status(400).json({ message: 'File Excel không có dữ liệu' });
  }

  const headers = data[0].map((h) => String(h ?? '').trim());
  const idx = {
    type: colIndex(headers, ['loại hàng']),
    category: colIndex(headers, ['nhóm hàng']),
    productCode: colIndex(headers, ['mã hàng']),
    barcode: colIndex(headers, ['mã vạch']),
    name: colIndex(headers, ['tên hàng']),
    brand: colIndex(headers, ['thương hiệu']),
    price: colIndex(headers, ['giá bán']),
    costPrice: colIndex(headers, ['giá vốn']),
    stock: colIndex(headers, ['tồn kho']),
    minStock: colIndex(headers, ['tồn nhỏ', 'tồn thấp']),
    maxStock: colIndex(headers, ['tồn lớn', 'tồn cao']),
    unit: colIndex(headers, ['đvt', 'đơn vị']),
    attribute: colIndex(headers, ['thuộc tính']),
    allowPoints: colIndex(headers, ['tích điểm']),
    position: colIndex(headers, ['vị trí']),
    description: colIndex(headers, ['mô tả']),
  };
  if (idx.productCode < 0 || idx.name < 0) {
    return res.status(400).json({ message: 'File Excel thiếu cột Mã hàng hoặc Tên hàng' });
  }

  const categories = await Category.find({ userId: effectiveUserId, storeId: resolvedStoreId }).lean();
  const pathKeyToId = buildCategoryPathMap(categories);

  const brands = await Brand.find({ userId: effectiveUserId, storeId: resolvedStoreId }).lean();
  const brandByName = new Map();
  brands.forEach((b) => {
    const n = (b.name || '').trim().toLowerCase();
    if (n && !brandByName.has(n)) brandByName.set(n, b._id.toString());
  });

  const existingByCode = new Map();
  const existingByBarcode = new Map();
  const existingProducts = await Product.find({
    userId: effectiveUserId,
    storeId: resolvedStoreId,
    deleted: { $ne: true },
  }).lean();
  existingProducts.forEach((p) => {
    const code = (p.productCode || '').trim();
    const barcode = (p.barcode || '').trim();
    if (code) existingByCode.set(code, p);
    if (barcode) existingByBarcode.set(barcode, p);
  });

  const codeRegex = /^SP\d{6}$/;
  const spProducts = await Product.find({ userId: effectiveUserId, storeId: resolvedStoreId, productCode: codeRegex })
    .select('productCode')
    .lean();
  let maxSp = spProducts.reduce((max, p) => {
    const n = Number(String(p.productCode).slice(2));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);

  const now = Date.now();
  const errors = [];
  const toUpsert = [];
  const getNextCode = () => {
    maxSp += 1;
    return `SP${String(maxSp).padStart(6, '0')}`;
  };

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const productCode = (idx.productCode >= 0 ? row[idx.productCode] : '') != null ? String(row[idx.productCode]).trim() : '';
    const barcode = (idx.barcode >= 0 ? row[idx.barcode] : '') != null ? String(row[idx.barcode]).trim() : '';
    const name = (idx.name >= 0 ? row[idx.name] : '') != null ? String(row[idx.name]).trim() : '';
    if (!name) continue;

    const codeFinal = productCode || getNextCode();
    if (!codeFinal) {
      errors.push({ row: r + 1, message: 'Không thể tạo mã hàng' });
      continue;
    }

    const existingByProductCode = existingByCode.get(codeFinal);
    const existingByBarcodeDoc = barcode ? existingByBarcode.get(barcode) : null;

    if (existingByProductCode && existingByProductCode.name !== name) {
      if (duplicateCodeName === 'error') {
        errors.push({ row: r + 1, message: `Trùng mã hàng "${codeFinal}" nhưng khác tên. Dừng import.` });
        return res.status(400).json({ message: 'Import dừng do trùng mã hàng/tên', errors });
      }
    }

    if (existingByBarcodeDoc && existingByBarcodeDoc.productCode !== codeFinal) {
      if (duplicateBarcodeCode === 'error') {
        errors.push({ row: r + 1, message: `Trùng mã vạch "${barcode}" nhưng khác mã hàng. Dừng import.` });
        return res.status(400).json({ message: 'Import dừng do trùng mã vạch/mã hàng', errors });
      }
      if (duplicateBarcodeCode === 'replace_code') {
        await Product.updateOne(
          { userId: effectiveUserId, storeId: resolvedStoreId, productCode: existingByBarcodeDoc.productCode },
          { $set: { productCode: codeFinal, updatedAt: now } }
        );
        existingByCode.delete(existingByBarcodeDoc.productCode);
        existingByCode.set(codeFinal, { ...existingByBarcodeDoc, productCode: codeFinal });
      }
    }

    let categoryId = '';
    if (idx.category >= 0 && row[idx.category]) {
      const pathRaw = String(row[idx.category]).trim();
      const segments = pathRaw.split('>>').map((s) => s.trim()).filter(Boolean);
      if (segments.length > 0) {
        const pathKey = segments.join('>>').toLowerCase();
        if (pathKeyToId.has(pathKey)) {
          categoryId = pathKeyToId.get(pathKey);
        } else {
          categoryId = await getOrCreateCategoryPath(
            effectiveUserId,
            resolvedStoreId,
            segments,
            pathKeyToId,
            Category
          );
        }
      }
    }

    let brandId = '';
    if (idx.brand >= 0 && row[idx.brand]) {
      const brandName = String(row[idx.brand]).trim().toLowerCase();
      brandId = brandByName.get(brandName) || '';
    }

    const price = parseNum(idx.price >= 0 ? row[idx.price] : 0);
    const costPrice = parseNum(idx.costPrice >= 0 ? row[idx.costPrice] : 0);
    let stock = parseNum(idx.stock >= 0 ? row[idx.stock] : 0);
    const unit = idx.unit >= 0 ? String(row[idx.unit] || '').trim() : '';
    const allowPoints = idx.allowPoints >= 0 ? parseNum(row[idx.allowPoints]) !== 0 : true;

    if (existingByProductCode && !updateStock) {
      stock = Number(existingByProductCode.stock) || 0;
    }
    let costToSet = costPrice;
    if (existingByProductCode && !updateCost) {
      costToSet = Number(existingByProductCode.costPrice) || 0;
    }

    toUpsert.push({
      productCode: codeFinal,
      barcode: barcode || '',
      name,
      price,
      costPrice: costToSet,
      stock,
      unit: unit || '',
      categoryId,
      brandId,
      allowPoints,
      localId: `import-${codeFinal}-${now}-${r}`,
    });
    existingByCode.set(codeFinal, { productCode: codeFinal, name, barcode, stock: costToSet });
    if (barcode) existingByBarcode.set(barcode, { productCode: codeFinal, name, barcode });
  }

  if (toUpsert.length === 0 && errors.length > 0) {
    return res.status(400).json({ message: 'Không có dòng nào hợp lệ để import', errors });
  }

  const ops = toUpsert.map((item) => ({
    updateOne: {
      filter: { userId: effectiveUserId, storeId: resolvedStoreId, productCode: item.productCode },
      update: {
        $set: {
          userId: effectiveUserId,
          storeId: resolvedStoreId,
          localId: item.localId,
          productCode: item.productCode,
          barcode: item.barcode,
          name: item.name,
          price: Number(item.price) || 0,
          costPrice: Number(item.costPrice) || 0,
          stock: Number(item.stock) || 0,
          unit: item.unit || '',
          categoryId: item.categoryId || '',
          brandId: item.brandId || '',
          allowPoints: item.allowPoints !== false,
          parentId: '',
          attributeName: '',
          attributeValue: '',
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  if (ops.length > 0) {
    await Product.bulkWrite(ops);
  }

  return res.status(200).json({
    message: 'Import thành công',
    imported: toUpsert.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

function downloadTemplate(req, res) {
  const headers = [
    'Loại hàng',
    'Nhóm hàng (3 Cấp)',
    'Mã hàng',
    'Mã vạch',
    'Tên hàng',
    'Thương hiệu',
    'Giá bán',
    'Giá vốn',
    'Tồn kho',
    'Tồn nhỏ nhất',
    'Tồn lớn nhất',
    'ĐVT',
    'Mã ĐVT Cơ bản',
    'Quy đổi',
    'Thuộc tính',
    'Hình ảnh (url1,url2...)',
    'Trọng lượng',
    'Tích điểm',
    'Đang kinh doanh',
    'Được bán trực tiếp',
    'Mô tả',
    'Vị trí',
  ];
  const sample = [
    'Hàng hóa',
    'Kẹo bánh',
    'HH000001',
    '364332862',
    'Kẹo Doublemint',
    'Doublemint',
    10000,
    3000,
    50,
    0,
    999,
    'Hộp',
    '',
    1,
    '',
    '',
    '',
    1,
    1,
    1,
    '',
    'Dãy 1',
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  XLSX.utils.book_append_sheet(wb, ws, 'ProductTemplate');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=MauFileSanPham.xlsx');
  res.send(buf);
}

module.exports = { importProducts, downloadTemplate };
