import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('vi-VN');
}

export default function PurchaseReturnPage() {
  const navigate = useNavigate();
  const { id: purchaseOrderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnItems, setReturnItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!purchaseOrderId) return;
    setLoading(true);
    apiRequest(`/api/purchase-orders/${purchaseOrderId}`)
      .then((res) => {
        const po = res?.purchaseOrder || res;
        setOrder(po);
        const items = Array.isArray(po?.items) ? po.items : [];
        setReturnItems(
          items.map((it) => ({
            productId: it.productId,
            productCode: it.productCode || '',
            productName: it.productName || '',
            unit: it.unit || '',
            importedQty: Number(it.quantity) || 0,
            returnQty: 0,
            unitPrice: Number(it.unitPrice) || 0,
            amount: 0,
            note: it.note || '',
          }))
        );
        setNotes(po?.notes || '');
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [purchaseOrderId]);

  const setReturnQty = useCallback((index, value) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setReturnItems((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      row.returnQty = Math.min(n, row.importedQty);
      row.amount = row.returnQty * row.unitPrice;
      next[index] = row;
      return next;
    });
  }, []);

  const totalAmount = returnItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const saveDraft = useCallback(async () => {
    setSaveError('');
    setSaving(true);
    try {
      await apiRequest('/api/purchase-returns', {
        method: 'POST',
        body: JSON.stringify({
          purchaseOrderId,
          supplierId: order?.supplierId || undefined,
          supplierCode: order?.supplierCode || '',
          supplierName: order?.supplierName || '',
          notes,
          status: 'draft',
          items: returnItems
            .filter((it) => (Number(it.returnQty) || 0) > 0)
            .map((it) => ({
              productId: it.productId,
              productCode: it.productCode,
              productName: it.productName,
              unit: it.unit,
              quantity: Number(it.returnQty) || 0,
              unitPrice: it.unitPrice,
              note: it.note,
            })),
        }),
      });
      navigate('/purchase-orders');
    } catch (err) {
      setSaveError(err?.data?.message || err?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }, [purchaseOrderId, order, notes, returnItems, navigate]);

  const submitComplete = useCallback(async () => {
    const withQty = returnItems.filter((it) => (Number(it.returnQty) || 0) > 0);
    if (withQty.length === 0) {
      setSaveError('Nhập số lượng trả ít nhất một mặt hàng.');
      return;
    }
    setSaveError('');
    setSaving(true);
    try {
      await apiRequest('/api/purchase-returns', {
        method: 'POST',
        body: JSON.stringify({
          purchaseOrderId,
          supplierId: order?.supplierId || undefined,
          supplierCode: order?.supplierCode || '',
          supplierName: order?.supplierName || '',
          notes,
          status: 'completed',
          items: withQty.map((it) => ({
            productId: it.productId,
            productCode: it.productCode,
            productName: it.productName,
            unit: it.unit,
            quantity: Number(it.returnQty) || 0,
            unitPrice: it.unitPrice,
            note: it.note,
          })),
        }),
      });
      navigate('/purchase-orders');
    } catch (err) {
      setSaveError(err?.data?.message || err?.message || 'Hoàn thành thất bại');
    } finally {
      setSaving(false);
    }
  }, [purchaseOrderId, order, notes, returnItems, navigate]);

  if (loading) {
    return (
      <Layout maxWidth={false}>
        <Typography variant="body2" color="text.secondary">Đang tải...</Typography>
      </Layout>
    );
  }
  if (!order) {
    return (
      <Layout maxWidth={false}>
        <Typography variant="body2" color="error">Không tìm thấy phiếu nhập hàng.</Typography>
        <Button sx={{ mt: 2, textTransform: 'none' }} onClick={() => navigate('/purchase-orders')}>Quay lại</Button>
      </Layout>
    );
  }

  return (
    <Layout maxWidth={false}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate('/purchase-orders')} aria-label="Quay lại">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Trả hàng nhập
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2 }}>Phiếu nhập: <strong>{order.code || '—'}</strong> · Nhà cung cấp: {order.supplierName || '—'}</Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'nowrap', minWidth: 0 }}>
        <Paper variant="outlined" sx={{ flex: '1 1 auto', minWidth: 0, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Sản phẩm trả</Typography>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Mã hàng</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tên hàng</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ĐVT</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Số lượng trả</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Giá nhập</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Thành tiền</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returnItems.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 500 }}>{row.productCode || '—'}</TableCell>
                    <TableCell>{row.productName || '—'}</TableCell>
                    <TableCell>{row.unit || '—'}</TableCell>
                    <TableCell align="right">
                      <Box>
                        <TextField
                          type="number"
                          size="small"
                          value={row.returnQty}
                          onChange={(e) => setReturnQty(idx, e.target.value)}
                          inputProps={{ min: 0, max: row.importedQty }}
                          sx={{ width: 90 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">/ {row.importedQty}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{formatMoney(row.unitPrice)}</TableCell>
                    <TableCell align="right">{formatMoney(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper variant="outlined" sx={{ flex: '0 0 320px', p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Tổng tiền hàng</Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>{formatMoney(totalAmount)}</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Ghi chú</Typography>
          <TextField size="small" fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={3} placeholder="Ghi chú..." sx={{ mb: 2 }} />
          {saveError && <Typography variant="body2" color="error" sx={{ mb: 1 }}>{saveError}</Typography>}
          <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
            <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={saveDraft} disabled={saving} sx={{ textTransform: 'none' }}>Lưu tạm</Button>
            <Button variant="contained" color="success" startIcon={<CheckCircleOutlinedIcon />} onClick={submitComplete} disabled={saving} sx={{ textTransform: 'none' }}>Hoàn thành</Button>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
}
