import React from 'react';
import { Box, Container } from '@mui/material';
import AdminHeader from './AdminHeader';

export default function Layout({ children, maxWidth = 'lg' }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fb' }}>
      <AdminHeader />
      <Container maxWidth={maxWidth} sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
