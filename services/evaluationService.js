const Question = require('../models/Question');
const Exam = require('../models/Exam');
const Result = require('../models/Result');

/**
 * Evaluate a single answer based on question type
 * @param {Object} question - The question object from DB
 * @param {Object} answer - The student's answer
 * @returns {Object} - Evaluated answer object with marks
 */
const evaluateAnswer = (question, answer, negativeMarkingEnabled, examNegativeMarks) => {
    let isCorrect = false;
    let marksAwarded = 0;

    // Auto-evaluate MCQ and TrueFalse
    if (question.type === 'MCQ' || question.type === 'TrueFalse') {
        const correctOption = question.options.find((opt) => opt.isCorrect);

        if (correctOption && correctOption.text === answer.selectedAnswer) {
            isCorrect = true;
            marksAwarded = question.marks;
        } else {
            isCorrect = false;
            // Use question's negativeMarks if > 0, otherwise use exam's global negativeMarks
            const negativeValue = question.negativeMarks > 0 ? question.negativeMarks : (examNegativeMarks || 0);
            marksAwarded = negativeMarkingEnabled ? -negativeValue : 0;
        }
    }

    return {
        isCorrect,
        marksAwarded,
        isEvaluated: ['MCQ', 'TrueFalse'].includes(question.type),
    };
};

/**
 * Calculate total score and update result
 * @param {Object} result - The result document
 * @param {Object} exam - The exam document
 * @returns {Object} - Updated result statistics
 */
exports.evaluateExamSubmission = async (exam, result, submittedAnswers) => {
    let totalScore = 0;
    let hasDescriptive = false;

    const processedAnswers = [];

    for (const submittedAnswer of submittedAnswers) {
        const question = await Question.findById(submittedAnswer.questionId);
        if (!question) continue;

        const answerData = {
            questionId: question._id,
            selectedAnswer: submittedAnswer.selectedAnswer,
            textAnswer: submittedAnswer.textAnswer,
            codeAnswer: submittedAnswer.codeAnswer,
            timeTaken: submittedAnswer.timeTaken,
        };

        // Evaluate
        const evaluation = evaluateAnswer(question, submittedAnswer, exam.negativeMarkingEnabled, exam.negativeMarks);

        // Check if manual evaluation is needed
        if (!evaluation.isEvaluated) {
            hasDescriptive = true;
        }

        Object.assign(answerData, evaluation);
        totalScore += evaluation.marksAwarded;
        processedAnswers.push(answerData);
    }

    return {
        answers: processedAnswers,
        score: totalScore,
        hasDescriptive,
    };
};
