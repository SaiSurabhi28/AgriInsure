const axios = require('axios');
const moment = require('moment');

// Test oracle network functionality
async function testOracleNetwork() {
  console.log('Testing Oracle Network...\n');
  
  const baseUrl = 'http://localhost:3002';
  
  try {
    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${baseUrl}/api/oracle/health`);
    console.log('Health status:', healthResponse.data);
    
    // Test node status
    console.log('\n2. Testing node status...');
    const nodesResponse = await axios.get(`${baseUrl}/api/oracle/nodes`);
    console.log('Node status:', nodesResponse.data);
    
    // Test sending IoT data
    console.log('\n3. Testing IoT data processing...');
    const testData = {
      timestamp: moment().toISOString(),
      totalSensors: 15,
      data: [
        { sensorId: 'test_1', sensorType: 'rainfall', value: 25.5, location: { name: 'Test Farm' } },
        { sensorId: 'test_2', sensorType: 'temperature', value: 28.3, location: { name: 'Test Farm' } },
        { sensorId: 'test_3', sensorType: 'soil_moisture', value: 65.2, location: { name: 'Test Farm' } }
      ],
      summary: {
        rainfall: { average: 25.5, min: 20, max: 30, count: 5 },
        temperature: { average: 28.3, min: 25, max: 32, count: 5 },
        soil_moisture: { average: 65.2, min: 60, max: 70, count: 5 }
      }
    };
    
    const dataResponse = await axios.post(`${baseUrl}/api/oracle/data`, testData);
    console.log('Data processing result:', dataResponse.data);
    
    // Test consensus history
    console.log('\n4. Testing consensus history...');
    const consensusResponse = await axios.get(`${baseUrl}/api/oracle/consensus`);
    console.log('Consensus history:', consensusResponse.data);
    
    console.log('\n✅ All oracle tests passed!');
    
  } catch (error) {
    console.error('❌ Oracle test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Test multiple data submissions for consensus
async function testConsensus() {
  console.log('\nTesting consensus mechanism...\n');
  
  const baseUrl = 'http://localhost:3002';
  
  try {
    // Send multiple data points
    for (let i = 0; i < 5; i++) {
      const testData = {
        timestamp: moment().toISOString(),
        totalSensors: 15,
        data: [
          { sensorId: `test_${i}_1`, sensorType: 'rainfall', value: 20 + Math.random() * 10, location: { name: `Farm ${i}` } }
        ],
        summary: {
          rainfall: { average: 20 + Math.random() * 10, min: 15, max: 30, count: 5 }
        }
      };
      
      const response = await axios.post(`${baseUrl}/api/oracle/data`, testData);
      console.log(`Data ${i + 1}:`, response.data.consensus?.consensusValue?.toFixed(2) + 'mm');
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
    
    // Check final consensus
    const consensusResponse = await axios.get(`${baseUrl}/api/oracle/consensus`);
    console.log('\nFinal consensus data:', consensusResponse.data.consensus);
    
  } catch (error) {
    console.error('❌ Consensus test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('Starting Oracle Network Tests...\n');
  
  // Wait a bit for the oracle to start
  setTimeout(async () => {
    await testOracleNetwork();
    await testConsensus();
  }, 2000);
}





