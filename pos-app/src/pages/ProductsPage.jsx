import { Box, Typography, Container } from '@mui/material';

/**
 * Trang quản lý sản phẩm
 */
export default function ProductsPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quản lý sản phẩm
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Trang quản lý sản phẩm sẽ được phát triển sau...
        </Typography>
      </Box>
    </Container>
  );
}
