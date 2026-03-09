import { Box, Button, IconButton, Typography, Chip } from '@mui/material';
import {
  LocalMall as SellIcon,
  LocalShipping as DeliveryIcon,
  Chat as ChatIcon,
  HelpOutline as HelpIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

/**
 * Footer component ở dưới cùng với mode selection và các icon
 */
export default function BottomFooter({ 
  saleMode = 'quick',
  onSaleModeChange 
}) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'white',
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      {/* Mode selection buttons bên trái */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant={saleMode === 'quick' ? 'contained' : 'outlined'}
          size="small"
          startIcon={<SellIcon />}
          onClick={() => onSaleModeChange && onSaleModeChange('quick')}
          sx={{
            textTransform: 'none',
            minWidth: 120,
            fontWeight: 600,
          }}
        >
          Bán nhanh
        </Button>
        <Button
          variant={saleMode === 'normal' ? 'contained' : 'outlined'}
          size="small"
          startIcon={<SellIcon />}
          onClick={() => onSaleModeChange && onSaleModeChange('normal')}
          sx={{
            textTransform: 'none',
            minWidth: 120,
            fontWeight: 600,
          }}
        >
          Bán thường
        </Button>
        <Button
          variant={saleMode === 'delivery' ? 'contained' : 'outlined'}
          size="small"
          startIcon={<DeliveryIcon />}
          onClick={() => onSaleModeChange && onSaleModeChange('delivery')}
          sx={{
            textTransform: 'none',
            minWidth: 120,
            fontWeight: 600,
          }}
        >
          Bán giao hàng
        </Button>
      </Box>

      {/* Icons bên phải */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={<ChatIcon fontSize="small" />}
          label="1900 6522"
          size="small"
          sx={{ fontWeight: 600, bgcolor: '#e0f2f7', color: '#01579b' }}
        />
        <IconButton size="small" title="Trợ giúp">
          <HelpIcon />
        </IconButton>
        <IconButton size="small" title="Cài đặt">
          <SettingsIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
