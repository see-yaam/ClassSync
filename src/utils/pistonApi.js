/**
 * pistonApi.js
 * Code evaluation engine using Paiza.io API (free, reliable, no API key required).
 * Supports Python, C++, C, JavaScript, Java, C#, Go, Ruby, PHP.
 * Docs: https://paiza.io/
 */

const PAIZA_CREATE_URL = 'https://api.paiza.io/runners/create?api_key=guest';
const PAIZA_DETAILS_URL = 'https://api.paiza.io/runners/get_details';

// Language key mapping to Paiza.io language identifiers
const PAIZA_LANG_MAP = {
  'python':     'python3',
  'python3':    'python3',
  'javascript': 'javascript',
  'js':         'javascript',
  'nodejs':     'javascript',
  'c':          'c',
  'c++':        'cpp',
  'cpp':        'cpp',
  'java':       'java',
  'csharp':     'csharp',
  'cs':         'csharp',
  'go':         'go',
  'ruby':       'ruby',
  'php':        'php'
};

const SUPPORTED_LANGUAGES = {
  'python':     { language: 'Python 3',     version: '3.x' },
  'javascript': { language: 'JavaScript',   version: 'Node.js' },
  'cpp':        { language: 'C++',          version: 'GCC' },
  'c':          { language: 'C',            version: 'GCC' },
  'java':       { language: 'Java',         version: 'OpenJDK' },
  'csharp':     { language: 'C#',           version: '.NET' },
  'go':         { language: 'Go',           version: 'latest' },
  'ruby':       { language: 'Ruby',         version: '3.x' },
  'php':        { language: 'PHP',          version: '8.x' }
};

/**
 * Run a single code snippet against one test case via Paiza.io API
 */
const runSingleTestCase = async (userCode, language, version, stdin, expectedOutput, timeLimitMs = 5000) => {
  const langKey = (language || '').toLowerCase();
  const paizaLang = PAIZA_LANG_MAP[langKey];

  if (!paizaLang) {
    return {
      verdict: 'Unsupported Language',
      error: `Language "${language}" is not supported.`
    };
  }

  try {
    // 1. Create runner session
    const createRes = await fetch(PAIZA_CREATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: userCode,
        language: paizaLang,
        input: stdin || ''
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return {
        verdict: 'API Error',
        error: `Paiza API returned status ${createRes.status}: ${errText}`
      };
    }

    const createData = await createRes.json();
    if (!createData.id) {
      return {
        verdict: 'API Error',
        error: createData.error || 'Failed to create execution session.'
      };
    }

    const sessionId = createData.id;

    // 2. Poll for completion (max 10 iterations = ~8s)
    let details = null;
    const maxPolls = Math.max(10, Math.ceil(timeLimitMs / 500));

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 600));
      const getRes = await fetch(`${PAIZA_DETAILS_URL}?id=${sessionId}&api_key=guest`);
      if (getRes.ok) {
        details = await getRes.json();
        if (details.status === 'completed') break;
      }
    }

    if (!details || details.status !== 'completed') {
      return { verdict: 'Time Limit Exceeded' };
    }

    // 3. Evaluate results
    const buildStderr = details.build_stderr || '';
    const stderr = details.stderr || '';
    const buildResult = details.build_result;
    const resultStatus = details.result; // 'success', 'failure', 'timeout'

    if (resultStatus === 'timeout') {
      return { verdict: 'Time Limit Exceeded' };
    }

    if (buildResult === 'failure' || buildStderr.length > 0) {
      return {
        verdict: 'Compilation Error',
        error: (buildStderr || stderr || 'Compilation failed').slice(0, 1000)
      };
    }

    if (details.exit_code !== '0' && details.exit_code !== 0 && stderr.length > 0) {
      return {
        verdict: 'Runtime Error',
        error: (stderr || 'Runtime error occurred').slice(0, 1000)
      };
    }

    // 4. Compare output
    const actualOutput = (details.stdout || '').trim();
    const cleanExpected = (expectedOutput || '').trim();

    if (actualOutput === cleanExpected) {
      return { verdict: 'Accepted', output: actualOutput };
    } else {
      return {
        verdict: 'Wrong Answer',
        output: actualOutput,
        expected: cleanExpected
      };
    }
  } catch (err) {
    return {
      verdict: 'API Error',
      error: `Execution request failed: ${err.message}`
    };
  }
};

/**
 * Run code against ALL test cases for a question
 */
const evaluateAllTestCases = async (userCode, language, version, testCases, timeLimitMs = 5000) => {
  let earnedPoints = 0;
  let totalPoints = 0;
  let passed = 0;
  const results = [];

  for (const tc of testCases) {
    totalPoints += (tc.points || 1);
    let result;
    try {
      result = await runSingleTestCase(
        userCode,
        language,
        version,
        tc.input_data,
        tc.expected_output,
        timeLimitMs
      );
    } catch (err) {
      result = { verdict: 'Internal Error', error: err.message };
    }

    const isPassed = result.verdict === 'Accepted';
    if (isPassed) {
      earnedPoints += (tc.points || 1);
      passed++;
    }

    results.push({
      test_case_id: tc.test_case_id,
      order_number: tc.order_number,
      is_hidden: tc.is_hidden,
      verdict: result.verdict,
      passed: isPassed,
      points: tc.points || 1,
      earned: isPassed ? (tc.points || 1) : 0,
      input: tc.is_hidden ? null : (tc.input_data || ''),
      expected: tc.is_hidden ? null : (tc.expected_output || ''),
      actual: tc.is_hidden ? null : (result.output || null),
      error: result.error || null,
    });
  }

  const percentScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  return {
    totalPoints,
    earnedPoints,
    passed,
    total: testCases.length,
    percentScore: Math.round(percentScore * 100) / 100,
    results
  };
};

/**
 * Get supported languages list for frontend dropdown
 */
const getSupportedLanguages = () => {
  return Object.entries(SUPPORTED_LANGUAGES).map(([key, val]) => ({
    key,
    name: val.language,
    version: val.version,
    display: `${val.language} (${val.version})`
  }));
};

module.exports = { runSingleTestCase, evaluateAllTestCases, getSupportedLanguages, SUPPORTED_LANGUAGES };
