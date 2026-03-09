import { Box, Typography, Container } from '@mui/material';

/**
 * Trang cài đặt
 */
export default function SettingsPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Cài đặt
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Trang cài đặt sẽ được phát triển sau...
        </Typography>
      </Box>
    </Container>
  );
}
