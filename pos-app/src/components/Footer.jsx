import { Box, TextField, InputAdornment } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

/**
 * Footer component với ghi chú đơn hàng
 */
export default function Footer({ note = '', onNoteChange }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 1.5,
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Ghi chú đơn hàng"
        value={note}
        onChange={(e) => onNoteChange && onNoteChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EditIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: '#f5f5f5',
          },
        }}
      />
    </Box>
  );
}
