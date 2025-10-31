import React, { useEffect, useState } from 'react';
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
    soilMoisture: '--'
  });
  
  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/oracle/weather?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const latest = data.data[data.data.length - 1];
          setWeatherData({
            rainfall: parseFloat(latest.value).toFixed(1),
            temperature: '--',
            soilMoisture: '--'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching weather data:', err);
    }
  };

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

  useEffect(() => {
    fetchStats();
    fetchWeatherData();
    const handlePolicyEvent = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      fetchStats();
    };
    window.addEventListener('policyCreated', handlePolicyEvent);
    window.addEventListener('policyFinalized', handlePolicyEvent);
    return () => {
      window.removeEventListener('policyCreated', handlePolicyEvent);
      window.removeEventListener('policyFinalized', handlePolicyEvent);
    };
  }, [account, isConnected]);

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
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Rainfall</Typography>
                  <Typography variant="h6">{weatherData.rainfall}mm</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Temperature</Typography>
                  <Typography variant="h6">{weatherData.temperature}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Soil Moisture</Typography>
                  <Typography variant="h6">{weatherData.soilMoisture}</Typography>
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