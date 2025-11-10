const fs = require('fs-extra');
const path = require('path');
const stationMetadata = require('./stationMetadata');

class DatasetWeatherService {
  constructor() {
    this.datasetFile = process.env.DATASET_WEATHER_FILE
      || process.env.KAGGLE_DATA_FILE
      || path.join(__dirname, '..', '..', 'archive (1) 2', 'weather_prediction_dataset.csv.bak');

    this.cacheDurationMs = parseInt(process.env.DATASET_CACHE_MS || '600000', 10); // 10 minutes default
    this._cache = null;
    this._stationStatsCache = null;
  }

  getDatasetPath() {
    return this.datasetFile;
  }

  async loadDataset() {
    if (this._cache && (Date.now() - this._cache.loadedAt) < this.cacheDurationMs) {
      return this._cache.rows;
    }

    if (!(await fs.pathExists(this.datasetFile))) {
      throw new Error(`Dataset file not found at ${this.datasetFile}`);
    }

    const csvText = await fs.readFile(this.datasetFile, 'utf8');
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error('Dataset file contains no data rows');
    }

    const header = lines[0].split(',').map(h => h.trim());
    const headerInfo = this._buildHeaderInfo(header);
    const totalRows = lines.length - 1;

    const rows = [];
    let firstTimestamp = null;
    let lastTimestamp = null;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const { timestamp, isoDate } = this._parseDate(cols[headerInfo.dateIndex], i, totalRows);

      const stationMap = new Map();
      const ensureStation = (station) => {
        const key = station.toLowerCase();
        if (!stationMap.has(key)) {
          stationMap.set(key, {
            stationId: key,
            name: station,
            precipitation: null,
            temperature: null,
            humidity: null,
            windSpeed: null,
            windGust: null
          });
        }
        return stationMap.get(key);
      };

      headerInfo.precipitation.forEach(({ station, index }) => {
        const value = this._safeParse(cols[index]);
        if (value !== null) {
          ensureStation(station).precipitation = value;
        }
      });

      headerInfo.temperature.forEach(({ station, index }) => {
        const value = this._safeParse(cols[index]);
        if (value !== null) {
          ensureStation(station).temperature = value;
        }
      });

      headerInfo.humidity.forEach(({ station, index }) => {
        const value = this._safeParse(cols[index]);
        if (value !== null) {
          ensureStation(station).humidity = value;
        }
      });

      headerInfo.windSpeed.forEach(({ station, index }) => {
        const value = this._safeParse(cols[index]);
        if (value !== null) {
          ensureStation(station).windSpeed = value;
        }
      });

      headerInfo.windGust.forEach(({ station, index }) => {
        const value = this._safeParse(cols[index]);
        if (value !== null) {
          ensureStation(station).windGust = value;
        }
      });

      const stationSummaries = Array.from(stationMap.values());
      const rainfall = this._average(stationSummaries.map(s => s.precipitation));
      const temperature = this._average(stationSummaries.map(s => s.temperature));
      const humidity = this._average(stationSummaries.map(s => s.humidity));
      const windSpeed = this._average(stationSummaries.map(s => s.windSpeed));
      const windGust = this._average(stationSummaries.map(s => s.windGust));

      rows.push({
        index: i - 1,
        timestamp,
        isoDate,
        rainfall,
        temperature,
        humidity,
        windSpeed,
        windGust,
        stations: stationSummaries
      });

