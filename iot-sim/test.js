const { IoTWeatherSensor, SensorNetwork } = require('./index');

// Test individual sensor functionality
function testSensor() {
  console.log('Testing individual sensor...');
  
  const sensor = new IoTWeatherSensor('test_sensor', { name: 'Test Farm', lat: 12.9716, lon: 77.5946 }, 'rainfall');
  
  for (let i = 0; i < 5; i++) {
    const data = sensor.generateSensorData();
    console.log(`Test ${i + 1}:`, data);
  }
}

// Test sensor network
async function testSensorNetwork() {
  console.log('Testing sensor network...');
  
  const network = new SensorNetwork();
  const data = await network.collectSensorData();
  
  console.log('Collected data summary:');
  console.log(JSON.stringify(data.summary, null, 2));
}

// Test extreme weather simulation
function testExtremeWeather() {
  console.log('Testing extreme weather simulation...');
  
  const network = new SensorNetwork();
  network.simulateExtremeWeather();
  
  setTimeout(async () => {
    const data = await network.collectSensorData();
    console.log('Extreme weather data:', data.summary);
  }, 2000);
}

// Run tests
if (require.main === module) {
  console.log('Running IoT sensor tests...\n');
  
  testSensor();
  console.log('\n' + '='.repeat(50) + '\n');
  
  testSensorNetwork().then(() => {
    console.log('\n' + '='.repeat(50) + '\n');
    testExtremeWeather();
  });
}





