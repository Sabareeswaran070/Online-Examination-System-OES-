const logger = require('../config/logger');

// Judge0 CE Language ID mapping
const LANGUAGE_MAP = {
    javascript: 63,  // Node.js
    python: 71,      // Python 3
    java: 62,        // Java (OpenJDK)
    cpp: 54,         // C++ (GCC)
    c: 50,           // C (GCC)
};

// Default execution limits
const DEFAULT_TIME_LIMIT = 5;        // seconds
const DEFAULT_MEMORY_LIMIT = 128000; // KB (128 MB)

// Judge0 API base URL — configurable via env var
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

/**
 * Execute code using Judge0 CE API
 * @param {string} code - Source code to execute
 * @param {string} language - Language key (javascript, python, java, cpp, c)
 * @param {string} stdin - Standard input for the program
 * @param {number} timeLimit - Time limit in seconds
 * @param {number} memoryLimit - Memory limit in KB
 * @returns {Object} { stdout, stderr, compile_output, status, time, memory }
 */
async function executeCode(code, language, stdin = '', timeLimit, memoryLimit) {
    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
        throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`);
    }

    const payload = {
        source_code: Buffer.from(code).toString('base64'),
        language_id: languageId,
        stdin: stdin ? Buffer.from(stdin).toString('base64') : '',
        time_limit: timeLimit || DEFAULT_TIME_LIMIT,
        memory_limit: memoryLimit || DEFAULT_MEMORY_LIMIT,
    };

    const headers = {
        'Content-Type': 'application/json',
    };

    // Add RapidAPI headers if API key is configured
    if (JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = JUDGE0_API_HOST;
    }

    try {
        const response = await fetch(
            `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,status,time,memory`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Judge0 API error (${response.status}): ${errorText}`);
            throw new Error(`Code execution service returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        // Decode base64 outputs
        return {
            stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : '',
            stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : '',
            compile_output: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : '',
            status: result.status,
            time: result.time,
            memory: result.memory,
        };
    } catch (error) {
        if (error.message.includes('Code execution service')) throw error;
        logger.error('Judge0 API connection error:', error.message);
        throw new Error('Code execution service is unavailable. Please try again later.');
    }
}

/**
 * Run code against multiple test cases
 * @param {string} code - Source code
 * @param {string} language - Language key
 * @param {Array} testCases - Array of { input, expectedOutput }
 * @param {number} timeLimit - Time limit per test case
 * @param {number} memoryLimit - Memory limit in KB
 * @returns {Object} { results: [...], summary: { passed, failed, total } }
 */
async function runAgainstTestCases(code, language, testCases, timeLimit, memoryLimit) {
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        try {
            const result = await executeCode(code, language, testCase.input || '', timeLimit, memoryLimit);

            const actualOutput = (result.stdout || '').trim();
            const expectedOutput = (testCase.expectedOutput || '').trim();
            const isPassed = result.status?.id === 3 && actualOutput === expectedOutput;

            if (isPassed) passed++;
            else failed++;

            results.push({
                input: testCase.input || '',
                expectedOutput: expectedOutput,
                actualOutput: actualOutput,
                passed: isPassed,
                status: result.status,
                stderr: result.stderr,
                compile_output: result.compile_output,
                time: result.time,
                memory: result.memory,
            });
        } catch (error) {
            failed++;
            results.push({
                input: testCase.input || '',
                expectedOutput: testCase.expectedOutput || '',
                actualOutput: '',
                passed: false,
                error: error.message,
            });
        }
    }

    return {
        results,
        summary: { passed, failed, total: testCases.length },
    };
}

module.exports = {
    executeCode,
    runAgainstTestCases,
    LANGUAGE_MAP,
};
