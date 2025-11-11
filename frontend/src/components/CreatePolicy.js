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
    threshold: '50',
    location: ''
  });
  const [pricing, setPricing] = useState(null);
  const [creatingPolicy, setCreatingPolicy] = useState(false);
  const [creatingTestPolicy, setCreatingTestPolicy] = useState(false);
  const [locations, setLocations] = useState([]);
  const [locationRecommendations, setLocationRecommendations] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const isStartTimeError = (error) => {
    const message = (error?.reason || error?.shortMessage || error?.message || error?.error?.message || '').toLowerCase();
    return message.includes('start time must be in the future');
  };

  const executeWithBufferedStartTime = async (initialBuffer, callStaticFn, txFn) => {
    let buffer = initialBuffer;
    const maxBuffer = 600;
    while (buffer <= maxBuffer) {
      const latestBlock = await provider.getBlock('latest');
      const chainTimestamp = latestBlock && typeof latestBlock.timestamp !== 'undefined'
        ? Number(latestBlock.timestamp)
        : Math.floor(Date.now() / 1000);
      const realNow = Math.floor(Date.now() / 1000);
      const startTime = Math.max(chainTimestamp, realNow) + buffer;

      if (callStaticFn) {
        try {
          await callStaticFn(startTime);
          console.log(`Buffered start time accepted at ${buffer}s buffer (start: ${startTime})`);
        } catch (err) {
          if (isStartTimeError(err)) {
            console.warn(`Start time ${startTime} rejected; increasing buffer to ${buffer + 30}s`);
            buffer += 30;
            continue;
          }
          throw err;
        }
      }

      if (!txFn) {
        return { startTime, tx: null };
      }

      try {
        const tx = await txFn(startTime);
        console.log(`Transaction submitted with start time ${startTime} (buffer ${buffer}s)`);
        return { startTime, tx };
      } catch (err) {
        if (isStartTimeError(err)) {
          console.warn(`Transaction reverted for start time ${startTime}; retrying with buffer ${buffer + 30}s`);
          buffer += 30;
          continue;
        }
        throw err;
      }
    }

    throw new Error('Unable to schedule a policy start time in the future. Please try again in a moment.');
  };

  const API_BASE_URL = 'http://localhost:3001';

  // Load products and locations
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load products
        const productsRes = await fetch(`${API_BASE_URL}/api/products`);
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
          if (productsData.products && productsData.products.length > 0) {
            const firstProduct = productsData.products[0];
            setSelectedProduct(firstProduct);
            setFormData(prev => ({ 
              ...prev,
              productId: firstProduct.id.toString(), 
              duration: firstProduct.minDurationDays.toString(),
              threshold: Math.floor((firstProduct.minThreshold + firstProduct.maxThreshold) / 2).toString()
            }));
          }
        }

        // Load locations
        const locationsRes = await fetch(`${API_BASE_URL}/api/policies/locations/all`);
        if (locationsRes.ok) {
          const locationsData = await locationsRes.json();
          setLocations(locationsData.regions || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadData();
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

  // Fetch location recommendations when location or duration changes
  useEffect(() => {
    if (formData.location && formData.duration) {
      fetch(`${API_BASE_URL}/api/policies/locations/${formData.location}/recommendations?durationDays=${formData.duration}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLocationRecommendations(data);
          }
        })
        .catch(err => console.error('Error fetching recommendations:', err));
    } else {
      setLocationRecommendations(null);
    }
  }, [formData.location, formData.duration]);

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

    setCreatingPolicy(true);
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
          setCreatingPolicy(false);
          return;
        }
      } catch (checkError) {
        console.warn('Could not check for active policy:', checkError.message);
        // Continue anyway - the contract will reject if policy exists
      }
      
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
      
      const { startTime, tx } = await executeWithBufferedStartTime(
        30,
        async (candidateStart) => {
          await policyFactory.createPolicy.staticCall(
            parseInt(formData.productId),
            candidateStart,
            durationDays,
            threshold,
            { value: premiumWei }
          );
        },
        async (candidateStart) => {
          return policyFactory.createPolicy(
            parseInt(formData.productId),
            candidateStart,
            durationDays,
            threshold,
            { value: premiumWei }
          );
        }
      );

      console.log('Creating policy with:', {
        productId: parseInt(formData.productId),
        startTime,
        durationDays,
        threshold,
        premiumWei: premiumWei.toString(),
        premiumFormatted: premiumValue
      });
      
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
      console.error('Full error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        reason: error.reason,
        error: error
      });
      
      // More detailed error message
      let errorMsg = 'Error creating policy: ' + error.message;
      if (error.reason) {
        errorMsg += '\nReason: ' + error.reason;
      }
      if (error.code === 'ACTION_REJECTED') {
        errorMsg = 'Transaction was rejected. Please approve the transaction in MetaMask.';
      }
      
      alert(errorMsg);
    } finally {
      setCreatingPolicy(false);
    }
  };

  const handleCreateTestPolicy = async () => {
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

    setCreatingTestPolicy(true);
    try {
      const contractsResponse = await fetch(`${API_BASE_URL}/api/contracts/addresses`);
      const contracts = await contractsResponse.json();
      const policyFactoryAddress = contracts.PolicyFactory;

      const policyFactoryAbi = [
        "function createTestPolicy(uint256 productId, uint64 startTs, uint64 durationSeconds, uint64 threshold) payable returns (uint256)",
        "function hasActivePolicy(address holder) view returns (bool)"
      ];

      const signer = await provider.getSigner();
      const policyFactory = new ethers.Contract(policyFactoryAddress, policyFactoryAbi, signer);

      try {
        const hasActive = await policyFactory.hasActivePolicy(account);
        if (hasActive) {
          alert('You already have an active policy. Please wait for it to expire or be claimed before creating a new one.');
          setCreatingTestPolicy(false);
          return;
        }
      } catch (checkError) {
        console.warn('Could not check for active policy (test policy):', checkError.message);
      }

      const threshold = parseInt(formData.threshold);

      const premiumValue = pricing.premiumFormatted || (pricing.premium ? pricing.premium.toString() : "0");
      const premiumWei = (!premiumValue || premiumValue === "0.0" || premiumValue === "0" || parseFloat(premiumValue) === 0)
        ? "0"
        : ethers.parseEther(premiumValue);

      const { startTime, tx } = await executeWithBufferedStartTime(
        30,
        async (candidateStart) => {
          await policyFactory.createTestPolicy.staticCall(
            parseInt(formData.productId),
            candidateStart,
            60,
            threshold,
            { value: premiumWei }
          );
        },
        async (candidateStart) => {
          return policyFactory.createTestPolicy(
            parseInt(formData.productId),
            candidateStart,
            60,
            threshold,
            { value: premiumWei }
          );
        }
      );

      const receipt = await tx.wait();
      console.log('60s test policy created:', receipt);

      await new Promise(resolve => setTimeout(resolve, 2000));

      window.dispatchEvent(new CustomEvent('policyCreated', { detail: { policyId: receipt.logs?.[0]?.topics?.[3] } }));

      alert(`60-second test policy created! Transaction: ${receipt.hash}\n\nThe policy will start in a few seconds and expire one minute later.`);
    } catch (error) {
      console.error('Error creating test policy:', error);
      alert('Failed to create 60-second policy: ' + (error?.message || 'Unknown error'));
    } finally {
      setCreatingTestPolicy(false);
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
            <label htmlFor="location">📍 Your Region</label>
            <select
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            >
              <option value="">Select your region...</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <small>Select your region to get AI-powered threshold recommendations</small>
          </div>

          {locationRecommendations && (
            <div className="form-group" style={{ background: '#f0f7ff', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ color: '#1976d2' }}>🎯 Recommended Thresholds</strong>
                <button 
                  type="button" 
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1976d2' }}
                >
                  {showRecommendations ? '▼' : '▶'}
                </button>
              </div>
              {showRecommendations && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Ideal:</strong> {locationRecommendations.recommendations.ideal}mm
                    <br />
                    <small style={{ color: '#666' }}>{locationRecommendations.explanation.ideal}</small>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Conservative:</strong> {locationRecommendations.recommendations.conservative}mm
                    <br />
                    <small style={{ color: '#666' }}>{locationRecommendations.explanation.conservative}</small>
                  </div>
                  <div>
                    <strong>Aggressive:</strong> {locationRecommendations.recommendations.aggressive}mm
                    <br />
                    <small style={{ color: '#666' }}>{locationRecommendations.explanation.aggressive}</small>
                  </div>
                  <div style={{ marginTop: '10px', padding: '8px', background: '#fff', borderRadius: '4px' }}>
                    <strong>Risk Level:</strong> {locationRecommendations.analysis.riskLevel} | 
                    <strong> Confidence:</strong> {locationRecommendations.analysis.confidence}
                  </div>
                </div>
              )}
            </div>
          )}

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
            {locationRecommendations && (
              <div style={{ marginTop: '5px' }}>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, threshold: locationRecommendations.recommendations.ideal.toString() }))}
                  style={{ 
                    background: '#4CAF50', 
                    color: 'white', 
                    border: 'none', 
                    padding: '5px 10px', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Use Ideal ({locationRecommendations.recommendations.ideal}mm)
                </button>
              </div>
            )}
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

          <button type="submit" disabled={creatingPolicy || !pricing} className="submit-btn">
            {creatingPolicy ? 'Creating Policy...' : (pricing && parseFloat(pricing.premiumFormatted) === 0) ? 'Create Free Policy (Gas Only)' : 'Pay Premium & Create Policy'}
          </button>
          <button
            type="button"
            disabled={creatingTestPolicy || creatingPolicy || !pricing}
            className="submit-btn"
            style={{ marginTop: '10px', background: '#2196F3' }}
            onClick={handleCreateTestPolicy}
          >
            {creatingTestPolicy ? 'Creating 60s Policy...' : 'Create 60s Test Policy'}
          </button>
        </form>
        </>
      )}
    </div>
  );
};

export default CreatePolicy;