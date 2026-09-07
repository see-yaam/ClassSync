const http = require('http');
const db = require('../src/config/db');

// Helper HTTP request function
function makeRequest(path, method = 'GET', body = null, userId = 1) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId.toString(),
        'Content-Length': Buffer.byteLength(dataString)
      }
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

async function runTests() {
  console.log('--- Starting ClassSync API Automated Tests ---');

  // Test 1: Get Users
  console.log('1. Testing GET /api/users...');
  const usersRes = await makeRequest('/users');
  console.log('Users Count:', usersRes.body.data ? usersRes.body.data.length : 0);
  if (usersRes.status !== 200) throw new Error('Users test failed');

  // Test 2: Create Classroom
  console.log('2. Testing POST /api/classrooms...');
  const createRoomRes = await makeRequest('/classrooms', 'POST', {
    classroom_name: 'CSE 4511: Distributed Systems',
    description: 'Advanced DB & Systems Lab'
  }, 1);
  console.log('Created Room Credentials:', createRoomRes.body.data);
  if (createRoomRes.status !== 201) throw new Error('Create classroom failed');

  const newRoomId = createRoomRes.body.data.classroom_id;
  const roomNum = createRoomRes.body.data.room_number;
  const roomPass = createRoomRes.body.data.room_password;

  // Test 3: Join Classroom (User 2 - Bob)
  console.log('3. Testing POST /api/classrooms/join...');
  const joinRes = await makeRequest('/classrooms/join', 'POST', {
    room_number: roomNum,
    room_password: roomPass
  }, 2);
  console.log('Join Result:', joinRes.body.message);
  if (joinRes.status !== 200) throw new Error('Join classroom failed');

  // Test 4: Create Problem Bank Item
  console.log('4. Testing POST /api/classrooms/:id/problems...');
  const probRes = await makeRequest(`/classrooms/${newRoomId}/problems`, 'POST', {
    category: 'Distributed DB',
    problem_title: 'Two-Phase Commit Protocol',
    problem_description: 'Describe 2PC prepared and commit states.',
    difficulty: 'hard'
  }, 1);
  console.log('Created Problem ID:', probRes.body.data.problem_id);
  if (probRes.status !== 201) throw new Error('Create problem failed');

  // Test 5: Add Problem Solution
  const probId = probRes.body.data.problem_id;
  console.log('5. Testing POST /api/problems/:id/answer...');
  const solRes = await makeRequest(`/problems/${probId}/answer`, 'POST', {
    solution_text: 'Phase 1: Prepare request -> Phase 2: Commit/Abort'
  }, 1);
  console.log('Solution Result:', solRes.body.message);
  if (solRes.status !== 200) throw new Error('Post solution failed');

  // Test 6: Create Homework & Question
  console.log('6. Testing Homework & Question creation...');
  const hwRes = await makeRequest(`/classrooms/${newRoomId}/homework`, 'POST', {
    title: 'Lab 01: 2PC Implementation',
    description: 'Coding assignment on 2PC',
    total_points: 100,
    is_published: true
  }, 1);
  const hwId = hwRes.body.data.homework_id;

  const qRes = await makeRequest(`/homework/${hwId}/questions`, 'POST', {
    question_type: 'text',
    question_text: 'Implement phase 1 voting logic.',
    points: 100
  }, 1);
  const qId = qRes.body.data.question_id;

  // Test 7: Submit Solution (User 2 - Bob)
  console.log('7. Testing Question Submission...');
  const subRes = await makeRequest(`/questions/${qId}/submit`, 'POST', {
    code_content: 'function phase1Vote() { return "VOTE_COMMIT"; }'
  }, 2);
  console.log('Submission Result:', subRes.body.message);
  if (subRes.status !== 200) throw new Error('Submission failed');

  // Test 8: Submission Matrix
  console.log('8. Testing GET /api/homework/:id/matrix...');
  const matrixRes = await makeRequest(`/homework/${hwId}/matrix`, 'GET', null, 1);
  console.log('Matrix Pivot Rows Count:', matrixRes.body.data.matrix.length);
  if (matrixRes.status !== 200) throw new Error('Matrix failed');

  // Test 9: Grade Submission & Notification check
  const subId = subRes.body.data.submission_id;
  console.log('9. Testing Submission Grading...');
  const gradeRes = await makeRequest(`/submissions/${subId}/grade`, 'POST', {
    score: 95.0,
    feedback: 'Excellent implementation!',
    is_draft: false
  }, 1);
  console.log('Grading Result:', gradeRes.body.message);
  if (gradeRes.status !== 200) throw new Error('Grading failed');

  // Check notifications for Bob (User 2)
  console.log('10. Testing GET /api/users/me/notifications for Bob...');
  const notiRes = await makeRequest('/me/notifications', 'GET', null, 2);
  console.log('Bob Unread Notifications:', notiRes.body.unreadCount);
  if (notiRes.status !== 200 || notiRes.body.unreadCount === 0) throw new Error('Notifications check failed');

  // Test 11: Plagiarism Scan
  console.log('11. Testing Plagiarism Scan...');
  // Submit identical code for User 3 (Charlie)
  await makeRequest(`/classrooms/join`, 'POST', { room_number: roomNum, room_password: roomPass }, 3);
  await makeRequest(`/questions/${qId}/submit`, 'POST', {
    code_content: 'function phase1Vote() { return "VOTE_COMMIT"; }'
  }, 3);

  const scanRes = await makeRequest(`/classrooms/${newRoomId}/plagiarism-check`, 'POST', null, 1);
  console.log('Plagiarism Scan Result:', scanRes.body.message);
  if (scanRes.status !== 200) throw new Error('Plagiarism scan failed');

  console.log('\n✅ ALL API TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

// Start temporary server if not running, then execute tests
const server = require('../src/server');
setTimeout(() => {
  runTests().catch(err => {
    console.error('❌ API Test Failed:', err);
    process.exit(1);
  });
}, 1500);
