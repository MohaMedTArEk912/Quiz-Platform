

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🔒 Starting Security Verification...\n');

  // Test 1: Register Valid User
  console.log('Test 1: Register Valid User');
  const user = {
    userId: `test_${Date.now()}`,
    name: 'Secure Tester',
    email: `test_${Date.now()}@example.com`,
    password: 'securePassword123'
  };
  
  try {
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    
    if (regRes.status === 201) {
      const data = await regRes.json();
      if (data.token) console.log('✅ PASS: Registered and received token');
      else console.log('❌ FAIL: Registered but no token');
    } else {
      console.log(`❌ FAIL: Registration failed with ${regRes.status}`);
      console.log(await regRes.text());
    }
  } catch (e) { console.log('❌ FAIL: Network error', e.message); }

  console.log('\n--------------------------------\n');

  // Test 2: Invalid User (Zod Check)
  console.log('Test 2: Register Invalid User (Bad Email)');
  try {
    const invalidRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, email: 'not-an-email' })
    });
    
    if (invalidRes.status === 400) {
      console.log('✅ PASS: Rejected invalid email');
    } else {
      console.log(`❌ FAIL: Expected 400, got ${invalidRes.status}`);
    }
  } catch (e) { console.log('❌ FAIL: Network error', e.message); }

  console.log('\n--------------------------------\n');

  // Test 3: Login (Password Hash Check implicitly)
  console.log('Test 3: Login with Correct Password');
  let token = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password })
    });
    
    if (loginRes.status === 200) {
      const data = await loginRes.json();
      token = data.token;
      console.log('✅ PASS: Login successful with token');
    } else {
      console.log(`❌ FAIL: Login failed with ${loginRes.status}`);
    }
  } catch (e) { console.log('❌ FAIL: Network error', e.message); }

  console.log('\n--------------------------------\n');

  // Test 4: Protected Route
  console.log('Test 4: Access Protected Route (requires token)');
  // We don't have a simple "me" route, so we'll try to use verify-session or similar if it uses middleware
  // Or just try a known protected route. 
  // Let's assume we can try to "change password" or something that requires auth.
  // Actually, verifySession was updated to check token in body potentially, but middleware is applied to verifyAdmin?
  // Let's check verify-session, we updated it to verify token.
  
  try {
    const validRes = await fetch(`${BASE_URL}/verify-session`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
        // 'Authorization': `Bearer ${token}` // verifySession expects token in body per my change?
      },
      body: JSON.stringify({ token })
    });
    
    if (validRes.status === 200) {
       console.log('✅ PASS: Protected route verification successful');
    } else {
       console.log(`❌ FAIL: Protected route failed ${validRes.status}`);
    }
  } catch (e) { console.log('❌ FAIL: Network error', e.message); }

  console.log('\n--------------------------------\n');

  // Test 5: Protected Route No Token
  console.log('Test 5: Access Protected Route without Token');
  try {
     const noTokenRes = await fetch(`${BASE_URL}/verify-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (noTokenRes.status === 401) {
       console.log('✅ PASS: Rejected without token');
    } else {
       console.log(`❌ FAIL: Expected 401, got ${noTokenRes.status}`);
    }
  } catch (e) { console.log('❌ FAIL: Network error', e.message); }
}

runTests();
