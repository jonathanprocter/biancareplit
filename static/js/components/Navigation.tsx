import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Navigation = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          NCLEX Coach
        </Typography>
        <Button color="inherit" component={RouterLink} to="/">
          Dashboard
        </Button>
        <Button color="inherit" component={RouterLink} to="/quiz">
          Quiz
        </Button>
        <Button color="inherit" component={RouterLink} to="/chat">
          AI Chat
        </Button>
        <Button color="inherit" component={RouterLink} to="/analytics">
          Analytics
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
