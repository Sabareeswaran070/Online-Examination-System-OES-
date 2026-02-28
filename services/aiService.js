const Groq = require('groq-sdk');
const logger = require('../config/logger');

/**
 * Generate a coding question using Groq AI (free, fast inference)
 * @param {Object} params - Generation parameters
 * @param {string} params.topic - The topic/concept for the question
 * @param {string} params.difficulty - easy, medium, hard
 * @param {string} params.language - Programming language (javascript, python, java, cpp, c)
 * @param {string} [params.additionalInstructions] - Extra instructions for customization
 * @returns {Object} Generated coding question data
 */
async function generateCodingQuestion({ topic, difficulty, language, visibleTestCaseCount = 2, hiddenTestCaseCount = 3, additionalInstructions = '' }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured. Get a free key at https://console.groq.com/keys and add it to your .env file.');
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = buildPrompt({ topic, difficulty, language, visibleTestCaseCount: visibleTestCaseCount || 2, hiddenTestCaseCount: hiddenTestCaseCount || 3, additionalInstructions });

  // Try models in order — fallback if one is unavailable
  const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
  let lastError = null;

  for (const modelName of MODELS) {
    try {
      logger.info(`Trying Groq model: ${modelName}`);

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert competitive programming question creator. You MUST respond with ONLY a valid JSON object. No markdown, no code blocks, no extra text — just raw JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: modelName,
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const text = chatCompletion.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('Empty response from AI');
      }

      // Parse the JSON response
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        // Try extracting JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          logger.error('AI response was not valid JSON:', text.substring(0, 500));
          throw new Error('AI returned an invalid response format. Please try again.');
        }
      }

      // Validate and normalize the response
      const question = normalizeAIResponse(parsed, { difficulty, language });

      logger.info(`AI generated coding question using Groq/${modelName}: "${question.questionText.substring(0, 80)}..."`);
      return question;
    } catch (error) {
      lastError = error;
      const msg = error.message || '';
      // If rate limited, model unavailable, or server error — try next model
      if (msg.includes('429') || msg.includes('404') || msg.includes('503') || msg.includes('rate') || msg.includes('quota') || msg.includes('not found') || msg.includes('unavailable')) {
        logger.warn(`Groq model ${modelName} unavailable or rate-limited, trying next...`);
        continue;
      }
      if (msg.includes('API') && msg.includes('key')) {
        throw new Error('Invalid Groq API key. Get a free key at https://console.groq.com/keys');
      }
      logger.error('AI question generation error:', error);
      throw error;
    }
  }

  // All models exhausted
  logger.error('All Groq models failed:', lastError);
  throw new Error('All AI models are currently unavailable. Please wait a moment and try again.');
}

/**
 * Build the prompt for Gemini
 */
