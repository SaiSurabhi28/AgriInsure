import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Stack,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocalDiningIcon from '@mui/icons-material/LocalDining';

const CropRecommendation = () => {
  const [conditions, setConditions] = useState({
    temperature: 25,
    humidity: 70,
    rainfall: 150,
    n: 50,
    p: 40,
    k: 35,
    ph: 6.5
  });
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [smartMode, setSmartMode] = useState(false);
  const [allCrops, setAllCrops] = useState([]);
  const [showAllCropsDialog, setShowAllCropsDialog] = useState(false);

  useEffect(() => {
    fetchAllCrops();
  }, []);

  const fetchAllCrops = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/crops/all');
      const data = await response.json();
      if (data.success) {
        setAllCrops(data.crops);
      }
    } catch (err) {
      console.error('Error fetching crops:', err);
    }
  };

  const handleGetRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url;
      if (smartMode) {
        // Smart mode - uses live weather data from oracle
        url = 'http://localhost:3001/api/crops/recommendations/smart?topN=5';
        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
          setRecommendations(data);
          if (data.inputConditions) {
            setConditions({ ...conditions, ...data.inputConditions });
          }
        } else {
          setError('Smart recommendations are not available. Use manual mode or check oracle service.');
        }
      } else {
        // Manual mode - uses provided conditions
        const params = new URLSearchParams({
          temperature: conditions.temperature,
          humidity: conditions.humidity,
          rainfall: conditions.rainfall,
          n: conditions.n,
          p: conditions.p,
          k: conditions.k,
          ph: conditions.ph,
          topN: '5'
        });
        url = `http://localhost:3001/api/crops/recommendations?${params}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          setRecommendations(data);
        } else {
          setError('Failed to get recommendations: ' + (data.error || 'Unknown error'));
        }
      }
    } catch (err) {
      console.error('Error getting recommendations:', err);
      setError('Error fetching recommendations. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getSuitabilityColor = (suitability) => {
    switch (suitability) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getSuitabilityIcon = (suitability) => {
    switch (suitability) {
      case 'excellent': return '⭐⭐⭐';
      case 'good': return '⭐⭐';
      case 'fair': return '⭐';
      case 'poor': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
          <LocalDiningIcon sx={{ mr: 1 }} /> Crop Recommendation System
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={() => setShowAllCropsDialog(true)}
          >
            View All Crops
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleGetRecommendations}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Get Recommendations'}
          </Button>
        </Stack>
      </Box>

      {/* Mode Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Mode
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant={smartMode ? 'contained' : 'outlined'}
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setSmartMode(true)}
            >
              Smart Mode (Live Weather)
            </Button>
            <Button
              variant={!smartMode ? 'contained' : 'outlined'}
              onClick={() => setSmartMode(false)}
            >
              Manual Mode
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {smartMode
              ? '✨ Smart mode uses live weather data from the oracle to recommend crops'
              : '📝 Manual mode uses your provided conditions to find suitable crops'}
          </Typography>
        </CardContent>
      </Card>

      {/* Manual Input Form */}
      {!smartMode && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Environmental Conditions
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Temperature (°C)"
                    type="number"
                    value={conditions.temperature}
                    onChange={(e) => setConditions({ ...conditions, temperature: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Humidity (%)"
                    type="number"
                    value={conditions.humidity}
                    onChange={(e) => setConditions({ ...conditions, humidity: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Rainfall (mm)"
                    type="number"
                    value={conditions.rainfall}
                    onChange={(e) => setConditions({ ...conditions, rainfall: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="pH Level"
                    type="number"
                    step="0.1"
                    value={conditions.ph}
                    onChange={(e) => setConditions({ ...conditions, ph: e.target.value })}
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Soil Nutrients (NPK)
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Nitrogen (N)"
                    type="number"
                    value={conditions.n}
                    onChange={(e) => setConditions({ ...conditions, n: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Phosphorus (P)"
                    type="number"
                    value={conditions.p}
                    onChange={(e) => setConditions({ ...conditions, p: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Potassium (K)"
                    type="number"
                    value={conditions.k}
                    onChange={(e) => setConditions({ ...conditions, k: e.target.value })}
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Loading State */}
      {loading && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analyzing Conditions...
            </Typography>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Using ML-powered recommendations based on 2,200 crop samples
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.success && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              🌾 Recommended Crops
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Based on 22 crop types, analyzed with K-Nearest Neighbors algorithm
            </Typography>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Rank</strong></TableCell>
                    <TableCell><strong>Crop</strong></TableCell>
                    <TableCell><strong>Confidence</strong></TableCell>
                    <TableCell><strong>Suitability</strong></TableCell>
                    <TableCell><strong>Avg Conditions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recommendations.recommendations.map((rec, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip
                          label={`#${index + 1}`}
                          color={index === 0 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {rec.crop.charAt(0).toUpperCase() + rec.crop.slice(1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={rec.confidence}
                          color={parseFloat(rec.confidence) > 50 ? 'success' : 'info'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${getSuitabilityIcon(rec.suitability)} ${rec.suitability}`}
                          color={getSuitabilityColor(rec.suitability)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">
                          Temp: {rec.averageConditions.temperature}°C
                        </Typography>
                        <Typography variant="caption" display="block">
                          Rain: {rec.averageConditions.rainfall}mm
                        </Typography>
                        <Typography variant="caption" display="block">
                          Humidity: {rec.averageConditions.humidity}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Input Conditions Summary */}
            {recommendations.inputConditions && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Your Conditions:
                </Typography>
                <Typography variant="body2">
                  Temperature: {recommendations.inputConditions.temperature}°C | 
                  Humidity: {recommendations.inputConditions.humidity}% | 
                  Rainfall: {recommendations.inputConditions.rainfall}mm | 
                  pH: {recommendations.inputConditions.ph}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Crops Dialog */}
      <Dialog
        open={showAllCropsDialog}
        onClose={() => setShowAllCropsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>🌾 All Available Crops (22 Types)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select from these crops for recommendations:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {allCrops.map((crop) => (
              <Chip
                key={crop}
                label={crop.charAt(0).toUpperCase() + crop.slice(1)}
                size="medium"
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAllCropsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CropRecommendation;

