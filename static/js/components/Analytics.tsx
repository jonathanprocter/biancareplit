import React from 'react';
import { Container, Paper, Typography } from '@mui/material';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  
  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(res => res.json())
      .then(data => setAnalyticsData(data))
      .catch(err => console.error('Analytics error:', err));
  }, []);

  if (!analyticsData) return <div>Loading analytics...</div>;
  
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
