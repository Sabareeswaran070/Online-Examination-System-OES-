const logger = require('../config/logger');

// ============================================================
// Wandbox API — Free, No API Key, No Docker, No Signup
// https://wandbox.org
// ============================================================

const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json';

// Language → Wandbox compiler mapping
const COMPILER_MAP = {
    javascript: 'nodejs-20.17.0',
    python: 'cpython-3.12.7',
    java: 'openjdk-jdk-22+36',
    cpp: 'gcc-13.2.0',
    c: 'gcc-13.2.0-c',
};

// Exported for compatibility — frontend checks supported languages
const LANGUAGE_MAP = {
    javascript: 'nodejs',
    python: 'cpython',
    java: 'openjdk',
    cpp: 'gcc',
    c: 'gcc-c',
};

/**
 * Execute code using Wandbox API (free, no auth)
 * @param {string} code - Source code to execute
 * @param {string} language - Language key (javascript, python, java, cpp, c)
 * @param {string} stdin - Standard input for the program
 * @param {number} timeLimit - Time limit in seconds (Wandbox has its own limits ~10s)
 * @param {number} memoryLimit - Memory limit in KB (Wandbox manages this internally)
 * @returns {Object} { stdout, stderr, compile_output, status, time, memory }
 */
async function executeCode(code, language, stdin = '', timeLimit, memoryLimit) {
    const compiler = COMPILER_MAP[language];
    if (!compiler) {
        throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(COMPILER_MAP).join(', ')}`);
    }

    const payload = {
        code: code,
        compiler: compiler,
        stdin: stdin || '',
        'save': false,
    };

    try {
        const response = await fetch(WANDBOX_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Wandbox API error (${response.status}): ${errorText}`);
            throw new Error(`Code execution service returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        // Wandbox response fields:
        //   status: "0" (success) or non-zero (error)
        //   program_message: stdout + stderr combined
        //   program_output: stdout only
        //   program_error: stderr only
        //   compiler_message: compilation output
        //   compiler_output: compiler stdout
        //   compiler_error: compiler stderr

        const exitCode = parseInt(result.status, 10);
        const hasCompileError = !!(result.compiler_error && result.compiler_error.trim());
        const programOutput = result.program_output || '';
        const programError = result.program_error || '';
        const compilerError = result.compiler_error || '';
        const compilerOutput = result.compiler_output || '';
        const compileMsg = (compilerError || compilerOutput || '').trim();

        // Determine status to match what the frontend expects
        let status;
        if (hasCompileError && !programOutput && exitCode !== 0) {
            status = { id: 6, description: 'Compilation Error' };
        } else if (exitCode !== 0 && !hasCompileError) {
            // Check for signal-based termination (timeout, etc.)
            if (result.signal && (result.signal === 'SIGKILL' || result.signal === 'SIGXCPU')) {
                status = { id: 5, description: 'Time Limit Exceeded' };
            } else {
                status = { id: 11, description: 'Runtime Error (NZEC)' };
            }
        } else {
            status = { id: 3, description: 'Accepted' };
        }

        return {
            stdout: programOutput,
            stderr: programError,
            compile_output: hasCompileError ? compileMsg : '',
            status: status,
            time: null,    // Wandbox doesn't return execution time
            memory: null,  // Wandbox doesn't return memory usage
        };
    } catch (error) {
        if (error.message.includes('Code execution service')) throw error;
        logger.error('Wandbox API connection error:', error.message);
        throw new Error('Code execution service is unavailable. Please check your internet connection and try again.');
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