      if (!firstTimestamp) {
        firstTimestamp = isoDate;
      }
      lastTimestamp = isoDate;
    }

    const rainfallValues = rows
      .map(row => row.rainfall)
      .filter(value => typeof value === 'number');
    const overallAvgRainfall = rainfallValues.length
      ? rainfallValues.reduce((sum, val) => sum + val, 0) / rainfallValues.length
      : 0;

    this._cache = {
      rows,
      headerInfo,
      overallAvgRainfall,
      firstTimestamp,
      lastTimestamp,
      loadedAt: Date.now()
    };
    this._stationStatsCache = null;

    return rows;
  }

  async getRainfallRounds(limit = 365) {
    const rows = await this.loadDataset();
    const count = Math.max(1, Math.min(parseInt(limit, 10) || 365, rows.length));
    const slice = rows.slice(-count);

    return slice.map((row, idx) => ({
      roundId: idx + 1,
      value: (row.rainfall ?? 0).toFixed(2),
      rainfall: row.rainfall,
      temperature: row.temperature,
      humidity: row.humidity,
      windSpeed: row.windSpeed,
      windGust: row.windGust,
      timestamp: row.timestamp,
      time: row.isoDate
    }));
  }

  async getConsensus(limit = 10) {
    const rows = await this.loadDataset();
    const slice = rows.slice(-Math.max(1, Math.min(parseInt(limit, 10) || 10, rows.length)));

    return slice.map(row => ({
      consensusValue: typeof row.rainfall === 'number' ? Math.round(row.rainfall * 100) / 100 : null,
      averageTemperature: row.temperature,
      averageHumidity: row.humidity,
      averageWindSpeed: row.windSpeed,
      participatingNodes: row.stations.filter(s => typeof s.precipitation === 'number').length,
      dataPoints: row.stations
        .filter(s => typeof s.precipitation === 'number')
        .map(s => ({
          stationId: s.stationId,
          name: s.name,
          precipitation: s.precipitation,
          temperature: s.temperature,
          humidity: s.humidity,
          windSpeed: s.windSpeed,
          windGust: s.windGust
        })),
      timestamp: row.timestamp,
      isoDate: row.isoDate
    }));
  }

  async getLatestEntry() {
    const rows = await this.loadDataset();
    return rows.length ? rows[rows.length - 1] : null;
  }

  async getDatasetInfo() {
    const rows = await this.loadDataset();
    const { headerInfo, firstTimestamp, lastTimestamp } = this._cache;

    return {
      file: this.datasetFile,
      records: rows.length,
      stations: headerInfo.stations,
      stationCount: headerInfo.stations.length,
      firstTimestamp,
      lastTimestamp,
      totalDays: rows.length
    };
  }

  async getStationStats() {
    if (this._stationStatsCache && (Date.now() - this._cache.loadedAt) < this.cacheDurationMs) {
      return this._stationStatsCache;
    }

    const rows = await this.loadDataset();
    const overallAvgRainfall = this._cache.overallAvgRainfall || 0;
    const totals = new Map();

    rows.forEach(row => {
      const averageRainfall = row.rainfall;

      row.stations.forEach(station => {
        const key = station.stationId;
        if (!totals.has(key)) {
          totals.set(key, {
            stationId: key,
            name: station.name,
            precipitationSum: 0,
            precipitationSamples: 0,
            temperatureSum: 0,
            temperatureSamples: 0,
            humiditySum: 0,
            humiditySamples: 0,
            windSum: 0,
            windSamples: 0,
            deviationSum: 0,
            totalReports: 0
          });
        }

        const summary = totals.get(key);
        summary.totalReports += 1;

        if (typeof station.precipitation === 'number') {
          summary.precipitationSum += station.precipitation;
          summary.precipitationSamples += 1;
          if (typeof averageRainfall === 'number') {
            summary.deviationSum += Math.abs(station.precipitation - averageRainfall);
          }
        }

        if (typeof station.temperature === 'number') {
          summary.temperatureSum += station.temperature;
          summary.temperatureSamples += 1;
        }

        if (typeof station.humidity === 'number') {
          summary.humiditySum += station.humidity;
          summary.humiditySamples += 1;
        }

        if (typeof station.windSpeed === 'number') {
          summary.windSum += station.windSpeed;
          summary.windSamples += 1;
        }
      });
    });

    const result = Array.from(totals.values()).map(summary => {
      const totalRows = rows.length || 1;
      const coverage = summary.precipitationSamples / totalRows;

      const avgRainfallMm = summary.precipitationSamples > 0
        ? summary.precipitationSum / summary.precipitationSamples
        : null;
      const avgTemperatureC = summary.temperatureSamples > 0
        ? summary.temperatureSum / summary.temperatureSamples
        : null;
      const avgHumidityPercent = summary.humiditySamples > 0
        ? (summary.humiditySum / summary.humiditySamples) * 100
        : null;
      const avgWindSpeedMs = summary.windSamples > 0
        ? summary.windSum / summary.windSamples
        : null;

      const avgDeviation = summary.precipitationSamples > 0
        ? summary.deviationSum / summary.precipitationSamples
        : 0;

      const baselineRain = overallAvgRainfall || avgRainfallMm || 1;
      const deviationRatio = Math.min(avgDeviation / baselineRain, 2);
      const deviationScore = 1 - (deviationRatio / 2); // 1 (best) to 0 (worst)
      const coverageScore = Math.min(1, coverage + 0.05);
      const reputationScore = Math.max(50, Math.min(100, (coverageScore * 0.6 + deviationScore * 0.4) * 100));
      const accuracy = Math.round(Math.max(0, Math.min(100, coverage * 100)));

      const metadata = stationMetadata[summary.stationId] || {};
      const displayName = metadata.displayName || this._formatStationName(summary.name);
      const status = coverage > 0 ? 'Active' : 'No precipitation data';
      const statusColor = coverage > 0 ? 'success' : 'warning';
      const notes = metadata.notes || (coverage > 0
        ? 'Consistent precipitation readings across the dataset period.'
        : 'This station did not report precipitation in the dataset window.');
      const coveragePercent = Math.round(coverage * 1000) / 10;

      return {
        nodeId: summary.stationId,
        name: summary.name,
        displayName,
        isActive: coverage > 0,
        status,
        statusColor,
        reputation: Math.round(reputationScore * 10) / 10,
        tier: this._mapTier(reputationScore),
        accuracy,
        coveragePercent,
        accurateReports: summary.precipitationSamples,
        totalReports: summary.totalReports,
        maliciousReports: 0,
        averageDeviationMm: Math.round(avgDeviation * 1000) / 1000,
        notes,
        location: {
          city: metadata.city || displayName,
          country: metadata.country || 'Unknown',
          region: metadata.region || 'Unknown'
        },
        coordinates: metadata.latitude && metadata.longitude
          ? {
              latitude: metadata.latitude,
              longitude: metadata.longitude
            }
          : null,
        metrics: {
          avgPrecipitation: avgRainfallMm,
          avgTemperature: avgTemperatureC,
          avgHumidity: summary.humiditySamples > 0
            ? summary.humiditySum / summary.humiditySamples
            : null,
          avgWindSpeed: avgWindSpeedMs
        },
        averages: {
          rainfallMm: avgRainfallMm,
          temperatureC: avgTemperatureC,
          humidityPercent: avgHumidityPercent,
          windSpeedMs: avgWindSpeedMs
        },
        lastUpdate: rows.length ? rows[rows.length - 1].isoDate : null
      };
    }).sort((a, b) => b.reputation - a.reputation);

    this._stationStatsCache = result;
    return result;
  }

  _buildHeaderInfo(header) {
    const info = {
      dateIndex: header.findIndex(h => h.toUpperCase() === 'DATE'),
      precipitation: [],
      temperature: [],
      humidity: [],
      windSpeed: [],
      windGust: [],
      stations: []
    };

    if (info.dateIndex === -1) {
      info.dateIndex = 0;
    }

    const stationSet = new Set();

    header.forEach((column, index) => {
      const parts = column.split('_');
      const station = parts.length > 1 ? parts[0] : column;
      const normalizedStation = station.trim();
      const lc = column.toLowerCase();

      if (lc.includes('precipitation')) {
        info.precipitation.push({ station: normalizedStation, index });
        stationSet.add(normalizedStation);
      }

      if (lc.includes('temp_mean')) {
        info.temperature.push({ station: normalizedStation, index });
        stationSet.add(normalizedStation);
      }

      if (lc.endsWith('humidity')) {
        info.humidity.push({ station: normalizedStation, index });
        stationSet.add(normalizedStation);
      }

      if (lc.includes('wind_speed')) {
        info.windSpeed.push({ station: normalizedStation, index });
        stationSet.add(normalizedStation);
      }

      if (lc.includes('wind_gust')) {
        info.windGust.push({ station: normalizedStation, index });
        stationSet.add(normalizedStation);
      }
    });

    info.stations = Array.from(stationSet).sort();
    return info;
  }

  _safeParse(value) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = String(value).trim();
    if (trimmed.length === 0) {
      return null;
    }

    const num = parseFloat(trimmed);
    return Number.isFinite(num) ? num : null;
  }

  _average(values) {
    const filtered = values.filter(val => typeof val === 'number');
    if (!filtered.length) {
      return null;
    }
    return filtered.reduce((sum, val) => sum + val, 0) / filtered.length;
  }

  _parseDate(dateValue, rowIndex, totalRows) {
    if (dateValue) {
      const trimmed = String(dateValue).trim();

      if (/^\d{8}$/.test(trimmed)) {
        const year = parseInt(trimmed.substring(0, 4), 10);
        const month = parseInt(trimmed.substring(4, 6), 10) - 1;
        const day = parseInt(trimmed.substring(6, 8), 10);
        const parsedDate = new Date(Date.UTC(year, month, day));
        if (!Number.isNaN(parsedDate.getTime())) {
          return {
            timestamp: Math.floor(parsedDate.getTime() / 1000),
            isoDate: parsedDate.toISOString()
          };
        }
      }

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return {
          timestamp: Math.floor(parsed.getTime() / 1000),
          isoDate: parsed.toISOString()
        };
      }
    }

    const fallback = new Date(Date.now() - (totalRows - rowIndex) * 86400 * 1000);
    return {
      timestamp: Math.floor(fallback.getTime() / 1000),
      isoDate: fallback.toISOString()
    };
  }

  _mapTier(score) {
    if (score >= 90) return { tier: 'excellent', color: 'success' };
    if (score >= 80) return { tier: 'strong', color: 'info' };
    if (score >= 65) return { tier: 'fair', color: 'warning' };
    return { tier: 'needs review', color: 'error' };
  }

  async getRandomWeatherSample() {
    const rows = await this.loadDataset();
    if (!rows.length) {
      return null;
    }

    const sample = rows[Math.floor(Math.random() * rows.length)];
    const humidityPercent = typeof sample.humidity === 'number'
      ? Math.max(0, Math.min(100, sample.humidity * 100))
      : null;

    return {
      roundId: sample.index,
      timestamp: sample.timestamp,
      isoDate: sample.isoDate,
      rainfall: sample.rainfall,
      rainfallFormatted: sample.rainfall !== null && sample.rainfall !== undefined
        ? Number(sample.rainfall).toFixed(2)
        : '0.00',
      temperature: sample.temperature,
      humidity: humidityPercent,
      windSpeed: sample.windSpeed,
      windGust: sample.windGust,
      source: 'dataset_random'
    };
  }

  _formatStationName(name = '') {
    return name
      .replace(/_/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

module.exports = new DatasetWeatherService();


