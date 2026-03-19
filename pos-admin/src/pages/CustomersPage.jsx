import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Menu,
  MenuItem,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  CircularProgress,
  Pagination,
  Avatar,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('vi-VN');
}

function formatDT(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentMethodLabel(m) {
  const x = String(m || '').toLowerCase();
  if (x === 'cash' || x === 'tiền mặt') return 'Tiền mặt';
  if (x === 'transfer' || x === 'bank' || x === 'chuyển khoản') return 'Chuyển khoản';
  if (x === 'card' || x === 'thẻ') return 'Thẻ';
  if (x === 'cod') return 'COD';
  return m || 'Bán trực tiếp';
}

function lineDiscountLabel(item) {
  const d = Number(item.discount) || 0;
  if (d <= 0) return '—';
  if (item.discountType === 'percent') return `${d}%`;
  return `${formatMoney(d)} đ`;
}

function invoiceDiscountAmount(goodsSubtotal, order) {
  const disc = Number(order?.discount) || 0;
  if (disc <= 0) return 0;
  if (order?.discountType === 'percent') {
    return Math.round((goodsSubtotal * Math.min(100, disc)) / 100);
  }
  return disc;
}

const DETAIL_TABS = [
  { id: 'info', label: 'Thông tin' },
  { id: 'address', label: 'Địa chỉ nhận hàng' },
  { id: 'sales', label: 'Lịch sử bán/trả hàng' },
  { id: 'debt', label: 'Nợ cần thu từ khách' },
  { id: 'points', label: 'Lịch sử tích điểm' },
];

function CustomerDetailExpand({ customer, tab, onTabChange, cache, loadSlice }) {
  const id = customer._id;
  const [salesDetailOpen, setSalesDetailOpen] = useState(false);
  const [salesDetailLoading, setSalesDetailLoading] = useState(false);
  const [salesDetailError, setSalesDetailError] = useState('');
  const [salesDetail, setSalesDetail] = useState(null);

  const [productMiniOpen, setProductMiniOpen] = useState(false);
  const [productMini, setProductMini] = useState(null);

  useEffect(() => {
    if (!id) return;
    if (tab === 'sales' && !cache.orders) loadSlice('orders');
    if (tab === 'debt' && !cache.ledger) loadSlice('ledger');
    if (tab === 'points' && !cache.points) loadSlice('points');
  }, [id, tab, cache.orders, cache.ledger, cache.points, loadSlice]);

  const orders = cache.orders || [];
  const returns = cache.returns || [];
  const ledger = cache.ledger || [];
  const points = cache.points || [];
  const loading = cache.loading;

  const orderView = salesDetail?.type === 'order' ? salesDetail.data : null;
  const ordModal = orderView?.order;
  const invLineItems = (() => {
    if (!orderView) return [];
    if (Array.isArray(orderView.invoiceLineItems) && orderView.invoiceLineItems.length > 0) {
      return orderView.invoiceLineItems;
    }
    return Array.isArray(orderView.items) ? orderView.items : [];
  })();
  const invGoodsSubtotal =
    orderView && typeof orderView.invoiceGoodsSubtotal === 'number'
      ? orderView.invoiceGoodsSubtotal
      : invLineItems.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  const invDiscAmount = ordModal ? invoiceDiscountAmount(invGoodsSubtotal, ordModal) : 0;
  const invEstimatedPay = Math.max(0, invGoodsSubtotal - invDiscAmount);
  const invLineQtySum = invLineItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);

  const salesRows = useMemo(() => {
    const POINTS_PER_VND = 50000;
    const o = (orders || []).map((x) => ({
      key: `o-${x.localId}`,
      code: x.orderCode || x.localId,
      detailId: x.orderCode || x.localId,
      time: x.createdAt,
      seller: x.cashierName || '—',
      // Sau trả một phần, POS có thể cập nhật order.totalAmount còn lại,
      // nhưng pointsEarned phản ánh số điểm được cộng từ thời điểm mua ban đầu.
      // Ưu tiên hiển thị theo pointsEarned để lịch sử không gây hiểu lầm.
      total: (Number(x.pointsEarned) > 0 ? Number(x.pointsEarned) * POINTS_PER_VND : (x.totalAmount || 0)),
      status: x.status === 'completed' ? 'Hoàn thành' : x.status,
      kind: 'order',
      note: `HD ${x.orderCode || x.localId}`,
    }));
    const r = (returns || []).map((x) => ({
      key: `r-${x.localId}`,
      code: x.returnCode || x.localId,
      detailId: x.returnCode || x.localId,
      time: x.createdAt,
      seller: x.cashierName || '—',
      total: -(x.totalReturnAmount || 0),
      kind: 'return',
      returnOrderCode: x.orderCode || x.orderLocalId || '',
      hasExchange: Array.isArray(x.exchangeItems) && x.exchangeItems.length > 0,
      status: (Array.isArray(x.exchangeItems) && x.exchangeItems.length > 0) ? 'Trả & đổi hàng' : 'Trả hàng',
      note: (Array.isArray(x.exchangeItems) && x.exchangeItems.length > 0)
        ? `TH ${x.returnCode || x.localId} (đổi + trả) - cho HD ${x.orderCode || x.orderLocalId || ''}`
        : `TH ${x.returnCode || x.localId} (trả) - cho HD ${x.orderCode || x.orderLocalId || ''}`,
    }));
    return [...o, ...r].sort((a, b) => (b.time || 0) - (a.time || 0));
  }, [orders, returns]);

  const openSalesDetail = async (row) => {
    if (!row?.detailId) return;
    setSalesDetailOpen(true);
    setSalesDetailLoading(true);
    setSalesDetailError('');
    setSalesDetail(null);
    try {
      const oid = encodeURIComponent(row.detailId);
      if (row.kind === 'order') {
        const data = await apiRequest(`/api/orders/${oid}`);
        const returnIds = Array.isArray(data?.order?.returnIds) ? data.order.returnIds : [];
        let returnDetails = [];
        if (returnIds.length > 0) {
          // Fetch các phiếu trả liên quan để hiển thị đúng "HD đã bán cái gì"
          const results = await Promise.allSettled(
            returnIds.map(async (rid) => {
              try {
                return apiRequest(`/api/returns/${encodeURIComponent(rid)}`);
              } catch {
                return null;
              }
            }),
          );
          returnDetails = results
            .filter((x) => x.status === 'fulfilled' && x.value && x.value.return)
            .map((x) => x.value);
        }
        setSalesDetail({ type: 'order', data, returnDetails });
      } else {
        const data = await apiRequest(`/api/returns/${oid}`);
        setSalesDetail({ type: 'return', data });
      }
    } catch (e) {
      setSalesDetailError(e?.message || 'Không tải được chi tiết');
    } finally {
      setSalesDetailLoading(false);
    }
  };

  const openProductMini = (it) => {
    if (!it) return;
    setProductMini(it);
    setProductMiniOpen(true);
  };

  return (
    <Box
      sx={{
        py: 2,
        px: 2,
        bgcolor: '#f0f4f8',
        borderTop: '3px solid',
        borderColor: 'primary.main',
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => onTabChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: 'primary.main' },
          '& .MuiTabs-indicator': { height: 3 },
        }}
      >
        {DETAIL_TABS.map((t) => (
          <Tab key={t.id} label={t.label} value={t.id} />
        ))}
      </Tabs>

      <Box sx={{ mt: 2, bgcolor: '#fff', borderRadius: 1, p: 2, minHeight: 200 }}>
        {tab === 'info' && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }} sx={{ textAlign: 'center' }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 1, bgcolor: 'grey.300' }} />
              <Typography variant="h6" fontWeight={700}>
                {customer.name || '—'}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {customer.customerCode || customer.localId}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                Nhóm: {customer.group || '—'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Grid container spacing={2}>
                {[
                  ['Điện thoại', customer.phone],
                  ['Email', customer.email],
                  ['Địa chỉ', customer.address],
                  ['Khu vực', [customer.ward, customer.area].filter(Boolean).join(', ') || '—'],
                  ['Ngày sinh', customer.dateOfBirth],
                  ['Giới tính', customer.gender],
                  ['Facebook', customer.facebook],
                ].map(([k, v]) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={k}>
                    <Typography variant="caption" color="text.secondary">
                      {k}
                    </Typography>
                    <Typography variant="body2">{v || '—'}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Paper variant="outlined" sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">
                  Ghi chú
                </Typography>
                <Typography variant="body2">{customer.note || '—'}</Typography>
              </Paper>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  <strong>Điểm hiện tại:</strong> {formatMoney(customer.points)}
                </Typography>
                <Typography variant="body2">
                  <strong>Nợ hiện tại:</strong> {formatMoney(customer.debt)} đ
                </Typography>
                <Typography variant="body2">
                  <strong>Tổng bán:</strong> {formatMoney(customer.totalSales)} đ
                </Typography>
                <Typography variant="body2">
                  <strong>Tổng bán trừ trả:</strong> {formatMoney(customer.netSales)} đ
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {tab === 'address' && (
          <>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>Tên địa chỉ</TableCell>
                  <TableCell>Người nhận</TableCell>
                  <TableCell>SĐT</TableCell>
                  <TableCell>Địa chỉ nhận</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customer.address || customer.phone ? (
                  <TableRow>
                    <TableCell>Mặc định</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>
                      {[customer.address, customer.ward, customer.area].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell>{formatDT(customer.createdAt)}</TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Không tìm thấy địa chỉ nào — thêm từ POS hoặc chỉnh sửa khách hàng
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button variant="outlined" size="small" startIcon={<AddIcon />}>
                + Địa chỉ mới
              </Button>
            </Box>
          </>
        )}

        {tab === 'sales' && (
          <>
            {loading === 'orders' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Mã chứng từ</TableCell>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Người bán</TableCell>
                    <TableCell>Diễn giải</TableCell>
                    <TableCell align="right">Tổng cộng</TableCell>
                    <TableCell>Trạng thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        Chưa có giao dịch
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesRows.map((row) => (
                      <TableRow key={row.key} hover onClick={() => openSalesDetail(row)} sx={{ cursor: 'pointer' }}>
                        <TableCell>
                          <Link
                            href="#"
                            underline="hover"
                            onClick={(e) => {
                              e.preventDefault();
                              openSalesDetail(row);
                            }}
                          >
                            {row.code}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDT(row.time)}</TableCell>
                        <TableCell>{row.seller}</TableCell>
                        <TableCell>{row.note || '—'}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: row.total < 0 ? 'error.main' : 'text.primary' }}
                        >
                          {row.total < 0 ? '-' : ''}
                          {formatMoney(Math.abs(row.total))}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.status}
                            color={row.kind === 'order' ? 'success' : 'warning'}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} sx={{ mt: 1 }}>
              Xuất file
            </Button>
          </>
        )}

        {tab === 'debt' && (
          <>
            {loading === 'ledger' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Mã phiếu</TableCell>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Loại</TableCell>
                    <TableCell align="right">Giá trị</TableCell>
                    <TableCell align="right">Dư nợ (luỹ kế)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        Không có dữ liệu công nợ chi tiết
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledger.map((row, i) => (
                      <TableRow key={`${row.code}-${i}`}>
                        <TableCell>
                          <Link href="#" underline="hover" onClick={(e) => e.preventDefault()}>
                            {row.code}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDT(row.time)}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell align="right" sx={{ color: row.value < 0 ? 'success.main' : 'text.primary' }}>
                          {row.value < 0 ? '' : '+'}
                          {formatMoney(row.value)} đ
                        </TableCell>
                        <TableCell align="right">{formatMoney(row.balance)} đ</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined">
                Xuất file công nợ
              </Button>
              <Button size="small" variant="contained">
                Thanh toán
              </Button>
            </Box>
          </>
        )}

        {tab === 'points' && (
          <>
            {loading === 'points' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Mã chứng từ</TableCell>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Loại</TableCell>
                    <TableCell align="right">Giá trị HĐ</TableCell>
                    <TableCell align="right">Điểm +/-</TableCell>
                    <TableCell align="right">Điểm sau GD</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {points.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        Chưa có lịch sử tích điểm từ hóa đơn
                      </TableCell>
                    </TableRow>
                  ) : (
                    points.map((row, i) => (
                      <TableRow key={`${row.code}-${i}`}>
                        <TableCell>{row.code}</TableCell>
                        <TableCell>{formatDT(row.time)}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell align="right">{formatMoney(row.orderTotal)} đ</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 600,
                            color: row.pointsDelta >= 0 ? 'success.main' : 'error.main',
                          }}
                        >
                          {row.pointsDelta > 0 ? '+' : ''}
                          {row.pointsDelta}
                        </TableCell>
                        <TableCell align="right">{row.balanceAfter}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} sx={{ mt: 1 }}>
              Xuất file
            </Button>
          </>
        )}
      </Box>

      <Dialog open={salesDetailOpen} onClose={() => setSalesDetailOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {salesDetailLoading
            ? 'Đang tải...'
            : salesDetail?.type === 'order'
              ? `Hóa đơn ${salesDetail?.data?.order?.orderCode || ''}`
              : salesDetail?.type === 'return'
                ? `Chi tiết trả/đổi: ${salesDetail?.data?.return?.returnCode || ''}`
                : 'Chi tiết'}
        </DialogTitle>
        <DialogContent>
          {salesDetailError && (
            <Box sx={{ color: 'error.main', mb: 2 }}>
              {salesDetailError}
            </Box>
          )}

          {salesDetailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : salesDetail?.type === 'order' ? (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 2,
                }}
              >
                <Typography variant="body1" fontWeight={700}>
                  Khách: {ordModal?.customerName || 'Khách lẻ'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={ordModal?.status === 'cancelled' ? 'Đã hủy' : 'Hoàn thành'}
                    color={ordModal?.status === 'cancelled' ? 'error' : 'success'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Chi nhánh: {ordModal?.storeId || '—'}
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  ['Người bán', ordModal?.cashierName || '—'],
                  ['Ngày bán', formatDT(ordModal?.createdAt)],
                  ['Kênh bán', paymentMethodLabel(ordModal?.paymentMethod)],
                  ['Ghi chú', ordModal?.note || 'Chưa có ghi chú'],
                ].map(([k, v]) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={k}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {k}
                    </Typography>
                    <Typography variant="body2">{v}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Hàng hóa theo hóa đơn gốc (đã cộng lại phần đã trả để hiển thị đúng SL lúc bán)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>Mã hàng</TableCell>
                      <TableCell>Tên hàng</TableCell>
                      <TableCell align="right">SL</TableCell>
                      <TableCell align="right">Đơn giá</TableCell>
                      <TableCell align="right">Giảm giá</TableCell>
                      <TableCell align="right">Giá bán</TableCell>
                      <TableCell align="right">Thành tiền</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invLineItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          Không có dữ liệu dòng hàng
                        </TableCell>
                      </TableRow>
                    ) : (
                      invLineItems.map((it) => (
                        <TableRow key={it._id || it.productLocalId}>
                          <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {it.productCode || it.productLocalId || '—'}
                          </TableCell>
                          <TableCell>{it.productName || '—'}</TableCell>
                          <TableCell align="right">{it.qty}</TableCell>
                          <TableCell align="right">{formatMoney(it.basePrice || it.price)}</TableCell>
                          <TableCell align="right">{lineDiscountLabel(it)}</TableCell>
                          <TableCell align="right">{formatMoney(it.price)}</TableCell>
                          <TableCell align="right">{formatMoney(it.subtotal)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Box sx={{ minWidth: 280 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Tổng tiền hàng
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatMoney(invGoodsSubtotal)} đ ({invLineQtySum})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Giảm giá hóa đơn
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {ordModal?.discountType === 'percent'
                        ? `${Number(ordModal?.discount) || 0}%`
                        : `${formatMoney(ordModal?.discount)} đ`}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2" fontWeight={700}>
                      Khách cần trả (ước tính theo dòng)
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatMoney(invEstimatedPay)} đ
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Tổng trên hệ thống sau trả/hủy: {formatMoney(ordModal?.totalAmount)} đ
                  </Typography>
                </Box>
              </Box>

              {Array.isArray(salesDetail?.returnDetails) && salesDetail.returnDetails.length > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
                    Các phiếu trả/đổi liên quan (để suy ra HD đã bán)
                  </Typography>
                  {salesDetail.returnDetails.map((rd) => (
                    <Box
                      key={rd?.return?.returnCode || rd?.return?.localId}
                      sx={{
                        mb: 2,
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50',
                      }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {rd?.return?.returnCode || rd?.return?.localId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Mã hóa đơn gốc: {rd?.return?.orderCode || rd?.return?.orderLocalId || '—'}
                      </Typography>

                      <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                          Sản phẩm đã trả
                        </Typography>
                        <Table size="small" sx={{ mb: 1 }}>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                              <TableCell>Sản phẩm</TableCell>
                              <TableCell align="right">SL</TableCell>
                              <TableCell align="right">Đơn giá</TableCell>
                              <TableCell align="right">Thành tiền</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(rd?.returnItems || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                                  Không có
                                </TableCell>
                              </TableRow>
                            ) : (
                              rd.returnItems.map((it, idx) => (
                                <TableRow key={`${it.productName}-${idx}`}>
                                  <TableCell>{it.productName}</TableCell>
                                  <TableCell align="right">{it.qty}</TableCell>
                                  <TableCell align="right">{formatMoney(it.price)}</TableCell>
                                  <TableCell align="right">{formatMoney(it.subtotal)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>

                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                          Sản phẩm đổi
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                              <TableCell>Sản phẩm</TableCell>
                              <TableCell align="right">SL</TableCell>
                              <TableCell align="right">Đơn giá</TableCell>
                              <TableCell align="right">Thành tiền</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(rd?.exchangeItems || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                                  Không có
                                </TableCell>
                              </TableRow>
                            ) : (
                              rd.exchangeItems.map((it, idx) => (
                                <TableRow key={`${it.productName}-${idx}`}>
                                  <TableCell>{it.productName}</TableCell>
                                  <TableCell align="right">{it.qty}</TableCell>
                                  <TableCell align="right">{formatMoney(it.price)}</TableCell>
                                  <TableCell align="right">{formatMoney(it.subtotal)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </Box>
                    </Box>
                  ))}
                </>
              )}
            </>
          ) : salesDetail?.type === 'return' ? (
            <>
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Mã trả hàng
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {salesDetail?.data?.return?.returnCode || salesDetail?.data?.return?.localId || '—'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Thời gian trả
                    </Typography>
                    <Typography variant="body2">
                      {formatDT(salesDetail?.data?.return?.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Người bán
                    </Typography>
                    <Typography variant="body2">{salesDetail?.data?.return?.cashierName || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Hình thức thanh toán
                    </Typography>
                    <Typography variant="body2">
                      {paymentMethodLabel(salesDetail?.data?.return?.paymentMethod)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Khách
                    </Typography>
                    <Typography variant="body2">
                      {salesDetail?.data?.return?.customerName || salesDetail?.data?.return?.customerCode || '—'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Hóa đơn gốc
                    </Typography>
                    <Typography variant="body2">
                      {salesDetail?.data?.return?.orderCode || salesDetail?.data?.return?.orderLocalId ? (
                        <Link
                          href="#"
                          underline="hover"
                          onClick={(e) => {
                            e.preventDefault();
                            const oc = salesDetail?.data?.return?.orderCode || salesDetail?.data?.return?.orderLocalId || '';
                            window.location.assign(`/invoices?search=${encodeURIComponent(oc)}`);
                          }}
                          sx={{ fontWeight: 700 }}
                        >
                          {salesDetail?.data?.return?.orderCode || salesDetail?.data?.return?.orderLocalId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Sản phẩm đã trả
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Mã hàng</TableCell>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell align="right">SL</TableCell>
                    <TableCell align="right">Đơn giá</TableCell>
                    <TableCell align="right">Thành tiền</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(salesDetail?.data?.returnItems || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        Không có
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesDetail.data.returnItems.map((it, idx) => (
                      <TableRow key={`${it.productName}-${idx}`}>
                        <TableCell sx={{ minWidth: 140 }}>
                          <Link
                            href="#"
                            underline="hover"
                            onClick={(e) => {
                              e.preventDefault();
                              openProductMini(it);
                            }}
                            sx={{ color: 'primary.main', fontWeight: 700 }}
                          >
                            {it.productCode || it.productLocalId || '—'}
                          </Link>
                        </TableCell>
                        <TableCell>{it.productName}</TableCell>
                        <TableCell align="right">{it.qty}</TableCell>
                        <TableCell align="right">{formatMoney(it.price)}</TableCell>
                        <TableCell align="right">{formatMoney(it.subtotal)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Sản phẩm đổi
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Mã hàng</TableCell>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell align="right">SL</TableCell>
                    <TableCell align="right">Đơn giá</TableCell>
                    <TableCell align="right">Thành tiền</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(salesDetail?.data?.exchangeItems || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        Không có
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesDetail.data.exchangeItems.map((it, idx) => (
                      <TableRow key={`${it.productName}-${idx}`}>
                        <TableCell sx={{ minWidth: 140 }}>
                          <Link
                            href="#"
                            underline="hover"
                            onClick={(e) => {
                              e.preventDefault();
                              openProductMini(it);
                            }}
                            sx={{ color: 'primary.main', fontWeight: 700 }}
                          >
                            {it.productCode || it.productLocalId || '—'}
                          </Link>
                        </TableCell>
                        <TableCell>{it.productName}</TableCell>
                        <TableCell align="right">{it.qty}</TableCell>
                        <TableCell align="right">{formatMoney(it.price)}</TableCell>
                        <TableCell align="right">{formatMoney(it.subtotal)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          ) : (
            <Typography color="text.secondary">Không có dữ liệu</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSalesDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={productMiniOpen} onClose={() => setProductMiniOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mã hàng hóa</DialogTitle>
        <DialogContent>
          {productMini ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, pt: 0.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Mã hàng</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {productMini.productCode || productMini.productLocalId || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Tên hàng</Typography>
                <Typography variant="body2">{productMini.productName || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Số lượng</Typography>
                <Typography variant="body2">{productMini.qty || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Đơn giá</Typography>
                <Typography variant="body2">{formatMoney(productMini.price || 0)} đ</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Thành tiền</Typography>
                <Typography variant="body2">{formatMoney(productMini.subtotal || 0)} đ</Typography>
              </Box>
            </Box>
          ) : (
            <Typography color="text.secondary">Không có dữ liệu</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductMiniOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function CustomersPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [timeMode, setTimeMode] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [debtFrom, setDebtFrom] = useState('');
  const [debtTo, setDebtTo] = useState('');
  const [pointsFrom, setPointsFrom] = useState('');
  const [pointsTo, setPointsTo] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const [expandedId, setExpandedId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [detailCache, setDetailCache] = useState({});

  const [selected, setSelected] = useState({});
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', phone: '', customerCode: '', address: '', group: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    if (debouncedSearch.trim()) p.set('q', debouncedSearch.trim());
    if (timeMode === 'range' && dateFrom) p.set('createdFrom', dateFrom);
    if (timeMode === 'range' && dateTo) p.set('createdTo', dateTo);
    if (debtFrom !== '') p.set('debtMin', debtFrom);
    if (debtTo !== '') p.set('debtMax', debtTo);
    if (pointsFrom !== '') p.set('pointsMin', pointsFrom);
    if (pointsTo !== '') p.set('pointsMax', pointsTo);
    if (areaFilter.trim()) p.set('area', areaFilter.trim());
    if (groupFilter.trim()) p.set('group', groupFilter.trim());
    return p.toString();
  }, [page, limit, debouncedSearch, timeMode, dateFrom, dateTo, debtFrom, debtTo, pointsFrom, pointsTo, areaFilter, groupFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/customers?${queryString}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setSummary(data.summary || {});
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = (row) => {
    const id = row._id;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setDetailTab('info');
    setDetailCache((prev) => ({
      ...prev,
      [id]: {
        ...row,
        orders: null,
        returns: null,
        ledger: null,
        points: null,
        loading: null,
      },
    }));
  };

  const loadSlice = useCallback(
    async (slice) => {
      if (!expandedId) return;
      const id = expandedId;
      setDetailCache((prev) => ({
        ...prev,
        [id]: { ...prev[id], loading: slice === 'orders' ? 'orders' : slice === 'ledger' ? 'ledger' : 'points' },
      }));
      try {
        if (slice === 'orders') {
          const [orders, returns] = await Promise.all([
            apiRequest(`/api/customers/${id}/orders`),
            apiRequest(`/api/customers/${id}/returns`),
          ]);
          setDetailCache((prev) => ({
            ...prev,
            [id]: { ...prev[id], orders, returns, loading: null },
          }));
        } else if (slice === 'ledger') {
          const ledger = await apiRequest(`/api/customers/${id}/ledger`);
          setDetailCache((prev) => ({
            ...prev,
            [id]: { ...prev[id], ledger, loading: null },
          }));
        } else if (slice === 'points') {
          const points = await apiRequest(`/api/customers/${id}/points-history`);
          setDetailCache((prev) => ({
            ...prev,
            [id]: { ...prev[id], points, loading: null },
          }));
        }
      } catch {
        setDetailCache((prev) => ({
          ...prev,
          [id]: { ...prev[id], loading: null },
        }));
      }
    },
    [expandedId]
  );

  const mergedCustomer = (row) => {
    const c = detailCache[row._id];
    return c ? { ...row, ...c, totalSales: row.totalSales, netSales: row.netSales } : row;
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      items.map((c) => ({
        'Mã KH': c.customerCode || c.localId,
        'Tên': c.name,
        'Điện thoại': c.phone,
        'Nợ': c.debt,
        'Tổng bán': c.totalSales,
        'Tổng bán trừ trả': c.netSales,
        'Điểm': c.points,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Khách hàng');
    XLSX.writeFile(wb, `khach_hang_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() && !createForm.phone.trim()) return;
    setSaving(true);
    try {
      await apiRequest('/api/customers', { method: 'POST', body: JSON.stringify(createForm) });
      setCreateOpen(false);
      setCreateForm({ name: '', phone: '', customerCode: '', address: '', group: '' });
      load();
    } catch {
      /* toast */
    } finally {
      setSaving(false);
    }
  };

  const allIds = items.map((r) => r._id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected[id]);

  return (
    <Layout maxWidth={false}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Khách hàng
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Sidebar lọc */}
        <Paper elevation={0} variant="outlined" sx={{ width: 280, flexShrink: 0, p: 2, position: 'sticky', top: 16 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Thời gian tạo
          </Typography>
          <RadioGroup
            value={timeMode}
            onChange={(e) => setTimeMode(e.target.value)}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="all" control={<Radio size="small" />} label="Toàn thời gian" />
            <FormControlLabel value="range" control={<Radio size="small" />} label="Tùy chỉnh" />
          </RadioGroup>
          {timeMode === 'range' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              <TextField size="small" type="date" label="Từ" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} fullWidth />
              <TextField size="small" type="date" label="Đến" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} fullWidth />
            </Box>
          )}

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Nợ hiện tại
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" placeholder="Từ" value={debtFrom} onChange={(e) => setDebtFrom(e.target.value)} fullWidth />
            <TextField size="small" placeholder="Tới" value={debtTo} onChange={(e) => setDebtTo(e.target.value)} fullWidth />
          </Box>

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Điểm hiện tại
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" placeholder="Từ" value={pointsFrom} onChange={(e) => setPointsFrom(e.target.value)} fullWidth />
            <TextField size="small" placeholder="Tới" value={pointsTo} onChange={(e) => setPointsTo(e.target.value)} fullWidth />
          </Box>

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Khu vực / Nhóm
          </Typography>
          <TextField size="small" fullWidth placeholder="Khu vực giao hàng" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} sx={{ mb: 1 }} />
          <TextField size="small" fullWidth placeholder="Nhóm khách hàng" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} sx={{ mb: 2 }} />

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Trạng thái
          </Typography>
          <ToggleButtonGroup exclusive size="small" fullWidth value="all" sx={{ mb: 2 }}>
            <ToggleButton value="all">Tất cả</ToggleButton>
            <ToggleButton value="active">Đang HĐ</ToggleButton>
            <ToggleButton value="off">Ngừng</ToggleButton>
          </ToggleButtonGroup>

          <Button variant="outlined" size="small" fullWidth onClick={() => { setPage(1); load(); }}>
            Áp dụng bộ lọc
          </Button>
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Theo mã, tên, số điện thoại"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                sx={{ flex: 1, minWidth: 220 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                Khách hàng
              </Button>
              <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} disabled>
                Import file
              </Button>
              <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={exportExcel}>
                Xuất file
              </Button>
              <IconButton onClick={(e) => setMoreAnchor(e.currentTarget)}>
                <MoreHorizIcon />
              </IconButton>
              <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
                <MenuItem onClick={() => setMoreAnchor(null)}>Cài đặt cột</MenuItem>
              </Menu>
            </Box>
          </Paper>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={allIds.some((id) => selected[id]) && !allSelected}
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) setSelected({});
                        else {
                          const n = {};
                          allIds.forEach((id) => { n[id] = true; });
                          setSelected(n);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell width={48} />
                  <TableCell>Mã khách hàng</TableCell>
                  <TableCell>Tên khách hàng</TableCell>
                  <TableCell>Điện thoại</TableCell>
                  <TableCell align="right">Nợ hiện tại</TableCell>
                  <TableCell align="right">Tổng bán</TableCell>
                  <TableCell align="right">Tổng bán trừ trả hàng</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell colSpan={2} />
                  <TableCell colSpan={3}>
                    <Typography variant="caption" fontWeight={700}>
                      Tổng (toàn bộ bộ lọc: nợ / điểm) — trang này:
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" fontWeight={700}>{formatMoney(summary.pageSumDebt)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" fontWeight={700}>{formatMoney(summary.pageSumSales)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" fontWeight={700}>{formatMoney(summary.pageSumNet)}</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      Không có khách hàng
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => {
                    const open = expandedId === row._id;
                    return (
                      <React.Fragment key={row._id}>
                        <TableRow
                          hover
                          selected={open}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: open ? 'action.selected' : undefined } }}
                          onClick={() => toggleExpand(row)}
                        >
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={!!selected[row._id]}
                              onChange={() => setSelected((p) => ({ ...p, [row._id]: !p[row._id] }))}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(row); }}>
                              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Link component="button" variant="body2" underline="hover" onClick={(e) => { e.stopPropagation(); toggleExpand(row); }}>
                              {row.customerCode || row.localId}
                            </Link>
                          </TableCell>
                          <TableCell>{row.name || '—'}</TableCell>
                          <TableCell>{row.phone || '—'}</TableCell>
                          <TableCell align="right">{formatMoney(row.debt)}</TableCell>
                          <TableCell align="right">{formatMoney(row.totalSales)}</TableCell>
                          <TableCell align="right">{formatMoney(row.netSales)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none', borderTop: 'none' }}>
                            <Collapse in={open} timeout="auto" unmountOnExit>
                              <CustomerDetailExpand
                                customer={mergedCustomer(row)}
                                tab={detailTab}
                                onTabChange={setDetailTab}
                                cache={detailCache[row._id] || {}}
                                loadSlice={loadSlice}
                              />
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {(page - 1) * limit + 1} – {Math.min(page * limit, total)} trong {total} khách hàng
            </Typography>
            <Pagination
              count={Math.max(1, Math.ceil(total / limit))}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
            />
          </Box>
        </Box>
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm khách hàng</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Tên" fullWidth value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
            <TextField label="Số điện thoại" fullWidth value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} />
            <TextField label="Mã khách hàng" fullWidth value={createForm.customerCode} onChange={(e) => setCreateForm((f) => ({ ...f, customerCode: e.target.value }))} />
            <TextField label="Địa chỉ" fullWidth value={createForm.address} onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))} />
            <TextField label="Nhóm" fullWidth value={createForm.group} onChange={(e) => setCreateForm((f) => ({ ...f, group: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
