import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { useApi } from '../hooks/useApi.js';
import { ethers } from 'ethers';
import { Container, Stack, Typography, Button, Grid, Card, CardContent, Chip, Box } from '@mui/material';

const MyPolicies = () => {
  const { account, isConnected, provider } = useWeb3();
  const { data: policiesData, loading, refetch } = useApi(account ? `/api/policies/farmer/${account}` : null);
  const [processing, setProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAllPolicies, setShowAllPolicies] = useState(false);
  const [allPoliciesData, setAllPoliciesData] = useState(null);
  const [allPoliciesLoading, setAllPoliciesLoading] = useState(false);
  
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
      alert('Unable to finalize policy. Please check network and try again.');
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

  const renderPolicyCard = (policy, key, extraBadge) => (
    <Card key={key}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1">Policy #{policy.policyId}</Typography>
            {extraBadge}
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
          <Button size="small" variant="contained" onClick={() => handleCheckPayout(policy)} disabled={processing || policy.statusString === 'PaidOut' || policy.statusString === 'Expired'}>
            {processing ? 'Processing...' : (policy.statusString === 'Active' ? 'Finalize Policy' : 'Already Finalized')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

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
                      {renderPolicyCard(policy, `all-${policy.policyId}-${index}`, isMyPolicy ? <Chip label="Your Policy" color="success" size="small"/> : null)}
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
                {renderPolicyCard(policy, `${policy.policyId}-${refreshKey}`)}
              </Grid>
          ))}
        </Grid>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2">No policies found. Create your first policy to get started!</Typography>
          <Button size="small" variant="outlined" onClick={refetch}>Refresh</Button>
        </Stack>
      )}
    </Container>
  );
};

export default MyPolicies;