import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link,
  ListItemText,
  Menu,
  MenuItem,
  MenuList,
  Paper,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CloseIcon from '@mui/icons-material/Close';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Phiếu tạm' },
  { value: 'received', label: 'Đã nhập hàng' },
  { value: 'cancelled', label: 'Đã hủy' },
];

// Các khoảng thời gian định sẵn giống giao diện mẫu (Theo ngày, tuần, tháng, quý, năm)
const TIME_PRESET_GROUPS = [
  {
    title: 'Theo ngày',
    options: [
      { value: 'today', label: 'Hôm nay' },
      { value: 'yesterday', label: 'Hôm qua' },
    ],
  },
  {
    title: 'Theo tuần',
    options: [
      { value: 'thisWeek', label: 'Tuần này' },
      { value: 'lastWeek', label: 'Tuần trước' },
      { value: 'last7days', label: '7 ngày qua' },
    ],
  },
  {
    title: 'Theo tháng',
    options: [
      { value: 'thisMonth', label: 'Tháng này' },
      { value: 'lastMonth', label: 'Tháng trước' },
      { value: 'last30days', label: '30 ngày qua' },
    ],
  },
  {
    title: 'Theo quý',
    options: [
      { value: 'thisQuarter', label: 'Quý này' },
      { value: 'lastQuarter', label: 'Quý trước' },
    ],
  },
  {
    title: 'Theo năm',
    options: [
      { value: 'thisYear', label: 'Năm nay' },
      { value: 'lastYear', label: 'Năm trước' },
    ],
  },
];

