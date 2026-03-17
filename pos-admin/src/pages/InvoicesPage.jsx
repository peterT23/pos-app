import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Drawer,
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
  Tabs,
  Tab,
  TextField,
  Typography,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';

const TIME_PRESET_GROUPS = [
  { title: 'Theo ngày', options: [{ value: 'today', label: 'Hôm nay' }, { value: 'yesterday', label: 'Hôm qua' }] },
  { title: 'Theo tuần', options: [{ value: 'thisWeek', label: 'Tuần này' }, { value: 'lastWeek', label: 'Tuần trước' }, { value: 'last7days', label: '7 ngày qua' }] },
  { title: 'Theo tháng', options: [{ value: 'thisMonth', label: 'Tháng này' }, { value: 'lastMonth', label: 'Tháng trước' }, { value: 'last30days', label: '30 ngày qua' }] },
  { title: 'Theo quý', options: [{ value: 'thisQuarter', label: 'Quý này' }, { value: 'lastQuarter', label: 'Quý trước' }] },
  { title: 'Theo năm', options: [{ value: 'thisYear', label: 'Năm nay' }, { value: 'lastYear', label: 'Năm trước' }] },
];

const TIME_PRESET_MAP = TIME_PRESET_GROUPS.reduce((acc, g) => {
  g.options.forEach((o) => { acc[o.value] = o.label; });
  return acc;
}, {});

function toYMD(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('vi-VN');
}

function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABELS = {
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  processing: 'Đang xử lý',
};

function statusLabel(s) {
  return STATUS_LABELS[s] || s || '—';
}

