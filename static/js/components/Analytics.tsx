import React from 'react';
import { Container, Paper, Typography } from '@mui/material';

const Analytics = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography component="h1" variant="h6" color="primary" gutterBottom>
          Study Analytics
        </Typography>
      </Paper>
    </Container>
  );
};

export default Analytics;
