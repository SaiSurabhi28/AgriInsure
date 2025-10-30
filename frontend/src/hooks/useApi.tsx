import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3001';

export const useApi = (endpoint: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const createPolicy = async (policyData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policyData),
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
    }
  }, [endpoint]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    createPolicy,
  };
};