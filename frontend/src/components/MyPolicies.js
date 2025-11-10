import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { useApi } from '../hooks/useApi.js';
import { ethers } from 'ethers';
import { Container, Stack, Typography, Button, Grid, Card, CardContent, Chip, Box, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Alert } from '@mui/material';

const MyPolicies = () => {
  const { account, isConnected, provider } = useWeb3();
  const { data: policiesData, loading, refetch } = useApi(account ? `/api/policies/farmer/${account}` : null);
  const [processing, setProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAllPolicies, setShowAllPolicies] = useState(false);
  const [allPoliciesData, setAllPoliciesData] = useState(null);
  const [allPoliciesLoading, setAllPoliciesLoading] = useState(false);
  const [showCompositeIndex, setShowCompositeIndex] = useState(false);
  const [compositeIndexData, setCompositeIndexData] = useState(null);
  const [compositeIndexLoading, setCompositeIndexLoading] = useState(false);
  
  useEffect(() => {
    console.log('🔍 MyPolicies - Account:', account);
    console.log('🔍 MyPolicies - Policies data:', policiesData);
    if (policiesData) {
      const allPolicies = policiesData.data || policiesData.policies || [];
      const activePolicies = allPolicies.filter(p => p.status === 0 || p.statusString === 'Active');
      console.log('🔍 MyPolicies - Active policies:', activePolicies.length);
    }
  }, [account, policiesData]);
  
  useEffect(() => {
    if (!isConnected || !refetch) return undefined;

    const intervalId = setInterval(() => {
      refetch();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [isConnected, refetch]);

  useEffect(() => {
    const handlePolicyCreated = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (refetch) {
        await refetch();
        setRefreshKey(prev => prev + 1);
      }
    };
    window.addEventListener('policyCreated', handlePolicyCreated);
    return () => window.removeEventListener('policyCreated', handlePolicyCreated);
  }, []);
  
  const fetchAllPolicies = async () => {
    setAllPoliciesLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/policies/all?t=${Date.now()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAllPoliciesData(data.data);
      }
    } catch (err) {
      console.error('Error loading all policies:', err);
    } finally {
      setAllPoliciesLoading(false);
    }
  };
  
  const handleViewDetails = (policyId) => {
    alert(`Policy Details\n\nID: ${policyId}`);
  };
  
  const handleViewAllPolicies = () => {
    setShowAllPolicies(true);
    if (!allPoliciesData) fetchAllPolicies();
  };
  
  const handleViewCompositeIndex = async (policyId) => {
    setCompositeIndexLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/policies/${policyId}/composite-index?threshold=60`);
      const data = await res.json();
      if (data.success) {
        setCompositeIndexData(data);
        setShowCompositeIndex(true);
      } else {
        alert('Failed to load composite index: ' + data.error);
      }
    } catch (err) {
      console.error('Error loading composite index:', err);
      alert('Error loading composite index');
    } finally {
      setCompositeIndexLoading(false);
    }
  };
  
  const handleCheckPayout = async (policy) => {
    if (!provider || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    try {
      const network = await provider.getNetwork();
      if (network.chainId !== 1337n) {
        alert(`❌ Wrong Network!\nYou're connected to Chain ID: ${network.chainId}\nSwitch MetaMask to \"Localhost 8545\" (Chain ID: 1337)`);
        return;
      }
    } catch (err) {
      console.error('Network check error:', err);
    }
    if (policy.status === 1 || policy.statusString === 'PaidOut') {
      alert('✅ This policy has already been paid out!');
      return;
    }
    if (policy.status === 2 || policy.statusString === 'Expired') {
      alert('This policy expired with no payout conditions met.');
      return;
    }
    const currentTime = Math.floor(Date.now() / 1000);
    if (policy.startTs > currentTime) {
      const minutesUntilStart = Math.floor((policy.startTs - currentTime) / 60);
      alert(`⏳ Policy hasn't started yet!\nStarts in ${minutesUntilStart} minute(s).`);
      return;
    }
    const confirmFinalize = window.confirm(`Finalize Policy #${policy.policyId}?`);
    if (!confirmFinalize) return;
    setProcessing(true);
    try {
      const signer = await provider.getSigner();
      const contractsResponse = await fetch('http://localhost:3001/api/contracts/addresses');
      const contracts = await contractsResponse.json();
      const policyFactory = new ethers.Contract(contracts.PolicyFactory, [
        'function finalize(uint256 policyId)'
      ], signer);
      const tx = await policyFactory.finalize(policy.policyId);
      alert(`Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      alert(`✅ Policy finalized!\nTx: ${receipt.hash}`);
      window.dispatchEvent(new CustomEvent('policyFinalized', { detail: { policyId: policy.policyId } }));
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (refetch) {
        await refetch();
        setRefreshKey(prev => prev + 1);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error finalizing policy:', error);
      const reason = error?.reason || error?.message || 'Unknown error';
      alert(`Unable to finalize policy.\nReason: ${reason}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h5">📋 My Policies</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Please connect your wallet to view your policies.</Typography>
      </Container>
    );
  }

  const renderPolicyCard = (policy, key, extraBadge, showFinalizeButton = false) => {
    const isMyPolicy = policy.holder && account && policy.holder.toLowerCase() === account.toLowerCase();
    return (
      <Card key={key}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1">Policy #{policy.policyId}</Typography>
              {extraBadge}
              {isMyPolicy && !extraBadge && <Chip label="Your Policy" color="success" size="small" />}
            </Stack>
            <Chip label={policy.statusString || (policy.status === 0 ? 'Active' : policy.status === 1 ? 'PaidOut' : 'Expired')} color={(policy.statusString === 'Active' || policy.status === 0) ? 'success' : 'default'} size="small" />
          </Stack>
          <Grid container spacing={2}>
            {policy.holder && (
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Owner</Typography>
                <Typography variant="body2">{policy.holder.slice(0, 6)}...{policy.holder.slice(-4)}</Typography>
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Product</Typography>
              <Typography variant="body2">{policy.productName || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Premium</Typography>
              <Typography variant="body2">{policy.premiumPaid ? ethers.formatEther(policy.premiumPaid) : '0'} ETH</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Payout</Typography>
              <Typography variant="body2">{policy.payoutAmount ? ethers.formatEther(policy.payoutAmount) : '0'} ETH</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Threshold</Typography>
              <Typography variant="body2">{policy.threshold}mm</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Duration</Typography>
              <Typography variant="body2">{policy.startTs && policy.endTs ? Math.floor((policy.endTs - policy.startTs) / 86400) : 'N/A'} days</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body2">{policy.startTs ? new Date(policy.startTs * 1000).toLocaleDateString() : 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Expires</Typography>
              <Typography variant="body2">{policy.endTs ? new Date(policy.endTs * 1000).toLocaleDateString() : 'N/A'}</Typography>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button size="small" variant="outlined" onClick={() => handleViewDetails(policy.policyId)}>View Details</Button>
            <Button size="small" variant="outlined" color="primary" onClick={() => handleViewCompositeIndex(policy.policyId)} disabled={compositeIndexLoading}>
              📊 Composite Index
            </Button>
            {showFinalizeButton && isMyPolicy && (
              <Button size="small" variant="contained" onClick={() => handleCheckPayout(policy)} disabled={processing || policy.statusString === 'PaidOut' || policy.statusString === 'Expired'}>
                {processing ? 'Processing...' : (policy.statusString === 'Active' ? 'Finalize Policy' : 'Already Finalized')}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const myPolicies = (policiesData?.data || policiesData?.policies || []);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ m: 0 }}>📋 My Policies</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => { setRefreshKey(prev => prev + 1); refetch(); }}>Refresh</Button>
          <Button variant="contained" onClick={showAllPolicies ? () => setShowAllPolicies(false) : handleViewAllPolicies}>
            {showAllPolicies ? '← Back to My Policies' : '🌐 View All Policies'}
          </Button>
        </Stack>
      </Stack>

      {showAllPolicies ? (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>🌐 All Active Policies (All Accounts)</Typography>
          {allPoliciesLoading ? (
            <Typography variant="body2" color="text.secondary">Loading all policies...</Typography>
          ) : allPoliciesData && allPoliciesData.length > 0 ? (
            <Grid container spacing={2}>
              {allPoliciesData
                .filter(p => p.status === 0 || p.statusString === 'Active')
                .sort((a, b) => b.policyId - a.policyId)
                .map((policy, index) => {
                  const isMyPolicy = policy.holder && account && policy.holder.toLowerCase() === account.toLowerCase();
                  return (
                    <Grid item xs={12} key={`all-${policy.policyId}-${index}`}>
                      {renderPolicyCard(policy, `all-${policy.policyId}-${index}`, isMyPolicy ? <Chip label="Your Policy" color="success" size="small"/> : null, false)}
                    </Grid>
                  );
                })}
            </Grid>
          ) : (
            <Stack spacing={1}>
              <Typography variant="body2">No active policies found in the system.</Typography>
              <Button size="small" variant="outlined" onClick={fetchAllPolicies}>Refresh</Button>
            </Stack>
          )}
        </Box>
      ) : loading ? (
        <Typography variant="body2" color="text.secondary">Loading policies...</Typography>
      ) : myPolicies && myPolicies.length > 0 ? (
        <Grid container spacing={2}>
          {myPolicies
            .filter(p => p.status === 0 || p.statusString === 'Active')
            .sort((a, b) => b.policyId - a.policyId)
            .map((policy, index) => (
              <Grid item xs={12} key={`${policy.policyId}-${refreshKey}`}>
                {renderPolicyCard(policy, `${policy.policyId}-${refreshKey}`, null, true)}
              </Grid>
          ))}
        </Grid>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2">No policies found. Create your first policy to get started!</Typography>
          <Button size="small" variant="outlined" onClick={refetch}>Refresh</Button>
        </Stack>
      )}

      {/* Composite Index Dialog */}
      <Dialog open={showCompositeIndex} onClose={() => setShowCompositeIndex(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          📊 Composite Insurance Index - Policy #{compositeIndexData?.policyId}
        </DialogTitle>
        <DialogContent>
          {compositeIndexLoading ? (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>Calculating composite index...</Typography>
            </Box>
          ) : compositeIndexData ? (
            <Box>
              {/* Payout Decision */}
              <Alert 
                severity={compositeIndexData.payoutDecision.shouldPayout ? 'warning' : 'success'} 
                sx={{ mb: 3 }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {compositeIndexData.payoutDecision.shouldPayout ? '⚠️ PAYOUT TRIGGERED' : '✅ No Payout'}
                </Typography>
                <Typography variant="body2">
                  Composite Index: <strong>{compositeIndexData.compositeIndex.compositeIndex}</strong> / Threshold: {compositeIndexData.policyThreshold}
                  {compositeIndexData.payoutDecision.shouldPayout && (
                    <span> (Deficit: {compositeIndexData.payoutDecision.deficit} - {compositeIndexData.payoutDecision.severity} severity)</span>
                  )}
                </Typography>
              </Alert>

              {/* Overall Index Gauge */}
              <Card variant="outlined" sx={{ mb: 3, p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" gutterBottom>Overall Composite Index</Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={compositeIndexData.compositeIndex.compositeIndex} 
                    sx={{ height: 30, borderRadius: 1, width: '100%' }}
                    color={compositeIndexData.compositeIndex.compositeIndex < 60 ? 'error' : compositeIndexData.compositeIndex.compositeIndex < 80 ? 'warning' : 'success'}
                  />
                  <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                      {compositeIndexData.compositeIndex.compositeIndex}
                    </Typography>
                  </Box>
                </Box>
              </Card>

              {/* Individual Parameters */}
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 2 }}>Parameter Breakdown</Typography>
              <Grid container spacing={2}>
                {Object.entries(compositeIndexData.compositeIndex.breakdown).map(([key, data]) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                        {key === 'rainfall' ? '🌧️ Rainfall' : key === 'temperature' ? '🌡️ Temperature' : key === 'soil' ? '🌱 Soil Moisture' : '💨 Wind Speed'}
                      </Typography>
                      <Typography variant="h6">{data.value} {key === 'rainfall' ? 'mm' : key === 'temperature' ? '°C' : key === 'soil' ? '%' : 'm/s'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Score: {data.score} • Weight: {(data.weight * 100).toFixed(0)}% • Contribution: {data.contribution}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={data.score} 
                        sx={{ mt: 1, height: 8, borderRadius: 1 }}
                        color={data.score < 50 ? 'error' : data.score < 80 ? 'warning' : 'success'}
                      />
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Current Weather */}
              <Card variant="outlined" sx={{ mt: 3, p: 2, bgcolor: 'info.light' }}>
                <Typography variant="subtitle2" gutterBottom>Current Weather Conditions</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption">Rainfall</Typography>
                    <Typography variant="body2" fontWeight="bold">{compositeIndexData.currentWeather.rainfall}mm</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption">Temperature</Typography>
                    <Typography variant="body2" fontWeight="bold">{compositeIndexData.currentWeather.temperature}°C</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption">Soil Moisture</Typography>
                    <Typography variant="body2" fontWeight="bold">{compositeIndexData.currentWeather.soil_moisture}%</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption">Source</Typography>
                    <Typography variant="body2" fontWeight="bold">{compositeIndexData.currentWeather.source}</Typography>
                  </Grid>
                </Grid>
              </Card>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompositeIndex(false)}>Close</Button>
          {compositeIndexData && (
            <Button onClick={() => handleViewCompositeIndex(compositeIndexData.policyId)} variant="outlined">
              🔄 Refresh
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyPolicies;