import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3001';

export const useApi = (endpoint) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const createPolicy = async (policyData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/policies/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmerAddress: policyData.farmer,
          premium: policyData.premium,
          threshold: policyData.threshold,
          duration: policyData.duration
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (endpoint) {
      fetchData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]); // Only refetch when endpoint changes, not when fetchData changes

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    createPolicy,
  };
};