import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { useApi } from '../hooks/useApi.js';
import { ethers } from 'ethers';

const CreatePolicy = () => {
  const { account, isConnected, provider } = useWeb3();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    duration: '14',
    threshold: '50'
  });
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://localhost:3001';

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to load products: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        setProducts(data.products || []);
        if (data.products && data.products.length > 0) {
          const firstProduct = data.products[0];
          setSelectedProduct(firstProduct);
          setFormData({ 
            productId: firstProduct.id.toString(), 
            duration: firstProduct.minDurationDays.toString(),
            threshold: Math.floor((firstProduct.minThreshold + firstProduct.maxThreshold) / 2).toString()
          });
        }
      } catch (err) {
        console.error('Error loading products:', err);
        alert(`Error loading products: ${err.message}\n\nPlease check if backend is running and restart it if needed.`);
      }
    };
    loadProducts();
  }, []);

  // Calculate pricing when form changes
  useEffect(() => {
    if (formData.productId && formData.duration) {
      fetch(`${API_BASE_URL}/api/policies/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: parseInt(formData.productId),
          durationDays: parseInt(formData.duration)
        })
      })
        .then(res => {
          if (!res.ok) {
            const errorText = res.status === 429 ? 'Rate limit exceeded. Please wait a moment and try again.' : `HTTP ${res.status}`;
            throw new Error(errorText);
          }
          return res.json();
        })
        .then(data => setPricing(data))
        .catch(err => {
          console.error('Error calculating price:', err);
          // Don't show alert for every failed price calculation to avoid spam
        });
    }
  }, [formData.productId, formData.duration]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected || !provider) {
      alert('Please connect your wallet first');
      return;
    }

    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }

    if (!pricing) {
      alert('Please wait for pricing to be calculated');
      return;
    }

    setLoading(true);
    try {
      // Get contract ABI and address (use local deployment address - get from backend)
      const contractsResponse = await fetch(`${API_BASE_URL}/api/contracts/addresses`);
      const contracts = await contractsResponse.json();
      const policyFactoryAddress = contracts.PolicyFactory;
      
      // Simple ABI for createPolicy and hasActivePolicy functions
      const policyFactoryAbi = [
        "function createPolicy(uint256 productId, uint64 startTs, uint64 durationDays, uint64 threshold) payable returns (uint256)",
        "function hasActivePolicy(address holder) view returns (bool)"
      ];
      
      const signer = await provider.getSigner();
      const policyFactory = new ethers.Contract(policyFactoryAddress, policyFactoryAbi, signer);
      
      // Check if user already has an active policy directly from contract
      try {
        const hasActive = await policyFactory.hasActivePolicy(account);
        if (hasActive) {
          alert('You already have an active policy. Please wait for it to expire or be claimed before creating a new one.');
          setLoading(false);
          return;
        }
      } catch (checkError) {
        console.warn('Could not check for active policy:', checkError.message);
        // Continue anyway - the contract will reject if policy exists
      }
      
      // Create policy with MetaMask
      const startTime = Math.floor(Date.now() / 1000) + 60; // 1 min from now
      const durationDays = parseInt(formData.duration);
      const threshold = parseInt(formData.threshold);
      
      // Convert premium to wei - handle 0 premium correctly
      let premiumWei;
      const premiumValue = pricing.premiumFormatted || (pricing.premium ? pricing.premium.toString() : "0");
      if (!premiumValue || premiumValue === "0.0" || premiumValue === "0" || parseFloat(premiumValue) === 0) {
        premiumWei = "0"; // Truly free - no ETH needed
      } else {
        premiumWei = ethers.parseEther(premiumValue);
      }
      
      const tx = await policyFactory.createPolicy(
        parseInt(formData.productId),
        startTime,
        durationDays,
        threshold,
        { value: premiumWei }
      );
      
      const receipt = await tx.wait();
      console.log('Policy created:', receipt);
      
      // Wait a moment for blockchain state to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Dispatch event to notify MyPolicies to refresh
      window.dispatchEvent(new CustomEvent('policyCreated', { detail: { policyId: receipt.logs?.[0]?.topics?.[3] } }));
      
      alert(`Policy created successfully! Transaction: ${receipt.hash}\n\nYou can now view your policy in "My Policies" page.`);
      
      // Don't auto-redirect - let user manually navigate to avoid interrupting the flow
      
      // Reset form to default values
      const defaultDuration = selectedProduct?.minDurationDays?.toString() || '14';
      const defaultThreshold = selectedProduct 
        ? Math.floor((selectedProduct.minThreshold + selectedProduct.maxThreshold) / 2).toString()
        : '50';
      setFormData({ 
        productId: formData.productId, 
        duration: defaultDuration, 
        threshold: defaultThreshold 
      });
      setPricing(null);
    } catch (error) {
      console.error('Error creating policy:', error);
      alert('Error creating policy: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-policy">
      <h2>🌱 Create New Insurance Policy</h2>
      
      {!isConnected ? (
        <div className="connect-prompt">
          <p>Please connect your MetaMask wallet to create a policy.</p>
        </div>
      ) : (
        <>
        <form onSubmit={handleSubmit} className="policy-form">
          <div className="form-group">
            <label htmlFor="product">Insurance Product</label>
            <select
              id="product"
              value={formData.productId}
              onChange={(e) => {
                const product = products.find(p => p.id.toString() === e.target.value);
                setSelectedProduct(product);
                if (product) {
                  setFormData(prev => {
                    // If current threshold is out of range for new product, set to minimum
                    const currentThreshold = parseInt(prev.threshold) || product.minThreshold;
                    const newThreshold = (currentThreshold < product.minThreshold || currentThreshold > product.maxThreshold)
                      ? product.minThreshold
                      : currentThreshold;
                    
                    return {
                    productId: e.target.value,
                    duration: prev.duration,
                      threshold: newThreshold.toString()
                    };
                  });
                }
              }}
              required
            >
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.basePremiumWei === "0" ? "(FREE)" : ""}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <small>
                Duration: {selectedProduct.minDurationDays}-{selectedProduct.maxDurationDays} days
                • Threshold: {selectedProduct.minThreshold}-{selectedProduct.maxThreshold} mm
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="threshold">Rainfall Threshold (mm)</label>
            <input
              type="number"
              id="threshold"
              step="1"
              min={selectedProduct?.minThreshold || 1}
              max={selectedProduct?.maxThreshold || 100}
              value={formData.threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, threshold: e.target.value }))}
              required
            />
            <small>Payout triggered if cumulative rainfall falls below this threshold</small>
          </div>

          <div className="form-group">
            <label htmlFor="duration">Policy Duration (days)</label>
            <select
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
            >
              {selectedProduct && Array.from({length: selectedProduct.maxDurationDays - selectedProduct.minDurationDays + 1}, (_, i) => {
                const days = selectedProduct.minDurationDays + i;
                return <option key={days} value={days}>{days} days</option>;
              })}
            </select>
          </div>

          <div className="form-summary">
            <h3>Policy Summary</h3>
            <div className="summary-item">
              <span>Premium:</span>
              <span>{pricing ? pricing.premiumFormatted : '0'} ETH</span>
            </div>
            <div className="summary-item">
              <span>Payout:</span>
              <span>{pricing ? pricing.payoutFormatted : '0'} ETH</span>
            </div>
            <div className="summary-item">
              <span>Duration:</span>
              <span>{formData.duration} days</span>
            </div>
            <div className="summary-item">
              <span>Threshold:</span>
              <span>{formData.threshold} mm</span>
            </div>
          </div>

          <button type="submit" disabled={loading || !pricing} className="submit-btn">
            {loading ? 'Creating Policy...' : (pricing && parseFloat(pricing.premiumFormatted) === 0) ? 'Create Free Policy (Gas Only)' : 'Pay Premium & Create Policy'}
          </button>
        </form>
        </>
      )}
    </div>
  );
};

export default CreatePolicy;