import React, { useState } from 'react';
import { AppBar, Box, Button, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import ColorLensOutlinedIcon from '@mui/icons-material/ColorLensOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../utils/apiClient';

export default function AdminHeader() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [anchorEls, setAnchorEls] = useState({});
  const POS_APP_URL = import.meta.env.VITE_POS_APP_URL || 'http://localhost:5173/pos';

  const openMenu = (key, event) => {
    setAnchorEls((prev) => ({ ...prev, [key]: event.currentTarget }));
  };

  const closeMenu = (key) => {
    setAnchorEls((prev) => ({ ...prev, [key]: null }));
  };

  return (
    <Box sx={{ bgcolor: '#fff' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          px: 2,
          py: 0.5,
          bgcolor: '#f5f7fb',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <IconButton size="small" onClick={(e) => openMenu('theme', e)}>
          <ColorLensOutlinedIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEls.theme}
          open={Boolean(anchorEls.theme)}
          onClose={() => closeMenu('theme')}
        >
          <MenuItem onClick={() => closeMenu('theme')}>Mặc định</MenuItem>
          <MenuItem onClick={() => closeMenu('theme')}>Tối</MenuItem>
          <MenuItem onClick={() => closeMenu('theme')}>Sáng</MenuItem>
        </Menu>

        <IconButton size="small" onClick={(e) => openMenu('language', e)}>
          <LanguageOutlinedIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEls.language}
          open={Boolean(anchorEls.language)}
          onClose={() => closeMenu('language')}
        >
          <MenuItem onClick={() => closeMenu('language')}>Tiếng Việt</MenuItem>
          <MenuItem onClick={() => closeMenu('language')}>English</MenuItem>
        </Menu>

        <IconButton size="small" onClick={(e) => openMenu('settings', e)}>
          <SettingsOutlinedIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEls.settings}
          open={Boolean(anchorEls.settings)}
          onClose={() => closeMenu('settings')}
        >
          <MenuItem onClick={() => closeMenu('settings')}>Cài đặt chung</MenuItem>
          <MenuItem onClick={() => closeMenu('settings')}>Thông báo</MenuItem>
        </Menu>

        <IconButton size="small" onClick={(e) => openMenu('account', e)}>
          <AccountCircleOutlinedIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEls.account}
          open={Boolean(anchorEls.account)}
          onClose={() => closeMenu('account')}
        >
          <MenuItem onClick={() => closeMenu('account')}>Tài khoản</MenuItem>
          <MenuItem onClick={() => closeMenu('account')}>Đổi mật khẩu</MenuItem>
        </Menu>
      </Box>

      <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar sx={{ gap: 1 }}>
        {/* <Typography variant="h6" sx={{ fontWeight: 700, mr: 2 }}>
          Quản lý
        </Typography> */}

        <Button color="inherit" onClick={() => navigate('/dashboard')}>Tổng quan</Button>
        <Button color="inherit" onClick={(e) => openMenu('products', e)}>Hàng hóa</Button>
        <Menu
          anchorEl={anchorEls.products}
          open={Boolean(anchorEls.products)}
          onClose={() => closeMenu('products')}
          PaperProps={{ sx: { p: 2, borderRadius: 2 } }}
          MenuListProps={{ sx: { p: 0 } }}
        >
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Hàng hóa
              </Typography>
              <MenuItem
                onClick={() => {
                  closeMenu('products');
                  navigate('/products');
                }}
              >
                Danh sách hàng hóa
              </MenuItem>
              <MenuItem onClick={() => closeMenu('products')}>Thiết lập giá</MenuItem>
            </Box>
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Kho hàng
              </Typography>
              <MenuItem onClick={() => closeMenu('products')}>Kiểm kho</MenuItem>
              <MenuItem onClick={() => closeMenu('products')}>Xuất hủy</MenuItem>
            </Box>
            <Box sx={{ minWidth: 220 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Nhập hàng
              </Typography>
              <MenuItem onClick={() => closeMenu('products')}>Hóa đơn đầu vào</MenuItem>
              <MenuItem
                onClick={() => {
                  closeMenu('products');
                  navigate('/suppliers');
                }}
              >
                Nhà cung cấp
              </MenuItem>
              <MenuItem
                onClick={() => {
                  closeMenu('products');
                  navigate('/purchase-orders');
                }}
              >
                Nhập hàng
              </MenuItem>
              <MenuItem onClick={() => closeMenu('products')}>Trả hàng nhập</MenuItem>
            </Box>
          </Box>
        </Menu>

        <Button color="inherit" onClick={(e) => openMenu('orders', e)}>Đơn hàng</Button>
        <Menu
          anchorEl={anchorEls.orders}
          open={Boolean(anchorEls.orders)}
          onClose={() => closeMenu('orders')}
          PaperProps={{ sx: { p: 2, borderRadius: 2 } }}
          MenuListProps={{ sx: { p: 0 } }}
        >
          <MenuItem onClick={() => closeMenu('orders')}>Đặt hàng</MenuItem>
          <MenuItem
            onClick={() => {
              closeMenu('orders');
              navigate('/invoices');
            }}
          >
            Hóa đơn
          </MenuItem>
          <MenuItem onClick={() => closeMenu('orders')}>Trả hàng</MenuItem>
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 1 }} />
          <MenuItem onClick={() => closeMenu('orders')}>Đối tác giao hàng</MenuItem>
          <MenuItem onClick={() => closeMenu('orders')}>Vận đơn</MenuItem>
        </Menu>

        <Button color="inherit" onClick={(e) => openMenu('customers', e)}>Khách hàng</Button>
        <Menu
          anchorEl={anchorEls.customers}
          open={Boolean(anchorEls.customers)}
          onClose={() => closeMenu('customers')}
          PaperProps={{ sx: { p: 2, borderRadius: 2 } }}
          MenuListProps={{ sx: { p: 0 } }}
        >
          <MenuItem onClick={() => closeMenu('customers')}>Danh sách khách hàng</MenuItem>
          <MenuItem onClick={() => closeMenu('customers')}>Nhóm khách hàng</MenuItem>
        </Menu>
        <Button color="inherit" onClick={(e) => openMenu('staff', e)}>Nhân viên</Button>
        <Menu
          anchorEl={anchorEls.staff}
          open={Boolean(anchorEls.staff)}
          onClose={() => closeMenu('staff')}
          PaperProps={{ sx: { p: 2, borderRadius: 2 } }}
          MenuListProps={{ sx: { p: 0 } }}
        >
          <MenuItem onClick={() => closeMenu('staff')}>Danh sách nhân viên</MenuItem>
          <MenuItem onClick={() => closeMenu('staff')}>Lịch làm việc</MenuItem>
          <MenuItem onClick={() => closeMenu('staff')}>Bảng chấm công</MenuItem>
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 1 }} />
          <MenuItem onClick={() => closeMenu('staff')}>Bảng lương</MenuItem>
          <MenuItem onClick={() => closeMenu('staff')}>Bảng hoa hồng</MenuItem>
          <MenuItem onClick={() => closeMenu('staff')}>Thiết lập nhân viên</MenuItem>
        </Menu>

        <Button color="inherit" onClick={(e) => openMenu('analysis', e)}>Phân tích</Button>
        <Menu
          anchorEl={anchorEls.analysis}
          open={Boolean(anchorEls.analysis)}
          onClose={() => closeMenu('analysis')}
          PaperProps={{ sx: { p: 2, borderRadius: 2 } }}
          MenuListProps={{ sx: { p: 0 } }}
        >
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Phân tích
              </Typography>
              <MenuItem onClick={() => closeMenu('analysis')}>Kinh doanh</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Hàng hóa</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Khách hàng</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Hiệu quả</MenuItem>
            </Box>
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Báo cáo
              </Typography>
              <MenuItem onClick={() => closeMenu('analysis')}>Cuối ngày</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Bán hàng</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Đặt hàng</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Hàng hóa</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Khách hàng</MenuItem>
            </Box>
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Khác
              </Typography>
              <MenuItem onClick={() => closeMenu('analysis')}>Nhà cung cấp</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Nhân viên</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Kênh bán hàng</MenuItem>
              <MenuItem onClick={() => closeMenu('analysis')}>Tài chính</MenuItem>
            </Box>
          </Box>
        </Menu>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="inherit"
            onClick={async () => {
              try {
                await apiRequest('/api/auth/switch', {
                  method: 'POST',
                  body: JSON.stringify({ targetApp: 'pos-app' }),
                });
              } catch {
                // ignore, open POS anyway
              }
              window.open(POS_APP_URL, '_blank', 'noopener');
            }}
          >
            Bán hàng
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Đăng xuất
          </Button>
        </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
