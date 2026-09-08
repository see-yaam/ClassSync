const http = require('http');
const db = require('../src/config/db');

function makeAuthRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: method,
      headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runAuthTests() {
  console.log('--- Starting ClassSync Auth Automated Tests ---');

  const testEmail = `testuser_${Date.now()}@uiu.ac.bd`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Test User Auth';

  // 1. Submit Registration
  console.log('1. Testing POST /api/auth/register...');
  const regRes = await makeAuthRequest('/auth/register', 'POST', {
    email: testEmail,
    password: testPassword,
    full_name: testName
  });
  console.log('Register Response Status:', regRes.status, 'Message:', regRes.body ? regRes.body.message : regRes.body);
  if (regRes.status !== 200) throw new Error(`Registration Step 1 failed with status ${regRes.status}`);

  // Verify User NOT YET in users table
  const [unverifiedUser] = await db.query(`SELECT user_id FROM users WHERE email = ? AND is_verified = true`, [testEmail]);
  if (unverifiedUser.length > 0) throw new Error('User row created prematurely before OTP verification!');

  // 2. Fetch OTP from DB
  const [otpRows] = await db.query(
    `SELECT otp_code FROM password_reset_otp WHERE otp_purpose = 'registration' AND is_used = false ORDER BY otp_id DESC LIMIT 1`
  );
  if (otpRows.length === 0) throw new Error('OTP was not generated in password_reset_otp');
  const otpCode = otpRows[0].otp_code;
  console.log(`2. Retrieved Registration OTP from DB: ${otpCode}`);

  // 3. Verify OTP & Create User
  console.log('3. Testing POST /api/auth/verify-otp...');
  const verifyRes = await makeAuthRequest('/auth/verify-otp', 'POST', {
    email: testEmail,
    otp_code: otpCode
  });
  console.log('Verify Response:', verifyRes.body.message);
  if (verifyRes.status !== 200 || !verifyRes.body.token) throw new Error('OTP Verification failed');

  const jwtToken = verifyRes.body.token;

  // 4. Test Login
  console.log('4. Testing POST /api/auth/login...');
  const loginRes = await makeAuthRequest('/auth/login', 'POST', {
    email: testEmail,
    password: testPassword
  });
  console.log('Login Response:', loginRes.body.message);
  if (loginRes.status !== 200 || !loginRes.body.token) throw new Error('Login failed');

  // 5. Access Protected Route with JWT
  console.log('5. Testing Protected GET /api/users/me using JWT Bearer Token...');
  const meRes = await makeAuthRequest('/users/me', 'GET', null, jwtToken);
  console.log('User Profile:', meRes.body.data.full_name, meRes.body.data.email);
  if (meRes.status !== 200 || meRes.body.data.email !== testEmail) throw new Error('Protected route JWT check failed');

  // 6. Test Forgot Password
  console.log('6. Testing POST /api/auth/forgot-password...');
  const forgotRes = await makeAuthRequest('/auth/forgot-password', 'POST', { email: testEmail });
  console.log('Forgot Password Response:', forgotRes.body.message);
  if (forgotRes.status !== 200) throw new Error('Forgot password failed');

  // Fetch Reset OTP
  const [resetOtpRows] = await db.query(
    `SELECT otp_code FROM password_reset_otp WHERE otp_purpose = 'password_reset' AND is_used = false ORDER BY otp_id DESC LIMIT 1`
  );
  const resetOtpCode = resetOtpRows[0].otp_code;

  // 7. Reset Password
  const newPassword = 'NewSecretPassword456!';
  console.log('7. Testing POST /api/auth/reset-password...');
  const resetRes = await makeAuthRequest('/auth/reset-password', 'POST', {
    email: testEmail,
    otp_code: resetOtpCode,
    new_password: newPassword
  });
  console.log('Reset Password Response:', resetRes.body.message);
  if (resetRes.status !== 200) throw new Error('Reset password failed');

  // 8. Verify Login with New Password
  console.log('8. Verifying login with new password...');
  const newLoginRes = await makeAuthRequest('/auth/login', 'POST', {
    email: testEmail,
    password: newPassword
  });
  if (newLoginRes.status !== 200) throw new Error('Login with new password failed');

  console.log('\n✅ ALL AUTH API TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

// Start updated server instance and run tests
const server = require('../src/server');
setTimeout(() => {
  runAuthTests().catch(err => {
    console.error('❌ Auth API Test Failed:', err);
    process.exit(1);
  });
}, 1500);
