import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { studentService } from '@/services';
import { formatDuration } from '@/utils/dateUtils';
import { QUESTION_TYPES } from '@/config/constants';
import toast from 'react-hot-toast';

const TakeExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [result, setResult] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  useEffect(() => {
    startExam();
  }, [id]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && exam) {
      handleSubmit(true); // Auto-submit
    }
  }, [timeLeft]);

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (result && Object.keys(answers).length > 0) {
      const interval = setInterval(() => {
        saveCurrentAnswer();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [answers, result]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && result) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          toast.error(`Warning: Tab switch detected (${newCount})`);
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [result]);

  const startExam = async () => {
    try {
      const response = await studentService.startExam(id);
      setExam(response.data.exam);
      setResult(response.data.result);
      setTimeLeft(response.data.exam.duration * 60); // Convert to seconds
      
      // Initialize answers from saved state if any
      if (response.data.result.answers) {
        const savedAnswers = {};
        response.data.result.answers.forEach(ans => {
          savedAnswers[ans.questionId] = ans.selectedAnswer || ans.textAnswer || ans.codeAnswer || '';
        });
        setAnswers(savedAnswers);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start exam');
      navigate('/student/exams');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentAnswer = async () => {
    if (!result || !exam) return;

    const question = exam.questions[currentQuestion];
    const answer = answers[question._id];

    if (!answer) return;

    try {
      await studentService.saveAnswer(id, {
        questionId: question._id,
        selectedAnswer: question.type === QUESTION_TYPES.MCQ || question.type === QUESTION_TYPES.TRUE_FALSE ? answer : undefined,
        textAnswer: question.type === QUESTION_TYPES.DESCRIPTIVE ? answer : undefined,
        codeAnswer: question.type === QUESTION_TYPES.CODING ? answer : undefined,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleNext = () => {
    saveCurrentAnswer();
    if (currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && !window.confirm('Are you sure you want to submit the exam?')) {
      return;
    }

    setSubmitting(true);

    try {
      const formattedAnswers = exam.questions.map(question => {
        const answer = answers[question._id] || '';
        return {
          questionId: question._id,
          selectedAnswer: question.type === QUESTION_TYPES.MCQ || question.type === QUESTION_TYPES.TRUE_FALSE ? answer : undefined,
          textAnswer: question.type === QUESTION_TYPES.DESCRIPTIVE ? answer : undefined,
          codeAnswer: question.type === QUESTION_TYPES.CODING ? answer : undefined,
        };
      });

      await studentService.submitExam(id, {
        answers: formattedAnswers,
        violations: tabSwitchCount,
      });

      toast.success(autoSubmit ? 'Exam auto-submitted' : 'Exam submitted successfully');
      navigate('/student/results');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit exam');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionColor = (questionId) => {
    if (answers[questionId]) return 'bg-green-500 text-white';
    return 'bg-gray-200 text-gray-600';
  };

  if (loading) return <Loader fullScreen />;
  if (!exam || !result) return <div>Exam not found</div>;

  const question = exam.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-sm text-gray-500">{exam.subject?.subjectName}</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-600">Time Remaining</p>
              <p className={`text-2xl font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-primary-600'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
            {tabSwitchCount > 0 && (
              <Badge variant="danger">
                Violations: {tabSwitchCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation */}
          <div className="lg:col-span-1">
            <Card title="Questions">
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((q, index) => (
                  <button
                    key={q._id}
                    onClick={() => setCurrentQuestion(index)}
                    className={`h-10 w-10 rounded-lg font-medium transition-colors ${
                      currentQuestion === index
                        ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                        : getQuestionColor(q._id)
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded bg-green-500"></div>
                  <span className="text-gray-600">Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded bg-gray-200"></div>
                  <span className="text-gray-600">Not Answered</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Question Display */}
          <div className="lg:col-span-3">
            <Card>
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-sm font-medium text-gray-500">
                        Question {currentQuestion + 1} of {exam.questions.length}
                      </span>
                      <Badge variant="info">{question.type}</Badge>
                      <span className="text-sm text-gray-500">Marks: {question.marks}</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {question.questionText}
                    </h3>
                  </div>
                </div>

                {/* Answer Input */}
                <div className="space-y-3">
                  {question.type === QUESTION_TYPES.MCQ && (
                    <div className="space-y-3">
                      {question.options.map((option, index) => (
                        <label
                          key={index}
                          className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="radio"
                            name={`question-${question._id}`}
                            value={option.optionText}
                            checked={answers[question._id] === option.optionText}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <span className="text-gray-900">{option.optionText}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === QUESTION_TYPES.TRUE_FALSE && (
                    <div className="space-y-3">
                      {['True', 'False'].map((option) => (
                        <label
                          key={option}
                          className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="radio"
                            name={`question-${question._id}`}
                            value={option}
                            checked={answers[question._id] === option}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                            className="mr-3"
                          />
                          <span className="text-gray-900">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === QUESTION_TYPES.DESCRIPTIVE && (
                    <textarea
                      value={answers[question._id] || ''}
                      onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={8}
                      placeholder="Type your answer here..."
                    />
                  )}

                  {question.type === QUESTION_TYPES.CODING && (
                    <div>
                      <textarea
                        value={answers[question._id] || ''}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                        className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                        rows={12}
                        placeholder="Write your code here..."
                      />
                      {question.testCases && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-2">Test Cases:</p>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {question.testCases}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="secondary"
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                  >
                    Previous
                  </Button>

                  <div className="flex space-x-3">
                    {currentQuestion < exam.questions.length - 1 ? (
                      <Button onClick={handleNext}>
                        Next
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        onClick={() => handleSubmit(false)}
                        loading={submitting}
                      >
                        Submit Exam
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeExam;
