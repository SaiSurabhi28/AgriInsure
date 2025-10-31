import React, { useState, useEffect } from 'react';
import { Container, Stack, Typography, Button, Alert, Grid, Card, CardContent, Box } from '@mui/material';

const WeatherFeed = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [lastSevenRounds, setLastSevenRounds] = useState([]);
  const [historyRounds, setHistoryRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('unknown');
  const [error, setError] = useState(null);

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/oracle/weather?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
        const rounds = Array.isArray(data?.data) ? data.data : [];
        setDataSource(data.source || 'oracle');
        setHistoryRounds(prev => {
          const byId = new Map(prev.map(r => [r.roundId, r]));
          rounds.forEach(r => {
            if (r && r.roundId !== undefined) {
              byId.set(r.roundId, r);
            }
          });
          const merged = Array.from(byId.values()).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
          const capped = merged.slice(Math.max(0, merged.length - 100));
          const last7 = capped.slice(Math.max(0, capped.length - 7));
          setLastSevenRounds(last7);
          return capped;
        });
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Backend not available');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch weather data';
      if (msg.includes('429') || msg.includes('Too many requests')) {
        setError('Backend rate limit reached. Please wait a moment or restart the backend server.');
      } else {
        setError(msg);
      }
      setWeatherData(null);
      setDataSource('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h6">🌤️ Live Weather Feed</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading weather data...</Typography>
      </Container>
    );
  }

  const latestRound = historyRounds.length > 0 ? historyRounds[historyRounds.length - 1] : null;
  const recentTen = historyRounds.slice(Math.max(0, historyRounds.length - 10));

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ m: 0 }}>🌤️ Live Weather Feed</Typography>
        <Button variant="contained" size="small" onClick={() => { setLoading(true); fetchWeatherData(); }} disabled={loading}>
          {loading ? '⏳ Refreshing...' : '🔄 Refresh Data'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          ⚠️ Error loading weather data: {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>📊 Latest Oracle Data</Typography>
              {latestRound ? (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Latest Round</Typography>
                    <Typography variant="h6">#{latestRound.roundId}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Rainfall</Typography>
                    <Typography variant="h6">{parseFloat(latestRound.value).toFixed(1)}mm</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Last Update</Typography>
                    <Typography variant="h6">{new Date(latestRound.timestamp * 1000).toLocaleTimeString()}</Typography>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">No weather data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>🔮 Oracle Rounds</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total Rounds</Typography>
                  <Typography variant="h6">{historyRounds.length}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Data Points</Typography>
                  <Typography variant="h6">{historyRounds.length}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>📡 Recent Oracle Rounds</Typography>
          <Grid container spacing={2}>
            {recentTen.map((round) => (
              <Grid item xs={12} sm={6} md={4} key={round.roundId}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2">Round #{round.roundId}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(round.timestamp * 1000).toLocaleString()}</Typography>
                  </Stack>
                  <Typography variant="body2">Value: {parseFloat(round.value).toFixed(1)}mm</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>📈 Weather Trends (Last 7 Rounds)</Typography>
          {lastSevenRounds.length > 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 180 }}>
              {(() => {
                const values = lastSevenRounds.map(r => parseFloat(r.value));
                const maxValue = Math.max(1, ...values);
                return lastSevenRounds.map((r) => {
                  const val = parseFloat(r.value) || 0;
                  const percentage = (val / maxValue) * 100;
                  return (
                    <Box key={r.roundId} sx={{ flex: 1, px: 0.5 }}>
                      <Box
                        sx={{
                          height: `${percentage}%`,
                          bgcolor: 'primary.main',
                          borderRadius: 0.5,
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          color: 'primary.contrastText',
                          pb: 0.5
                        }}
                        title={`Round ${r.roundId}: ${val.toFixed(1)}mm`}
                      >
                        <Typography variant="caption">{val.toFixed(0)}mm</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>R{r.roundId}</Typography>
                    </Box>
                  );
                });
              })()}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No data available for chart</Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default WeatherFeed;