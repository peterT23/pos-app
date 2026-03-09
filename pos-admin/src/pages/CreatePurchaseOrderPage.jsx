import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
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
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';
import { getStoredStoreId } from '../utils/authStorage';

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('vi-VN');
}

export default function CreatePurchaseOrderPage() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState([]);
  const [supplierId, setSupplierId] = useState(null);
  const [supplierInput, setSupplierInput] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [autoCode, setAutoCode] = useState('Mã phiếu tự động');

  const loadProducts = useCallback(async () => {
    try {
      const storeId = getStoredStoreId();
      const url = storeId ? `/api/products?storeId=${storeId}` : '/api/products';
      const res = await apiRequest(url);
      setProducts(Array.isArray(res?.products) ? res.products : []);
    } catch {
      setProducts([]);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await apiRequest('/api/suppliers');
      setSuppliers(Array.isArray(res?.suppliers) ? res.suppliers : []);
    } catch {
      setSuppliers([]);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, [loadProducts, loadSuppliers]);

  const productOptions = useMemo(() => {
    const term = (productSearch || '').trim().toLowerCase();
    if (!term) return products.slice(0, 50);
    return products.filter(
      (p) =>
        (p.productCode || '').toLowerCase().includes(term) ||
        (p.name || '').toLowerCase().includes(term)
    ).slice(0, 50);
  }, [products, productSearch]);

  const totalGoodsValue = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items]
  );
  const totalDiscount = useMemo(
    () => items.reduce((s, it) => s + (Number(it.discount) || 0), 0),
    [items]
  );
  const amountToPay = totalGoodsValue - totalDiscount;

  const addProduct = (product) => {
    if (!product) return;
    const existing = items.find((it) => it.productId === product._id);
    if (existing) {
      setItems((prev) =>
        prev.map((it) =>
          it.productId === product._id
            ? { ...it, quantity: (Number(it.quantity) || 0) + 1 }
            : it
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product._id,
          productCode: product.productCode || '',
          productName: product.name || '',
          unit: product.unit || '',
          quantity: 1,
          unitPrice: Number(product.costPrice) || Number(product.price) || 0,
          discount: 0,
        },
      ]);
    }
    setProductSearch('');
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (status) => {
    setSaveError('');
    setSaving(true);
    try {
      const supplier = supplierId ? suppliers.find((s) => s._id === supplierId) : null;
      const payload = {
        supplierId: supplierId || undefined,
        supplierCode: supplier?.code || '',
        supplierName: supplier?.name || '',
        orderCode: orderCode.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          productCode: it.productCode,
          productName: it.productName,
          unit: it.unit,
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
        })),
      };
      await apiRequest('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      navigate('/purchase-orders');
    } catch (err) {
      setSaveError(err?.data?.message || err?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s._id === supplierId) || null,
    [suppliers, supplierId]
  );

  return (
    <Layout maxWidth={false}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate('/purchase-orders')} aria-label="Quay lại">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Nhập hàng
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        {/* Left: product search + table + excel */}
        <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Tìm hàng hóa theo mã hoặc tên (F3)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
            <Autocomplete
              size="small"
              fullWidth
              inputValue={productSearch}
              onInputChange={(_, v) => setProductSearch(v)}
              options={productOptions}
              getOptionLabel={(opt) => `${opt.productCode || ''} - ${opt.name || ''}`.trim() || '(Không tên)'}
              onChange={(_, value) => addProduct(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={searchInputRef}
                  placeholder="Nhập mã hoặc tên hàng..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <IconButton size="small" sx={{ flexShrink: 0 }}>
              <GridViewOutlinedIcon />
            </IconButton>
            <IconButton size="small" sx={{ flexShrink: 0 }} onClick={() => productOptions[0] && addProduct(productOptions[0])}>
              <AddIcon />
            </IconButton>
          </Box>

          <TableContainer sx={{ flex: 1, minHeight: 200, mb: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 48 }}>STT</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mã hàng</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tên hàng</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ĐVT</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Số lượng</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Đơn giá</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Giảm giá</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row.productCode || '—'}</TableCell>
                    <TableCell>{row.productName || '—'}</TableCell>
                    <TableCell>{row.unit || '—'}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        inputProps={{ min: 0, step: 1, style: { textAlign: 'right', width: 64 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={row.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                        inputProps={{ min: 0, step: 1000, style: { textAlign: 'right', width: 90 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={row.discount}
                        onChange={(e) => updateItem(index, 'discount', e.target.value)}
                        inputProps={{ min: 0, step: 1000, style: { textAlign: 'right', width: 80 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeItem(index)}>
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Thêm sản phẩm từ file excel
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              (Tải về file mẫu: <Box component="span" sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}>Excel file</Box>)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FileUploadOutlinedIcon />}
              sx={{ textTransform: 'none' }}
              onClick={() => document.getElementById('create-po-excel-input')?.click()}
            >
              Chọn file dữ liệu
            </Button>
            <input
              id="create-po-excel-input"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={() => {}}
            />
          </Box>
        </Paper>

        {/* Right sidebar */}
        <Paper variant="outlined" sx={{ width: 320, flexShrink: 0, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Tìm nhà cung cấp
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Autocomplete
              size="small"
              fullWidth
              value={selectedSupplier}
              inputValue={supplierInput}
              onInputChange={(_, v) => setSupplierInput(v)}
              options={suppliers}
              getOptionLabel={(opt) => (opt ? `${opt.code || ''} - ${opt.name || ''}`.trim() : '')}
              onChange={(_, value) => setSupplierId(value?._id || null)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Tìm nhà cung cấp" />
              )}
            />
            <IconButton size="small" onClick={() => navigate('/suppliers')} title="Thêm nhà cung cấp">
              <AddIcon />
            </IconButton>
          </Box>

          <TextField size="small" fullWidth label="Mã phiếu nhập" value={autoCode} disabled />
          <TextField
            size="small"
            fullWidth
            label="Mã đặt hàng nhập"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            placeholder="Tùy chọn"
          />
          <TextField size="small" fullWidth label="Trạng thái" value="Phiếu tạm" disabled />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Tổng tiền hàng</Typography>
            <Typography variant="body2" fontWeight={600}>{formatMoney(totalGoodsValue)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Giảm giá</Typography>
            <Typography variant="body2" fontWeight={600}>{formatMoney(totalDiscount)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Cần trả nhà cung cấp</Typography>
            <Typography component="span" variant="body2" sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer' }}>
              {formatMoney(amountToPay)}
            </Typography>
          </Box>

          <TextField
            size="small"
            fullWidth
            label="Ghi chú"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            placeholder="Ghi chú phiếu nhập..."
          />

          {saveError && (
            <Typography variant="body2" color="error">{saveError}</Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            <Button
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              fullWidth
              sx={{ textTransform: 'none' }}
              onClick={() => handleSave('draft')}
              disabled={saving}
            >
              Lưu tạm
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleOutlinedIcon />}
              fullWidth
              sx={{ textTransform: 'none' }}
              onClick={() => handleSave('received')}
              disabled={saving}
            >
              Hoàn thành
            </Button>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
}
