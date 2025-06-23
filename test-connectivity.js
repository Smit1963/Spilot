const fetch = require('node-fetch');

async function testConnectivity() {
  console.log('🔍 Testing network connectivity...\n');

  // Test 1: Basic internet connectivity
  console.log('1. Testing basic internet connectivity...');
  try {
    const internetResponse = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    console.log('✅ Internet connectivity: OK');
  } catch (error) {
    console.log('❌ Internet connectivity: FAILED');
    console.log(`   Error: ${error.message}`);
    return;
  }

  // Test 2: DNS resolution
  console.log('\n2. Testing DNS resolution...');
  try {
    const dnsResponse = await fetch('https://api.groq.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    console.log('✅ DNS resolution: OK');
  } catch (error) {
    console.log('❌ DNS resolution: FAILED');
    console.log(`   Error: ${error.message}`);
    return;
  }

  // Test 3: Groq API connectivity (without auth)
  console.log('\n3. Testing Groq API connectivity...');
  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    console.log('✅ Groq API connectivity: OK');
    console.log(`   Status: ${groqResponse.status}`);
  } catch (error) {
    console.log('❌ Groq API connectivity: FAILED');
    console.log(`   Error: ${error.message}`);
  }

  // Test 4: If API key provided, test authentication
  const apiKey = process.argv[2];
  if (apiKey) {
    console.log('\n4. Testing API key authentication...');
    try {
      const authResponse = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (authResponse.status === 401) {
        console.log('❌ API key authentication: FAILED (Invalid key)');
      } else if (authResponse.status === 403) {
        console.log('❌ API key authentication: FAILED (Insufficient permissions)');
      } else if (authResponse.ok) {
        console.log('✅ API key authentication: OK');
      } else {
        console.log(`❌ API key authentication: FAILED (Status: ${authResponse.status})`);
      }
    } catch (error) {
      console.log('❌ API key authentication: FAILED');
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n📋 Summary:');
  console.log('- If all tests pass: Your network is fine, the issue might be with the VS Code extension');
  console.log('- If internet test fails: Check your internet connection');
  console.log('- If DNS test fails: Check your DNS settings or try using a different DNS (8.8.8.8)');
  console.log('- If Groq API test fails: Check firewall/proxy settings');
}

testConnectivity().catch(console.error); 