import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCode, FiPlay, FiClock, FiCpu, FiChevronDown, FiChevronUp, FiEye, FiFileText, FiTerminal, FiCheckCircle, FiXCircle, FiLoader, FiLock, FiAlertTriangle } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Modal from '@/components/common/Modal.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { studentService } from '@/services';
import { formatDuration } from '@/utils/dateUtils';
import { QUESTION_TYPES } from '@/config/constants';
import toast from 'react-hot-toast';

const CODING_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', icon: '🟨' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'cpp', label: 'C++', icon: '⚡' },
  { value: 'c', label: 'C', icon: '🔧' },
];

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
  const [runningCode, setRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState(null);  // single run output
  const [testResults, setTestResults] = useState(null); // test case results
  const [customInput, setCustomInput] = useState('');

  // Proctoring States
  const [isFullscreenEnforced, setIsFullscreenEnforced] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [proctoringModal, setProctoringModal] = useState({ show: false, type: '', message: '', count: 0 });
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [isActualFullScreen, setIsActualFullScreen] = useState(false);

  // Unlock Request States
  const [unlockReason, setUnlockReason] = useState('');
  const [requestingUnlock, setRequestingUnlock] = useState(false);
  const [unlockRequestStatus, setUnlockRequestStatus] = useState('none'); // 'none', 'pending', 'approved', 'rejected'



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

  // Tab switch & Fullscreen detection
  useEffect(() => {
    if (!result || !exam) return;

    // Debug log to confirm proctoring status
    console.log('Proctoring status:', {
      enabled: exam.proctoring?.enabled,
      fullscreen: exam.proctoring?.enforceFullscreen,
      tabSwitchBlocked: exam.proctoring?.tabSwitchingAllowed === false
    });

    if (isLocked || !exam?.proctoring?.enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden && exam?.proctoring?.tabSwitchingAllowed === false) {
        handleViolation('tab_switch', 'Tab switch detected');
      }
    };

    const handleBlur = () => {
      if (exam?.proctoring?.tabSwitchingAllowed === false) {
        handleViolation('tab_switch', 'Window focus lost');
      }
    };

    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsActualFullScreen(isFS);
      if (!isFS && exam?.proctoring?.enforceFullscreen) {
        handleViolation('fullscreen_exit', 'Exited fullscreen mode');
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.error('Right-click is disabled during the exam');
    };

    const handleKeyDown = (e) => {
      // Disable Alt+Tab, Ctrl+C, Ctrl+V, etc.
      if (
        (e.altKey && e.key === 'Tab') ||
        (e.ctrlKey && ['c', 'v', 't', 'w', 'n', 'r'].includes(e.key.toLowerCase())) ||
        (e.metaKey && ['c', 'v', 't', 'w', 'n', 'r'].includes(e.key.toLowerCase()))
      ) {
        // e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exam, result?.status, isLocked]);

  // Poll for unlock if pending
  useEffect(() => {
    let interval;
    if (isLocked && unlockRequestStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          // Re-fetch result to check status update
          const response = await studentService.startExam(id);
          const { result: resultData } = response.data;
          if (resultData.status === 'in-progress') {
            setIsLocked(false);
            setUnlockRequestStatus('approved');
            setTabSwitchCount(resultData.tabSwitchCount || 0);
            const fsExits = resultData.violations?.filter(v => v.type === 'fullscreen_exit' || v.type === 'fullscreen-exit').length || 0;
            setFullscreenExitCount(fsExits);
            toast.success('Exam Unlocked! You can now continue.', { duration: 5000 });
          }
        } catch (error) {
          console.error('Polling for unlock failed:', error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLocked, unlockRequestStatus, id]);

  const handleViolation = async (type, description) => {
    if (isLocked) return;

    try {
      const response = await studentService.logViolation(id, { type, description });
      const { actionTaken, tabSwitchCount: newTabCount, fullscreenExitCount: newFSCount } = response.data;

      setTabSwitchCount(newTabCount);
      setFullscreenExitCount(newFSCount);

      if (actionTaken === 'lock' || actionTaken === 'auto-submit') {
        setIsLocked(true);
        toast.error(`Exam ${actionTaken === 'lock' ? 'Locked' : 'Submitted'} due to violations`);
        if (actionTaken === 'auto-submit') {
          navigate('/student/results');
        }
      } else {
        const limit = type === 'tab_switch' ? exam.proctoring?.maxTabSwitches : exam.proctoring?.maxFullscreenExits;
        const currentCount = type === 'tab_switch' ? newTabCount : newFSCount;

        // If limit is 0, backend handles it as 1. If limit is truly 0 and actionTaken is none, we just toast.
        // But with my backend fix, if limit is 0, it should trigger an action (lock/submit/warn).
        if (limit === 0 && actionTaken === 'none') {
          toast.error(`${type === 'tab_switch' ? 'Tab switching' : 'Fullscreen exit'} detected and logged.`, { duration: 3000 });
        } else {
          setProctoringModal({
            show: true,
            type,
            message: description,
            count: currentCount
          });
        }
      }
    } catch (error) {
      console.error('Failed to log violation:', error);
      // If backend returns error, it might be due to locked/already submitted session
      if (error.response?.status === 400 && (error.response?.data?.message?.includes('locked') || error.response?.data?.message?.includes('submitted'))) {
        setIsLocked(true);
      }
    }
  };

  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  const startExam = async () => {
    try {
      const response = await studentService.startExam(id);
      const { exam: examData, result: resultData, remainingTime } = response.data;
      setExam(examData);
      setResult(resultData);
      setTimeLeft(remainingTime);

      // Handle Locked Status
      if (resultData.status === 'locked') {
        setIsLocked(true);
        setUnlockRequestStatus(resultData.unlockRequest?.status || 'none');
        setLoading(false);
        return; // Don't proceed
      }

      // Handle Fullscreen Enforcement
      if (examData.proctoring?.enforceFullscreen) {
        setIsFullscreenEnforced(true);
        setIsActualFullScreen(!!document.fullscreenElement);
        toast('This exam requires Fullscreen Mode', { icon: '🖥️' });
      }

      // Initialize violation counts from resultData
      setTabSwitchCount(resultData.tabSwitchCount || 0);
      const fsExits = resultData.violations?.filter(v => v.type === 'fullscreen_exit' || v.type === 'fullscreen-exit').length || 0;
      setFullscreenExitCount(fsExits);

      // Handle Notifications
      if (examData.proctoring?.blockNotifications && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }

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

  const [showResultsModal, setShowResultsModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

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

      const response = await studentService.submitExam(id, {
        answers: formattedAnswers,
        violations: tabSwitchCount,
      });

      toast.success(autoSubmit ? 'Exam auto-submitted' : 'Exam submitted successfully');

      if (exam.showResultsImmediately) {
        setSubmissionResult(response.data.data);
        setShowResultsModal(true);
        setSubmitting(false);
      } else {
        navigate('/student/results');
      }
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

  // ——— Code execution handlers ———
  const getCurrentLanguage = (question) => {
    return selectedLanguages[question._id] || question.programmingLanguage || 'javascript';
  };

  const handleRun = async () => {
    const q = exam.questions[currentQuestion];
    const code = answers[q._id] || q.starterCode || '';
    const lang = getCurrentLanguage(q);
    const visibleTests = q.visibleTestCases || [];

    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setRunningCode(true);
    setCodeOutput(null);
    setTestResults(null);

    try {
      // 1. Run with Custom Input if provided
      if (customInput.trim()) {
        const response = await studentService.runCode({
          code,
          language: lang,
          input: customInput,
        });
        setCodeOutput(response.data);
      }

      // 2. Run with Visible Test Cases if they exist
      if (visibleTests.length > 0) {
        const response = await studentService.runCode({
          code,
          language: lang,
          questionId: q._id,
          testCases: visibleTests.map(tc => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
          })),
        });
        setTestResults(response.data);
      }

      // 3. Fallback: If neither custom input nor test cases, run once with empty input
      if (!customInput.trim() && visibleTests.length === 0) {
        const response = await studentService.runCode({
          code,
          language: lang,
          input: '',
        });
        setCodeOutput(response.data);
      }

      toast.success('Run completed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Execution failed');
      if (!customInput.trim() && visibleTests.length === 0) {
        setCodeOutput({
          stderr: error.response?.data?.message || 'Code execution failed.',
          status: { description: 'Error' },
        });
      }
    } finally {
      setRunningCode(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!exam || !result) return <div>Exam not found</div>;
  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <div className="text-center space-y-6 max-w-md w-full bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-700">
          <div className="relative">
            <FiLock className="w-20 h-20 text-red-500 mx-auto" />
            <div className="absolute top-0 right-1/4 animate-ping">
              <div className="w-4 h-4 bg-red-400 rounded-full opacity-75"></div>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-white">Exam Locked</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your session was secured due to multiple proctoring violations.
            </p>
          </div>

          {unlockRequestStatus === 'pending' ? (
            <div className="bg-amber-900/30 border border-amber-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold">
                <FiLoader className="animate-spin" />
                <span>Request Pending Approval</span>
              </div>
              <p className="text-xs text-amber-200/70">
                Your instructor has been notified. This page will automatically refresh once unlocked.
              </p>
            </div>
          ) : unlockRequestStatus === 'rejected' ? (
            <div className="bg-red-900/30 border border-red-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-center gap-2 text-red-400 font-bold">
                <FiXCircle />
                <span>Request Rejected</span>
              </div>
              <p className="text-xs text-red-200/70">
                The administrator has declined your unlock request.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnlockRequestStatus('none')}
                className="text-white border-white/20 hover:bg-white/10"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!unlockReason.trim()) return toast.error('Please enter a reason');
              setRequestingUnlock(true);
              try {
                await studentService.requestUnlock(id, unlockReason);
                setUnlockRequestStatus('pending');
                toast.success('Unlock request sent!');
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to send request');
              } finally {
                setRequestingUnlock(false);
              }
            }} className="space-y-4">
              <div className="text-left">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Reason for Unlock</label>
                <textarea
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="e.g. Accidental tab switch, technical glitch..."
                  rows={3}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  required
                />
              </div>
              <Button
                className="w-full h-12 text-lg font-bold shadow-lg"
                type="submit"
                loading={requestingUnlock}
              >
                Send Unlock Request
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={() => navigate('/student/exams')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Exit to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = exam.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mandatory Fullscreen Overlay */}
      {exam?.proctoring?.enforceFullscreen && !isActualFullScreen && !isLocked && (
        <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl transform transition-all">
            <div className="p-4 bg-primary-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <FiLoader className="w-12 h-12 text-primary-600 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">Fullscreen Required</h2>
            <p className="text-gray-600 mb-8 text-lg">
              This exam is regulated and requires mandatory Fullscreen Mode to ensure academic integrity. Your access is paused until you return to fullscreen.
            </p>
            <Button
              className="w-full h-14 text-xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={enterFullscreen}
            >
              Enter Fullscreen to Continue
            </Button>
            <p className="mt-6 text-sm text-gray-400 font-medium">
              Attempting to bypass this mode will be logged as a security violation.
            </p>
          </div>
        </div>
      )}

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
              <Badge variant="warning">
                Tab Switches: {tabSwitchCount}/{exam.proctoring?.maxTabSwitches || '∞'}
              </Badge>
            )}
            {fullscreenExitCount > 0 && (
              <Badge variant="danger">
                FS Exits: {fullscreenExitCount}/{exam.proctoring?.maxFullscreenExits || '∞'}
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
                    className={`h-10 w-10 rounded-lg font-medium transition-colors ${currentQuestion === index
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
                              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${(selectedLanguages[question._id] || question.programmingLanguage || 'javascript') === lang.value
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

                      {/* ===== Run Code Controls & Output ===== */}
                      <div className="space-y-3">
                        {/* Custom Input */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            <FiTerminal className="inline mr-1" />
                            Custom Input (stdin)
                          </label>
                          <textarea
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-gray-50"
                            rows={2}
                            placeholder="Enter input for your program..."
                          />
                        </div>

                        {/* Run Button */}
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleRun}
                            disabled={runningCode}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50"
                          >
                            {runningCode ? (
                              <><FiLoader className="w-4 h-4 animate-spin" /> Running...</>
                            ) : (
                              <><FiPlay className="w-4 h-4" /> Run</>
                            )}
                          </button>

                          {testResults && (
                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${testResults.summary.failed === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              Test Cases: {testResults.summary.passed}/{testResults.summary.total} Passed
                            </span>
                          )}
                        </div>

                        {/* Simplified Results Section */}
                        {(codeOutput || testResults) && (
                          <div className="space-y-4 pt-2">
                            {/* Console Output (Custom Input) */}
                            {codeOutput && (
                              <div className="bg-gray-900 rounded-lg overflow-hidden">
                                <div className="px-3 py-1.5 bg-gray-800 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Console Output</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${codeOutput.status?.id === 3 ? 'text-green-400' : 'text-red-400'}`}>
                                    {codeOutput.status?.description}
                                  </span>
                                </div>
                                <pre className="p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                  {codeOutput.compile_output && <div className="text-red-400 mb-2">{codeOutput.compile_output}</div>}
                                  {codeOutput.stderr && <div className="text-red-400 mb-2">{codeOutput.stderr}</div>}
                                  {codeOutput.stdout || (!codeOutput.compile_output && !codeOutput.stderr && '(no output)')}
                                </pre>
                              </div>
                            )}

                            {/* Test Results (Simplified) */}
                            {testResults && (
                              <div className="grid grid-cols-1 gap-2">
                                {testResults.results.filter(tr => !tr.isHidden).map((tr, idx) => (
                                  <div key={idx} className={`p-2 rounded-md border text-xs flex justify-between items-center ${tr.passed ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                    <div className="flex items-center gap-2">
                                      {tr.passed ? <FiCheckCircle /> : <FiXCircle />}
                                      <span className="font-semibold">Test Case {idx + 1}</span>
                                    </div>
                                    {!tr.passed && (
                                      <details className="cursor-pointer ml-auto">
                                        <summary className="text-[10px] underline">View Details</summary>
                                        <div className="mt-2 text-[10px] font-mono bg-white p-2 rounded border space-y-1">
                                          <div><span className="text-gray-400">Input:</span> {tr.input}</div>
                                          <div><span className="text-gray-400">Expected:</span> {tr.expectedOutput}</div>
                                          <div><span className="text-gray-400">Actual:</span> {tr.actualOutput || tr.stderr || 'N/A'}</div>
                                        </div>
                                      </details>
                                    )}
                                    {tr.passed && <span className="text-[10px] opacity-70">Accepted</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
      {/* Results Modal */}
      <Modal
        isOpen={showResultsModal}
        onClose={() => navigate('/student/results')}
        title="Exam Results"
        showCloseButton={false}
      >
        <div className="text-center space-y-6 py-4">
          <div className="flex justify-center">
            {submissionResult?.isPassed ? (
              <div className="bg-green-100 p-4 rounded-full">
                <FiCheckCircle className="w-16 h-16 text-green-600" />
              </div>
            ) : (
              <div className="bg-blue-100 p-4 rounded-full">
                <FiFileText className="w-16 h-16 text-blue-600" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {submissionResult?.status === 'pending-evaluation'
                ? 'Exam Submitted!'
                : submissionResult?.isPassed ? 'Congratulations!' : 'Exam Completed'}
            </h2>
            <p className="text-gray-500 mt-2">
              {submissionResult?.status === 'pending-evaluation'
                ? 'Your exam has been submitted. Descriptive questions will be evaluated by the faculty.'
                : 'You have successfully completed the examination.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div className="text-center">
              <span className="block text-sm text-gray-500 font-medium">Score</span>
              <span className="text-3xl font-black text-gray-900">
                {submissionResult?.score} <span className="text-sm font-normal text-gray-400">/ {exam.totalMarks}</span>
              </span>
            </div>
            <div className="text-center border-l border-gray-200">
              <span className="block text-sm text-gray-500 font-medium">Status</span>
              <div className="mt-1">
                {submissionResult?.status === 'pending-evaluation' ? (
                  <Badge variant="warning">Pending Eval</Badge>
                ) : submissionResult?.isPassed ? (
                  <Badge variant="success">Passed</Badge>
                ) : (
                  <Badge variant="danger">Failed</Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            className="w-full h-12 text-lg font-bold shadow-lg"
            onClick={() => navigate('/student/results')}
          >
            View All Results
          </Button>
        </div>
      </Modal>

      {/* Proctoring Violation Modal */}
      <Modal
        isOpen={proctoringModal.show}
        onClose={() => { }} // Force student to click return button
        title="⚠️ Security Violation Detected"
        showCloseButton={false}
      >
        <div className="text-center space-y-4 py-4">
          <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <FiXCircle className="w-12 h-12 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            {proctoringModal.type === 'tab_switch' ? 'Tab Switching Detected' : 'Fullscreen Exit Detected'}
          </h3>
          <p className="text-gray-600">
            {proctoringModal.message}. Tab switching and exiting fullscreen are strictly prohibited during this exam.
          </p>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <p className="text-sm font-semibold text-amber-800">
              {proctoringModal.type === 'tab_switch'
                ? `Warning: This is tab switch ${proctoringModal.count} of ${exam.proctoring?.maxTabSwitches || 'Unlimited'}`
                : `Warning: This is fullscreen exit ${proctoringModal.count} of ${exam.proctoring?.maxFullscreenExits || 'Unlimited'}`
              }
            </p>
            <p className="text-xs text-amber-600 mt-1">Exceeding the limit will result in your exam being {exam.proctoring?.actionOnLimit === 'warn' ? 'warned' : exam.proctoring?.actionOnLimit.replace('-', ' ')}.</p>
          </div>
          <Button
            className="w-full h-12 text-lg font-bold"
            onClick={() => {
              setProctoringModal({ ...proctoringModal, show: false });
              if (exam.proctoring?.enforceFullscreen) enterFullscreen();
            }}
          >
            Return to Exam
          </Button>
        </div>
      </Modal >
    </div >
  );
};

export default TakeExam;