const TIME_PRESET_MAP = TIME_PRESET_GROUPS.reduce((acc, g) => {
  g.options.forEach((o) => { acc[o.value] = o.label; });
  return acc;
}, {});

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTimePresetRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);
  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'thisWeek': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      break;
    }
    case 'lastWeek': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff - 7);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      break;
    }
    case 'last7days':
      start.setDate(start.getDate() - 6);
      break;
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'last30days':
      start.setDate(start.getDate() - 29);
      break;
    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3) + 1;
      start = new Date(now.getFullYear(), (q - 1) * 3, 1);
      end = new Date(now.getFullYear(), q * 3, 0);
      break;
    }
    case 'lastQuarter': {
      const q = Math.floor(now.getMonth() / 3) + 1;
      const y = q === 1 ? now.getFullYear() - 1 : now.getFullYear();
      const m = q === 1 ? 9 : (q - 2) * 3;
      start = new Date(y, m, 1);
      end = new Date(y, m + 3, 0);
      break;
    }
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    case 'lastYear':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      return { start: '', end: '' };
  }
  return { start: toYMD(start), end: toYMD(end) };
}

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('vi-VN');
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusDraft, setStatusDraft] = useState(true);
  const [statusReceived, setStatusReceived] = useState(true);
  const [statusCancelled, setStatusCancelled] = useState(false);
  const [timeFilter, setTimeFilter] = useState('preset'); // 'preset' | 'custom'
  const [timePreset, setTimePreset] = useState('thisMonth');
  const [timePresetMenuAnchor, setTimePresetMenuAnchor] = useState(null);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [receiverFilter, setReceiverFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    supplierId: '',
    supplierCode: '',
    supplierName: '',
    amountToPay: '',
    status: 'draft',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailItemCodeSearch, setDetailItemCodeSearch] = useState('');
  const [detailItemNameSearch, setDetailItemNameSearch] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailOrder, setEmailOrder] = useState(null);
  const [emailForm, setEmailForm] = useState({ email: '', subject: '', content: '' });
  const [barcodeStep, setBarcodeStep] = useState(0);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [barcodeItems, setBarcodeItems] = useState([]);
  const [selectedPaperTemplate, setSelectedPaperTemplate] = useState('72x22-2');
  const [barcodePreviewUrl, setBarcodePreviewUrl] = useState(null);
  const [saveSuccessDialogOpen, setSaveSuccessDialogOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [saveOrderError, setSaveOrderError] = useState('');

  const effectiveDateRange = useMemo(() => {
    if (timeFilter === 'custom') return { start: dateRangeStart, end: dateRangeEnd };
    return getTimePresetRange(timePreset);
  }, [timeFilter, timePreset, dateRangeStart, dateRangeEnd]);

  const loadPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const statuses = [];
      if (statusDraft) statuses.push('draft');
      if (statusReceived) statuses.push('received');
      if (statusCancelled) statuses.push('cancelled');
      const params = new URLSearchParams();
      if (statuses.length > 0) params.set('status', statuses.join(','));
      if (effectiveDateRange.start) params.set('dateFrom', effectiveDateRange.start);
      if (effectiveDateRange.end) params.set('dateTo', effectiveDateRange.end);
      if (creatorFilter) params.set('creatorId', creatorFilter);
      if (receiverFilter) params.set('receiverId', receiverFilter);
      const url = `/api/purchase-orders${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiRequest(url);
      setPurchaseOrders(Array.isArray(res?.purchaseOrders) ? res.purchaseOrders : []);
    } catch (err) {
      setLoadError(err?.message || 'Không tải được danh sách phiếu nhập hàng');
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusDraft, statusReceived, statusCancelled, effectiveDateRange.start, effectiveDateRange.end, creatorFilter, receiverFilter]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await apiRequest('/api/suppliers');
      setSuppliers(Array.isArray(res?.suppliers) ? res.suppliers : []);
    } catch {
      setSuppliers([]);
    }
  }, []);

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return purchaseOrders;
    return purchaseOrders.filter(
      (o) =>
        (o.code || '').toLowerCase().includes(term) ||
        (o.supplierCode || '').toLowerCase().includes(term) ||
        (o.supplierName || '').toLowerCase().includes(term)
    );
  }, [purchaseOrders, searchTerm]);

  const totalAmountToPay = useMemo(
    () => filteredOrders.reduce((s, o) => s + (Number(o.amountToPay) || 0), 0),
    [filteredOrders]
  );

  const openCreate = () => {
    setEditId(null);
    setForm({
      supplierId: '',
      supplierCode: '',
      supplierName: '',
      amountToPay: '',
      status: 'draft',
      notes: '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (order) => {
    setEditId(order._id);
    setForm({
      supplierId: order.supplierId || '',
      supplierCode: order.supplierCode || '',
      supplierName: order.supplierName || '',
      amountToPay: order.amountToPay ?? '',
      status: order.status || 'draft',
      notes: order.notes || '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSupplierChange = (supplierId) => {
    const s = suppliers.find((x) => x._id === supplierId);
    setForm((prev) => ({
      ...prev,
      supplierId: supplierId || '',
      supplierCode: s ? (s.code || '') : prev.supplierCode,
      supplierName: s ? (s.name || '') : prev.supplierName,
    }));
  };

  const handleSave = async () => {
    const amount = form.amountToPay === '' ? 0 : Number(String(form.amountToPay).replace(/,/g, ''));
    if (Number.isNaN(amount) || amount < 0) {
      setFormError('Số tiền cần trả không hợp lệ');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      if (editId) {
        await apiRequest(`/api/purchase-orders/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            supplierId: form.supplierId || undefined,
            supplierCode: form.supplierCode,
            supplierName: form.supplierName,
            amountToPay: amount,
            status: form.status,
            notes: form.notes,
          }),
        });
      } else {
        await apiRequest('/api/purchase-orders', {
          method: 'POST',
          body: JSON.stringify({
            supplierId: form.supplierId || undefined,
            supplierCode: form.supplierCode,
            supplierName: form.supplierName,
            amountToPay: amount,
            status: form.status,
            notes: form.notes,
          }),
        });
      }
      setDialogOpen(false);
      await loadPurchaseOrders();
    } catch (err) {
      setFormError(err?.data?.message || err?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (status) => {
    const o = STATUS_OPTIONS.find((x) => x.value === status);
    return o ? o.label : status;
  };

  const handleCancelClick = useCallback((order) => {
    if (!order) return;
    if (order.status === 'cancelled') return;
    setOrderToCancel(order);
    setCancelConfirmOpen(true);
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      await apiRequest(`/api/purchase-orders/${orderToCancel._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      setCancelConfirmOpen(false);
      setOrderToCancel(null);
      if (expandedId === orderToCancel._id) {
        setExpandedId(null);
        setDetailOrder(null);
      }
      await loadPurchaseOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  }, [orderToCancel, expandedId, loadPurchaseOrders]);

  const handleCopy = useCallback(
    (order) => {
      if (!order) return;
      navigate('/purchase-orders/new', { state: { copyFrom: order } });
    },
    [navigate]
  );

  const handleExportExcel = useCallback(
    (order) => {
      if (!order?.items?.length) return;
      const headers = [
        'Mã hàng',
        'Tên hàng',
        'Đơn vị tính',
        'Đơn giá',
        'Giảm giá',
        'Giảm giá (%)',
        'Số lượng',
        'Giá nhập',
        'Thành tiền',
        'Giá vốn',
      ];
      const rows = order.items.map((it) => {
        const qty = Number(it.quantity) || 0;
        const unitPrice = Number(it.unitPrice) || 0;
        const discount = Number(it.discount) || 0;
        const discountPct = unitPrice ? (discount / unitPrice) * 100 : 0;
        const importPrice = unitPrice - discount;
        const amount = Number(it.amount) || qty * importPrice;
        return [
          it.productCode || '',
          it.productName || '',
          it.unit || '',
          unitPrice,
          discount,
          discountPct,
          qty,
          importPrice,
          amount,
          unitPrice,
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      const code = order.code || 'PN';
      const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
      XLSX.utils.book_append_sheet(wb, ws, 'ChiTietNhapHang');
      XLSX.writeFile(wb, `DanhSachChiTietNhapHang_${code}_${ts}.xlsx`);
    },
    []
  );

  const handleOpenEmail = useCallback((order) => {
    if (!order) return;
    setEmailOrder(order);
    setEmailForm({ email: '', subject: '', content: '' });
    setEmailDialogOpen(true);
  }, []);

  const handleOpenOrder = useCallback(
    (order) => {
      if (!order?._id) return;
      navigate(`/purchase-orders/${order._id}/edit`);
    },
    [navigate]
  );

  const handleSaveOrder = useCallback(
    async (order) => {
      if (!order?._id) return;
      setSaveOrderError('');
      setSavingOrderId(order._id);
      try {
        const itemsPayload = (order.items || []).map((it) => ({
          productId: it.productId ? String(it.productId).trim() || null : null,
          productCode: String(it.productCode ?? '').trim(),
          productName: String(it.productName ?? '').trim(),
          unit: String(it.unit ?? '').trim(),
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
          amount: Number(it.amount) || 0,
          note: String(it.note ?? '').trim(),
        }));
        const res = await apiRequest(`/api/purchase-orders/${order._id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            supplierId: order.supplierId || undefined,
            supplierCode: order.supplierCode || '',
            supplierName: order.supplierName || '',
            notes: order.notes || '',
            amountToPay: Number(order.amountToPay) || 0,
            status: 'received',
            items: itemsPayload,
          }),
        });
        if (res?.alreadyCompleted) {
          setSaveSuccessMessage('Bạn đã hoàn thành phiếu nhập hàng trước đó.');
        } else {
          setSaveSuccessMessage('Bạn đã lưu phiếu nhập hàng');
        }
        setSaveSuccessDialogOpen(true);
      } catch (err) {
        setSaveOrderError(err?.data?.message || err?.message || 'Lưu thất bại');
      } finally {
        setSavingOrderId(null);
      }
    },
    []
  );

  const handleReturn = useCallback(
    (order) => {
      if (!order?._id) return;
      navigate(`/purchase-orders/${order._id}/return`);
    },
    [navigate]
  );

  const handlePrintBarcodeOpen = useCallback((order) => {
    if (!order?.items?.length) return;
    setBarcodeItems(
      (order.items || []).map((it) => ({
        productId: it.productId,
        productCode: it.productCode || '',
        productName: it.productName || '',
        unitPrice: Number(it.unitPrice) || 0,
        quantity: Number(it.quantity) || 1,
        printQty: Number(it.quantity) || 1,
      }))
    );
    setBarcodeStep(1);
    setBarcodeDialogOpen(true);
  }, []);

  const toggleExpand = useCallback(async (order) => {
    if (!order) return;
    const id = order._id;
    if (expandedId === id) {
      setExpandedId(null);
      setDetailOrder(null);
      setDetailItemCodeSearch('');
      setDetailItemNameSearch('');
      return;
    }
    setExpandedId(id);
    setDetailItemCodeSearch('');
    setDetailItemNameSearch('');
    setSaveOrderError('');
    try {
      const res = await apiRequest(`/api/purchase-orders/${id}`);
      setDetailOrder(res?.purchaseOrder || res || null);
    } catch (e) {
      console.error(e);
      setDetailOrder(order);
    }
  }, [expandedId]);

  const detailItemsFiltered = useMemo(() => {
    if (!detailOrder?.items?.length) return [];
    let list = detailOrder.items;
    const code = (detailItemCodeSearch || '').trim().toLowerCase();
    const name = (detailItemNameSearch || '').trim().toLowerCase();
    if (code) list = list.filter((i) => (i.productCode || '').toLowerCase().includes(code));
    if (name) list = list.filter((i) => (i.productName || '').toLowerCase().includes(name));
    return list;
  }, [detailOrder?.items, detailItemCodeSearch, detailItemNameSearch]);

  const detailSummary = useMemo(() => {
    const items = detailOrder?.items || [];
    const count = items.length;
    const totalGoods = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
    const totalDiscount = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.discount) || 0), 0);
    const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const paid = Number(detailOrder?.amountPaid) || 0;
    return { count, totalGoods, totalDiscount, total, paid };
  }, [detailOrder]);

  return (
    <Layout maxWidth={false}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Nhập hàng
      </Typography>

      <Card sx={{ mb: 2, width: '100%' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', minHeight: 480, width: '100%' }}>
            {/* Sidebar - filters */}
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
                Trạng thái
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                <FormControlLabel
                  control={<Checkbox size="small" checked={statusDraft} onChange={(e) => setStatusDraft(e.target.checked)} />}
                  label="Phiếu tạm"
                />
                <FormControlLabel
                  control={<Checkbox size="small" checked={statusReceived} onChange={(e) => setStatusReceived(e.target.checked)} />}
                  label="Đã nhập hàng"
                />
                <FormControlLabel
                  control={<Checkbox size="small" checked={statusCancelled} onChange={(e) => setStatusCancelled(e.target.checked)} />}
                  label="Đã hủy"
                />
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Thời gian
              </Typography>
              <RadioGroup value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                  <FormControlLabel value="preset" control={<Radio size="small" />} label={null} sx={{ mr: 0 }} />
                  <Box
                    component="button"
                    type="button"
                    onClick={(e) => timeFilter === 'preset' && setTimePresetMenuAnchor(e.currentTarget)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      px: 1,
                      py: 0.5,
                      cursor: timeFilter === 'preset' ? 'pointer' : 'default',
                      bgcolor: timeFilter === 'preset' ? 'background.paper' : 'action.hover',
                      font: 'inherit',
                      color: 'inherit',
                      '&:hover': timeFilter === 'preset' ? { bgcolor: 'action.hover' } : {},
                    }}
                  >
                    <Typography variant="body2" component="span" sx={{ minWidth: 100 }}>
                      {TIME_PRESET_MAP[timePreset] || 'Tháng này'}
                    </Typography>
                    <ArrowDropDownIcon sx={{ fontSize: 20, ml: 0.25 }} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
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
                </Box>
              </RadioGroup>
              <Menu
                anchorEl={timePresetMenuAnchor}
                open={Boolean(timePresetMenuAnchor)}
                onClose={() => setTimePresetMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{ sx: { maxHeight: 360, minWidth: 180 } }}
              >
                {TIME_PRESET_GROUPS.map((group) => (
                  <MenuList key={group.title} dense disablePadding>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block', fontWeight: 600 }}>
                      {group.title}
                    </Typography>
                    {group.options.map((opt) => (
                      <MenuItem
                        key={opt.value}
                        selected={timePreset === opt.value}
                        onClick={() => {
                          setTimePreset(opt.value);
                          setTimePresetMenuAnchor(null);
                        }}
                      >
                        <ListItemText primary={opt.label} />
                      </MenuItem>
                    ))}
                  </MenuList>
                ))}
              </Menu>
              {timeFilter === 'custom' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2, mt: 0.5 }}>
                  <TextField
                    size="small"
                    type="date"
                    label="Từ ngày"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Đến ngày"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Box>
              )}

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Người tạo
              </Typography>
              <TextField
                size="small"
                placeholder="Chọn người tạo"
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Người nhập
              </Typography>
              <TextField
                size="small"
                placeholder="Chọn người nhập"
                value={receiverFilter}
                onChange={(e) => setReceiverFilter(e.target.value)}
                fullWidth
              />
            </Paper>

            {/* Main content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                  <Box sx={{ position: 'relative', flex: 1, minWidth: 260 }}>
                    <TextField
                      size="small"
                      placeholder="Theo mã phiếu nhập"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                      fullWidth
                    />
                  </Box>
                  <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: 'none' }} onClick={() => navigate('/purchase-orders/new')}>
                    Nhập hàng
                  </Button>
                  <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} sx={{ textTransform: 'none' }}>
                    Xuất file
                  </Button>
                </Box>
                <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600 }}>
                  Cần trả NCC: {formatMoney(totalAmountToPay)}
                </Typography>
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
                          <TableCell sx={{ fontWeight: 600 }}>Mã nhập hàng</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Mã NCC</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Nhà cung cấp</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">
                            Cần trả NCC
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredOrders.map((row) => (
                          <React.Fragment key={row._id}>
                            <TableRow
                              hover
                              sx={{
                                cursor: 'pointer',
                                bgcolor: expandedId === row._id ? 'action.hover' : undefined,
                              }}
                              onClick={() => toggleExpand(row)}
                            >
                              <TableCell>{row.code || '—'}</TableCell>
                              <TableCell>
                                {row.createdAt
                                  ? new Date(row.createdAt).toLocaleString('vi-VN', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '—'}
                              </TableCell>
                              <TableCell>{row.supplierCode || '—'}</TableCell>
                              <TableCell>{row.supplierName || '—'}</TableCell>
                              <TableCell align="right">{formatMoney(row.amountToPay)}</TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: row.status === 'received' ? 'success.main' : row.status === 'cancelled' ? 'text.secondary' : 'info.main',
                                    fontWeight: 500,
                                  }}
                                >
                                  {statusLabel(row.status)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                            {expandedId === row._id && detailOrder && (
                              <TableRow>
                                <TableCell colSpan={6} sx={{ py: 0, px: 0, borderBottom: 1, borderColor: 'divider', verticalAlign: 'top', bgcolor: 'grey.50' }}>
                                  <Box sx={{ p: 2 }}>
                                    <Tabs value={0} sx={{ minHeight: 36, mb: 2 }}>
                                      <Tab label="Thông tin" id="detail-tab-0" />
                                    </Tabs>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{detailOrder.code || '—'}</Typography>
                                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>{statusLabel(detailOrder.status)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3, maxWidth: 560 }}>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">Người tạo</Typography>
                                        <Typography variant="body2">{detailOrder.creatorName || '—'}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">Tên NCC</Typography>
                                        <Typography variant="body2">
                                          {detailOrder.supplierId ? (
                                            <Link href="#" onClick={(e) => { e.stopPropagation(); openEdit(detailOrder); }} sx={{ color: 'primary.main' }}>{detailOrder.supplierName || '—'}</Link>
                                          ) : (detailOrder.supplierName || '—')}
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">Người nhập</Typography>
                                        <Typography variant="body2">{detailOrder.receiverName || '—'}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">Ngày nhập</Typography>
                                        <Typography variant="body2">
                                          {detailOrder.createdAt
                                            ? new Date(detailOrder.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : '—'}
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">Chi nhánh</Typography>
                                        <Typography variant="body2">{detailOrder.branchName || '—'}</Typography>
                                      </Box>
                                    </Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Sản phẩm</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Mã hàng</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Tên hàng</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Số lượng</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Đơn giá</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Giảm giá</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Giá nhập</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Thành tiền</TableCell>
                                          </TableRow>
                                          <TableRow>
                                            <TableCell sx={{ py: 0.5 }}>
                                              <TextField size="small" placeholder="Tìm mã hàng" value={detailItemCodeSearch} onChange={(e) => setDetailItemCodeSearch(e.target.value)} fullWidth inputProps={{ sx: { fontSize: '0.8rem' } }} />
                                            </TableCell>
                                            <TableCell sx={{ py: 0.5 }}>
                                              <TextField size="small" placeholder="Tìm tên hàng" value={detailItemNameSearch} onChange={(e) => setDetailItemNameSearch(e.target.value)} fullWidth inputProps={{ sx: { fontSize: '0.8rem' } }} />
                                            </TableCell>
                                            <TableCell colSpan={5} sx={{ py: 0.5 }}>
                                              <Link component="button" variant="body2" sx={{ cursor: 'pointer' }}>Thiết lập giá</Link>
                                            </TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {detailItemsFiltered.length === 0 ? (
                                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2 }}>Không có mặt hàng</TableCell></TableRow>
                                          ) : (
                                            detailItemsFiltered.map((item, idx) => (
                                              <TableRow key={item.productId || idx}>
                                                <TableCell><Link component="button" sx={{ color: 'primary.main', cursor: 'pointer' }}>{item.productCode || '—'}</Link></TableCell>
                                                <TableCell>{item.productName || '—'}</TableCell>
                                                <TableCell align="right">{item.quantity ?? '—'}</TableCell>
                                                <TableCell align="right">{formatMoney(item.unitPrice)}</TableCell>
                                                <TableCell align="right">{formatMoney(item.discount)}</TableCell>
                                                <TableCell align="right">{formatMoney(item.unitPrice)}</TableCell>
                                                <TableCell align="right">{formatMoney(item.amount)}</TableCell>
                                              </TableRow>
                                            ))
                                          )}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                                      <TextField
                                        size="small"
                                        placeholder="Ghi chú..."
                                        value={detailOrder.notes || ''}
                                        multiline
                                        rows={4}
                                        disabled
                                        sx={{ flex: '1 1 65%', minWidth: 0 }}
                                        InputProps={{ sx: { bgcolor: 'background.paper' } }}
                                      />
                                      <Box sx={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography variant="body2" color="text.secondary">Số lượng mặt hàng</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{detailSummary.count}</Typography>
                                        <Typography variant="body2" color="text.secondary">Tổng tiền hàng</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatMoney(detailSummary.totalGoods)}</Typography>
                                        <Typography variant="body2" color="text.secondary">Giảm giá</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                          {formatMoney(detailSummary.totalDiscount)}
                                          <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Tổng cộng</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{formatMoney(detailSummary.total)}</Typography>
                                        <Typography variant="body2" color="text.secondary">Tiền đã trả NCC</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatMoney(detailSummary.paid)}</Typography>
                                      </Box>
                                    </Box>
                                    {saveOrderError && (
                                      <Typography variant="body2" color="error" sx={{ mb: 0.5 }}>{saveOrderError}</Typography>
                                    )}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        <Button size="small" startIcon={<DeleteOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleCancelClick(detailOrder); }} disabled={detailOrder.status === 'cancelled'} sx={{ textTransform: 'none' }}>Hủy</Button>
                                        <Button size="small" startIcon={<ContentCopyOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleCopy(detailOrder); }} sx={{ textTransform: 'none' }}>Sao chép</Button>
                                        <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleExportExcel(detailOrder); }} disabled={!detailOrder?.items?.length} sx={{ textTransform: 'none' }}>Xuất file</Button>
                                        <Button size="small" startIcon={<EmailOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleOpenEmail(detailOrder); }} sx={{ textTransform: 'none' }}>Gửi Email</Button>
                                      </Box>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        <Button size="small" variant="contained" startIcon={<OpenInNewOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleOpenOrder(detailOrder); }} sx={{ textTransform: 'none' }}>Mở phiếu</Button>
                                        <Button size="small" startIcon={<SaveOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleSaveOrder(detailOrder); }} disabled={savingOrderId === detailOrder._id} sx={{ textTransform: 'none' }}>{savingOrderId === detailOrder._id ? 'Đang lưu...' : 'Lưu'}</Button>
                                        <Button size="small" startIcon={<ReplyOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleReturn(detailOrder); }} disabled={detailOrder.status !== 'received' || !detailOrder?.items?.length} sx={{ textTransform: 'none' }}>Trả hàng nhập</Button>
                                        <Button size="small" startIcon={<QrCode2OutlinedIcon />} onClick={(e) => { e.stopPropagation(); handlePrintBarcodeOpen(detailOrder); }} disabled={!detailOrder?.items?.length} sx={{ textTransform: 'none' }}>In tem mã</Button>
                                        <Button size="small" sx={{ minWidth: 36 }}><MoreHorizIcon /></Button>
                                      </Box>
                                    </Box>
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
                {!loading && filteredOrders.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    Chưa có phiếu nhập hàng. Bấm <strong>+ Nhập hàng</strong> để tạo mới.
                  </Typography>
                )}
              </Paper>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={cancelConfirmOpen} onClose={() => !cancelling && setCancelConfirmOpen(false)}>
        <DialogTitle>Xác nhận hủy phiếu nhập hàng</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có thực sự muốn hủy phiếu nhập hàng <strong>{orderToCancel?.code || ''}</strong>? Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !cancelling && setCancelConfirmOpen(false)} disabled={cancelling} sx={{ textTransform: 'none' }}>Không</Button>
          <Button variant="contained" color="error" onClick={handleCancelConfirm} disabled={cancelling} sx={{ textTransform: 'none' }}>{cancelling ? 'Đang xử lý...' : 'Đồng ý hủy'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={saveSuccessDialogOpen} onClose={() => { setSaveSuccessDialogOpen(false); setSaveSuccessMessage(''); setExpandedId(null); setDetailOrder(null); loadPurchaseOrders(); }}>
        <DialogTitle>Thông báo</DialogTitle>
        <DialogContent>
          <Typography>{saveSuccessMessage || 'Bạn đã lưu phiếu nhập hàng'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSaveSuccessDialogOpen(false); setSaveSuccessMessage(''); setExpandedId(null); setDetailOrder(null); loadPurchaseOrders(); }} variant="contained" sx={{ textTransform: 'none' }}>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Gửi Email
          <IconButton size="small" onClick={() => setEmailDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Tên NCC</Typography>
              <Typography variant="body2">{emailOrder?.supplierName || '—'}</Typography>
            </Box>
            <TextField size="small" fullWidth label="Email" value={emailForm.email} onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))} placeholder="Nhập email nhà cung cấp" />
            <TextField size="small" fullWidth label="Tiêu đề" value={emailForm.subject} onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Nhập tiêu đề" />
            <TextField size="small" fullWidth label="Nội dung" value={emailForm.content} onChange={(e) => setEmailForm((p) => ({ ...p, content: e.target.value }))} placeholder="Nhập nội dung" multiline rows={4} />
            <Typography variant="body2" component={Link} href="#" sx={{ color: 'primary.main' }}>ChiTietNhapHang_{emailOrder?.code || ''}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEmailDialogOpen(false)} sx={{ textTransform: 'none' }}>Hủy</Button>
          <Button variant="outlined" sx={{ textTransform: 'none' }}>Lưu</Button>
          <Button variant="contained" sx={{ textTransform: 'none' }}>Gửi</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={barcodeDialogOpen} onClose={() => { setBarcodeDialogOpen(false); setBarcodeStep(0); }} maxWidth={barcodeStep === 3 ? 'md' : 'sm'} fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {barcodeStep === 1 ? 'In tem mã' : barcodeStep === 2 ? 'Chọn loại giấy in tem mã' : 'In tem mã'}
          <IconButton size="small" onClick={() => { setBarcodeDialogOpen(false); setBarcodeStep(0); }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {barcodeStep === 1 && (
            <>
              <TableContainer sx={{ maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Mã hàng</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tên hàng</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Số lượng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {barcodeItems.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.productCode}</TableCell>
                        <TableCell>{row.productName}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            inputProps={{ min: 1 }}
                            value={row.printQty}
                            onChange={(e) => {
                              const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setBarcodeItems((prev) => prev.map((it, i) => (i === idx ? { ...it, printQty: v } : it)));
                            }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <DialogActions sx={{ justifyContent: 'flex-end', pt: 2 }}>
                <Button onClick={() => { setBarcodeDialogOpen(false); setBarcodeStep(0); }} sx={{ textTransform: 'none' }}>Bỏ qua</Button>
                <Button variant="contained" onClick={() => setBarcodeStep(2)} sx={{ textTransform: 'none' }}>In tem mã</Button>
              </DialogActions>
            </>
          )}
          {barcodeStep === 2 && (
            <>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Tùy chọn</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Nếu mã vạch được in không đầy đủ, hãy sử dụng mẫu giấy lớn hơn hoặc rút ngắn mã hàng. Phần mềm hỗ trợ in tối đa 5000 tem mã/lần.
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} sx={{ textTransform: 'none' }}>Xuất file Excel</Button>
                </Box>
                <Box sx={{ flex: '1 1 260px' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Mẫu giấy</Typography>
                  {[
                    { id: '72x22-2', label: 'Mẫu giấy cuộn 2 nhãn (Khổ giấy in nhãn 72×22mm)' },
                    { id: '104x22-3', label: 'Mẫu giấy cuộn 3 nhãn (Khổ giấy in nhãn 104×22mm)' },
                    { id: '50x30-1', label: 'Mẫu giấy cuộn 1 nhãn (Khổ giấy in tem nhãn 50×30mm)' },
                  ].map((t) => (
                    <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography variant="body2">{t.label}</Typography>
                      <Button size="small" variant="outlined" onClick={() => { setSelectedPaperTemplate(t.id); setBarcodeStep(3); }} sx={{ textTransform: 'none' }}>Xem bản in</Button>
                    </Box>
                  ))}
                </Box>
              </Box>
            </>
          )}
          {barcodeStep === 3 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <IconButton size="small" onClick={() => setBarcodeStep(2)} title="Quay lại">↩</IconButton>
                <Typography variant="body2" color="text.secondary">Trang 1</Typography>
                <Button size="small" startIcon={<FileDownloadOutlinedIcon />}>Tải PDF</Button>
                <Button size="small" variant="contained" startIcon={<QrCode2OutlinedIcon />} onClick={() => window.print()}>In</Button>
              </Box>
              <Box id="barcode-preview" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, bgcolor: 'grey.100' }}>
                {barcodeItems.slice(0, 6).map((row, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5, width: 160, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontSize: 10 }}>{row.productName}</Typography>
                    <Box sx={{ my: 0.5, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white' }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>{row.productCode}</Typography>
                    </Box>
                    <Typography variant="caption">{formatMoney(row.unitPrice)} VNĐ</Typography>
                  </Paper>
                ))}
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Sửa phiếu nhập hàng' : 'Thêm phiếu nhập hàng'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              size="small"
              select
              fullWidth
              label="Nhà cung cấp"
              value={form.supplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
            >
              <MenuItem value="">— Không chọn —</MenuItem>
              {suppliers.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.code ? `${s.code} - ` : ''}{s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              fullWidth
              label="Số tiền cần trả NCC"
              value={form.amountToPay}
              onChange={(e) => setForm((prev) => ({ ...prev, amountToPay: e.target.value }))}
              placeholder="0"
              inputProps={{ inputMode: 'numeric' }}
            />
            <TextField
              size="small"
              select
              fullWidth
              label="Trạng thái"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              fullWidth
              label="Ghi chú"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={2}
            />
            {formError && (
              <Typography variant="body2" color="error">
                {formError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => !saving && setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
            Hủy
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none' }}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
