import React, { useEffect, useState, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { useApi } from '../hooks/useApi.js';
import { Container, Grid, Card, CardContent, Typography, Button, Stack, Box } from '@mui/material';

const BUILD_ID = process.env.REACT_APP_BUILD_ID || 'dev';

const Dashboard = () => {
  const { account, connectWallet, isConnected } = useWeb3();
  const [stats, setStats] = useState({
    activePolicies: 0,
    totalPremium: 0,
    totalPayouts: 0,
    revenue: 0,
    policies: []
  });
  const [showFinalized, setShowFinalized] = useState(false);
  const [weatherData, setWeatherData] = useState({
    rainfall: '--',
    temperature: '--',
    humidity: '--',
    windSpeed: '--'
  });
  const [treasuryLedger, setTreasuryLedger] = useState({
    balanceFormatted: '0',
    balanceWei: '0',
    entries: []
  });
  const [treasuryLoading, setTreasuryLoading] = useState(true);
  const [treasuryError, setTreasuryError] = useState(null);
  const [showTreasury, setShowTreasury] = useState(false);
  
  const fetchWeatherData = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/oracle/weather/live?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          const latest = data.data;
          setWeatherData({
            rainfall: latest.rainfallFormatted || (latest.rainfall !== undefined && latest.rainfall !== null ? Number(latest.rainfall).toFixed(2) : '--'),
            temperature: latest.temperature !== null && latest.temperature !== undefined ? Number(latest.temperature).toFixed(1) : '--',
            humidity: latest.humidity !== null && latest.humidity !== undefined ? Number(latest.humidity).toFixed(1) : '--',
            windSpeed: latest.windSpeed !== null && latest.windSpeed !== undefined ? Number(latest.windSpeed).toFixed(1) : '--'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching weather data:', err);
    }
  }, []);

  const fetchStats = async () => {
    if (!account || !isConnected) return;
    try {
      const res = await fetch(`http://localhost:3001/api/policies/farmer/${account}`);
      const data = await res.json();
      if (data.success && data.data) {
        const policies = data.data;
        const active = policies.filter(p => p.status === 0 || p.statusString === 'Active').length;
        const totalPremium = policies.reduce((sum, p) => {
          const premium = p.premiumPaid ? parseFloat(p.premiumPaid) / 1e18 : 0;
          return sum + premium;
        }, 0);
        const totalPayouts = policies.filter(p => p.status === 1 || p.statusString === 'PaidOut').length;
        const totalPayoutAmount = policies
          .filter(p => p.status === 1 || p.statusString === 'PaidOut')
          .reduce((sum, p) => {
            const payout = p.payoutAmount ? parseFloat(p.payoutAmount) / 1e18 : 0;
            return sum + payout;
          }, 0);
        const revenue = totalPremium - totalPayoutAmount;
        setStats({
          activePolicies: active,
          totalPremium: totalPremium,
          totalPayouts: totalPayouts,
          revenue: revenue,
          policies: policies
        });
      }
    } catch (err) {
      console.error('Error loading policies:', err);
    }
  };

  const fetchTreasuryLedger = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/treasury/ledger?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setTreasuryLedger({
          balanceFormatted: data.balanceFormatted,
          balanceWei: data.balanceWei,
          entries: Array.isArray(data.entries) ? data.entries : []
        });
        setTreasuryError(null);
      } else {
        setTreasuryError(data.error || 'Failed to load treasury ledger');
      }
    } catch (error) {
      console.error('Error fetching treasury ledger:', error);
      setTreasuryError(error.message || 'Failed to load treasury ledger');
    } finally {
      setTreasuryLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 10000);
    fetchTreasuryLedger();
    const handlePolicyEvent = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      fetchStats();
      fetchTreasuryLedger();
    };
    window.addEventListener('policyCreated', handlePolicyEvent);
    window.addEventListener('policyFinalized', handlePolicyEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('policyCreated', handlePolicyEvent);
      window.removeEventListener('policyFinalized', handlePolicyEvent);
    };
  }, [account, isConnected, fetchWeatherData]);

  const formatLedgerDate = (iso) => {
    if (!iso) return '--';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2">
          📊 Dashboard <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>Build: {BUILD_ID}</Typography>
        </Typography>
        {!isConnected ? (
          <Button variant="contained" onClick={connectWallet}>Connect MetaMask</Button>
        ) : (
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">Connected: {account?.slice(0, 6)}...{account?.slice(-4)}</Typography>
            <Button variant="outlined" onClick={fetchStats}>🔄 Refresh</Button>
          </Stack>
        )}
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Active Policies</Typography>
              <Typography variant="h5">{stats.activePolicies}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Premium</Typography>
              <Typography variant="h5">{stats.totalPremium.toFixed(4)} ETH</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Payouts Made</Typography>
              <Typography variant="h5">{stats.totalPayouts}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Revenue</Typography>
              <Typography variant="h5" sx={{ color: stats.revenue >= 0 ? 'success.main' : 'error.main' }}>{stats.revenue.toFixed(4)} ETH</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Box>
              <Typography variant="subtitle1">💰 Treasury Balance</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>{treasuryLedger.balanceFormatted} ETH</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" onClick={() => setShowTreasury(prev => !prev)}>
                {showTreasury ? 'Hide' : 'Show'} Ledger
              </Button>
              <Button variant="outlined" size="small" onClick={() => { setTreasuryLoading(true); fetchTreasuryLedger(); }}>
                Refresh
              </Button>
            </Stack>
          </Stack>
          {showTreasury && (
            <Box sx={{ mt: 2 }}>
              {treasuryLoading ? (
                <Typography variant="body2" color="text.secondary">Loading treasury activity...</Typography>
              ) : treasuryError ? (
                <Typography variant="body2" color="error">Error: {treasuryError}</Typography>
              ) : treasuryLedger.entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No treasury activity recorded yet.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {treasuryLedger.entries.slice(0, 6).map((entry, idx) => {
                    const isCredit = entry.direction === 'credit';
                    const sign = isCredit ? '+' : '-';
                    const label = entry.type === 'premium'
                      ? 'Policy Premium'
                      : entry.type === 'payout'
                        ? 'Policy Payout'
                        : 'Treasury Funded';
                    return (
                      <Box key={entry.txHash || idx} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 0.5 }}>
                        <Stack spacing={0}>
                          <Typography variant="body2" fontWeight={600}>{label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatLedgerDate(entry.timestampIso)} • Tx: {entry.txHash ? `${entry.txHash.slice(0, 10)}…` : '--'}
                          </Typography>
                          {entry.policyId && (
                            <Typography variant="caption" color="text.secondary">
                              Policy #{entry.policyId} • Holder {entry.holder ? `${entry.holder.slice(0, 6)}…${entry.holder.slice(-4)}` : '--'}
                            </Typography>
                          )}
                          {entry.type === 'funded' && entry.funder && (
                            <Typography variant="caption" color="text.secondary">
                              Funded by {entry.funder.slice(0, 6)}…{entry.funder.slice(-4)}
                            </Typography>
                          )}
                          {entry.type === 'payout' && entry.to && (
                            <Typography variant="caption" color="text.secondary">
                              Paid to {entry.to.slice(0, 6)}…{entry.to.slice(-4)}
                            </Typography>
                          )}
                        </Stack>
                        <Typography variant="h6" sx={{ color: isCredit ? 'success.main' : 'error.main' }}>
                          {sign}{entry.amountFormatted} ETH
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Recent Activity (Active Policies)</Typography>
              <Stack spacing={1}>
                {stats.policies.length > 0 ? (
                  (() => {
                    const activePolicies = stats.policies
                      .filter(p => p.status === 0 || p.statusString === 'Active')
                      .sort((a, b) => b.policyId - a.policyId)
                      .slice(0, 5);
                    if (activePolicies.length === 0) {
                      return (
                        <Typography variant="body2" color="text.secondary">No active policies. Create your first policy to get started!</Typography>
                      );
                    }
                    return activePolicies.map((policy, idx) => (
                      <Box key={policy.policyId || idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{policy.statusString || 'Active'}</Typography>
                        <Typography variant="body2">Policy #{policy.policyId} - {policy.productName || 'Insurance'}</Typography>
                      </Box>
                    ));
                  })()
                ) : (
                  <Typography variant="body2" color="text.secondary">No policies yet. Create your first policy to get started!</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Current Weather</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Rainfall</Typography>
                  <Typography variant="h6">{weatherData.rainfall} mm</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Temperature</Typography>
                  <Typography variant="h6">{weatherData.temperature} °C</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Humidity</Typography>
                  <Typography variant="h6">{weatherData.humidity} %</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Wind Speed</Typography>
                  <Typography variant="h6">{weatherData.windSpeed} m/s</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1">✅ Paid Out & Expired Policies</Typography>
              <Button size="small" onClick={() => setShowFinalized(!showFinalized)}>
                {showFinalized ? 'Hide' : 'Show'} ({stats.policies.filter(p => p.status !== 0 && p.statusString !== 'Active').length})
              </Button>
            </Stack>
            {showFinalized && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {stats.policies.filter(p => p.status !== 0 && p.statusString !== 'Active').length > 0 ? (
                  stats.policies
                    .filter(p => p.status !== 0 && p.statusString !== 'Active')
                    .sort((a, b) => b.policyId - a.policyId)
                    .map((policy, idx) => (
                      <Box key={policy.policyId || idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Policy #{policy.policyId}</Typography>
                        <Typography variant="body2" color={policy.statusString === 'PaidOut' ? 'success.main' : 'text.secondary'}>
                          {policy.statusString}
                        </Typography>
                      </Box>
                    ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No finalized policies yet.</Typography>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Dashboard;