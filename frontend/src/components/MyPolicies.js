import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { useApi } from '../hooks/useApi.js';
import { ethers } from 'ethers';

const MyPolicies = () => {
  const { account, isConnected, provider } = useWeb3();
  const { data: policiesData, loading, refetch } = useApi(account ? `/api/policies/farmer/${account}` : null);
  const [processing, setProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Debug: Log account and policies data
  useEffect(() => {
    console.log('🔍 MyPolicies - Account:', account);
    console.log('🔍 MyPolicies - Policies data:', policiesData);
    if (policiesData) {
      const allPolicies = policiesData.data || policiesData.policies || [];
      console.log('🔍 MyPolicies - Total policies from backend:', allPolicies.length);
      console.log('🔍 MyPolicies - All policies:', allPolicies.map(p => ({ id: p.policyId, status: p.statusString, statusCode: p.status })));
      
      const activePolicies = allPolicies.filter(p => p.status === 0 || p.statusString === 'Active');
      console.log('🔍 MyPolicies - Active policies:', activePolicies.length);
      console.log('🔍 MyPolicies - Active policy IDs:', activePolicies.map(p => p.policyId));
    }
  }, [account, policiesData]);
  
  // Listen for policy creation events and auto-refresh
  useEffect(() => {
    const handlePolicyCreated = async () => {
      console.log('Policy created event received, refreshing policies...');
      // Wait a moment for blockchain to update
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (refetch) {
        await refetch();
        setRefreshKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('policyCreated', handlePolicyCreated);
    
    return () => {
      window.removeEventListener('policyCreated', handlePolicyCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only set up listener once
  
  const handleViewDetails = (policyId) => {
    alert(`Policy Details:\nID: ${policyId}\n\nThis feature will show detailed policy information in a modal.\nCurrently under development.`);
  };
  
  const handleCheckPayout = async (policy) => {
    if (!provider || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    // Check if connected to correct network
    try {
      const network = await provider.getNetwork();
      if (network.chainId !== 1337n) {
        alert(`❌ Wrong Network!\n\nYou're connected to Chain ID: ${network.chainId}\n\nPlease switch MetaMask to "Localhost 8545" (Chain ID: 1337)`);
        return;
      }
    } catch (err) {
      console.error('Network check error:', err);
    }
    
    // Allow finalizing anytime! Early claim if conditions are met
    if (policy.status === 1 || policy.statusString === 'PaidOut') {
      alert('✅ This policy has already been paid out!');
      return;
    }
    
    if (policy.status === 2 || policy.statusString === 'Expired') {
      alert('This policy expired with no payout conditions met.');
      return;
    }
    
    // Check if policy has started (startTs must be in the past)
    const currentTime = Math.floor(Date.now() / 1000);
    if (policy.startTs > currentTime) {
      const secondsUntilStart = policy.startTs - currentTime;
      const minutesUntilStart = Math.floor(secondsUntilStart / 60);
      alert(`⏳ Policy hasn't started yet!\n\nPolicy starts in ${minutesUntilStart} minute(s).\nStart time: ${new Date(policy.startTs * 1000).toLocaleString()}\n\nPlease wait until the policy start time to finalize.`);
      return;
    }
    
      const confirmFinalize = window.confirm(
        `Finalize Policy #${policy.policyId}?\n\n` +
        `This will check oracle data and execute payout if conditions are met.\n` +
        `Payout Amount: ${policy.payoutAmount ? (parseFloat(policy.payoutAmount) / 1e18).toFixed(4) : '0'} ETH\n\n` +
        `Proceed with MetaMask transaction?`
      );
      
      if (!confirmFinalize) return;
      
      setProcessing(true);
      
    // Declare currentPolicyData outside try block so it's accessible in catch
    let currentPolicyData = null;
    
    try {
      const signer = await provider.getSigner();
      // Get contract address from backend
      const contractsResponse = await fetch('http://localhost:3001/api/contracts/addresses');
      const contracts = await contractsResponse.json();
      const policyFactoryAddress = contracts.PolicyFactory;
      const policyFactoryAbi = [
        "function finalize(uint256 policyId)",
        "function getPolicy(uint256 policyId) view returns (uint256 policyId, address holder, uint256 productId, uint64 startTs, uint64 endTs, uint64 threshold, uint256 premiumPaid, uint256 payoutAmount, uint8 status)",
        "function oracle() view returns (address)",
        "function hasActivePolicy(address holder) view returns (bool)"
      ];
      
      const policyFactory = new ethers.Contract(policyFactoryAddress, policyFactoryAbi, signer);
      
      // Try to get current policy details before finalizing to provide better error messages
      try {
        currentPolicyData = await policyFactory.getPolicy(policy.policyId);
      } catch (err) {
        console.warn('Could not fetch current policy data:', err);
      }
      
      const tx = await policyFactory.finalize(policy.policyId);
      alert(`Transaction submitted: ${tx.hash}\nPlease wait for confirmation...`);
      
      const receipt = await tx.wait();
      alert(`✅ Policy finalized!\nTransaction: ${receipt.hash}\n\nCheck your wallet for any payout.`);
      
      // Dispatch event for other components (Dashboard) to refresh
      window.dispatchEvent(new CustomEvent('policyFinalized', { detail: { policyId: policy.policyId } }));
      
      // Wait a moment for blockchain state to update, then refresh
      console.log('Waiting for blockchain state to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force refetch policies from blockchain
      console.log('Refetching policies...');
      if (refetch) {
        await refetch();
        console.log('✅ Policies refetched');
        // Force UI update
        setRefreshKey(prev => prev + 1);
      } else {
        console.log('Refetch function not available, reloading page...');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error finalizing policy:', error);
      
      // Parse error from various sources (ethers.js can have different error structures)
      const errorString = JSON.stringify(error);
      const errorMsg = error.message || error.reason || error.data?.message || error.error?.message || errorString || '';
      const errorCode = error.code || error.data?.code || '';
      
      let errorMessage = 'Unable to finalize policy.\n\n';
      
      if (errorMsg.includes('network') || errorCode === 'NETWORK_ERROR') {
        errorMessage += '❌ Network Error:\n';
        errorMessage += 'Make sure MetaMask is connected to "Localhost 8545" network.\n\n';
        errorMessage += 'In MetaMask, switch to "Localhost 8545" or add it:\n';
        errorMessage += 'RPC URL: http://127.0.0.1:8545\n';
        errorMessage += 'Chain ID: 1337';
      } else if (errorMsg.includes('user rejected') || errorCode === 4001 || errorCode === 'ACTION_REJECTED') {
        errorMessage += 'Transaction was cancelled.';
      } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('insufficient balance')) {
        errorMessage += 'Not enough ETH for gas fees.';
      } else if (errorMsg.includes('Invalid amount')) {
        errorMessage += '❌ Invalid Amount Error:\n';
        errorMessage += 'This policy has a payout amount of 0 ETH (free product).\n';
        errorMessage += 'Payouts with 0 amount cannot be processed.\n\n';
        errorMessage += 'Note: This is a demo policy - real policies would have payout amounts.';
      } else if (errorMsg.includes('Invalid time window') || errorMsg.includes('time window') || errorMsg.includes('has not started yet')) {
        errorMessage += '❌ Invalid Time Window Error:\n';
        errorMessage += 'The policy start time hasn\'t been reached yet.\n';
        errorMessage += 'Please wait until the policy start time to finalize.\n\n';
        if (policy.startTs) {
          errorMessage += `Policy starts at: ${new Date(policy.startTs * 1000).toLocaleString()}`;
        }
      } else if (errorMsg.includes('Conditions not met') || errorMsg.includes('above threshold') || 
                 errorMsg.includes('cumulative rainfall') || errorMsg.includes('payout conditions')) {
        // Parse the detailed error message
        errorMessage = '❌ Cannot Finalize Policy - Conditions Not Met\n\n';
        errorMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        // Extract policy details if available
        const threshold = policy.threshold || currentPolicyData?.threshold?.toString() || 'N/A';
        const startTs = policy.startTs || currentPolicyData?.startTs?.toString() || Date.now() / 1000;
        const endTs = policy.endTs || currentPolicyData?.endTs?.toString() || Date.now() / 1000;
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = currentTime >= endTs;
        
        errorMessage += '📋 Policy Details:\n';
        errorMessage += `   • Policy ID: #${policy.policyId}\n`;
        errorMessage += `   • Threshold: ${threshold}mm (cumulative rainfall must be BELOW this)\n`;
        errorMessage += `   • Start Date: ${new Date(startTs * 1000).toLocaleString()}\n`;
        errorMessage += `   • End Date: ${new Date(endTs * 1000).toLocaleString()}\n`;
        errorMessage += `   • Current Status: ${isExpired ? 'EXPIRED' : 'ACTIVE'}\n\n`;
        
        errorMessage += '❌ Why Finalization Failed:\n';
        errorMessage += '   The cumulative rainfall during the policy period is ABOVE your threshold.\n';
        errorMessage += '   This means payout conditions are NOT satisfied.\n\n';
        
        errorMessage += '✅ When You CAN Finalize:\n';
        errorMessage += '   1. If cumulative rainfall < threshold → Payout will be processed\n';
        errorMessage += '   2. If policy has expired (even if conditions not met) → Policy expires, no payout\n\n';
        
        if (!isExpired) {
          const timeUntilExpiry = endTs - currentTime;
          const hoursUntilExpiry = Math.floor(timeUntilExpiry / 3600);
          const minutesUntilExpiry = Math.floor((timeUntilExpiry % 3600) / 60);
          errorMessage += `⏳ Policy Status:\n`;
          errorMessage += `   • Policy is still ACTIVE\n`;
          errorMessage += `   • Expires in: ${hoursUntilExpiry}h ${minutesUntilExpiry}m\n`;
          errorMessage += `   • You can finalize once it expires (even if conditions aren't met)\n\n`;
        } else {
          errorMessage += `⚠️ Note: Your policy has expired. You should be able to finalize it now.\n`;
          errorMessage += `   If you're still seeing this error, there may be a blockchain sync issue.\n\n`;
        }
        
        errorMessage += '💡 What This Means:\n';
        errorMessage += '   Your insurance protects against LOW rainfall (drought conditions).\n';
        errorMessage += '   Since rainfall is above the threshold, no payout is due.\n';
        errorMessage += '   If the policy expires without payout, your premium stays with the insurance company.';
      } else {
        errorMessage += `Error: ${errorMsg || 'Unknown error'}\n\n`;
        errorMessage += 'Please make sure:\n';
        errorMessage += '1. MetaMask is on "Localhost 8545"\n';
        errorMessage += '2. You have some ETH for gas\n';
        errorMessage += '3. Hardhat node is running (npx hardhat node)\n';
        errorMessage += '4. Policy start time has passed';
      }
      
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="my-policies">
        <h2>📋 My Policies</h2>
        <p>Please connect your wallet to view your policies.</p>
      </div>
    );
  }

  return (
    <div className="my-policies">
      <h2>📋 My Policies</h2>
      
      {loading ? (
        <div className="loading">Loading policies...</div>
      ) : policiesData && ((policiesData.data && policiesData.data.length > 0) || (policiesData.policies && policiesData.policies.length > 0)) ? (
        <div className="policies-list">
          {(policiesData.data || policiesData.policies || [])
            .filter(p => p.status === 0 || p.statusString === 'Active') // Only show active policies
            .sort((a, b) => b.policyId - a.policyId) // Sort by policy ID descending (most recent first)
            .map((policy, index) => (
            <div key={`${policy.policyId}-${refreshKey}`} className="policy-card">
              <div className="policy-header">
                <h3>Policy #{policy.policyId}</h3>
                <span className={`status ${policy.statusString === 'Active' || policy.status === 0 ? 'active' : 'inactive'}`}>
                  {policy.statusString || (policy.status === 0 ? 'Active' : policy.status === 1 ? 'PaidOut' : 'Inactive')}
                </span>
              </div>
              
              <div className="policy-details">
                <div className="detail-row">
                  <span>Product:</span>
                  <span>{policy.productName || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span>Premium:</span>
                  <span>{policy.premiumPaid ? ethers.formatEther(policy.premiumPaid) : '0'} ETH</span>
                </div>
                <div className="detail-row">
                  <span>Payout:</span>
                  <span>{policy.payoutAmount ? ethers.formatEther(policy.payoutAmount) : '0'} ETH</span>
                </div>
                <div className="detail-row">
                  <span>Threshold:</span>
                  <span>{policy.threshold}mm</span>
                </div>
                <div className="detail-row">
                  <span>Duration:</span>
                  <span>{policy.startTs && policy.endTs ? Math.floor((policy.endTs - policy.startTs) / 86400) : 'N/A'} days</span>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <span>{policy.statusString || (policy.status === 0 ? 'Active' : policy.status === 1 ? 'PaidOut' : 'Expired')}</span>
                </div>
                <div className="detail-row">
                  <span>Created:</span>
                  <span>{policy.startTs ? new Date(policy.startTs * 1000).toLocaleDateString() : 'Invalid Date'}</span>
                </div>
                <div className="detail-row">
                  <span>Expires:</span>
                  <span>{policy.endTs ? new Date(policy.endTs * 1000).toLocaleDateString() : 'Invalid Date'}</span>
                </div>
              </div>

              <div className="policy-actions">
                <button className="action-btn" onClick={() => handleViewDetails(policy.policyId)}>View Details</button>
                <button 
                  className="action-btn" 
                  onClick={() => handleCheckPayout(policy)}
                  disabled={processing || policy.statusString === 'PaidOut' || policy.statusString === 'Expired'}
                >
                  {processing ? 'Processing...' : (policy.statusString === 'Active' ? 'Finalize Policy' : 'Already Finalized')}
                </button>
                <button className="action-btn" onClick={() => { setRefreshKey(prev => prev + 1); refetch(); }}>Refresh</button>
              </div>
            </div>
          ))}
        </div>
      ) : (() => {
        const allPolicies = policiesData?.data || policiesData?.policies || [];
        const hasAnyPolicies = allPolicies.length > 0;
        const hasActivePolicies = allPolicies.filter(p => p.status === 0 || p.statusString === 'Active').length > 0;
        
        if (hasAnyPolicies && !hasActivePolicies) {
          return (
            <div className="no-policies">
              <p>No active policies. Your existing policies have been finalized.</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                View finalized policies in the Dashboard
              </p>
              <button className="action-btn" onClick={refetch}>Refresh</button>
            </div>
          );
        }
        
        return (
          <div className="no-policies">
            <p>No policies found. Create your first policy to get started!</p>
            <button className="action-btn" onClick={refetch}>Refresh</button>
          </div>
        );
      })()}
    </div>
  );
};

export default MyPolicies;