import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', storeId: '' });
  const [error, setError] = useState('');

  const loadStores = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/stores');
      setStores(Array.isArray(response?.stores) ? response.stores : []);
    } catch (err) {
      setError(err.message || 'Không thể tải cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên cửa hàng');
      return;
    }
    try {
      setError('');
      await apiRequest('/api/stores', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setDialogOpen(false);
      setForm({ name: '', phone: '', address: '', storeId: '' });
      loadStores();
    } catch (err) {
      setError(err.message || 'Không thể tạo cửa hàng');
    }
  };

  return (
    <Layout>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Danh sách cửa hàng
          </Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Tạo cửa hàng
          </Button>
        </Box>

        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tên cửa hàng</TableCell>
              <TableCell>Mã</TableCell>
              <TableCell>Số điện thoại</TableCell>
              <TableCell>Địa chỉ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stores.map((store) => (
              <TableRow key={store.storeId}>
                <TableCell>{store.name}</TableCell>
                <TableCell>{store.storeId}</TableCell>
                <TableCell>{store.phone}</TableCell>
                <TableCell>{store.address}</TableCell>
              </TableRow>
            ))}
            {!loading && stores.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Chưa có cửa hàng
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Tạo cửa hàng</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Tên cửa hàng"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Số điện thoại"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Địa chỉ"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Mã cửa hàng (tuỳ chọn)"
              value={form.storeId}
              onChange={(e) => setForm((prev) => ({ ...prev, storeId: e.target.value }))}
              helperText="Ví dụ: trungtam, q1, q2..."
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate}>
            Tạo cửa hàng
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