function buildPrompt({ topic, difficulty, language, visibleTestCaseCount, hiddenTestCaseCount, additionalInstructions }) {
  const difficultyGuide = {
    easy: 'Simple problem suitable for beginners. Should involve basic operations, loops, or simple data structures. Expected solution under 20 lines.',
    medium: 'Intermediate problem requiring understanding of algorithms and data structures. May involve sorting, searching, hash maps, two pointers, or recursion. Expected solution 20-50 lines.',
    hard: 'Advanced problem requiring complex algorithmic thinking. May involve dynamic programming, graph algorithms, advanced data structures, or optimization techniques. Expected solution 30-80 lines.',
  };

  return `You are an expert competitive programming question creator. Generate a complete coding question with the following specifications:

**Topic:** ${topic}
**Difficulty:** ${difficulty} - ${difficultyGuide[difficulty] || difficultyGuide.medium}
**Primary Language:** ${language}
**Number of Visible Test Cases:** ${visibleTestCaseCount} (students can see these)
**Number of Hidden Test Cases:** ${hiddenTestCaseCount} (used for evaluation only)
${additionalInstructions ? `**Additional Instructions:** ${additionalInstructions}` : ''}

Generate a well-structured coding question and return it as a JSON object with EXACTLY this structure:

{
  "questionText": "Full problem statement in markdown format. Include a clear problem description, examples inline, and edge cases to consider.",
  "difficulty": "${difficulty}",
  "marks": <number: 5 for easy, 10 for medium, 15 for hard>,
  "inputFormat": "Detailed description of input format. Explain each line of input clearly.",
  "outputFormat": "Detailed description of expected output format.",
  "constraints": "All constraints on input values, array sizes, time complexity expectations etc. Use mathematical notation where appropriate.",
  "sampleInput": "A sample input that demonstrates the problem",
  "sampleOutput": "The expected output for the sample input", 
  "visibleTestCases": [
    // EXACTLY ${visibleTestCaseCount} visible test cases, each with input, expectedOutput, AND explanation
    { "input": "test input", "expectedOutput": "expected output", "explanation": "Step-by-step explanation" }
  ],
  "hiddenTestCases": [
    // EXACTLY ${hiddenTestCaseCount} hidden test cases, each MUST have both "input" and "expectedOutput" (non-empty)
    { "input": "edge case input", "expectedOutput": "expected output" }
  ],
  "starterCode": "Starter code template in ${language} with function signature, comments, and input/output handling boilerplate. DO NOT provide the full solution or implementation. Leave the actual logic blank or add a comment like // Write your code here",
  "solutionCode": "The full working solution code in ${language} that solves the problem completely",
  "explanation": "Brief editorial explaining the optimal approach, time complexity, and space complexity",
  "timeLimit": <number in milliseconds: 1000 for easy, 2000 for medium/hard>,
  "memoryLimit": <number in MB: 256>,
  "programmingLanguage": "${language}",
  "tags": ["tag1", "tag2", "tag3"]
}

IMPORTANT RULES:
1. The problem statement should be clear, unambiguous, and well-written
2. Generate EXACTLY ${visibleTestCaseCount} visible test cases, each with "input", "expectedOutput", and "explanation" fields
3. Generate EXACTLY ${hiddenTestCaseCount} hidden test cases covering edge cases (empty input, single element, large values, boundary values, etc.)
4. EVERY hidden test case MUST have both a non-empty "input" AND a non-empty "expectedOutput" — never leave them blank
5. The starter code should have proper input parsing and output formatting
6. Constraints should be realistic for the difficulty level
7. All test case inputs/outputs MUST be consistent with the problem statement
8. Return ONLY the JSON object, no additional text
9. The starterCode MUST ONLY contain the boilerplate and function signature. NEVER write the actual solution inside the starterCode because it will be shown to the students directly.
10. The solutionCode MUST contain the full working logic and solution to the problem.`;
}

/**
 * Normalize and validate AI response to match our Question model schema
 */
