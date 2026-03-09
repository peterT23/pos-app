import { Box, Typography, Container } from '@mui/material';

/**
 * Trang quản lý khách hàng
 */
export default function CustomersPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quản lý khách hàng
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Trang quản lý khách hàng sẽ được phát triển sau...
        </Typography>
      </Box>
    </Container>
  );
}
