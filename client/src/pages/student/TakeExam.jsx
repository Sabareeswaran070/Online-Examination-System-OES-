import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCode, FiPlay, FiClock, FiCpu, FiChevronDown, FiChevronUp, FiEye, FiFileText } from 'react-icons/fi';
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
  const [selectedLanguages, setSelectedLanguages] = useState({});  // { questionId: 'python' }
  const [showProblemDetails, setShowProblemDetails] = useState({}); // { questionId: true/false }

  const CODING_LANGUAGES = [
    { value: 'javascript', label: 'JavaScript', icon: '🟨' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'cpp', label: 'C++', icon: '⚡' },
    { value: 'c', label: 'C', icon: '🔧' },
  ];

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
      const { exam: examData, result: resultData, remainingTime } = response.data;
      setExam(examData);
      setResult(resultData);
      setTimeLeft(remainingTime);
      
      // Initialize answers from saved state if any
      if (resultData.answers) {
        const savedAnswers = {};
        resultData.answers.forEach(ans => {
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
        selectedLanguage: question.type === QUESTION_TYPES.CODING ? (selectedLanguages[question._id] || question.programmingLanguage || 'javascript') : undefined,
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
          selectedLanguage: question.type === QUESTION_TYPES.CODING ? (selectedLanguages[question._id] || question.programmingLanguage || 'javascript') : undefined,
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
            <p className="text-sm text-gray-500">{exam.subject?.name}</p>
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
                            value={option.text}
                            checked={answers[question._id] === option.text}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <span className="text-gray-900">{option.text}</span>
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
                    <div className="space-y-4">
                      {/* Language Selector */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <FiCode className="inline mr-1.5 text-violet-500" />
                          Choose Programming Language
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CODING_LANGUAGES.map((lang) => (
                            <button
                              key={lang.value}
                              type="button"
                              onClick={() => setSelectedLanguages(prev => ({ ...prev, [question._id]: lang.value }))}
                              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                (selectedLanguages[question._id] || question.programmingLanguage || 'javascript') === lang.value
                                  ? 'bg-violet-100 text-violet-700 border-violet-400 shadow-sm'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-violet-200 hover:bg-violet-50'
                              }`}
                            >
                              <span>{lang.icon}</span>
                              <span>{lang.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Problem Details Toggle */}
                      {(question.inputFormat || question.outputFormat || question.constraints || question.visibleTestCases?.length > 0) && (
                        <div className="border-2 border-blue-100 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowProblemDetails(prev => ({ ...prev, [question._id]: !prev[question._id] }))}
                            className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <span className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                              <FiFileText className="w-4 h-4" />
                              Problem Details & Test Cases
                            </span>
                            {showProblemDetails[question._id] ? (
                              <FiChevronUp className="w-4 h-4 text-blue-500" />
                            ) : (
                              <FiChevronDown className="w-4 h-4 text-blue-500" />
                            )}
                          </button>
                          {showProblemDetails[question._id] && (
                            <div className="p-4 space-y-4 bg-white">
                              {/* I/O Format */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {question.inputFormat && (
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Input Format</h5>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.inputFormat}</p>
                                  </div>
                                )}
                                {question.outputFormat && (
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Output Format</h5>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.outputFormat}</p>
                                  </div>
                                )}
                              </div>
                              {question.constraints && (
                                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                  <h5 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Constraints</h5>
                                  <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">{question.constraints}</p>
                                </div>
                              )}

                              {/* Visible Test Cases */}
                              {question.visibleTestCases?.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">
                                    <FiEye className="inline mr-1" /> Sample Test Cases
                                  </h5>
                                  <div className="space-y-3">
                                    {question.visibleTestCases.map((tc, idx) => (
                                      <div key={idx} className="bg-green-50 rounded-lg p-3 border border-green-100">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                            Case {idx + 1}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Input</span>
                                            <pre className="text-xs bg-white p-2 rounded mt-1 text-gray-700 border overflow-x-auto">{tc.input}</pre>
                                          </div>
                                          <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Expected Output</span>
                                            <pre className="text-xs bg-white p-2 rounded mt-1 text-gray-700 border overflow-x-auto">{tc.expectedOutput}</pre>
                                          </div>
                                        </div>
                                        {tc.explanation && (
                                          <p className="text-xs text-gray-500 mt-2 italic bg-white rounded p-2">💡 {tc.explanation}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Sample I/O fallback */}
                              {(!question.visibleTestCases || question.visibleTestCases.length === 0) && (question.sampleInput || question.sampleOutput) && (
                                <div className="grid grid-cols-2 gap-3">
                                  {question.sampleInput && (
                                    <div>
                                      <span className="text-xs font-bold text-gray-500 uppercase">Sample Input</span>
                                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 text-gray-700 border overflow-x-auto">{question.sampleInput}</pre>
                                    </div>
                                  )}
                                  {question.sampleOutput && (
                                    <div>
                                      <span className="text-xs font-bold text-gray-500 uppercase">Sample Output</span>
                                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 text-gray-700 border overflow-x-auto">{question.sampleOutput}</pre>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Time & Memory Limits */}
                              {(question.timeLimit || question.memoryLimit) && (
                                <div className="flex gap-4">
                                  {question.timeLimit && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <FiClock className="w-3 h-3" /> Time: {question.timeLimit}ms
                                    </span>
                                  )}
                                  {question.memoryLimit && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <FiCpu className="w-3 h-3" /> Memory: {question.memoryLimit}MB
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Code Editor */}
                      <div className="rounded-xl overflow-hidden border-2 border-gray-700">
                        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-xs text-gray-400 ml-2 font-mono">
                              solution.{(selectedLanguages[question._id] || question.programmingLanguage || 'js') === 'python' ? 'py'
                                : (selectedLanguages[question._id] || question.programmingLanguage || 'js') === 'java' ? 'java'
                                : (selectedLanguages[question._id] || question.programmingLanguage || 'js') === 'cpp' ? 'cpp'
                                : (selectedLanguages[question._id] || question.programmingLanguage || 'js') === 'c' ? 'c'
                                : 'js'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {CODING_LANGUAGES.find(l => l.value === (selectedLanguages[question._id] || question.programmingLanguage || 'javascript'))?.icon}{' '}
                            {CODING_LANGUAGES.find(l => l.value === (selectedLanguages[question._id] || question.programmingLanguage || 'javascript'))?.label}
                          </span>
                        </div>
                        <textarea
                          value={answers[question._id] || question.starterCode || ''}
                          onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900 text-green-400 font-mono text-sm focus:outline-none resize-none"
                          rows={16}
                          placeholder="Write your code here..."
                          spellCheck={false}
                          style={{ tabSize: 4 }}
                          onKeyDown={(e) => {
                            // Tab key support
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              const start = e.target.selectionStart;
                              const end = e.target.selectionEnd;
                              const val = e.target.value;
                              handleAnswerChange(question._id, val.substring(0, start) + '    ' + val.substring(end));
                              setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 4; }, 0);
                            }
                          }}
                        />
                      </div>

                      {/* Old test cases fallback */}
                      {question.testCases && !question.visibleTestCases?.length && typeof question.testCases === 'string' && (
                        <div className="p-4 bg-gray-50 rounded-lg">
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
