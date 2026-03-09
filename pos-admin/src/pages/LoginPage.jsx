import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const POS_APP_URL = import.meta.env.VITE_POS_APP_URL || 'http://localhost:5173/pos';

  const redirectPath = useMemo(() => {
    if (location.state && location.state.from) {
      return location.state.from;
    }
    return '/dashboard';
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const loginWithTarget = async (clientApp) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': clientApp,
      },
      credentials: 'include',
      body: JSON.stringify({ identifier, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.message || 'Đăng nhập thất bại';
      throw new Error(message);
    }
    return data;
  };

  const handleSubmit = async (event, target = 'admin') => {
    event.preventDefault();
    if (!identifier || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (target === 'pos') {
        await loginWithTarget('pos-app');
        window.location.href = POS_APP_URL;
        return;
      }
      const data = await loginWithTarget('pos-admin');
      login(data.token, data.user, null);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ width: 380, p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Đăng nhập quản lý
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Chỉ dành cho chủ cửa hàng và quản trị
        </Typography>

        <Box component="form" onSubmit={(event) => handleSubmit(event, 'admin')} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email hoặc số điện thoại"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            fullWidth
          />
          <TextField
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
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
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          <Button
            type="button"
            variant="contained"
            size="large"
            disabled={loading}
            onClick={(event) => handleSubmit(event, 'admin')}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Vào quản lý'}
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="large"
            disabled={loading}
            onClick={(event) => handleSubmit(event, 'pos')}
          >
            Vào POS
          </Button>
          <Button variant="text" onClick={() => navigate('/register')}>
            Tạo tài khoản dùng thử
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