const COLUMN_DEFS = [
  { id: 'orderCode', label: 'Mã hóa đơn', defaultVisible: true },
  { id: 'trackingCode', label: 'Mã vận đơn', defaultVisible: false },
  { id: 'deliveryStatus', label: 'Trạng thái giao hàng', defaultVisible: false },
  { id: 'reconcileCode', label: 'Mã đối soát', defaultVisible: false },
  { id: 'time', label: 'Thời gian', defaultVisible: true },
  { id: 'createdTime', label: 'Thời gian tạo', defaultVisible: false },
  { id: 'updatedTime', label: 'Ngày cập nhật', defaultVisible: false },
  { id: 'orderRef', label: 'Mã đặt hàng', defaultVisible: false },
  { id: 'returnCodes', label: 'Mã trả hàng', defaultVisible: true },
  { id: 'customerCode', label: 'Mã KH', defaultVisible: true },
  { id: 'customerName', label: 'Khách hàng', defaultVisible: true },
  { id: 'email', label: 'Email', defaultVisible: false },
  { id: 'phone', label: 'Điện thoại', defaultVisible: false },
  { id: 'address', label: 'Địa chỉ', defaultVisible: false },
  { id: 'area', label: 'Khu vực', defaultVisible: false },
  { id: 'ward', label: 'Phường/Xã', defaultVisible: false },
  { id: 'birthday', label: 'Ngày sinh', defaultVisible: false },
  { id: 'branch', label: 'Chi nhánh', defaultVisible: false },
  { id: 'seller', label: 'Người bán', defaultVisible: false },
  { id: 'creator', label: 'Người tạo', defaultVisible: false },
  { id: 'salesChannel', label: 'Kênh bán', defaultVisible: false },
  { id: 'shippingPartner', label: 'Đối tác giao hàng', defaultVisible: false },
  { id: 'note', label: 'Ghi chú', defaultVisible: false },
  { id: 'totalAmount', label: 'Tổng tiền hàng', defaultVisible: true, align: 'right' },
  { id: 'afterTaxAmount', label: 'Tổng tiền hàng sau thuế', defaultVisible: false, align: 'right' },
  { id: 'discount', label: 'Giảm giá', defaultVisible: true, align: 'right' },
  { id: 'taxDiscount', label: 'Giảm thuế', defaultVisible: false, align: 'right' },
  { id: 'customerPay', label: 'Khách cần trả', defaultVisible: false, align: 'right' },
  { id: 'paid', label: 'Khách đã trả', defaultVisible: true, align: 'right' },
  { id: 'paymentDiscount', label: 'Chiết khấu thanh toán', defaultVisible: false, align: 'right' },
  { id: 'codRemaining', label: 'Còn cần thu (COD)', defaultVisible: false, align: 'right' },
  { id: 'shippingFee', label: 'Phí trả ĐTGH', defaultVisible: false, align: 'right' },
  { id: 'deliveryFinalFee', label: 'Phí cuối trạng thái giao hàng', defaultVisible: false, align: 'right' },
  { id: 'deliveryTime', label: 'Thời gian giao hàng', defaultVisible: false },
  { id: 'status', label: 'Trạng thái', defaultVisible: false },
  { id: 'eInvoiceStatus', label: 'Trạng thái HĐĐT', defaultVisible: false },
  { id: 'invoiceNumber', label: 'Số hóa đơn', defaultVisible: false },
];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const POS_APP_URL = import.meta.env.VITE_POS_APP_URL || 'http://localhost:5173';
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('preset');
  const [timePreset, setTimePreset] = useState('thisYear');
  const [timePresetMenuAnchor, setTimePresetMenuAnchor] = useState(null);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [invoiceTypeNoDelivery, setInvoiceTypeNoDelivery] = useState(true);
  const [invoiceTypeDelivery, setInvoiceTypeDelivery] = useState(true);
  const [statusProcessing, setStatusProcessing] = useState(true);
  const [statusCompleted, setStatusCompleted] = useState(true);
  const [statusCannotDeliver, setStatusCannotDeliver] = useState(false);
  const [statusCancelled, setStatusCancelled] = useState(false);
  const [statusEInvoice, setStatusEInvoice] = useState('');
  const [statusDelivery, setStatusDelivery] = useState('');
  const [deliveryPartner, setDeliveryPartner] = useState('');
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [columnDrawerOpen, setColumnDrawerOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaults = COLUMN_DEFS.filter((c) => c.defaultVisible).map((c) => c.id);
    return new Set(defaults);
  });
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailTab, setDetailTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [detailNote, setDetailNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [returnDetailOpen, setReturnDetailOpen] = useState(false);
  const [returnDetailData, setReturnDetailData] = useState(null);
  const [returnDetailLoading, setReturnDetailLoading] = useState(false);

  const effectiveDateRange = useMemo(() => {
    if (timeFilter === 'custom') return { dateFrom: dateRangeStart, dateTo: dateRangeEnd };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = today;
    let end = today;
    switch (timePreset) {
      case 'today':
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start = new Date(today);
        start.setDate(start.getDate() + diff);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'lastWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start = new Date(today);
        start.setDate(start.getDate() + diff - 7);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'last7days':
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'last30days':
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisQuarter': {
        const q = Math.floor(now.getMonth() / 3) + 1;
        const startMonth = (q - 1) * 3;
        start = new Date(now.getFullYear(), startMonth, 1);
        end = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999);
        break;
      }
      case 'lastQuarter': {
        const q = Math.floor(now.getMonth() / 3) + 1;
        const y = q <= 1 ? now.getFullYear() - 1 : now.getFullYear();
        const startMonth = (q <= 1 ? 3 : q - 2) * 3;
        start = new Date(y, startMonth, 1);
        end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);
        break;
      }
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      default:
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    return { dateFrom: toYMD(start), dateTo: toYMD(end) };
  }, [timeFilter, timePreset, dateRangeStart, dateRangeEnd]);

  const statusList = useMemo(() => {
    const list = [];
    if (statusProcessing) list.push('processing');
    if (statusCompleted) list.push('completed');
    if (statusCannotDeliver) list.push('cannot_deliver');
    if (statusCancelled) list.push('cancelled');
    return list;
  }, [statusProcessing, statusCompleted, statusCannotDeliver, statusCancelled]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams();
      params.set('timePreset', timeFilter === 'custom' ? 'custom' : timePreset);
      if (timeFilter === 'custom' && effectiveDateRange.dateFrom) params.set('dateFrom', effectiveDateRange.dateFrom);
      if (timeFilter === 'custom' && effectiveDateRange.dateTo) params.set('dateTo', effectiveDateRange.dateTo);
      if (statusList.length > 0) params.set('status', statusList.join(','));
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedStoreId) params.set('storeId', selectedStoreId);
      params.set('limit', '100');
      const res = await apiRequest(`/api/orders?${params.toString()}`);
      setOrders(Array.isArray(res?.orders) ? res.orders : []);
      setTotal(Number(res?.total) ?? 0);
    } catch (err) {
      setLoadError(err?.message || 'Không tải được danh sách hóa đơn');
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, timePreset, effectiveDateRange.dateFrom, effectiveDateRange.dateTo, statusList.join(','), searchTerm, selectedStoreId]);

  const loadStores = useCallback(async () => {
    try {
      const res = await apiRequest('/api/stores/me');
      setStores(Array.isArray(res?.stores) ? res.stores : []);
    } catch {
      setStores([]);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const showBranchColumn = stores.length > 1;
  const storeNameByStoreId = useMemo(() => new Map(stores.map((s) => [s.storeId, s.name || s.storeId])), [stores]);

  const effectiveVisibleColumns = useMemo(() => {
    const ids = new Set(visibleColumns);
    // Luôn hiển thị Mã hóa đơn
    ids.add('orderCode');
    // Chỉ hiển thị cột Chi nhánh khi có >= 2 chi nhánh
    if (!showBranchColumn) ids.delete('branch');
    return COLUMN_DEFS.filter((c) => ids.has(c.id));
  }, [visibleColumns, showBranchColumn]);

  const getCellValue = useCallback((colId, row) => {
    switch (colId) {
      case 'orderCode':
        return row.orderCode || row.localId || '—';
      case 'time':
        return formatDateTime(row.createdAt);
      case 'createdTime':
        return formatDateTime(row.createdAt);
      case 'updatedTime':
        return '—';
      case 'returnCodes':
        return row.returnCodes || [];
      case 'customerCode':
        return row.customerCode || '—';
      case 'customerName':
        return row.customerName || 'Khách lẻ';
      case 'branch':
        return storeNameByStoreId.get(row.storeId) || row.storeId || '—';
      case 'seller':
      case 'creator':
        return row.cashierName || '—';
      case 'salesChannel':
        return 'Bán trực tiếp';
      case 'shippingPartner':
        return '—';
      case 'note':
        return row.note || '—';
      case 'totalAmount':
      case 'paid':
        return formatMoney(row.totalAmount);
      case 'discount':
        return formatMoney(row.discount);
      case 'customerPay':
        return formatMoney(row.totalAmount);
      case 'status':
        return statusLabel(row.status);
      default:
        return '—';
    }
  }, [storeNameByStoreId]);

  const toggleExpand = useCallback(async (row) => {
    const id = row._id;
    if (expandedId === id) {
      setExpandedId(null);
      setDetailData(null);
      setEditMode(false);
      return;
    }
    setExpandedId(id);
    setDetailTab(0);
    setEditMode(false);
    try {
      const res = await apiRequest(`/api/orders/${id}`);
      setDetailData(res);
      setDetailNote(res?.order?.note ?? '');
    } catch (e) {
      console.error(e);
      setDetailData({ order: row, items: [] });
      setDetailNote(row.note ?? '');
    }
  }, [expandedId]);

  const detailSummary = useMemo(() => {
    const items = detailData?.items || [];
    const totalGoods = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const discount = Number(detailData?.order?.discount) || 0;
    const totalAmount = Number(detailData?.order?.totalAmount) || 0;
    return {
      count: items.length,
      totalGoods,
      discount,
      customerPay: totalAmount,
      paid: totalAmount,
    };
  }, [detailData]);

  const handleCancelClick = useCallback((order) => {
    if (!order || order.status === 'cancelled') return;
    setOrderToCancel(order);
    setCancelConfirmOpen(true);
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      await apiRequest(`/api/orders/${orderToCancel._id}`, { method: 'DELETE' });
      setCancelConfirmOpen(false);
      setOrderToCancel(null);
      if (expandedId === orderToCancel._id) {
        setExpandedId(null);
        setDetailData(null);
      }
      await loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  }, [orderToCancel, expandedId, loadOrders]);

  const handleOpenReturnDetail = useCallback(async (returnCode) => {
    if (!returnCode) return;
    setReturnDetailLoading(true);
    setReturnDetailOpen(true);
    setReturnDetailData(null);
    try {
      const res = await apiRequest(`/api/returns/${encodeURIComponent(returnCode)}`);
      setReturnDetailData(res);
    } catch (e) {
      console.error(e);
      setReturnDetailData({ error: true });
    } finally {
      setReturnDetailLoading(false);
    }
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!detailData?.order?._id) return;
    setSavingNote(true);
    try {
      await apiRequest(`/api/orders/${detailData.order._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note: detailNote }),
      });
      setDetailData((prev) => (prev ? { ...prev, order: { ...prev.order, note: detailNote } } : prev));
      setEditMode(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
    }
  }, [detailData, detailNote]);

  const handleCopy = useCallback(() => {
    if (!detailData?.order) return;
    const order = detailData.order;
    const items = detailData.items || [];
    const rows = [
      ['Mã hóa đơn', order.orderCode || ''],
      ['Thời gian', formatDateTime(order.createdAt)],
      ['Khách hàng', order.customerName || ''],
      ['Mã hàng', 'Tên hàng', 'Số lượng', 'Đơn giá', 'Thành tiền'],
      ...items.map((i) => [
        i.productCode || i.productLocalId || '',
        i.productName || '',
        i.qty ?? '',
        formatMoney(i.price),
        formatMoney(i.subtotal),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HoaDon');
    XLSX.writeFile(wb, `HoaDon_${(order.orderCode || order._id).toString().slice(-6)}_${Date.now()}.xlsx`);
  }, [detailData]);

  const handleExportList = useCallback(() => {
    const headers = effectiveVisibleColumns.map((c) => c.label);
    const rows = orders.map((o) => effectiveVisibleColumns.map((c) => {
      if (c.id === 'returnCodes') return (o.returnCodes || []).join(', ');
      const v = getCellValue(c.id, o);
      return Array.isArray(v) ? v.join(', ') : v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HoaDon');
    XLSX.writeFile(wb, `DanhSachHoaDon_${toYMD(new Date())}.xlsx`);
  }, [orders, effectiveVisibleColumns, getCellValue]);

  const handlePrint = useCallback(() => {
    if (!detailData?.order) return;
    const win = window.open('', '_blank');
    const order = detailData.order;
    const items = detailData.items || [];
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Hóa đơn ${order.orderCode || ''}</title></head><body style="font-family: Arial; padding: 16px;">
      <h2>Hóa đơn ${order.orderCode || ''}</h2>
      <p>Ngày: ${formatDateTime(order.createdAt)} | Khách: ${order.customerName || 'Khách lẻ'}</p>
      <table border="1" cellpadding="6" style="border-collapse: collapse; width: 100%;">
        <tr><th>Mã hàng</th><th>Tên hàng</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
        ${(items || []).map((i) => `<tr><td>${i.productCode || i.productLocalId || ''}</td><td>${i.productName || ''}</td><td>${i.qty ?? ''}</td><td>${formatMoney(i.price)}</td><td>${formatMoney(i.subtotal)}</td></tr>`).join('')}
      </table>
      <p><strong>Tổng tiền hàng:</strong> ${formatMoney(detailSummary.totalGoods)} | <strong>Khách đã trả:</strong> ${formatMoney(detailSummary.paid)}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
    win.close();
  }, [detailData, detailSummary]);

  const openPosEdit = useCallback(async () => {
    const orderId = detailData?.order?._id;
    if (!orderId) return;
    try {
      await apiRequest('/api/auth/switch', {
        method: 'POST',
        body: JSON.stringify({ targetApp: 'pos-app' }),
      });
    } catch {
      // ignore, open POS anyway
    }
    const base = String(POS_APP_URL || '').replace(/\/$/, '');
    const target = base.includes('/pos')
      ? `${base}?editOrderId=${encodeURIComponent(orderId)}`
      : `${base}/pos?editOrderId=${encodeURIComponent(orderId)}`;
    window.open(target, '_blank', 'noopener');
  }, [POS_APP_URL, detailData?.order?._id]);

  const openPosReturn = useCallback(async () => {
    const orderId = detailData?.order?._id;
    if (!orderId) return;
    try {
      await apiRequest('/api/auth/switch', {
        method: 'POST',
        body: JSON.stringify({ targetApp: 'pos-app' }),
      });
    } catch {
      // ignore, open POS anyway
    }
    const base = String(POS_APP_URL || '').replace(/\/$/, '');
    const target = base.includes('/pos')
      ? `${base}?returnOrderId=${encodeURIComponent(orderId)}`
      : `${base}/pos?returnOrderId=${encodeURIComponent(orderId)}`;
    window.open(target, '_blank', 'noopener');
  }, [POS_APP_URL, detailData?.order?._id]);

  return (
    <Layout maxWidth={false}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Hóa đơn
      </Typography>

      <Card sx={{ mb: 2, width: '100%' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', minHeight: 520, width: '100%' }}>
            {/* Sidebar - filters (hình 4, 5, 6) */}
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Hóa đơn
              </Typography>

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
                    }}
                  >
                    <Typography variant="body2" component="span" sx={{ minWidth: 90 }}>
                      {TIME_PRESET_MAP[timePreset] || 'Năm nay'}
                    </Typography>
                    <ArrowDropDownIcon sx={{ fontSize: 20, ml: 0.25 }} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <FormControlLabel value="custom" control={<Radio size="small" />} label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>Tùy chỉnh <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} /></Box>} />
                </Box>
              </RadioGroup>
              <Menu anchorEl={timePresetMenuAnchor} open={Boolean(timePresetMenuAnchor)} onClose={() => setTimePresetMenuAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} PaperProps={{ sx: { maxHeight: 340, minWidth: 160 } }}>
                {TIME_PRESET_GROUPS.map((group) => (
                  <MenuList key={group.title} dense disablePadding>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block', fontWeight: 600 }}>{group.title}</Typography>
                    {group.options.map((opt) => (
                      <MenuItem key={opt.value} selected={timePreset === opt.value} onClick={() => { setTimePreset(opt.value); setTimePresetMenuAnchor(null); }}>
                        <ListItemText primary={opt.label} />
                      </MenuItem>
                    ))}
                  </MenuList>
                ))}
              </Menu>
              {timeFilter === 'custom' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2, mt: 0.5 }}>
                  <TextField size="small" type="date" label="Từ ngày" value={dateRangeStart} onChange={(e) => setDateRangeStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                  <TextField size="small" type="date" label="Đến ngày" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                </Box>
              )}

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Loại hóa đơn</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                <FormControlLabel control={<Checkbox size="small" checked={invoiceTypeNoDelivery} onChange={(e) => setInvoiceTypeNoDelivery(e.target.checked)} />} label="Không giao hàng" />
                <FormControlLabel control={<Checkbox size="small" checked={invoiceTypeDelivery} onChange={(e) => setInvoiceTypeDelivery(e.target.checked)} />} label="Giao hàng" />
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Trạng thái hóa đơn</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                <FormControlLabel control={<Checkbox size="small" checked={statusProcessing} onChange={(e) => setStatusProcessing(e.target.checked)} />} label="Đang xử lý" />
                <FormControlLabel control={<Checkbox size="small" checked={statusCompleted} onChange={(e) => setStatusCompleted(e.target.checked)} />} label="Hoàn thành" />
                <FormControlLabel control={<Checkbox size="small" checked={statusCannotDeliver} onChange={(e) => setStatusCannotDeliver(e.target.checked)} />} label="Không giao được" />
                <FormControlLabel control={<Checkbox size="small" checked={statusCancelled} onChange={(e) => setStatusCancelled(e.target.checked)} />} label="Đã hủy" />
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Trạng thái HĐĐT</Typography>
              <TextField size="small" placeholder="Chọn trạng thái" value={statusEInvoice} onChange={(e) => setStatusEInvoice(e.target.value)} fullWidth sx={{ mb: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Trạng thái giao hàng</Typography>
              <TextField size="small" placeholder="Chọn trạng thái" value={statusDelivery} onChange={(e) => setStatusDelivery(e.target.value)} fullWidth sx={{ mb: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Đối tác giao hàng</Typography>
              <TextField size="small" placeholder="Chọn đối tác giao hàng" value={deliveryPartner} onChange={(e) => setDeliveryPartner(e.target.value)} fullWidth sx={{ mb: 2 }} />

              {showBranchColumn && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Chi nhánh</Typography>
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    SelectProps={{ displayEmpty: true, renderValue: (v) => (v ? (stores.find((s) => s.storeId === v)?.name || v) : 'Tất cả chi nhánh') }}
                  >
                    <MenuItem value="">Tất cả chi nhánh</MenuItem>
                    {stores.map((s) => (
                      <MenuItem key={s.storeId} value={s.storeId}>{s.name || s.storeId}</MenuItem>
                    ))}
                  </TextField>
                </>
              )}
            </Paper>

            {/* Main content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                  <Box sx={{ flex: 1, minWidth: 240 }}>
                    <TextField
                      size="small"
                      placeholder="Theo mã hóa đơn"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                      fullWidth
                    />
                  </Box>
                  <Button variant="outlined" sx={{ textTransform: 'none' }} disabled>Import file</Button>
                  <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} sx={{ textTransform: 'none' }} onClick={handleExportList}>
                    Xuất file
                  </Button>
                  <IconButton size="small" onClick={() => setColumnDrawerOpen(true)}><MoreHorizIcon /></IconButton>
                </Box>
                <Typography variant="body2" sx={{ mt: 1.5 }}>
                  Tổng tiền hàng {formatMoney(orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0))} · Giảm giá {formatMoney(orders.reduce((s, o) => s + (Number(o.discount) || 0), 0))} · Khách đã trả {formatMoney(orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0))}
                </Typography>
              </Paper>

              <Paper sx={{ p: 0, flex: 1 }}>
                {loadError && <Typography variant="body2" color="error" sx={{ p: 2 }}>{loadError}</Typography>}
                {loading ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Đang tải...</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox"><Checkbox size="small" disabled /></TableCell>
                          <TableCell padding="checkbox"><StarBorderOutlinedIcon sx={{ fontSize: 18 }} /></TableCell>
                          {effectiveVisibleColumns.map((c) => (
                            <TableCell key={c.id} sx={{ fontWeight: 600 }} align={c.align || 'left'}>
                              {c.label}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orders.map((row) => (
                          <React.Fragment key={row._id}>
                            <TableRow
                              hover
                              sx={{ cursor: 'pointer', bgcolor: expandedId === row._id ? 'action.selected' : undefined }}
                              onClick={() => toggleExpand(row)}
                            >
                              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}><Checkbox size="small" /></TableCell>
                              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}><StarBorderOutlinedIcon sx={{ fontSize: 18, color: 'action.active' }} /></TableCell>
                              {effectiveVisibleColumns.map((c) => {
                                if (c.id === 'returnCodes') {
                                  const list = row.returnCodes || [];
                                  return (
                                    <TableCell key={c.id}>
                                      {list.length > 0 ? (
                                        list.map((code, idx) => (
                                          <Link
                                            key={`${code}-${idx}`}
                                            component="button"
                                            variant="body2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenReturnDetail(code);
                                            }}
                                            sx={{ display: 'block', color: 'primary.main', textAlign: 'left', cursor: 'pointer' }}
                                          >
                                            {code}
                                          </Link>
                                        ))
                                      ) : (
                                        '—'
                                      )}
                                    </TableCell>
                                  );
                                }
                                const v = getCellValue(c.id, row);
                                return (
                                  <TableCell key={c.id} align={c.align || 'left'}>
                                    {v}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                            {expandedId === row._id && detailData && (
                              <TableRow>
                                <TableCell colSpan={2 + effectiveVisibleColumns.length} sx={{ py: 0, px: 0, borderBottom: 1, borderColor: 'divider', verticalAlign: 'top', bgcolor: 'grey.50' }}>
                                  <Box sx={{ p: 2 }}>
                                    <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ minHeight: 40, mb: 2 }}>
                                      <Tab label="Thông tin" />
                                      <Tab label="Lịch sử thanh toán" />
                                    </Tabs>
                                    {detailTab === 0 && (
                                      <>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{detailData.order?.customerName || 'Khách lẻ'}</Typography>
                                          <Link component="button" sx={{ color: 'primary.main', fontWeight: 600 }}>{detailData.order?.orderCode || ''}</Link>
                                          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>{statusLabel(detailData.order?.status)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2, mb: 2 }}>
                                          <Box><Typography variant="caption" color="text.secondary">Người tạo</Typography><Typography variant="body2">{detailData.order?.cashierName || '—'}</Typography></Box>
                                          <Box><Typography variant="caption" color="text.secondary">Người bán</Typography><Typography variant="body2">{detailData.order?.cashierName || '—'}</Typography></Box>
                                          <Box><Typography variant="caption" color="text.secondary">Kênh bán</Typography><Typography variant="body2">Bán trực tiếp</Typography></Box>
                                          <Box><Typography variant="caption" color="text.secondary">Bảng giá</Typography><Typography variant="body2">Bảng giá chung</Typography></Box>
                                          <Box><Typography variant="caption" color="text.secondary">Ngày bán</Typography><Typography variant="body2">{formatDateTime(detailData.order?.createdAt)}</Typography></Box>
                                          <Box><Typography variant="caption" color="text.secondary">Chi nhánh</Typography><Typography variant="body2">Trung tâm</Typography></Box>
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
                                                <TableCell sx={{ fontWeight: 600 }} align="right">Giá bán</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="right">Thành tiền</TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {(detailData.items || []).length === 0 ? (
                                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2 }}>Không có mặt hàng</TableCell></TableRow>
                                              ) : (
                                                (detailData.items || []).map((item, idx) => (
                                                  <TableRow key={item._id || idx}>
                                                    <TableCell>
                                                      <Link
                                                        href="#"
                                                        sx={{ color: 'primary.main', cursor: 'pointer' }}
                                                        onClick={(e) => e.stopPropagation()}
                                                      >
                                                        {item.productCode || item.productLocalId || '—'}
                                                      </Link>
                                                    </TableCell>
                                                    <TableCell>{item.productName || '—'}</TableCell>
                                                    <TableCell align="right">{item.qty ?? '—'}</TableCell>
                                                    <TableCell align="right">{formatMoney(item.basePrice ?? item.price)}</TableCell>
                                                    <TableCell align="right">{formatMoney(item.discount)}</TableCell>
                                                    <TableCell align="right">{formatMoney(item.price)}</TableCell>
                                                    <TableCell align="right">{formatMoney(item.subtotal)}</TableCell>
                                                  </TableRow>
                                                ))
                                              )}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                            <TextField
                                            size="small"
                                            placeholder="Ghi chú..."
                                            value={detailNote}
                                            onChange={(e) => setDetailNote(e.target.value)}
                                              disabled
                                            multiline
                                            rows={2}
                                            sx={{ flex: '1 1 200px', minWidth: 0 }}
                                          />
                                          <Box sx={{ minWidth: 200 }}>
                                            <Typography variant="body2" color="text.secondary">Tổng tiền hàng ({(detailData.items || []).length}): {formatMoney(detailSummary.totalGoods)}</Typography>
                                            <Typography variant="body2" color="text.secondary">Giảm giá hóa đơn: {formatMoney(detailSummary.discount)}</Typography>
                                            <Typography variant="body2" color="text.secondary">Khách cần trả: {formatMoney(detailSummary.customerPay)}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Khách đã trả: {formatMoney(detailSummary.paid)}</Typography>
                                          </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, justifyContent: 'space-between' }}>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            <Button size="small" startIcon={<DeleteOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleCancelClick(detailData.order); }} disabled={detailData.order?.status === 'cancelled'} sx={{ textTransform: 'none' }}>Hủy</Button>
                                            <Button size="small" startIcon={<ContentCopyOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleCopy(); }} sx={{ textTransform: 'none' }}>Sao chép</Button>
                                            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handleCopy(); }} sx={{ textTransform: 'none' }}>Xuất file</Button>
                                          </Box>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            <Button size="small" variant="contained" startIcon={<EditOutlinedIcon />} onClick={(e) => { e.stopPropagation(); openPosEdit(); }} sx={{ textTransform: 'none' }}>Chỉnh sửa</Button>
                                            <Button size="small" startIcon={<ReplyOutlinedIcon />} sx={{ textTransform: 'none' }} onClick={(e) => { e.stopPropagation(); openPosReturn(); }}>Trả hàng</Button>
                                            <Button size="small" startIcon={<PrintOutlinedIcon />} onClick={(e) => { e.stopPropagation(); handlePrint(); }} sx={{ textTransform: 'none' }}>In</Button>
                                            <IconButton size="small"><MoreHorizIcon /></IconButton>
                                          </Box>
                                        </Box>
                                      </>
                                    )}
                                    {detailTab === 1 && (
                                      <Typography variant="body2" color="text.secondary">Lịch sử thanh toán sẽ hiển thị tại đây.</Typography>
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
                {!loading && orders.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    Chưa có hóa đơn. Dữ liệu hóa đơn được đồng bộ từ ứng dụng Bán hàng.
                  </Typography>
                )}
              </Paper>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={cancelConfirmOpen} onClose={() => !cancelling && setCancelConfirmOpen(false)}>
        <DialogTitle>Xác nhận hủy hóa đơn</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn hủy hóa đơn <strong>{orderToCancel?.orderCode || orderToCancel?.localId || ''}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !cancelling && setCancelConfirmOpen(false)} disabled={cancelling} sx={{ textTransform: 'none' }}>Không</Button>
          <Button color="error" variant="contained" onClick={handleCancelConfirm} disabled={cancelling} sx={{ textTransform: 'none' }}>{cancelling ? 'Đang xử lý...' : 'Hủy hóa đơn'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={returnDetailOpen} onClose={() => setReturnDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi tiết hóa đơn đổi trả</DialogTitle>
        <DialogContent>
          {returnDetailLoading && (
            <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">Đang tải...</Typography></Box>
          )}
          {!returnDetailLoading && returnDetailData?.error && (
            <Typography color="error" sx={{ py: 2 }}>Không tải được chi tiết đơn trả hàng.</Typography>
          )}
          {!returnDetailLoading && returnDetailData && !returnDetailData.error && (() => {
            const r = returnDetailData.return || {};
            const returnItems = returnDetailData.returnItems || [];
            const exchangeItems = returnDetailData.exchangeItems || [];
            return (
              <Box sx={{ pt: 0 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                  <Box><Typography variant="caption" color="text.secondary">Mã trả hàng</Typography><Typography variant="body2" fontWeight={600}>{r.returnCode || '—'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Hóa đơn gốc</Typography><Typography variant="body2" fontWeight={600}>{r.orderCode || '—'}</Typography></Box>
                  {r.exchangeOrderCode && <Box><Typography variant="caption" color="text.secondary">Hóa đơn mua</Typography><Typography variant="body2" fontWeight={600}>{r.exchangeOrderCode}</Typography></Box>}
                  <Box><Typography variant="caption" color="text.secondary">Khách hàng</Typography><Typography variant="body2">{r.customerPhone || 'Khách lẻ'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Thời gian</Typography><Typography variant="body2">{formatDateTime(r.createdAt)}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Hình thức thanh toán</Typography><Typography variant="body2">{r.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Tổng tiền trả hàng</Typography><Typography variant="body2">{formatMoney(r.totalReturnAmount)}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Tổng tiền mua hàng</Typography><Typography variant="body2">{formatMoney(r.totalExchangeAmount)}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Khách thanh toán</Typography><Typography variant="body2">{formatMoney(r.amountPaid)}</Typography></Box>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Sản phẩm đã trả</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell sx={{ fontWeight: 600 }}>Tên sản phẩm</TableCell><TableCell sx={{ fontWeight: 600 }} align="right">Số lượng</TableCell><TableCell sx={{ fontWeight: 600 }} align="right">Đơn giá</TableCell><TableCell sx={{ fontWeight: 600 }} align="right">Thành tiền</TableCell></TableRow></TableHead>
                    <TableBody>
                      {returnItems.length === 0 ? <TableRow><TableCell colSpan={4} align="center" sx={{ py: 1 }}>Không có</TableCell></TableRow> : returnItems.map((item, idx) => (
                        <TableRow key={idx}><TableCell>{item.productName || '—'}</TableCell><TableCell align="right">{item.qty ?? '—'}</TableCell><TableCell align="right">{formatMoney(item.price)}</TableCell><TableCell align="right">{formatMoney(item.subtotal)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Sản phẩm đã mua</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 0 }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell sx={{ fontWeight: 600 }}>Tên sản phẩm</TableCell><TableCell sx={{ fontWeight: 600 }} align="right">Số lượng</TableCell><TableCell sx={{ fontWeight: 600 }} align="right">Đơn giá</TableCell><TableCell sx={{ fontWeight: 600 }} align="right">Thành tiền</TableCell></TableRow></TableHead>
                    <TableBody>
                      {exchangeItems.length === 0 ? <TableRow><TableCell colSpan={4} align="center" sx={{ py: 1 }}>Không có</TableCell></TableRow> : exchangeItems.map((item, idx) => (
                        <TableRow key={idx}><TableCell>{item.productName || '—'}</TableCell><TableCell align="right">{item.qty ?? '—'}</TableCell><TableCell align="right">{formatMoney(item.price)}</TableCell><TableCell align="right">{formatMoney(item.subtotal)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDetailOpen(false)} sx={{ textTransform: 'none' }}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={columnDrawerOpen} onClose={() => setColumnDrawerOpen(false)}>
        <Box sx={{ width: 360, p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Ẩn hiện cột
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Các mục đang tích sẽ hiển thị trong danh sách hóa đơn.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
            {COLUMN_DEFS.filter((c) => (showBranchColumn ? true : c.id !== 'branch')).map((c) => {
              const checked = visibleColumns.has(c.id) || c.id === 'orderCode';
              const disabled = c.id === 'orderCode' || (!showBranchColumn && c.id === 'branch');
              return (
                <FormControlLabel
                  key={c.id}
                  control={(
                    <Checkbox
                      size="small"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = new Set(visibleColumns);
                        if (e.target.checked) next.add(c.id);
                        else next.delete(c.id);
                        // không cho tắt mã hóa đơn
                        next.add('orderCode');
                        if (!showBranchColumn) next.delete('branch');
                        setVisibleColumns(next);
                      }}
                    />
                  )}
                  label={c.label}
                />
              );
            })}
          </Box>
        </Box>
      </Drawer>
    </Layout>
  );
}
