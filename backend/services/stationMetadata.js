// Metadata describing weather stations present in the historical dataset.
// Used to give user-friendly names and contextual information for the
// "oracle" reputation dashboard in dataset-only mode.

const STATION_METADATA = {
  basel: {
    displayName: 'Basel Weather Station',
    city: 'Basel',
    country: 'Switzerland',
    region: 'Europe',
    latitude: 47.5596,
    longitude: 7.5886,
    notes: 'Swiss Federal Office of Meteorology & Climatology station near Basel.'
  },
  budapest: {
    displayName: 'Budapest Met Office',
    city: 'Budapest',
    country: 'Hungary',
    region: 'Europe',
    latitude: 47.4979,
    longitude: 19.0402
  },
  de: {
    displayName: 'German Aggregate Station',
    city: 'Multiple (Germany)',
    country: 'Germany',
    region: 'Europe',
    notes: 'Aggregated German measurements (De Bilt) representing national averages.'
  },
  dresden: {
    displayName: 'Dresden Weather Centre',
    city: 'Dresden',
    country: 'Germany',
    region: 'Europe',
    latitude: 51.0504,
    longitude: 13.7373
  },
  dusseldorf: {
    displayName: 'Düsseldorf Airport Station',
    city: 'Düsseldorf',
    country: 'Germany',
    region: 'Europe',
    latitude: 51.2894,
    longitude: 6.7668
  },
  heathrow: {
    displayName: 'London Heathrow Station',
    city: 'London',
    country: 'United Kingdom',
    region: 'Europe',
    latitude: 51.4700,
    longitude: -0.4543
  },
  kassel: {
    displayName: 'Kassel Weather Station',
    city: 'Kassel',
    country: 'Germany',
    region: 'Europe',
    latitude: 51.3127,
    longitude: 9.4797
  },
  ljubljana: {
    displayName: 'Ljubljana-Bežigrad Station',
    city: 'Ljubljana',
    country: 'Slovenia',
    region: 'Europe',
    latitude: 46.0569,
    longitude: 14.5058
  },
  maastricht: {
    displayName: 'Maastricht Aachen Airport',
    city: 'Maastricht',
    country: 'Netherlands',
    region: 'Europe',
    latitude: 50.9150,
    longitude: 5.7769
  },
  malmo: {
    displayName: 'Malmö Airport Station',
    city: 'Malmö',
    country: 'Sweden',
    region: 'Europe',
    latitude: 55.6050,
    longitude: 13.0038
  },
  montelimar: {
    displayName: 'Montélimar Weather Centre',
    city: 'Montélimar',
    country: 'France',
    region: 'Europe',
    latitude: 44.5580,
    longitude: 4.7508
  },
  muenchen: {
    displayName: 'Munich Weather Observatory',
    city: 'Munich',
    country: 'Germany',
    region: 'Europe',
    latitude: 48.1351,
    longitude: 11.5820
  },
  oslo: {
    displayName: 'Oslo Blindern Station',
    city: 'Oslo',
    country: 'Norway',
    region: 'Europe',
    latitude: 59.9427,
    longitude: 10.7215
  },
  perpignan: {
    displayName: 'Perpignan-Rivesaltes Station',
    city: 'Perpignan',
    country: 'France',
    region: 'Europe',
    latitude: 42.7400,
    longitude: 2.8700
  },
  roma: {
    displayName: 'Rome Weather Station',
    city: 'Rome',
    country: 'Italy',
    region: 'Europe',
    latitude: 41.9028,
    longitude: 12.4964,
    notes: 'Dataset lacks precipitation measurements for this station, so coverage is 0%.'
  },
  sonnblick: {
    displayName: 'Sonnblick Observatory',
    city: 'Sonnblick',
    country: 'Austria',
    region: 'Europe',
    latitude: 47.0547,
    longitude: 12.9589,
    notes: 'High-altitude Alpine observatory with low average temperatures.'
  },
  stockholm: {
    displayName: 'Stockholm Arlanda',
    city: 'Stockholm',
    country: 'Sweden',
    region: 'Europe',
    latitude: 59.6519,
    longitude: 17.9186
  },
  tours: {
    displayName: 'Tours Val de Loire',
    city: 'Tours',
    country: 'France',
    region: 'Europe',
    latitude: 47.3941,
    longitude: 0.7250
  }
};

module.exports = STATION_METADATA;