function normalizeAIResponse(data, { difficulty, language }) {
  return {
    questionText: data.questionText || 'Generated Question',
    type: 'Coding',
    difficulty: data.difficulty || difficulty,
    marks: Number(data.marks) || (difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10),
    negativeMarks: 0,
    inputFormat: data.inputFormat || '',
    outputFormat: data.outputFormat || '',
    constraints: data.constraints || '',
    sampleInput: data.sampleInput || '',
    sampleOutput: data.sampleOutput || '',
    visibleTestCases: (data.visibleTestCases || []).map(tc => ({
      input: String(tc.input || ''),
      expectedOutput: String(tc.expectedOutput || ''),
      explanation: String(tc.explanation || ''),
    })),
    hiddenTestCases: (data.hiddenTestCases || []).filter(tc => tc.input && tc.expectedOutput).map(tc => ({
      input: String(tc.input || ''),
      expectedOutput: String(tc.expectedOutput || ''),
    })),
    testCases: [
      ...(data.visibleTestCases || []).map(tc => ({
        input: String(tc.input || ''),
        expectedOutput: String(tc.expectedOutput || ''),
      })),
      ...(data.hiddenTestCases || []).map(tc => ({
        input: String(tc.input || ''),
        expectedOutput: String(tc.expectedOutput || ''),
      })),
    ],
    starterCode: data.starterCode || '',
    explanation: data.explanation || '',
    timeLimit: Number(data.timeLimit) || 1000,
    memoryLimit: Number(data.memoryLimit) || 256,
    programmingLanguage: data.programmingLanguage || language,
    codeSnippet: data.solutionCode || data.starterCode || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

/**
 * Generate questions of ANY type (MCQ, Descriptive, TrueFalse, Coding) using Groq AI
 */
async function generateQuestion({ topic, type = 'MCQ', difficulty = 'medium', count = 5, language = 'javascript', additionalInstructions = '' }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured. Get a free key at https://console.groq.com/keys and add it to your .env file.');
  }

  // For coding, delegate to existing function
  if (type === 'Coding') {
    const q = await generateCodingQuestion({ topic, difficulty, language, additionalInstructions });
    return [q];
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = buildMultiTypePrompt({ topic, type, difficulty, count, additionalInstructions });

  const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
  let lastError = null;

  for (const modelName of MODELS) {
    try {
      logger.info(`Trying Groq model: ${modelName} for ${type} generation`);

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert exam question creator for educational institutions. You MUST respond with ONLY a valid JSON object. No markdown, no code blocks, no extra text — just raw JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: modelName,
        temperature: 0.8,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const text = chatCompletion.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from AI');

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          throw new Error('AI returned an invalid response format. Please try again.');
        }
      }

      const questions = normalizeMultiTypeResponse(parsed, { type, difficulty });
      logger.info(`AI generated ${questions.length} ${type} question(s) using Groq/${modelName}`);
      return questions;
    } catch (error) {
      lastError = error;
      const msg = error.message || '';
      if (msg.includes('429') || msg.includes('404') || msg.includes('503') || msg.includes('rate') || msg.includes('quota') || msg.includes('not found') || msg.includes('unavailable')) {
        logger.warn(`Groq model ${modelName} unavailable, trying next...`);
        continue;
      }
      if (msg.includes('API') && msg.includes('key')) {
        throw new Error('Invalid Groq API key. Get a free key at https://console.groq.com/keys');
      }
      throw error;
    }
  }

  throw new Error('All AI models are currently unavailable. Please wait and try again.');
}

function buildMultiTypePrompt({ topic, type, difficulty, count, additionalInstructions }) {
  const marksMap = { easy: 1, medium: 2, hard: 3 };
  const marks = marksMap[difficulty] || 2;

  const typeInstructions = {
    MCQ: `Generate ${count} Multiple Choice Questions (MCQ). Each question must have EXACTLY 4 options, with exactly ONE correct answer.

Return JSON:
{
  "questions": [
    {
      "questionText": "Clear, unambiguous question text",
      "difficulty": "${difficulty}",
      "marks": ${marks},
      "options": [
        { "text": "Option A", "isCorrect": false },
        { "text": "Option B", "isCorrect": true },
        { "text": "Option C", "isCorrect": false },
        { "text": "Option D", "isCorrect": false }
      ],
      "explanation": "Why the correct answer is correct and why others are wrong"
    }
  ]
}`,

    TrueFalse: `Generate ${count} True/False questions. Each must have exactly 2 options: "True" and "False", with one marked correct.

Return JSON:
{
  "questions": [
    {
      "questionText": "A clear statement that is either true or false",
      "difficulty": "${difficulty}",
      "marks": ${marks},
      "options": [
        { "text": "True", "isCorrect": true },
        { "text": "False", "isCorrect": false }
      ],
      "explanation": "Why the statement is true/false with reasoning"
    }
  ]
}`,

    Descriptive: `Generate ${count} descriptive/short-answer questions. These are open-ended questions requiring detailed written answers.

Return JSON:
{
  "questions": [
    {
      "questionText": "A clear question requiring a detailed written answer",
      "difficulty": "${difficulty}",
      "marks": ${marks * 3},
      "correctAnswer": "A comprehensive model answer (3-5 sentences)",
      "explanation": "Key points that should be covered in the answer"
    }
  ]
}`,
  };

  return `You are an expert exam question creator. Generate questions about the following topic:

**Topic/Subject:** ${topic}
**Question Type:** ${type}
**Difficulty:** ${difficulty}
**Number of Questions:** ${count}
${additionalInstructions ? `**Additional Instructions:** ${additionalInstructions}` : ''}

${typeInstructions[type] || typeInstructions.MCQ}

RULES:
1. Questions must be factually accurate and educationally sound
2. Questions should cover different aspects of the topic
3. Difficulty should match: easy = recall/basic, medium = understanding/application, hard = analysis/evaluation
4. Each question must be unique and non-overlapping
5. Return ONLY the JSON object, no extra text`;
}

