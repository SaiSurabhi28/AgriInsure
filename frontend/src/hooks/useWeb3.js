import { useState, useEffect } from 'react';

import { ethers } from 'ethers';

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setLoading(true);
    try {
      // First, request to add the local network if not already added
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x539', // 1337 in hex (correct chain ID)
            chainName: 'Hardhat Local',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['http://127.0.0.1:8545'],
            blockExplorerUrls: null,
          }],
        });
      } catch (addError) {
        console.log('Network already added or user rejected:', addError);
      }

      // Switch to the local network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x539' }], // 1337 in hex
      });

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        console.log('Connected to account:', accounts[0]);
        
        // Create provider
        const providerInstance = new ethers.BrowserProvider(window.ethereum);
        setProvider(providerInstance);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            const providerInstance = new ethers.BrowserProvider(window.ethereum);
            setProvider(providerInstance);
          }
        });

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          setAccount(null);
          setIsConnected(false);
        }
      });
    }
  }, []);

  return {
    account,
    isConnected,
    loading,
    connectWallet,
    provider,
  };
};