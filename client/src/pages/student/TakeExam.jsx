import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCode, FiPlay, FiClock, FiCpu, FiChevronDown, FiChevronUp, FiEye, FiFileText, FiTerminal, FiCheckCircle, FiXCircle, FiLoader, FiLock, FiAlertTriangle, FiVideo } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Modal from '@/components/common/Modal.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { studentService } from '@/services';
import { formatDuration } from '@/utils/dateUtils';
import { QUESTION_TYPES } from '@/config/constants';
import toast from 'react-hot-toast';
import LiveFeedPanel from '@/components/proctor/LiveFeedPanel';
import { useAuth } from '@/context/AuthContext';

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
  const { user } = useAuth();
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
  const [showInstructions, setShowInstructions] = useState(true);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [hasStartedTimer, setHasStartedTimer] = useState(false);
  const [isCameraExpanded, setIsCameraExpanded] = useState(false);



  useEffect(() => {
    startExam();
  }, [id]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && hasStartedTimer) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && exam && hasStartedTimer) {
      handleSubmit(true); // Auto-submit
    }
  }, [timeLeft, hasStartedTimer]);

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
      const isTabSwitchRestricted = exam?.proctoring?.tabSwitchingAllowed === false || (exam?.proctoring?.maxTabSwitches > 0);
      if (document.hidden && isTabSwitchRestricted) {
        handleViolation('tab_switch', 'Tab switch detected');
      }
    };

    const handleBlur = () => {
      const isTabSwitchRestricted = exam?.proctoring?.tabSwitchingAllowed === false || (exam?.proctoring?.maxTabSwitches > 0);
      if (isTabSwitchRestricted) {
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

    const handleCopy = (e) => {
      if (exam?.proctoring?.enabled) {
        handleViolation('copy_paste', 'Content copying detected');
        toast.error('Copying is prohibited!');
      }
    };

    const handlePaste = (e) => {
      if (exam?.proctoring?.enabled) {
        handleViolation('copy_paste', 'Content pasting detected');
        toast.error('Pasting is prohibited!');
      }
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

      // Enter / ArrowRight → next question (skip when typing in textarea/input)
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = tag === 'textarea' || tag === 'input' || tag === 'select';
      if (!isTyping) {
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault();
          setCurrentQuestion(q => Math.min(q + 1, exam.questions.length - 1));
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setCurrentQuestion(q => Math.max(q - 1, 0));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
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
            count: type === 'copy_paste' ? result.violations.filter(v => v.type === 'copy_paste' || v.type === 'copy-paste').length : currentCount
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
  const [flagged, setFlagged] = useState({});
  const toggleFlag = (qId) => setFlagged(f => ({ ...f, [qId]: !f[qId] }));

  const sectionLabel = (type) => ({
    'MCQ': { label: 'MCQ', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    'TrueFalse': { label: 'True/False', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Descriptive': { label: 'Desc', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    'Coding': { label: 'Code', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  }[type] || { label: type, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' });

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      setShowConfirmSubmit(true);
      return;
    }
    performSubmit(true);
  };

  const performSubmit = async (autoSubmit = false) => {
    setShowConfirmSubmit(false);
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

  const getQuestionStatus = (q) => {
    if (answers[q._id]) return 'answered';
    return 'unanswered';
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
  const sectionTypes = ['MCQ', 'TrueFalse', 'Descriptive', 'Coding'];
  const questionsBySection = sectionTypes.map(s => ({
    section: s,
    qs: exam?.questions?.filter(q => q.type === s) || []
  })).filter(g => g.qs.length > 0);

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-6 max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <div className="p-5 bg-red-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <FiLock className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900">Exam Locked</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your session was locked due to proctoring violations.
            </p>
          </div>

          {unlockRequestStatus === 'pending' ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-center gap-2 text-amber-700 font-bold">
                <FiLoader className="animate-spin" />
                <span>Unlock Request Pending</span>
              </div>
              <p className="text-xs text-amber-600">Your instructor has been notified. This page will refresh once approved.</p>
            </div>
          ) : unlockRequestStatus === 'rejected' ? (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-center gap-2 text-red-700 font-bold">
                <FiXCircle /> <span>Request Rejected</span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setUnlockRequestStatus('none')}>Try Again</Button>
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
              } finally { setRequestingUnlock(false); }
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Reason for Unlock</label>
                <textarea className="input-field" placeholder="e.g. Accidental tab switch…" rows={3} value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} required />
              </div>
              <Button className="w-full" type="submit" loading={requestingUnlock}>Send Unlock Request</Button>
            </form>
          )}
          <div className="pt-4 border-t border-gray-100">
            <button onClick={() => navigate('/student/exams')} className="text-sm text-gray-400 hover:text-gray-700">Exit to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const question = exam.questions[currentQuestion];
  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / exam.questions.length) * 100);
  const qSection = sectionLabel(question.type);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fullscreen Overlay */}
      {exam?.proctoring?.enforceFullscreen && !isActualFullScreen && !isLocked && (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="p-4 bg-primary-50 rounded-full w-20 h-20 mx-auto mb-5 flex items-center justify-center">
              <FiLoader className="w-10 h-10 text-primary-600 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">Fullscreen Required</h2>
            <p className="text-gray-500 text-sm mb-6">This exam requires fullscreen mode to ensure academic integrity. Your access is paused until you return to fullscreen.</p>
            <Button className="w-full h-12 text-base font-bold" onClick={enterFullscreen}>Enter Fullscreen to Continue</Button>
          </div>
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 flex-shrink-0">
        <div className="px-5 py-3 flex items-center gap-4">
          {/* Left: Exam name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">📝</div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{exam.title}</h1>
              <p className="text-xs text-gray-400">{exam.subject?.name}</p>
            </div>
            {exam.proctoring?.enabled && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-100 rounded-full animate-pulse ml-2 flex-shrink-0">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Proctoring</span>
              </div>
            )}
          </div>

          {/* Center: Progress */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-32 h-1.5 bg-gray-100 rounded-full">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-gray-500 font-semibold">{answered}/{exam.questions.length}</span>
          </div>

          {/* Right: Timer + violations + submit */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {tabSwitchCount > 0 && <Badge variant="warning">Tabs: {tabSwitchCount}</Badge>}
            {fullscreenExitCount > 0 && <Badge variant="danger">FS Exits: {fullscreenExitCount}</Badge>}
            <div className={`font-mono text-lg font-black px-4 py-1.5 rounded-lg border ${timeLeft < 300 ? 'text-red-600 bg-red-50 border-red-200' : 'text-primary-700 bg-primary-50 border-primary-200'}`}>
              ⏱ {formatTime(timeLeft)}
            </div>
            <Button size="sm" onClick={() => handleSubmit(false)} loading={submitting}>Submit</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {/* ── Left Sidebar: Section-grouped question palette ── */}
        <div className="w-56 flex-none border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Question Palette</p>
          </div>
          <div className="flex-1 p-3 space-y-4">
            {questionsBySection.map(({ section, qs }) => {
              const sl = sectionLabel(section);
              return (
                <div key={section}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${sl.dot}`} />
                    <span className="text-xs font-black text-gray-500 uppercase tracking-wider">{section}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {qs.map(q => {
                      const idx = exam.questions.indexOf(q);
                      const isActive = currentQuestion === idx;
                      const isAns = !!answers[q._id];
                      const isFlagged = !!flagged[q._id];
                      let cls = 'bg-gray-100 text-gray-500 border-gray-200';
                      if (isActive) cls = 'bg-primary-600 text-white border-primary-600 ring-2 ring-primary-300';
                      else if (isFlagged) cls = 'bg-amber-100 text-amber-700 border-amber-300';
                      else if (isAns) cls = 'bg-emerald-100 text-emerald-700 border-emerald-300';
                      return (
                        <button key={q._id} onClick={() => setCurrentQuestion(idx)}
                          className={`relative w-9 h-9 rounded-lg border text-sm font-bold transition-all ${cls}`}>
                          {idx + 1}
                          {isFlagged && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="p-3 border-t border-gray-100 space-y-1.5">
            {[
              { cls: 'bg-emerald-200', label: 'Answered' },
              { cls: 'bg-primary-500', label: 'Current' },
              { cls: 'bg-amber-200', label: 'Flagged' },
              { cls: 'bg-gray-200', label: 'Unanswered' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded ${l.cls}`} />
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Question header  */}
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-white flex items-start gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="bg-gray-100 text-gray-600 text-sm font-bold px-3 py-1.5 rounded-md">
                Q{currentQuestion + 1} / {exam.questions.length}
              </span>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${qSection.bg} ${qSection.text}`}>{question.type}</span>
              <span className="text-sm text-gray-400 font-semibold">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</span>
            </div>
            <button onClick={() => toggleFlag(question._id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border transition-colors flex-shrink-0 ${flagged[question._id]
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
              {flagged[question._id] ? '🚩 Flagged' : '⚑ Flag'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 leading-relaxed">{question.questionText}</h3>

              {/* Answer Input */}
              <div className="space-y-3">
                {question.type === QUESTION_TYPES.MCQ && (
                  <div className="space-y-3">
                    {question.options.map((option, index) => {
                      const isSelected = answers[question._id] === option.text;
                      return (
                        <label key={index}
                          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-primary-50 border-primary-400 ring-2 ring-primary-100' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}>
                          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-base font-black flex-shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-gray-400'
                            }`}>{String.fromCharCode(65 + index)}</div>
                          <input type="radio" name={`question-${question._id}`} value={option.text} checked={isSelected}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value)} className="hidden" />
                          <span className={`font-medium text-base ${isSelected ? 'text-primary-900' : 'text-gray-800'}`}>{option.text}</span>
                          {isSelected && <span className="ml-auto text-primary-600 text-xl">✓</span>}
                        </label>
                      );
                    })}
                  </div>
                )}

                {question.type === QUESTION_TYPES.TRUE_FALSE && (
                  <div className="grid grid-cols-2 gap-5">
                    {['True', 'False'].map((option) => {
                      const isSelected = answers[question._id] === option;
                      const isTrue = option === 'True';
                      return (
                        <label key={option} className={`relative flex flex-col items-center gap-3 py-8 px-5 border-2 rounded-2xl cursor-pointer transition-all ${isSelected
                          ? isTrue ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-100' : 'bg-red-50 border-red-400 ring-2 ring-red-100'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}>
                          <input type="radio" name={`question-${question._id}`} value={option} checked={isSelected}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value)} className="hidden" />
                          <span className="text-4xl">{isTrue ? '✓' : '✗'}</span>
                          <span className={`text-2xl font-black tracking-wide ${isSelected ? (isTrue ? 'text-emerald-700' : 'text-red-700') : 'text-gray-300'
                            }`}>{option.toUpperCase()}</span>
                          {isSelected && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isTrue ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>Selected</span>}
                        </label>
                      );
                    })}
                  </div>
                )}

                {question.type === QUESTION_TYPES.DESCRIPTIVE && (
                  <div>
                    <textarea value={answers[question._id] || ''}
                      onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 min-h-[200px] resize-y font-sans text-base leading-relaxed"
                      rows={8} placeholder="Write your answer here…" />
                    {question.wordLimit && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full">
                          <div className="h-full bg-primary-400 rounded-full transition-all" style={{ width: `${Math.min(((answers[question._id]?.trim().split(/\s+/).filter(Boolean).length || 0) / question.wordLimit) * 100, 100)}%` }} />
                        </div>
                        <span className="text-sm text-gray-500 font-semibold">
                          {answers[question._id]?.trim().split(/\s+/).filter(Boolean).length || 0} / {question.wordLimit} words
                        </span>
                      </div>
                    )}
                  </div>
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
            </div>
          </div>

          {/* Navigation footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-between items-center flex-shrink-0">
            <button onClick={handlePrevious} disabled={currentQuestion === 0}
              className={`px-5 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${currentQuestion === 0 ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
              ← Previous
            </button>
            <span className="text-xs text-gray-400">{answered} answered · {exam.questions.length - answered} remaining</span>
            {currentQuestion < exam.questions.length - 1 ? (
              <button onClick={handleNext}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-colors">
                Next →
              </button>
            ) : (
              <button onClick={() => handleSubmit(false)} disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60">
                {submitting ? 'Submitting…' : 'Finish & Submit ✓'}
              </button>
            )}
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
            <p className="text-xs text-amber-600 mt-1">Exceeding the limit will result in your exam being {(exam.proctoring?.actionOnLimit || 'warn').replace('-', ' ')}.</p>
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

      {/* Instructions Modal */}
      <Modal
        isOpen={showInstructions}
        onClose={() => { }}
        title="Exam Instructions & Proctoring Rules"
        showCloseButton={false}
      >
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h4 className="flex items-center gap-2 text-amber-800 font-bold mb-3">
              <FiAlertTriangle className="text-amber-600" />
              Proctoring Rules
            </h4>
            <ul className="space-y-2.5 text-sm text-amber-900/80">
              {exam.proctoring?.enforceFullscreen && (
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                  <span><b>Fullscreen Mandatory</b>: Exiting fullscreen will be logged as a violation.</span>
                </li>
              )}
              {exam.proctoring?.tabSwitchingAllowed === false && (
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                  <span><b>Tab Switching Blocked</b>: Do not switch tabs or windows. Max allowed: {exam.proctoring?.maxTabSwitches || 'None'}.</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <span><b>Copy-Paste Disabled</b>: Integrity monitoring is active for all text inputs.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <span><b>Consequence</b>: Exceeding violation limits will trigger <b>{(exam.proctoring?.actionOnLimit || 'warn').toUpperCase().replace('-', ' ')}</b>.</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 px-1">General Instructions</h4>
            <div className="prose prose-sm text-gray-600 bg-gray-50 p-4 rounded-xl max-h-40 overflow-y-auto border border-gray-100">
              {exam.instructions || 'No specific instructions provided.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Duration</span>
              <span className="font-bold text-gray-900">{exam.duration} Minutes</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Total Marks</span>
              <span className="font-bold text-gray-900">{exam.totalMarks} Marks</span>
            </div>
          </div>

          <Button
            className="w-full h-14 text-xl font-black shadow-xl"
            onClick={() => {
              setShowInstructions(false);
              setHasStartedTimer(true);
              if (exam.proctoring?.enforceFullscreen) enterFullscreen();
            }}
          >
            I Understand, Start Exam
          </Button>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
        title="Confirm Submission"
      >
        <div className="text-center space-y-6 py-4">
          <div className="p-4 bg-primary-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <FiCheckCircle className="w-12 h-12 text-primary-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Ready to Submit?</h3>
            <p className="text-gray-600 mt-2">
              Are you sure you want to submit your exam? Once submitted, you won't be able to change your answers.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-700">
              Questions Answered: {Object.keys(answers).length} of {exam.questions.length}
            </p>
            {Object.keys(answers).length < exam.questions.length && (
              <p className="text-xs text-amber-600 mt-1 font-bold italic">
                Wait! You still have {exam.questions.length - Object.keys(answers).length} unanswered questions.
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setShowConfirmSubmit(false)}
            >
              Go Back
            </Button>
            <Button
              className="flex-1 h-12 shadow-lg"
              onClick={() => performSubmit(false)}
              loading={submitting}
            >
              Submit Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Proctor Monitoring Feed */}
      {exam?.proctoring?.enabled && exam?.proctoring?.cameraRequired && (
        <div className={`fixed bottom-28 right-6 z-50 transition-all duration-500 ease-in-out ${isCameraExpanded ? 'w-64' : 'w-12 h-12'}`}>
          {/* Expanded View */}
          <div className={`bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-gray-200 shadow-2xl overflow-hidden transition-all duration-500 ${isCameraExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'}`}>
            <div className="px-3 py-1 flex items-center justify-end">
              <button
                onClick={() => setIsCameraExpanded(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Minimize Feed"
              >
                <FiChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <LiveFeedPanel
              useRealFeed={true}
              mediaActive={!submitting && !submissionResult && !showConfirmSubmit}
              showOverlays={false}
              studentName={user?.name || 'Student'}
              status="detected"
            />
          </div>

          {/* Minimized Icon View */}
          {!isCameraExpanded && (
            <button
              onClick={() => setIsCameraExpanded(true)}
              className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 group relative animate-in zoom-in duration-300"
              title="Expand Monitoring Feed"
            >
              <FiVideo className="w-5 h-5" />
              {(!submitting && !submissionResult && !showConfirmSubmit) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
              )}
            </button>
          )}
        </div>
      )}
    </div >
  );
};

export default TakeExam;