function normalizeMultiTypeResponse(data, { type, difficulty }) {
  const rawQuestions = data.questions || (Array.isArray(data) ? data : [data]);

  return rawQuestions.map(q => {
    const base = {
      questionText: q.questionText || q.question || 'Generated Question',
      type: type,
      difficulty: q.difficulty || difficulty,
      marks: Number(q.marks) || (difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2),
      negativeMarks: 0,
      explanation: q.explanation || '',
      isGlobal: true,
      tags: Array.isArray(q.tags) ? q.tags : [],
    };

    if (type === 'MCQ' || type === 'TrueFalse') {
      base.options = (q.options || []).map(o => ({
        text: String(o.text || o),
        isCorrect: Boolean(o.isCorrect),
      }));
    }

    if (type === 'Descriptive') {
      base.correctAnswer = q.correctAnswer || q.idealAnswer || '';
    }

    return base;
  });
}

/**
 * Evaluate a student's coding submission using AI
 */
async function evaluateCodingSubmission({ question, submission }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = `You are an expert technical interviewer and code reviewer. Evaluate the following student code submission for a programming question.

**Question:** 
${question.questionText}

**Constraints:**
${question.constraints}

**Reference Solution:**
${question.codeSnippet || 'Not provided'}

**Student Submission:**
\`\`\`${question.programmingLanguage || 'code'}
${submission.codeAnswer || submission.textAnswer || 'No code submitted'}
\`\`\`

**Max Marks:** ${question.marks}

**Test Cases (for context):**
${(question.testCases || []).map((tc, i) => `Case ${i + 1}: Input="${tc.input}", Expected="${tc.expectedOutput}"`).join('\n')}

Evaluate the student's submission based on:
1. **Correctness:** Does it solve the problem described?
2. **Efficiency:** Is the time and space complexity optimal?
3. **Code Quality:** Is the code clean, well-structured, and easy to read?

Return a JSON object with:
{
  "marksAwarded": <number between 0 and ${question.marks}>,
  "feedback": "Concise but helpful feedback (2-3 sentences). Highlight what was good and what can be improved.",
  "isCorrect": <boolean>,
  "complexityAnalysis": "Brief O(n) analysis"
}

IMPORTANT:
- Be fair but encouraging.
- If the code has minor syntax errors but the logic is mostly correct, award partial marks.
- Return ONLY the JSON object.`;

  const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

  for (const modelName of MODELS) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an AI code evaluator. You MUST respond with ONLY a valid JSON object.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: modelName,
        temperature: 0.2, // Low temperature for consistent grading
        response_format: { type: 'json_object' },
      });

      const text = chatCompletion.choices?.[0]?.message?.content;
      return JSON.parse(text);
    } catch (error) {
      logger.error(`AI Evaluation error with ${modelName}:`, error);
      continue;
    }
  }

  throw new Error('AI evaluation service is currently unavailable.');
}

module.exports = {
  generateCodingQuestion,
  generateQuestion,
  evaluateCodingSubmission,
};
