import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormHelperText,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';
import { getStoredStoreId } from '../utils/authStorage';

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
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return { valid: false, message: 'Email không đúng định dạng (ví dụ: email@domain.com)' };
  return { valid: true };
}

function parseAmount(value) {
  if (value === '' || value == null) return null;
  const n = Number(String(value).replace(/,/g, '').replace(/\s/g, '').trim());
  return Number.isNaN(n) ? null : n;
}

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getStartOfDay(ymd) {
  if (!ymd) return null;
  const d = new Date(ymd + 'T00:00:00');
  return d.getTime();
}

function getEndOfDay(ymd) {
  if (!ymd) return null;
  const d = new Date(ymd + 'T23:59:59.999');
  return d.getTime();
}

function getTimePresetRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);
  switch (preset) {
    case 'today':
      break;
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start = new Date(today);
      start.setDate(start.getDate() + diff);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) + 1;
      start = new Date(now.getFullYear(), (q - 1) * 3, 1);
      end = new Date(now.getFullYear(), q * 3, 0);
      break;
    }
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      return { start: toYMD(today), end: toYMD(today) };
  }
  return { start: toYMD(start), end: toYMD(end) };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [supplierGroupFilter, setSupplierGroupFilter] = useState('all');
  const [totalPurchaseFrom, setTotalPurchaseFrom] = useState('');
  const [totalPurchaseTo, setTotalPurchaseTo] = useState('');
  const [debtFrom, setDebtFrom] = useState('');
  const [debtTo, setDebtTo] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [timeRangeDialogOpen, setTimeRangeDialogOpen] = useState(false);
  const [timeRangeTempStart, setTimeRangeTempStart] = useState('');
  const [timeRangeTempEnd, setTimeRangeTempEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [supplierGroupsList, setSupplierGroupsList] = useState([]);
  const [groupDialogName, setGroupDialogName] = useState('');
  const [groupDialogNotes, setGroupDialogNotes] = useState('');
  const [groupDialogError, setGroupDialogError] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    area: '',
    ward: '',
    groupId: '',
    notes: '',
    companyName: '',
    taxCode: '',
  });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', contact: '', phone: '', email: '' });
  const [expandedSupplierId, setExpandedSupplierId] = useState(null);
  const [expandedDetailTab, setExpandedDetailTab] = useState(0);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importUpdateDebt, setImportUpdateDebt] = useState(true);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const importFileInputRef = useRef(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiRequest('/api/suppliers');
      setSuppliers(Array.isArray(response?.suppliers) ? response.suppliers : []);
    } catch (err) {
      setLoadError(err.message || 'Không thể tải danh sách nhà cung cấp');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSupplierGroups = useCallback(async () => {
    try {
      const storeId = getStoredStoreId();
      const url = storeId ? `/api/supplier-groups?storeId=${storeId}` : '/api/supplier-groups';
      const response = await apiRequest(url);
      setSupplierGroupsList(Array.isArray(response?.groups) ? response.groups : []);
    } catch {
      setSupplierGroupsList([]);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadSupplierGroups();
  }, [loadSupplierGroups]);

  const supplierGroupNamesForFilter = useMemo(() => {
    const fromApi = supplierGroupsList.map((g) => g.name);
    const fromSuppliers = new Set();
    suppliers.forEach((s) => {
      if (s.group && String(s.group).trim()) fromSuppliers.add(String(s.group).trim());
    });
    const combined = new Set([...fromApi, ...fromSuppliers]);
    return Array.from(combined).sort();
  }, [supplierGroupsList, suppliers]);

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const fromP = parseAmount(totalPurchaseFrom);
    const toP = parseAmount(totalPurchaseTo);
    const fromD = parseAmount(debtFrom);
    const toD = parseAmount(debtTo);
    const totalPurchaseMin = fromP != null ? fromP : -Infinity;
    const totalPurchaseMax = toP != null ? toP : Infinity;
    const debtMin = fromD != null ? fromD : -Infinity;
    const debtMax = toD != null ? toD : Infinity;
    const tStart = timeFilter === 'custom' && dateRangeStart ? getStartOfDay(dateRangeStart) : null;
    const tEnd = timeFilter === 'custom' && dateRangeEnd ? getEndOfDay(dateRangeEnd) : null;

    return suppliers.filter((s) => {
      const matchGroup =
        supplierGroupFilter === 'all' || (s.group || '').trim() === supplierGroupFilter;
      const matchTerm =
        !term ||
        (s.code || '').toLowerCase().includes(term) ||
        (s.name || '').toLowerCase().includes(term) ||
        (s.phone || '').toLowerCase().includes(term);
      const matchStatus =
        statusFilter === 'all' || (s.status || 'active') === statusFilter;
      const totalPurchase = Number(s.totalPurchase) || 0;
      const matchPurchase = totalPurchase >= totalPurchaseMin && totalPurchase <= totalPurchaseMax;
      const debt = Number(s.currentDebt) || 0;
      const matchDebt = debt >= debtMin && debt <= debtMax;
      let matchTime = true;
      if (tStart != null && tEnd != null && s.createdAt) {
        const created = new Date(s.createdAt).getTime();
        matchTime = created >= tStart && created <= tEnd;
      }
      return matchGroup && matchTerm && matchStatus && matchPurchase && matchDebt && matchTime;
    });
  }, [suppliers, searchTerm, statusFilter, supplierGroupFilter, totalPurchaseFrom, totalPurchaseTo, debtFrom, debtTo, timeFilter, dateRangeStart, dateRangeEnd]);

  const handleCreateGroup = async () => {
    if (!groupDialogName.trim()) {
      setGroupDialogError('Vui lòng nhập tên nhóm');
      return;
    }
    setGroupDialogError('');
    try {
      const storeId = getStoredStoreId();
      const url = storeId ? `/api/supplier-groups?storeId=${storeId}` : '/api/supplier-groups';
      await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify({ name: groupDialogName.trim(), notes: groupDialogNotes.trim() }),
      });
      setGroupDialogOpen(false);
      setGroupDialogName('');
      setGroupDialogNotes('');
      loadSupplierGroups();
    } catch (err) {
      setGroupDialogError(err.message || 'Không thể tạo nhóm nhà cung cấp');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStatusChange = async (id, status) => {
    try {
      const url = `/api/suppliers/${id}`;
      await apiRequest(url, { method: 'PATCH', body: JSON.stringify({ status }) });
      loadSuppliers();
      setExpandedSupplierId(null);
    } catch (err) {
      setFormError(err.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleSaveSupplier = async () => {
    const nameTrim = form.name.trim();
    const phoneTrim = form.phone.trim();
    const emailTrim = form.email.trim();
    const hasContact = !!phoneTrim || !!emailTrim;
    const errName = !nameTrim ? 'Vui lòng nhập tên nhà cung cấp' : '';
    const errContact = !hasContact
      ? 'Nhà cung cấp cần ít nhất một thông tin liên lạc: số điện thoại hoặc email'
      : '';
    const phoneCheck = validatePhone(phoneTrim);
    const emailCheck = validateEmail(emailTrim);
    const errPhone = !phoneCheck.valid ? (phoneCheck.message || 'Số điện thoại không hợp lệ') : '';
    const errEmail = !emailCheck.valid ? (emailCheck.message || 'Email không hợp lệ') : '';
    setFieldErrors({
      name: errName,
      contact: errContact,
      phone: errPhone,
      email: errEmail,
    });
    if (errName || errContact || errPhone || errEmail) {
      setFormError(errName || errContact || errPhone || errEmail);
      return;
    }
    setFormError('');
    try {
      if (editTarget) {
        const url = `/api/suppliers/${editTarget._id}`;
        await apiRequest(url, {
          method: 'PATCH',
          body: JSON.stringify({
            name: nameTrim,
            code: form.code.trim() || undefined,
            phone: phoneTrim,
            email: emailTrim,
            address: form.address.trim(),
            area: form.area.trim(),
            ward: form.ward.trim(),
            groupId: form.groupId || undefined,
            notes: form.notes.trim(),
            companyName: form.companyName.trim(),
            taxCode: form.taxCode.trim(),
          }),
        });
        setEditTarget(null);
        setDialogOpen(false);
        setForm({ code: '', name: '', phone: '', email: '', address: '', area: '', ward: '', groupId: '', notes: '', companyName: '', taxCode: '' });
        setFieldErrors({ name: '', contact: '', phone: '', email: '' });
        loadSuppliers();
      } else {
        await apiRequest('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify({
            code: form.code.trim() || undefined,
            name: nameTrim,
            phone: phoneTrim,
            email: emailTrim,
            address: form.address.trim(),
            area: form.area.trim(),
            ward: form.ward.trim(),
            groupId: form.groupId || undefined,
            notes: form.notes.trim(),
            companyName: form.companyName.trim(),
            taxCode: form.taxCode.trim(),
          }),
        });
        setDialogOpen(false);
        setForm({ code: '', name: '', phone: '', email: '', address: '', area: '', ward: '', groupId: '', notes: '', companyName: '', taxCode: '' });
        setFieldErrors({ name: '', contact: '', phone: '', email: '' });
        loadSuppliers();
      }
    } catch (err) {
      setFormError(err.message || 'Không thể lưu nhà cung cấp');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/suppliers/${deleteTarget._id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setExpandedSupplierId(null);
      loadSuppliers();
    } catch (err) {
      setFormError(err.message || 'Không thể xóa nhà cung cấp');
    }
  };

  const downloadSupplierTemplate = useCallback(() => {
    const headers = [
      'Mã nhà cung cấp',
      'Tên nhà cung cấp',
      'Email',
      'Điện thoại',
      'Địa chỉ',
      'Khu vực',
      'Phường/Xã',
      'Tổng mua (Không Import)',
      'Nợ cần trả hiện tại',
      'Mã số thuế',
      'Ghi chú',
      'Nhóm nhà cung cấp',
      'Trạng thái',
      'Tổng mua trừ trả hàng',
      'Công ty',
    ];
    const sample = [
      'NCC000004',
      'Nhà cung cấp',
      '',
      '35446',
      'Hà Nội - Quận Đống Đa',
      '',
      'Phường Quốc Tử Giám',
      '',
      '',
      '0400123456-002',
      'Note',
      'Nhóm nhà cung cấp 1',
      '1',
      '',
      'Citigo',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SupplierTemplate');
    XLSX.writeFile(wb, 'MauFileNhaCungCap.xlsx');
  }, []);

  // File mẫu: cột 0=Mã, 1=Tên, 2=Email, 3=Điện thoại, 4=Địa chỉ, 5=Khu vực, 6=Phường/Xã, 7=bỏ qua, 8=Nợ, 9=Mã số thuế, 10=Ghi chú, 11=Nhóm, 12=Trạng thái, 13=bỏ qua, 14=Công ty
  const FALLBACK_INDEX = { code: 0, name: 1, email: 2, phone: 3, address: 4, area: 5, ward: 6, currentDebt: 8, taxCode: 9, notes: 10, group: 11, status: 12, companyName: 14 };

  const parseSupplierImportPreview = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', range: 'A1:O500' });
          if (!raw.length) {
            resolve([]);
            return;
          }
          const headers = raw[0].map((h) => String(h ?? '').replace(/\uFEFF/g, '').trim().toLowerCase());
          const col = (names) => {
            const i = headers.findIndex((h) => names.some((n) => (h || '').includes(n)));
            return i >= 0 ? i : -1;
          };
          let idxCode = col(['mã nhà cung cấp', 'mã', 'code']);
          let idxName = col(['tên nhà cung cấp', 'tên', 'ten', 'name']);
          let idxEmail = col(['email']);
          let idxPhone = col(['điện thoại', 'dien thoai', 'phone', 'sdt']);
          let idxAddress = col(['địa chỉ', 'dia chi', 'address']);
          let idxArea = col(['khu vực', 'khu vuc', 'area']);
          let idxWard = col(['phường', 'xã', 'phuong', 'ward']);
          let idxCurrentDebt = col(['nợ cần trả', 'nợ', 'no']);
          let idxTaxCode = col(['mã số thuế', 'tax']);
          let idxNotes = col(['ghi chú', 'ghi chu', 'notes']);
          let idxGroup = col(['nhóm nhà cung cấp', 'nhóm', 'nhom', 'group']);
          let idxStatus = col(['trạng thái', 'trang thai', 'status']);
          let idxCompanyName = col(['công ty', 'cong ty', 'company']);
          const useFallback = idxName < 0 && idxPhone < 0 && idxEmail < 0 && idxCode < 0;
          if (useFallback) {
            idxCode = FALLBACK_INDEX.code;
            idxName = FALLBACK_INDEX.name;
            idxEmail = FALLBACK_INDEX.email;
            idxPhone = FALLBACK_INDEX.phone;
            idxAddress = FALLBACK_INDEX.address;
            idxArea = FALLBACK_INDEX.area;
            idxWard = FALLBACK_INDEX.ward;
            idxCurrentDebt = FALLBACK_INDEX.currentDebt;
            idxTaxCode = FALLBACK_INDEX.taxCode;
            idxNotes = FALLBACK_INDEX.notes;
            idxGroup = FALLBACK_INDEX.group;
            idxStatus = FALLBACK_INDEX.status;
            idxCompanyName = FALLBACK_INDEX.companyName;
          }
          const get = (row, idx) => (idx >= 0 && row && row[idx] != null && row[idx] !== '' ? String(row[idx]).trim() : '');
          const rows = [];
          for (let r = 1; r < raw.length; r++) {
            const row = Array.isArray(raw[r]) ? raw[r] : [];
            const name = get(row, idxName);
            const phone = get(row, idxPhone);
            const email = get(row, idxEmail);
            const code = get(row, idxCode);
            if (!name && !phone && !email && !code) continue;
            const currentDebtVal = idxCurrentDebt >= 0 && row[idxCurrentDebt] != null && row[idxCurrentDebt] !== ''
              ? Number(String(row[idxCurrentDebt]).replace(/,/g, ''))
              : null;
            const statusRaw = get(row, idxStatus);
            rows.push({
              code,
              name,
              email,
              phone,
              address: get(row, idxAddress),
              area: get(row, idxArea),
              ward: get(row, idxWard),
              currentDebt: Number.isFinite(currentDebtVal) ? currentDebtVal : null,
              taxCode: get(row, idxTaxCode),
              notes: get(row, idxNotes),
              group: get(row, idxGroup),
              status: statusRaw === '0' || String(statusRaw).toLowerCase() === 'inactive' ? 'inactive' : 'active',
              companyName: get(row, idxCompanyName),
            });
          }
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Không đọc được file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Vui lòng chọn file dữ liệu');
      return;
    }
    if (importPreviewRows.length === 0) {
      setImportError('File không có dòng dữ liệu hợp lệ. Kiểm tra file có đúng cấu trúc mẫu (dòng 1 là tiêu đề, từ dòng 2 có Mã/Tên/Điện thoại/Email).');
      return;
    }
    const normalizePhone = (v) => {
      if (!v) return '';
      const s = String(v).trim();
      const digits = s.replace(/\D/g, '');
      if (digits.length === 9 && !digits.startsWith('0')) return `0${digits}`;
      return s;
    };
    // Kiểm tra trùng mã hoặc trùng số điện thoại trong chính file
    const codeSeen = new Map();
    const phoneSeen = new Map();
    const duplicateCodes = [];
    const duplicatePhones = [];
    for (let i = 0; i < importPreviewRows.length; i++) {
      const row = importPreviewRows[i];
      const code = (row.code || '').trim();
      const phone = normalizePhone(row.phone || '');
      if (code) {
        const key = code.toLowerCase();
        if (codeSeen.has(key)) {
          if (!duplicateCodes.includes(code)) duplicateCodes.push(code);
        } else {
          codeSeen.set(key, i + 2);
        }
      }
      if (phone) {
        if (phoneSeen.has(phone)) {
          if (!duplicatePhones.includes(phone)) duplicatePhones.push(phone);
        } else {
          phoneSeen.set(phone, i + 2);
        }
      }
    }
    if (duplicateCodes.length > 0 || duplicatePhones.length > 0) {
      const parts = [];
      if (duplicateCodes.length > 0) parts.push(`Mã nhà cung cấp bị trùng trong file: ${duplicateCodes.join(', ')}`);
      if (duplicatePhones.length > 0) parts.push(`Số điện thoại bị trùng trong file: ${duplicatePhones.join(', ')}`);
      setImportError(`Không thực hiện import. Vui lòng sửa lại file.\n${parts.join('\n')}`);
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportResult(null);
    let imported = 0;
    let updated = 0;
    const errors = [];
    const codeToSupplier = new Map();
    const phoneToSupplier = new Map();
    suppliers.forEach((s) => {
      const c = (s.code || '').trim().toLowerCase();
      if (c) codeToSupplier.set(c, s);
      const p = normalizePhone(s.phone || '');
      if (p) phoneToSupplier.set(p, s);
    });
    try {
      for (let i = 0; i < importPreviewRows.length; i++) {
        const row = importPreviewRows[i];
        const { code, name, email, phone, address, area, ward, currentDebt, taxCode, notes, group, status, companyName } = row;
        if (!name) {
          errors.push(`Dòng ${i + 2}: Thiếu tên nhà cung cấp`);
          continue;
        }
        if (!phone && !email) {
          errors.push(`Dòng ${i + 2}: Cần ít nhất điện thoại hoặc email`);
          continue;
        }
        const payload = {
          name,
          phone: normalizePhone(phone) || undefined,
          email: email || undefined,
          address: address || undefined,
          area: area || undefined,
          ward: ward || undefined,
          notes: notes || undefined,
          companyName: companyName || undefined,
          taxCode: taxCode || undefined,
          group: group || undefined,
          status: status || 'active',
          ...(code ? { code: code.trim() } : {}),
        };
        if (importUpdateDebt && currentDebt != null && !Number.isNaN(currentDebt)) {
          payload.currentDebt = currentDebt;
        }
        const existingByCode = code ? codeToSupplier.get(code.trim().toLowerCase()) : null;
        const normalizedPhone = normalizePhone(phone);
        const existingByPhone = normalizedPhone ? phoneToSupplier.get(normalizedPhone) : null;
        const existing = existingByCode || existingByPhone;
        try {
          if (existing) {
            if (!importUpdateDebt) delete payload.currentDebt;
            await apiRequest(`/api/suppliers/${existing._id}`, { method: 'PATCH', body: JSON.stringify(payload) });
            updated += 1;
          } else {
            await apiRequest('/api/suppliers', {
              method: 'POST',
              body: JSON.stringify({
                ...payload,
                code: code || undefined,
                currentDebt: importUpdateDebt && currentDebt != null && !Number.isNaN(currentDebt) ? currentDebt : 0,
              }),
            });
            imported += 1;
          }
        } catch (err) {
          errors.push(`Dòng ${i + 2}: ${err?.data?.message || err?.message || 'Lỗi'}`);
        }
      }
      setImportResult({ imported, updated, errors });
      setImportPreviewRows([]);
      await loadSuppliers();
      if (imported + updated > 0) {
        setImportFile(null);
        setSearchTerm('');
        setTimeFilter('all');
        setDateRangeStart('');
        setDateRangeEnd('');
        setTimeout(() => setImportDialogOpen(false), 1500);
      }
    } catch (err) {
      setImportError(err?.message || 'Import thất bại');
    } finally {
      setImportLoading(false);
    }
  };

  const sumDebt = useMemo(
    () => filteredSuppliers.reduce((s, i) => s + (Number(i.currentDebt) || 0), 0),
    [filteredSuppliers]
  );
  const sumPurchase = useMemo(
    () => filteredSuppliers.reduce((s, i) => s + (Number(i.totalPurchase) || 0), 0),
    [filteredSuppliers]
  );

  return (
    <Layout maxWidth={false}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Nhà cung cấp
      </Typography>

      <Card sx={{ mb: 2, width: '100%' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', minHeight: 480, width: '100%' }}>
            {/* Sidebar filters */}
            <Paper
              variant="outlined"
              sx={{
                width: 280,
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                p: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Nhóm nhà cung cấp
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                <TextField
                  size="small"
                  select
                  fullWidth
                  value={supplierGroupFilter}
                  onChange={(e) => setSupplierGroupFilter(e.target.value)}
                >
                  <MenuItem value="all">Tất cả các nhóm</MenuItem>
                  {supplierGroupNamesForFilter.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography
                  component="button"
                  type="button"
                  variant="caption"
                  onClick={() => {
                    setGroupDialogError('');
                    setGroupDialogOpen(true);
                  }}
                  sx={{ color: 'primary.main', cursor: 'pointer', flexShrink: 0, border: 0, background: 'none' }}
                >
                  Tạo mới
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Tổng mua
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Giá trị
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  size="small"
                  placeholder="Từ"
                  type="text"
                  inputProps={{ inputMode: 'numeric' }}
                  value={totalPurchaseFrom}
                  onChange={(e) => setTotalPurchaseFrom(e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  placeholder="Tới"
                  type="text"
                  inputProps={{ inputMode: 'numeric' }}
                  value={totalPurchaseTo}
                  onChange={(e) => setTotalPurchaseTo(e.target.value)}
                  fullWidth
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Thời gian
              </Typography>
              <RadioGroup value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                <FormControlLabel value="all" control={<Radio size="small" />} label="Toàn thời gian" />
                <FormControlLabel
                  value="custom"
                  control={<Radio size="small" />}
                  label={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      Tùy chỉnh
                      <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />
                    </Box>
                  }
                />
              </RadioGroup>
              {timeFilter === 'custom' && (
                <Box
                  onClick={() => setTimeRangeDialogOpen(true)}
                  sx={{
                    mt: 1,
                    py: 1,
                    px: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography variant="body2">
                    {dateRangeStart && dateRangeEnd
                      ? `${new Date(dateRangeStart + 'T12:00:00').toLocaleDateString('vi-VN')} - ${new Date(dateRangeEnd + 'T12:00:00').toLocaleDateString('vi-VN')}`
                      : 'Chọn khoảng thời gian'}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Nợ hiện tại
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Giá trị (Từ = trở lên, Tới = trở xuống)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Từ"
                  type="text"
                  inputProps={{ inputMode: 'numeric' }}
                  value={debtFrom}
                  onChange={(e) => setDebtFrom(e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  placeholder="Tới"
                  type="text"
                  inputProps={{ inputMode: 'numeric' }}
                  value={debtTo}
                  onChange={(e) => setDebtTo(e.target.value)}
                  fullWidth
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Trạng thái
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Button
                  size="small"
                  variant={statusFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setStatusFilter('all')}
                  sx={{ textTransform: 'none' }}
                >
                  Tất cả
                </Button>
                <Button
                  size="small"
                  variant={statusFilter === 'active' ? 'contained' : 'outlined'}
                  onClick={() => setStatusFilter('active')}
                  sx={{ textTransform: 'none' }}
                >
                  Đang hoạt động
                </Button>
                <Button
                  size="small"
                  variant={statusFilter === 'inactive' ? 'contained' : 'outlined'}
                  onClick={() => setStatusFilter('inactive')}
                  sx={{ textTransform: 'none' }}
                >
                  Ngừng hoạt động
                </Button>
              </Box>
            </Paper>

            {/* Main content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                  <Box sx={{ position: 'relative', flex: 1, minWidth: 260 }}>
                    <TextField
                      size="small"
                      placeholder="Theo mã, tên, số điện thoại"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                      fullWidth
                    />
                  </Box>
                  {selectedIds.size > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Đã chọn {selectedIds.size}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ textTransform: 'none' }}
                    onClick={() => {
                      setFormError('');
                      setFieldErrors({ name: '', contact: '', phone: '', email: '' });
                      setEditTarget(null);
                      setForm({ code: '', name: '', phone: '', email: '', address: '', area: '', ward: '', groupId: '', notes: '', companyName: '', taxCode: '' });
                      setDialogOpen(true);
                    }}
                  >
                    Nhà cung cấp
                  </Button>
                  <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} sx={{ textTransform: 'none' }}>
                    Xuất file
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadOutlinedIcon />}
                    sx={{ textTransform: 'none' }}
                    onClick={() => {
                      setImportDialogOpen(true);
                      setImportError('');
                      setImportResult(null);
                      setImportFile(null);
                      setImportPreviewRows([]);
                    }}
                  >
                    Import file
                  </Button>
                </Box>
              </Paper>

              <Paper sx={{ p: 2, flex: 1 }}>
                {loadError && (
                  <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {loadError}
                  </Typography>
                )}
                {loading ? (
                  <Typography variant="body2" color="text.secondary">
                    Đang tải...
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" sx={{ fontWeight: 600, width: 48 }} />
                          <TableCell padding="checkbox" sx={{ fontWeight: 600 }}>
                            <Checkbox
                              size="small"
                              checked={selectedIds.size > 0 && selectedIds.size === filteredSuppliers.length}
                              indeterminate={selectedIds.size > 0 && selectedIds.size < filteredSuppliers.length}
                              onChange={() => {
                                if (selectedIds.size === filteredSuppliers.length) {
                                  setSelectedIds(new Set());
                                } else {
                                  setSelectedIds(new Set(filteredSuppliers.map((s) => s._id)));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Mã nhà cung cấp</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Tên nhà cung cấp</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Điện thoại</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Nhóm nhà cung cấp</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">
                            Nợ cần trả hiện tại
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">
                            Tổng mua
                          </TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell colSpan={2} />
                          <TableCell colSpan={5} />
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {sumDebt.toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {sumPurchase.toLocaleString('vi-VN')}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredSuppliers.map((row) => (
                          <React.Fragment key={row._id}>
                            <TableRow
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                setExpandedSupplierId((prev) => {
                                  if (prev === row._id) return null;
                                  setExpandedDetailTab(0);
                                  return row._id;
                                });
                              }}
                            >
                              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSupplierId((prev) => {
                                      if (prev === row._id) return null;
                                      setExpandedDetailTab(0);
                                      return row._id;
                                    });
                                  }}
                                >
                                  {expandedSupplierId === row._id ? (
                                    <ExpandLessIcon fontSize="small" />
                                  ) : (
                                    <ExpandMoreIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </TableCell>
                              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  size="small"
                                  checked={selectedIds.has(row._id)}
                                  onChange={() => toggleSelect(row._id)}
                                />
                              </TableCell>
                              <TableCell>{row.code || '—'}</TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell>{row.phone || '—'}</TableCell>
                              <TableCell>{row.group || '—'}</TableCell>
                              <TableCell>{row.email || '—'}</TableCell>
                              <TableCell align="right">
                                {(Number(row.currentDebt) || 0).toLocaleString('vi-VN')}
                              </TableCell>
                              <TableCell align="right">
                                {(Number(row.totalPurchase) || 0).toLocaleString('vi-VN')}
                              </TableCell>
                            </TableRow>
                            {expandedSupplierId === row._id && (
                              <TableRow>
                                <TableCell colSpan={9} sx={{ py: 0, px: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
                                  <Box sx={{ bgcolor: 'grey.50', p: 2.5 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem', mb: 1.5 }}>
                                      {row.name} {row.code ? ` ${row.code}` : ''}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        Ngày tạo: {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '—'}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">|</Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        Nhóm nhà cung cấp: {row.group || 'Chưa có'}
                                      </Typography>
                                    </Box>
                                    <Tabs
                                      value={expandedDetailTab}
                                      onChange={(_, v) => setExpandedDetailTab(v)}
                                      sx={{ minHeight: 40, mb: 2, '& .MuiTab-root': { textTransform: 'uppercase', fontWeight: 600 } }}
                                    >
                                      <Tab label="Thông tin" id="supplier-tab-0" />
                                      <Tab label="Lịch sử nhập/trả hàng" id="supplier-tab-1" />
                                      <Tab label="Nợ cần trả nhà cung cấp" id="supplier-tab-2" />
                                    </Tabs>
                                    {expandedDetailTab === 0 && (
                                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                        <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                                            Liên hệ
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                                            <Typography variant="body2">
                                              <strong>Điện thoại:</strong> {row.phone || 'Chưa có'}
                                            </Typography>
                                            <Typography variant="body2">
                                              <strong>Email:</strong> {row.email || 'Chưa có'}
                                            </Typography>
                                          </Box>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                                            Địa chỉ
                                          </Typography>
                                          <Typography variant="body2" sx={{ mb: 2 }}>
                                            {[row.address, row.area, row.ward].filter(Boolean).join(', ') || 'Chưa có'}
                                          </Typography>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                                            Ghi chú
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {row.notes || 'Chưa có ghi chú'}
                                          </Typography>
                                          <Button size="small" variant="text" color="primary" sx={{ textTransform: 'none', px: 0, mb: 2 }}>
                                            Thêm thông tin xuất hóa đơn
                                          </Button>
                                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Button
                                              size="small"
                                              variant="contained"
                                              startIcon={<EditOutlinedIcon />}
                                              sx={{ textTransform: 'none' }}
                                              onClick={() => {
                                                const g = supplierGroupsList.find((gr) => gr.name === row.group);
                                                setForm({
                                                  code: row.code || '',
                                                  name: row.name || '',
                                                  phone: row.phone || '',
                                                  email: row.email || '',
                                                  address: row.address || '',
                                                  area: row.area || '',
                                                  ward: row.ward || '',
                                                  groupId: g ? g._id : '',
                                                  notes: row.notes || '',
                                                  companyName: row.companyName || '',
                                                  taxCode: row.taxCode || '',
                                                });
                                                setEditTarget(row);
                                                setExpandedSupplierId(null);
                                                setFormError('');
                                                setFieldErrors({ name: '', contact: '', phone: '', email: '' });
                                                setDialogOpen(true);
                                              }}
                                            >
                                              Chỉnh sửa
                                            </Button>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              startIcon={<LockOutlinedIcon />}
                                              sx={{ textTransform: 'none' }}
                                              onClick={() => handleStatusChange(row._id, row.status === 'active' ? 'inactive' : 'active')}
                                            >
                                              {row.status === 'active' ? 'Ngừng hoạt động' : 'Đang hoạt động'}
                                            </Button>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              color="error"
                                              startIcon={<DeleteOutlinedIcon />}
                                              sx={{ textTransform: 'none' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget(row);
                                              }}
                                            >
                                              Xóa
                                            </Button>
                                          </Box>
                                        </Box>
                                        <Paper variant="outlined" sx={{ flex: '1 1 260px', minWidth: 0, p: 2, bgcolor: 'background.paper' }}>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                                            Thông tin xuất hóa đơn
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">Tên công ty</Typography>
                                              <Typography variant="body2">{row.companyName || '—'}</Typography>
                                            </Box>
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">Mã số thuế</Typography>
                                              <Typography variant="body2">{row.taxCode || '—'}</Typography>
                                            </Box>
                                          </Box>
                                          <Divider sx={{ my: 2 }} />
                                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                                            Tóm tắt
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                            <Typography variant="body2">
                                              Nợ cần trả: <strong>{(Number(row.currentDebt) || 0).toLocaleString('vi-VN')} đ</strong>
                                            </Typography>
                                            <Typography variant="body2">
                                              Tổng mua: <strong>{(Number(row.totalPurchase) || 0).toLocaleString('vi-VN')} đ</strong>
                                            </Typography>
                                          </Box>
                                        </Paper>
                                      </Box>
                                    )}
                                    {expandedDetailTab === 1 && (
                                      <Box>
                                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell sx={{ fontWeight: 600 }}>Mã phiếu</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Người tạo</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="right">Tổng cộng</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {[].length === 0 ? (
                                                <TableRow>
                                                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="text.secondary">Chưa có lịch sử nhập/trả hàng</Typography>
                                                  </TableCell>
                                                </TableRow>
                                              ) : (
                                                [].map((entry) => (
                                                  <TableRow key={entry.id}>
                                                    <TableCell><Typography component="a" href="#" sx={{ color: 'primary.main', textDecoration: 'none' }}>{entry.code}</Typography></TableCell>
                                                    <TableCell>{entry.time}</TableCell>
                                                    <TableCell>{entry.creator}</TableCell>
                                                    <TableCell align="right">{entry.total}</TableCell>
                                                    <TableCell><Typography variant="body2" sx={{ color: 'success.main' }}>{entry.status}</Typography></TableCell>
                                                  </TableRow>
                                                ))
                                              )}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                        <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} sx={{ textTransform: 'none' }}>
                                          Xuất file
                                        </Button>
                                      </Box>
                                    )}
                                    {expandedDetailTab === 2 && (
                                      <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                                          <TextField
                                            size="small"
                                            select
                                            value="all"
                                            sx={{ minWidth: 180 }}
                                            SelectProps={{ displayEmpty: true }}
                                          >
                                            <MenuItem value="all">Tất cả giao dịch</MenuItem>
                                          </TextField>
                                        </Box>
                                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell sx={{ fontWeight: 600 }}>Mã phiếu</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="right">Giá trị</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="right">Nợ cần trả nhà cung cấp</TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                  <Typography variant="body2" color="text.secondary">Chưa có giao dịch công nợ</Typography>
                                                </TableCell>
                                              </TableRow>
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                          <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} sx={{ textTransform: 'none' }}>
                                            Xuất file công nợ
                                          </Button>
                                          <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} sx={{ textTransform: 'none' }}>
                                            Xuất file
                                          </Button>
                                          <Button size="small" variant="contained" startIcon={<EditOutlinedIcon />} sx={{ textTransform: 'none' }}>
                                            Điều chỉnh
                                          </Button>
                                          <Button size="small" variant="outlined" startIcon={<PaymentOutlinedIcon />} sx={{ textTransform: 'none' }}>
                                            Thanh toán
                                          </Button>
                                          <Button size="small" variant="outlined" startIcon={<LocalOfferOutlinedIcon />} sx={{ textTransform: 'none' }}>
                                            Chiết khấu thanh toán
                                          </Button>
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Typography variant="h6" component="span">
            {editTarget ? 'Chỉnh sửa nhà cung cấp' : 'Tạo nhà cung cấp'}
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              setDialogOpen(false);
              setEditTarget(null);
            }}
            aria-label="Đóng"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {formError && (
              <Typography variant="body2" color="error">
                {formError}
              </Typography>
            )}
            <TextField
              label="Tên nhà cung cấp"
              required
              placeholder="Bắt buộc"
              value={form.name}
              onChange={(e) => {
                setForm((p) => ({ ...p, name: e.target.value }));
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
              }}
              fullWidth
              size="small"
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
            />
            <TextField
              label="Mã nhà cung cấp"
              placeholder="Tự động"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              fullWidth
              size="small"
              // helperText="Để trống để hệ thống tự tạo mã"
            />
            <Box>
              <TextField
                label="Điện thoại"
                value={form.phone}
                onChange={(e) => {
                  setForm((p) => ({ ...p, phone: e.target.value }));
                  setFieldErrors((p) => ({ ...p, contact: '', phone: '' }));
                }}
                onBlur={() => {
                  if (form.phone.trim()) {
                    const r = validatePhone(form.phone);
                    if (!r.valid) setFieldErrors((p) => ({ ...p, phone: r.message || '' }));
                  }
                }}
                fullWidth
                size="small"
                error={!!fieldErrors.phone || !!fieldErrors.contact}
                helperText={fieldErrors.phone}
                placeholder="Ví dụ: 0901234567"
              />
              <TextField
                label="Email"
                type="email"
                placeholder="email@gmail.com"
                value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }));
                  setFieldErrors((p) => ({ ...p, contact: '', email: '' }));
                }}
                onBlur={() => {
                  if (form.email.trim()) {
                    const r = validateEmail(form.email);
                    if (!r.valid) setFieldErrors((p) => ({ ...p, email: r.message || '' }));
                  }
                }}
                fullWidth
                size="small"
                error={!!fieldErrors.email || !!fieldErrors.contact}
                helperText={fieldErrors.email}
                sx={{ mt: 2 }}
              />
              {fieldErrors.contact && (
                <FormHelperText error sx={{ mt: 0.5 }}>
                  {fieldErrors.contact}
                </FormHelperText>
              )}
            </Box>

            <Accordion defaultExpanded sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Địa chỉ
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ flexDirection: 'column', gap: 2, display: 'flex' }}>
                <TextField
                  label="Địa chỉ"
                  placeholder="Nhập địa chỉ"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  fullWidth
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Khu vực"
                    placeholder="Chọn Tỉnh/Thành phố"
                    value={form.area}
                    onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Phường/Xã"
                    placeholder="Chọn Phường/Xã"
                    value={form.ward}
                    onChange={(e) => setForm((p) => ({ ...p, ward: e.target.value }))}
                    fullWidth
                    size="small"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Nhóm nhà cung cấp, ghi chú
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ flexDirection: 'column', gap: 2, display: 'flex' }}>
                <TextField
                  label="Nhóm nhà cung cấp"
                  placeholder="Chọn nhóm nhà cung cấp"
                  value={form.groupId}
                  onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))}
                  fullWidth
                  size="small"
                  select
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">Chọn nhóm nhà cung cấp</MenuItem>
                  {supplierGroupsList.map((g) => (
                    <MenuItem key={g._id} value={g._id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Ghi chú"
                  placeholder="Nhập ghi chú"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                />
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Thông tin xuất hóa đơn
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ flexDirection: 'column', gap: 2, display: 'flex' }}>
                <TextField
                  label="Tên công ty"
                  placeholder="Nhập tên công ty"
                  value={form.companyName}
                  onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Mã số thuế"
                  placeholder="Nhập mã số thuế"
                  value={form.taxCode}
                  onChange={(e) => setForm((p) => ({ ...p, taxCode: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Bỏ qua
          </Button>
          <Button variant="contained" onClick={handleSaveSupplier} sx={{ textTransform: 'none' }}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Xóa nhà cung cấp</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn xóa nhà cung cấp &quot;{deleteTarget?.name}&quot;?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none' }}>
            Bỏ qua
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} sx={{ textTransform: 'none' }}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => !importLoading && setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nhập nhà cung cấp từ file excel</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              (Tải về file mẫu:{' '}
              <Typography
                component="a"
                href="#"
                onClick={(e) => { e.preventDefault(); downloadSupplierTemplate(); }}
                sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Excel file
              </Typography>
              )
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Cập nhật dư nợ cuối từ file?
            </Typography>
            <RadioGroup
              value={importUpdateDebt ? 'yes' : 'no'}
              onChange={(e) => setImportUpdateDebt(e.target.value === 'yes')}
            >
              <FormControlLabel value="yes" control={<Radio size="small" />} label="Cập nhật dư nợ cuối" />
              <FormControlLabel value="no" control={<Radio size="small" />} label="Không cập nhật dư nợ cuối" />
            </RadioGroup>
            <input
              type="file"
              ref={importFileInputRef}
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0] || null;
                setImportFile(file);
                setImportError('');
                setImportResult(null);
                setImportPreviewRows([]);
                e.target.value = '';
                if (file) {
                  try {
                    const rows = await parseSupplierImportPreview(file);
                    setImportPreviewRows(rows);
                  } catch (err) {
                    setImportError(err?.message || 'Không đọc được file Excel');
                  }
                }
              }}
            />
            {!importFile ? (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 500 }}>
                Chưa chọn file. Bấm nút <strong>Chọn file dữ liệu</strong> bên dưới để chọn file Excel (.xlsx) của bạn, sau đó bấm <strong>Thực hiện</strong>.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Đã chọn: {importFile.name}
              </Typography>
            )}
            {importPreviewRows.length > 0 && (
              <Box sx={{ mt: 1, maxHeight: 220, overflow: 'auto' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Xem trước ({importPreviewRows.length} dòng)</Typography>
                <Table size="small" stickyHeader sx={{ mt: 0.5, '& th, & td': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Mã</TableCell>
                      <TableCell>Tên</TableCell>
                      <TableCell>Điện thoại</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Địa chỉ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importPreviewRows.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.code || '—'}</TableCell>
                        <TableCell>{row.name || '—'}</TableCell>
                        <TableCell>{row.phone || '—'}</TableCell>
                        <TableCell>{row.email || '—'}</TableCell>
                        <TableCell>{row.address || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importPreviewRows.length > 50 && (
                  <Typography variant="caption" color="text.secondary">Chỉ hiển thị 50 dòng đầu.</Typography>
                )}
              </Box>
            )}
            {importError && (
              <Alert severity="error" sx={{ mt: 1, whiteSpace: 'pre-line' }} onClose={() => setImportError('')}>
                {importError}
              </Alert>
            )}
            {importResult && (importResult.imported > 0 || importResult.updated > 0) && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Đã nhập {importResult.imported} nhà cung cấp mới, cập nhật {importResult.updated} nhà cung cấp.
              </Alert>
            )}
            {importResult && importResult.imported === 0 && importResult.updated === 0 && importResult.errors?.length === 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Không có dòng nào được nhập. Kiểm tra file có dòng tiêu đề đúng (Tên nhà cung cấp, Điện thoại hoặc Email) và ít nhất một dòng dữ liệu hợp lệ.
              </Alert>
            )}
            {importResult && importResult.imported === 0 && importResult.updated === 0 && importResult.errors?.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Không có dòng nào được nhập. {importResult.errors.length} lỗi — ví dụ: {importResult.errors.slice(0, 2).join('; ')}
                {importResult.errors.length > 2 ? ` (và ${importResult.errors.length - 2} lỗi khác)` : ''}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => !importLoading && setImportDialogOpen(false)} disabled={importLoading} sx={{ textTransform: 'none' }}>
            Bỏ qua
          </Button>
          <Button
            variant="contained"
            onClick={() => importFileInputRef.current?.click()}
            disabled={importLoading}
            sx={{ textTransform: 'none' }}
          >
            Chọn file dữ liệu
          </Button>
          <Button
            variant="contained"
            onClick={handleImportSubmit}
            disabled={importLoading || !importFile}
            title={!importFile ? 'Chọn file trước' : importPreviewRows.length === 0 ? 'File chưa có dữ liệu xem trước (sẽ báo lỗi khi Thực hiện)' : ''}
            sx={{ textTransform: 'none' }}
          >
            {importLoading ? 'Đang nhập...' : 'Thực hiện'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={timeRangeDialogOpen}
        onClose={() => setTimeRangeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        TransitionProps={{ onEntered: () => { setTimeRangeTempStart(dateRangeStart); setTimeRangeTempEnd(dateRangeEnd); } }}
      >
        <DialogTitle>Từ ngày - Đến ngày</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Từ ngày</Typography>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={timeRangeTempStart}
                onChange={(e) => setTimeRangeTempStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Đến ngày</Typography>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={timeRangeTempEnd}
                onChange={(e) => setTimeRangeTempEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Divider />
            <Typography variant="caption" color="text.secondary">Chọn nhanh</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => { const r = getTimePresetRange('today'); setTimeRangeTempStart(r.start); setTimeRangeTempEnd(r.end); }}>
                Hôm nay
              </Button>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => { const r = getTimePresetRange('week'); setTimeRangeTempStart(r.start); setTimeRangeTempEnd(r.end); }}>
                Tuần này
              </Button>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => { const r = getTimePresetRange('month'); setTimeRangeTempStart(r.start); setTimeRangeTempEnd(r.end); }}>
                Tháng này
              </Button>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => { const r = getTimePresetRange('quarter'); setTimeRangeTempStart(r.start); setTimeRangeTempEnd(r.end); }}>
                Quý này
              </Button>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => { const r = getTimePresetRange('year'); setTimeRangeTempStart(r.start); setTimeRangeTempEnd(r.end); }}>
                Năm nay
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" sx={{ textTransform: 'none' }} onClick={() => { const r = getTimePresetRange('today'); setTimeRangeTempStart(r.start); setTimeRangeTempEnd(r.end); }}>
            Hôm nay
          </Button>
          <Button onClick={() => setTimeRangeDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Bỏ qua
          </Button>
          <Button
            variant="contained"
            sx={{ textTransform: 'none' }}
            onClick={() => {
              setDateRangeStart(timeRangeTempStart);
              setDateRangeEnd(timeRangeTempEnd);
              setTimeRangeDialogOpen(false);
            }}
          >
            Áp dụng
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Typography variant="h6" component="span">
            Thêm nhóm nhà cung cấp
          </Typography>
          <IconButton size="small" onClick={() => setGroupDialogOpen(false)} aria-label="Đóng">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {groupDialogError && (
              <Typography variant="body2" color="error">
                {groupDialogError}
              </Typography>
            )}
            <TextField
              label="Tên nhóm"
              value={groupDialogName}
              onChange={(e) => setGroupDialogName(e.target.value)}
              fullWidth
              size="small"
              placeholder="Nhập tên nhóm"
            />
            <TextField
              label="Ghi chú"
              value={groupDialogNotes}
              onChange={(e) => setGroupDialogNotes(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="Nhập ghi chú"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={() => setGroupDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Bỏ qua
          </Button>
          <Button variant="contained" onClick={handleCreateGroup} sx={{ textTransform: 'none' }}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
