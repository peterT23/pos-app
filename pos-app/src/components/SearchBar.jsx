import { useState } from 'react';
import { 
  TextField, 
  Box, 
  InputAdornment,
  IconButton 
} from '@mui/material';
import { Search as SearchIcon, QrCodeScanner as QrCodeIcon } from '@mui/icons-material';

/**
 * Component SearchBar: Tìm kiếm sản phẩm hoặc quét barcode
 * 
 * Props:
 * - onSearch: function(searchTerm) - Callback khi người dùng tìm kiếm
 * - onScan: function() - Callback khi bấm nút quét barcode (sẽ làm sau)
 */
export default function SearchBar({ onSearch, onScan }) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (value) => {
    setSearchTerm(value);
    // Gọi callback để component cha xử lý
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleScan = () => {
    // Tính năng quét barcode sẽ làm sau (cần camera API)
    if (onScan) {
      onScan();
    }
    alert('Tính năng quét barcode sẽ được thêm sau!');
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
      <TextField
        fullWidth
        placeholder="Tìm kiếm sản phẩm hoặc quét barcode..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        size="large"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton 
                onClick={handleScan}
                color="primary"
                aria-label="Quét barcode"
              >
                <QrCodeIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '1.1rem',
            height: '56px', // Button lớn dễ chạm trên màn hình cảm ứng
          },
        }}
      />
    </Box>
  );
}
