import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Stack, Typography, Button, Alert, Grid, Card, CardContent, Box } from '@mui/material';

const WeatherFeed = () => {
  const [latestSample, setLatestSample] = useState(null);
  const [historyRounds, setHistoryRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('unknown');
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchWeatherData = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/oracle/weather/live?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (data?.data) {
          const transform = (entry) => ({
            roundId: entry.roundId ?? entry.timestamp ?? Math.floor(Date.now() / 1000),
            timestamp: entry.timestamp ?? Math.floor(Date.now() / 1000),
            rainfall: entry.rainfall !== undefined && entry.rainfall !== null
              ? Number(entry.rainfall)
              : entry.rainfallFormatted
                ? Number(entry.rainfallFormatted)
                : 0,
            temperature: entry.temperature ?? null,
            humidity: entry.humidity ?? null,
            windSpeed: entry.windSpeed ?? null,
            source: entry.source || data.source || 'dataset'
          });

          const historyList = Array.isArray(data.history) && data.history.length > 0
            ? data.history.map(transform)
            : [transform(data.data)];

          const latestRound = historyList[historyList.length - 1];
          setLatestSample(latestRound);
          setDataSource(latestRound.source);
          setHistoryRounds(historyList);
          setError(null);
        }
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
      setLatestSample(null);
      setDataSource('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchWeatherData();
    const interval = setInterval(() => {
      if (isMounted.current) {
        fetchWeatherData();
      }
    }, 10000); // Refresh every 10 seconds
    
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchWeatherData]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h6">🌤️ Live Weather Feed</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading weather data...</Typography>
      </Container>
    );
  }

  const latestRound = latestSample;
  const recentTen = historyRounds.slice(-10);

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
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Latest Round</Typography>
                    <Typography variant="h6">#{latestRound.roundId}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Rainfall</Typography>
                  <Typography variant="h6">
                    {typeof latestRound.rainfall === 'number' ? `${latestRound.rainfall.toFixed(2)} mm` : '--'}
                  </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Last Update</Typography>
                    <Typography variant="h6">{new Date(latestRound.timestamp * 1000).toLocaleTimeString()}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Temp / Humidity</Typography>
                    <Typography variant="h6">
                      {latestRound.temperature !== null && latestRound.temperature !== undefined ? `${latestRound.temperature.toFixed(1)} °C` : '--'} /
                      {' '}
                      {latestRound.humidity !== null && latestRound.humidity !== undefined ? `${latestRound.humidity.toFixed(1)} %` : '--'}
                    </Typography>
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
          <Typography variant="subtitle1" sx={{ mb: 2 }}>📡 Recent Weather Samples</Typography>
          <Grid container spacing={2}>
            {recentTen.map((round) => (
              <Grid item xs={12} sm={6} md={4} key={round.roundId}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2">Round #{round.roundId}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(round.timestamp * 1000).toLocaleString()}</Typography>
                  </Stack>
                  <Typography variant="body2">
                    Rainfall: {typeof round.rainfall === 'number' ? `${round.rainfall.toFixed(2)} mm` : '--'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Temp: {round.temperature !== null && round.temperature !== undefined ? `${round.temperature.toFixed(1)} °C` : '--'} •
                    Humidity: {round.humidity !== null && round.humidity !== undefined ? `${round.humidity.toFixed(1)} %` : '--'}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

    </Container>
  );
};

export default WeatherFeed;