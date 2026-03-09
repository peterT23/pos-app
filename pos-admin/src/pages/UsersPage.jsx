import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    storeIds: [],
  });

  const loadUsers = async () => {
    try {
      const response = await apiRequest('/api/users');
      setUsers(Array.isArray(response?.users) ? response.users : []);
    } catch (err) {
      setError(err.message || 'Không thể tải nhân viên');
    }
  };

  const loadStores = async () => {
    try {
      const response = await apiRequest('/api/stores');
      setStores(Array.isArray(response?.stores) ? response.stores : []);
    } catch (err) {
      setError(err.message || 'Không thể tải cửa hàng');
    }
  };

  useEffect(() => {
    loadUsers();
    loadStores();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      setError('');
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ name: '', email: '', password: '', role: 'cashier', storeIds: [] });
      loadUsers();
    } catch (err) {
      setError(err.message || 'Không thể tạo nhân viên');
    }
  };

  return (
    <Layout>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Tạo tài khoản mới
        </Typography>
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2 }}>
          <TextField
            label="Tên nhân viên"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth>
            <InputLabel>Vai trò</InputLabel>
            <Select
              value={form.role}
              label="Vai trò"
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <MenuItem value="cashier">Cashier</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Gán cửa hàng</InputLabel>
            <Select
              multiple
              value={form.storeIds}
              onChange={(e) => setForm((prev) => ({ ...prev, storeIds: e.target.value }))}
              input={<OutlinedInput label="Gán cửa hàng" />}
            >
              {stores.map((store) => (
                <MenuItem key={store.storeId} value={store.storeId}>
                  {store.name} ({store.storeId})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleCreate}>
            Tạo tài khoản
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Danh sách nhân viên
          </Typography>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Vai trò</TableCell>
              <TableCell>Cửa hàng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id || user._id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  {(user.storeIds || []).map((storeId) => (
                    <Chip key={storeId} label={storeId} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Chưa có nhân viên
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Layout>
  );
}
