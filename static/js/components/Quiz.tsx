import { Container, Paper, Typography } from '@mui/material';

import React from 'react';

const Quiz = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography component="h1" variant="h6" color="primary" gutterBottom>
          NCLEX Practice Quiz
        </Typography>
      </Paper>
    </Container>
  );
};

export default Quiz;
