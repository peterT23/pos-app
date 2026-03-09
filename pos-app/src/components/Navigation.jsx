import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Typography,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  PointOfSale as PosIcon,
  Inventory as ProductsIcon,
  People as CustomersIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const menuItems = [
  { path: '/pos', label: 'Bán hàng', icon: <PosIcon /> },
  { path: '/products', label: 'Sản phẩm', icon: <ProductsIcon /> },
  { path: '/customers', label: 'Khách hàng', icon: <CustomersIcon /> },
  { path: '/reports', label: 'Báo cáo', icon: <ReportsIcon /> },
  { path: '/settings', label: 'Cài đặt', icon: <SettingsIcon /> },
];

/**
 * Component Navigation: Sidebar navigation cho ứng dụng
 */
export default function Navigation() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      {/* Button mở menu - Bên phải */}
      <IconButton
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1300, bgcolor: 'white', boxShadow: 2 }}
      >
        <MenuIcon />
      </IconButton>

      {/* Drawer sidebar - Bên phải */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            POS System
          </Typography>
          <Divider />
        </Box>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
}
