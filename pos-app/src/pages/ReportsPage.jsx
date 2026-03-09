import { Box, Typography, Container } from '@mui/material';

/**
 * Trang báo cáo
 */
export default function ReportsPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Báo cáo
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Trang báo cáo sẽ được phát triển sau...
        </Typography>
      </Box>
    </Container>
  );
}
