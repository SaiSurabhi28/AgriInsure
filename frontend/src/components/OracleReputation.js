import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const OracleReputation = () => {
  const [reputationData, setReputationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchReputation = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/oracle/reputation?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reputation data');
      }

        const data = await response.json();
        if (isMounted.current) {
          setReputationData(data);
          setError(null);
      }
    } catch (err) {
      console.error('Error fetching reputation:', err);
      if (isMounted.current) {
        setError(err.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchReputation();
    
    const interval = setInterval(() => {
      if (isMounted.current) {
        fetchReputation();
      }
    }, 10000);
    
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchReputation]);

  const getTierIcon = (tier) => {
    if (tier === 'excellent') return <CheckCircleIcon fontSize="small" />;
    if (tier === 'strong') return <TrendingUpIcon fontSize="small" />;
    return <WarningIcon fontSize="small" />;
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 90) return 'success';
    if (accuracy >= 75) return 'info';
    if (accuracy >= 50) return 'warning';
    return 'error';
  };

  const formatNumber = (value, digits = 1) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '--';
    }
    return Number(value).toFixed(digits);
  };

  const formatPercent = (value, digits = 1) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '--';
    }
    return `${Number(value).toFixed(digits)}%`;
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return '--';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return '--';
    return parsed.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Loading oracle reputation data...</Typography>
        <LinearProgress sx={{ mt: 2, width: 320, mx: 'auto' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Error loading reputation data: {error}</Alert>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchReputation}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const networkStats = reputationData?.networkStats || {};
  const datasetInfo = networkStats.dataset || {};
  const nodes = reputationData?.nodes || [];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h2">
          🔐 Oracle Reputation (Dataset Insights)
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchReputation}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card raised>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Active Data Stations
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {networkStats.activeNodes || 0}/{networkStats.totalNodes || 0}
              </Typography>
              <Chip
                label={`${networkStats.suspendedNodes || 0} offline`}
                color={(networkStats.suspendedNodes || 0) > 0 ? 'warning' : 'success'}
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card raised>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Average Coverage
              </Typography>
              <Typography variant="h3" component="div" color="success.main">
                {formatPercent(networkStats.averageCoverage, 1)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, networkStats.averageCoverage || 0)}
                color="success"
                sx={{ mt: 2, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card raised>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Average Reputation
              </Typography>
              <Typography variant="h3" component="div" color="info.main">
                {formatNumber(networkStats.averageReputation, 1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg. deviation: {formatNumber(networkStats.averageDeviation, 2)} mm
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card raised>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Dataset Coverage
              </Typography>
              <Typography variant="h6" color="text.primary">
                {datasetInfo.totalDays || 0} days · {datasetInfo.stationCount || 0} stations
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {datasetInfo.firstTimestamp ? formatDate(datasetInfo.firstTimestamp) : '--'} – {datasetInfo.lastTimestamp ? formatDate(datasetInfo.lastTimestamp) : '--'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card raised>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Station Reliability Breakdown
          </Typography>
          
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Station</TableCell>
                  <TableCell align="center">Coverage</TableCell>
                  <TableCell align="center">Avg Rainfall (mm)</TableCell>
                  <TableCell align="center">Avg Temp (°C)</TableCell>
                  <TableCell align="center">Avg Humidity (%)</TableCell>
                  <TableCell align="center">Deviation (mm)</TableCell>
                  <TableCell align="center">Reputation</TableCell>
                  <TableCell align="center">Accuracy</TableCell>
                  <TableCell align="center">Last Update</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow key={node.nodeId} hover>
                    <TableCell>
                      <Stack spacing={0.3}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {node.displayName || node.nodeId.toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {node.location?.city || 'Unknown City'}, {node.location?.country || 'Unknown Country'}
                        </Typography>
                        {node.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {node.notes}
                      </Typography>
                        )}
                        <Chip
                          icon={getTierIcon(node.tier?.tier)}
                          label={node.status || 'Unknown'}
                          color={node.statusColor || 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ width: 'fit-content' }}
                        />
                      </Stack>
                    </TableCell>

                    <TableCell align="center">
                      <Stack spacing={0.5} alignItems="center">
                      <Chip
                          label={formatPercent(node.coveragePercent, 1)}
                          color={node.statusColor || 'default'}
                        size="small"
                      />
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, node.coveragePercent || 0)}
                          sx={{ width: 80, height: 6, borderRadius: 3 }}
                        />
                      </Stack>
                    </TableCell>

                    <TableCell align="center">{formatNumber(node.averages?.rainfallMm, 2)}</TableCell>
                    <TableCell align="center">{formatNumber(node.averages?.temperatureC, 1)}</TableCell>
                    <TableCell align="center">{formatNumber(node.averages?.humidityPercent, 1)}</TableCell>
                    <TableCell align="center">{formatNumber(node.averageDeviationMm, 2)}</TableCell>

                    <TableCell align="center">
                      <Chip
                        label={`${formatNumber(node.reputation, 1)} (${node.tier?.tier || 'unknown'})`}
                        color={node.tier?.color || 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={formatPercent(node.accuracy, 0)}
                        color={getAccuracyColor(node.accuracy)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title={node.lastUpdate ? new Date(node.lastUpdate).toLocaleString() : ''}>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(node.lastUpdate)}
                      </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How to read these scores
          </Typography>
          <Stack spacing={0.75}>
            <Typography variant="body2">
              • <strong>Reputation</strong> blends coverage (how many days the station reported rain) and consistency (how close it stays to the dataset average).
            </Typography>
            <Typography variant="body2">
              • <strong>Coverage</strong> shows the percentage of days with precipitation readings in the dataset window.
            </Typography>
            <Typography variant="body2">
              • <strong>Deviation</strong> is the average difference between the station and the cross-station rainfall consensus (lower is better).
            </Typography>
            <Typography variant="body2">
              • <strong>Accuracy</strong> indicates how often the station contributed precipitation data (100% means every day in the dataset).
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {reputationData?.timestamp && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: 'block', textAlign: 'center' }}
        >
          Last updated: {new Date(reputationData.timestamp).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};

export default OracleReputation;

