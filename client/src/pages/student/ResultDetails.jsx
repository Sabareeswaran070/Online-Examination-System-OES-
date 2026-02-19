import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiClock, FiAward } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import Loader from '@/components/common/Loader.jsx';
import { studentService } from '@/services';
import { formatDateTime } from '@/utils/dateUtils';
import { formatPercentage, getGrade, getGradeColor } from '@/utils/helpers';
import { QUESTION_TYPES } from '@/config/constants';
import toast from 'react-hot-toast';

const ResultDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(0);

  useEffect(() => {
    fetchResultDetails();
  }, [id]);

  const fetchResultDetails = async () => {
    try {
      const response = await studentService.getResultDetails(id);
      setResult(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load result details');
      navigate('/student/results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!result) return null;

  const exam = result.examId;
  const currentAnswer = result.answers[selectedQuestion];
  const currentQuestion = currentAnswer?.questionId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/student/results')}>
            <FiArrowLeft className="mr-2" /> Back to Results
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam?.title || 'Exam Result'}</h1>
            <p className="text-gray-600 mt-1">{exam?.subject?.name || exam?.subject?.subjectName}</p>
          </div>
        </div>
        <Badge variant={result.isPassed ? 'success' : 'danger'}>
          {result.isPassed ? 'PASSED' : 'FAILED'}
        </Badge>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FiAward className="w-8 h-8 text-primary-500" />
            </div>
            <p className="text-sm text-gray-500">Score</p>
            <p className="text-2xl font-bold text-gray-900">
              {result.score} / {exam?.totalMarks}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">Percentage</p>
            <p className={`text-2xl font-bold ${getGradeColor(result.percentage)}`}>
              {formatPercentage(result.percentage)}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">Grade</p>
            <p className="text-2xl font-bold text-gray-900">{getGrade(result.percentage)}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FiClock className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Time Taken</p>
            <p className="text-2xl font-bold text-gray-900">{result.totalTimeTaken || 0} min</p>
          </div>
        </Card>
      </div>

      {/* Additional Info */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Status</p>
            <Badge variant={result.status === 'evaluated' ? 'success' : result.status === 'pending-evaluation' ? 'warning' : 'info'}>
              {result.status}
            </Badge>
          </div>
          <div>
            <p className="text-gray-500">Submitted At</p>
            <p className="font-medium text-gray-900">{formatDateTime(result.submittedAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Rank</p>
            <p className="font-medium text-gray-900">#{result.rank || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500">Auto Submitted</p>
            <p className="font-medium text-gray-900">{result.autoSubmitted ? 'Yes' : 'No'}</p>
          </div>
        </div>
        {result.tabSwitchCount > 0 && (
          <div className="mt-3 p-2 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">
              Tab switches detected: {result.tabSwitchCount}
            </p>
          </div>
        )}
      </Card>

      {/* Answer Review */}
      {result.answers && result.answers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation */}
          <div className="lg:col-span-1">
            <Card title="Questions">
              <div className="grid grid-cols-5 gap-2">
                {result.answers.map((answer, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedQuestion(index)}
                    className={`h-10 w-10 rounded-lg font-medium text-sm transition-colors ${
                      selectedQuestion === index
                        ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                        : answer.isCorrect
                        ? 'bg-green-100 text-green-800'
                        : answer.isEvaluated === false
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded bg-green-100 border border-green-300"></div>
                  <span className="text-gray-600">Correct</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded bg-red-100 border border-red-300"></div>
                  <span className="text-gray-600">Incorrect</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded bg-yellow-100 border border-yellow-300"></div>
                  <span className="text-gray-600">Pending Review</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Question Detail */}
          <div className="lg:col-span-3">
            <Card>
              {currentQuestion ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500">
                        Question {selectedQuestion + 1} of {result.answers.length}
                      </span>
                      <Badge variant="info">{currentQuestion.type}</Badge>
                      <span className="text-sm text-gray-500">
                        Marks: {currentAnswer.marksAwarded || 0} / {currentQuestion.marks}
                      </span>
                    </div>
                    {currentAnswer.isEvaluated ? (
                      currentAnswer.isCorrect ? (
                        <Badge variant="success"><FiCheckCircle className="mr-1" /> Correct</Badge>
                      ) : (
                        <Badge variant="danger"><FiXCircle className="mr-1" /> Incorrect</Badge>
                      )
                    ) : (
                      <Badge variant="warning">Pending Evaluation</Badge>
                    )}
                  </div>

                  {/* Question Text */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900">
                      {currentQuestion.questionText}
                    </h3>
                  </div>

                  {/* MCQ Options Review */}
                  {(currentQuestion.type === QUESTION_TYPES.MCQ || currentQuestion.type === 'MCQ') && currentQuestion.options && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Options:</p>
                      {currentQuestion.options.map((option, idx) => {
                        const isSelected = currentAnswer.selectedAnswer === option.text;
                        const isCorrectOption = option.isCorrect;
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrectOption
                                ? 'border-green-400 bg-green-50'
                                : isSelected && !isCorrectOption
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`${isSelected ? 'font-semibold' : ''}`}>
                                {option.text}
                              </span>
                              <div className="flex items-center space-x-2">
                                {isSelected && (
                                  <Badge variant={isCorrectOption ? 'success' : 'danger'} className="text-xs">
                                    Your Answer
                                  </Badge>
                                )}
                                {isCorrectOption && (
                                  <FiCheckCircle className="text-green-500 w-5 h-5" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True/False Review */}
                  {(currentQuestion.type === QUESTION_TYPES.TRUE_FALSE || currentQuestion.type === 'TrueFalse') && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                      <p className="p-3 bg-gray-50 rounded-lg font-medium">
                        {currentAnswer.selectedAnswer || 'Not answered'}
                      </p>
                    </div>
                  )}

                  {/* Descriptive Answer Review */}
                  {(currentQuestion.type === QUESTION_TYPES.DESCRIPTIVE || currentQuestion.type === 'Descriptive') && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                      <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                        {currentAnswer.textAnswer || 'Not answered'}
                      </div>
                    </div>
                  )}

                  {/* Coding Answer Review */}
                  {(currentQuestion.type === QUESTION_TYPES.CODING || currentQuestion.type === 'Coding') && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Your Code:</p>
                      <div className="rounded-xl overflow-hidden border-2 border-gray-700">
                        <div className="bg-gray-800 px-4 py-2">
                          <span className="text-xs text-gray-400 font-mono">solution</span>
                        </div>
                        <pre className="p-4 bg-gray-900 text-green-400 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                          {currentAnswer.codeAnswer || '// No code submitted'}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {currentQuestion.explanation && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-semibold text-blue-700 mb-1">Explanation</p>
                      <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
                    </div>
                  )}

                  {/* Faculty Feedback */}
                  {currentAnswer.feedback && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm font-semibold text-purple-700 mb-1">Faculty Feedback</p>
                      <p className="text-sm text-purple-800">{currentAnswer.feedback}</p>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between pt-4 border-t">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedQuestion(Math.max(0, selectedQuestion - 1))}
                      disabled={selectedQuestion === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setSelectedQuestion(Math.min(result.answers.length - 1, selectedQuestion + 1))}
                      disabled={selectedQuestion === result.answers.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Question details not available for review</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Remarks */}
      {result.remarks && (
        <Card title="Remarks">
          <p className="text-gray-700">{result.remarks}</p>
        </Card>
      )}
    </div>
  );
};

export default ResultDetails;
