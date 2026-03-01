import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiEye, FiUser, FiAward, FiCheckCircle, FiClock, FiXCircle, FiFileText, FiActivity, FiMonitor, FiAlertTriangle, FiLock, FiShield } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Textarea from '@/components/common/Textarea.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { facultyService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/utils/dateUtils';
import { QUESTION_TYPES } from '@/config/constants';
import toast from 'react-hot-toast';

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === 'superadmin' ? '/super-admin' : '/faculty';
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [evaluationData, setEvaluationData] = useState({
    marksAwarded: 0,
    feedback: '',
  });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [activeTab, setActiveTab] = useState('results'); // 'results' or 'monitoring'

  useEffect(() => {
    let interval;
    if (activeTab === 'monitoring' && exam && (exam.status === 'ongoing' || exam.status === 'scheduled')) {
      interval = setInterval(() => {
        fetchResults(selectedResult?._id);
      }, 5000); // Poll every 5 seconds for live status
    }
    return () => clearInterval(interval);
  }, [activeTab, exam?.status, selectedResult]);

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async (syncSelectedId = null) => {
    try {
      if (!syncSelectedId) setLoading(true);
      const response = await facultyService.getExamResults(id);
      const data = response.data;
      setResults(data);

      if (syncSelectedId) {
        const updated = data.find((r) => r._id === syncSelectedId);
        if (updated) setSelectedResult(updated);
      }

      if (data.length > 0) {
        const examResponse = await facultyService.getExam(id);
        setExam(examResponse.data);
      }
    } catch (error) {
      toast.error('Failed to load results');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (result) => {
    setSelectedResult(result);
  };

  const handleEvaluate = (answer) => {
    setSelectedAnswer(answer);
    setEvaluationData({
      marksAwarded: answer.marksAwarded || 0,
      feedback: answer.feedback || '',
    });
    setShowEvaluateModal(true);
  };

  const handleSubmitEvaluation = async () => {
    try {
      await facultyService.evaluateAnswer(
        selectedResult._id,
        selectedAnswer._id,
        evaluationData
      );
      toast.success('Answer evaluated successfully');
      setShowEvaluateModal(false);
      fetchResults(selectedResult._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to evaluate');
    }
  };

  const handleAIEvaluate = async () => {
    try {
      setLoadingAI(true);
      const response = await facultyService.evaluateAI(selectedResult._id, selectedAnswer._id);

      if (response.success) {
        setEvaluationData({
          marksAwarded: response.data.marksAwarded,
          feedback: response.data.feedback,
        });
        toast.success('AI evaluation complete!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'AI evaluation failed');
      console.error(error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePublishResults = async () => {
    if (!window.confirm('Are you sure you want to publish the results? Once published, students will be able to see their scores and detailed performance.')) {
      return;
    }

    try {
      await facultyService.publishResults(id);
      toast.success('Results published successfully');
      fetchResults(); // Refresh data to get updated exam status
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish results');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'in-progress': { variant: 'info', label: 'In Progress' },
      submitted: { variant: 'warning', label: 'Submitted' },
      evaluated: { variant: 'success', label: 'Evaluated' },
      locked: { variant: 'danger', label: 'LOCKED' },
    };
    const config = statusMap[status] || statusMap.submitted;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    { header: 'Rank', accessor: 'rank' },
    {
      header: 'Student',
      accessor: (row) => (
        <div>
          <p className="font-medium">{row.studentId?.name}</p>
          <p className="text-sm text-gray-500">{row.studentId?.regNo || row.studentId?.enrollmentNumber}</p>
        </div>
      )
    },
    {
      header: 'Score',
      accessor: (row) => `${row.score} / ${row.totalMarks || exam?.totalMarks || 0}`
    },
    {
      header: 'Percentage',
      accessor: (row) => {
        const percentage = ((row.score / (row.totalMarks || exam?.totalMarks || 1)) * 100).toFixed(2);
        return `${percentage}%`;
      }
    },
    {
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Violations',
      render: (row) => (
        <div className="flex flex-col gap-1">
          {row.tabSwitchCount > 0 && (
            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 font-bold">
              TAB: {row.tabSwitchCount}
            </span>
          )}
          {row.violations?.length > 0 && (
            <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-bold">
              EXT: {row.violations.filter(v => v.type === 'fullscreen_exit').length}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Submitted At',
      accessor: (row) => row.submittedAt ? formatDateTime(row.submittedAt) : 'Ongoing...'
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button
          size="sm"
          variant="primary"
          onClick={() => handleViewDetails(row)}
        >
          <FiEye className="w-4 h-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`${basePath}/exams`)}
            icon={<FiArrowLeft />}
          >
            Back to Exams
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exam Results</h1>
            <p className="text-gray-600 mt-1">{exam?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exam?.status === 'completed' && !exam?.resultsPublished && (
            <Button
              variant="success"
              onClick={handlePublishResults}
              icon={<FiCheckCircle />}
            >
              Publish Results
            </Button>
          )}
          {exam?.resultsPublished && (
            <Badge variant="success" className="px-3 py-2 flex items-center gap-1 font-bold">
              <FiCheckCircle /> Results Published
            </Badge>
          )}
          <Button icon={<FiDownload />}>Export Results</Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="text-center">
            <p className="text-sm text-blue-700 font-medium">Total Students</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">{results.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="text-center">
            <p className="text-sm text-green-700 font-medium">Average Score</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {results.length > 0
                ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
                : 0}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="text-center">
            <p className="text-sm text-emerald-700 font-medium">Highest Score</p>
            <p className="text-3xl font-bold text-emerald-900 mt-2">
              {results.length > 0 ? Math.max(...results.map(r => r.score)) : 0}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="text-center">
            <p className="text-sm text-red-700 font-medium">Lowest Score</p>
            <p className="text-3xl font-bold text-red-900 mt-2">
              {results.length > 0 ? Math.min(...results.map(r => r.score)) : 0}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="text-center">
            <p className="text-sm text-purple-700 font-medium">Pass Rate</p>
            <p className="text-3xl font-bold text-purple-900 mt-2">
              {results.length > 0
                ? ((results.filter(r => r.score >= (exam?.passingMarks || 0)).length / results.length) * 100).toFixed(0)
                : 0}%
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('results')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'results' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FiFileText /> Completed Results
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'monitoring' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FiMonitor className={activeTab === 'monitoring' && exam?.status === 'ongoing' ? 'animate-pulse text-red-500' : ''} />
          Live Monitoring
        </button>
      </div>

      {activeTab === 'results' ? (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900">Student Results</h2>
          </div>
          {results.length > 0 ? (
            <Table columns={columns} data={results} />
          ) : (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FiFileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
              <p className="text-gray-600">No students have submitted this exam yet.</p>
            </div>
          )}
        </Card>
      ) : (
        /* Monitoring View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Feed Column */}
            <div className="lg:col-span-2 space-y-4">
              <Card title="Live Student Status" subtitle={`Currently ${results.filter(r => r.status === 'in-progress').length} active students`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.length > 0 ? results.map((result) => (
                    <div
                      key={result._id}
                      className={`p-4 rounded-xl border-2 transition-all group hover:cursor-pointer ${result.status === 'locked' ? 'bg-red-50 border-red-200' : result.status === 'submitted' ? 'bg-gray-50 border-gray-100' : 'bg-white border-transparent shadow-sm hover:shadow-md'}`}
                      onClick={() => handleViewDetails(result)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${result.status === 'locked' ? 'bg-red-500 shadow-md shadow-red-100' : result.status === 'submitted' ? 'bg-gray-400' : 'bg-indigo-500 shadow-md shadow-indigo-100'}`}>
                            {result.studentId?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{result.studentId?.name}</p>
                            <p className="text-[10px] font-mono text-gray-400">{result.studentId?.regNo}</p>
                          </div>
                        </div>
                        {getStatusBadge(result.status)}
                      </div>

                      <div className="flex gap-2 mb-3">
                        <div className={`flex-1 p-2 rounded-lg text-center border ${result.tabSwitchCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tab Switches</p>
                          <p className={`text-lg font-black ${result.tabSwitchCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{result.tabSwitchCount}</p>
                        </div>
                        <div className={`flex-1 p-2 rounded-lg text-center border ${result.violations?.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">FS Exits</p>
                          <p className={`text-lg font-black ${result.violations?.length > 0 ? 'text-red-600' : 'text-gray-300'}`}>{result.violations?.length || 0}</p>
                        </div>
                      </div>

                      {result.status === 'in-progress' && (
                        <div className="flex items-center gap-2 text-xs text-green-500 font-bold animate-pulse">
                          <FiActivity /> Live Session Active
                        </div>
                      )}

                      {result.status === 'locked' && (
                        <div className="flex items-center gap-2 text-xs text-red-600 font-black">
                          <FiLock /> EXAM LOCKED (THRESHOLD)
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-gray-400">No students joined yet</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Violations Column */}
            <div className="space-y-4">
              <Card title="Critical Alerts" className="bg-white">
                <div className="space-y-3">
                  {results.filter(r => (r.tabSwitchCount > 0 || r.violations?.length > 0)).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10).map(r => (
                    <div key={r._id} className="p-3 bg-red-50/50 border border-red-100 rounded-lg flex gap-3 items-start">
                      <div className="bg-red-500 text-white p-1.5 rounded-lg">
                        <FiAlertTriangle size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{r.studentId?.name}</p>
                        <p className="text-[10px] text-red-600 font-medium">
                          {r.tabSwitchCount > 0 && `${r.tabSwitchCount} Tab Switches `}
                          {r.violations?.length > 0 && `${r.violations.length} Fullscreen Exits`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {results.filter(r => (r.tabSwitchCount > 0 || r.violations?.length > 0)).length === 0 && (
                    <div className="text-center py-6">
                      <FiShield className="w-10 h-10 text-green-100 mx-auto mb-2" />
                      <p className="text-xs text-green-600 font-bold uppercase tracking-widest">Secure session</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Result Details Modal */}
      {selectedResult && (
        <Modal
          isOpen={!!selectedResult}
          onClose={() => setSelectedResult(null)}
          title="Student Answer Sheet"
          size="xl"
        >
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">Student: </span>
                  <span className="font-semibold text-gray-900">{selectedResult.studentId?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiAward className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Score: </span>
                  <span className="font-semibold text-gray-900">{selectedResult.score} / {exam?.totalMarks}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">Status: </span>
                  {getStatusBadge(selectedResult.status)}
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-700">Submitted: </span>
                  <span className="font-semibold text-gray-900">
                    {selectedResult.submittedAt ? formatDateTime(selectedResult.submittedAt) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Proctoring Violation Log */}
            {(selectedResult.tabSwitchCount > 0 || (selectedResult.violations && selectedResult.violations.length > 0)) && (
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3">
                <div className="flex items-center justify-between border-b border-red-200 pb-2">
                  <h3 className="text-xs font-black text-red-800 uppercase tracking-widest flex items-center gap-2">
                    <FiAlertTriangle className="animate-pulse" />
                    Security Violation Event Log
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold bg-white text-red-600 px-2 py-1 rounded border shadow-sm">
                      TOTAL TAB SWITCHES: {selectedResult.tabSwitchCount || 0}
                    </span>
                    <span className="text-[10px] font-bold bg-white text-orange-600 px-2 py-1 rounded border shadow-sm">
                      FULLSCREEN EXITS: {selectedResult.violations?.filter(v => v.type === 'fullscreen_exit').length || 0}
                    </span>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {selectedResult.violations?.slice().reverse().map((v, i) => (
                    <div key={i} className="bg-white/80 p-2 rounded-lg text-[10px] border border-red-50 flex justify-between items-center group hover:bg-white transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${v.type === 'fullscreen_exit' ? 'bg-orange-500' : 'bg-red-500'}`}></span>
                        <span className="font-bold text-gray-700 uppercase">{v.type?.replace('_', ' ')}</span>
                        <span className="text-gray-400 italic font-medium">{v.details || 'Violation detected during exam'}</span>
                      </div>
                      <span className="text-gray-500 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {(!selectedResult.violations || selectedResult.violations.length === 0) && selectedResult.tabSwitchCount > 0 && (
                    <div className="text-center py-2 italic text-[10px] text-gray-400">
                      Check tab switching metrics above. Specific event logging may vary.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Question Type Filter */}
            <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
              {['All', QUESTION_TYPES.MCQ, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.DESCRIPTIVE, QUESTION_TYPES.CODING].map((type) => {
                const count = type === 'All'
                  ? selectedResult.answers?.length
                  : selectedResult.answers?.filter(a => a.questionId?.type === type).length;

                if (type !== 'All' && count === 0) return null;

                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === type
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {type === 'All' ? 'All Questions' : type}
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${filterType === type ? 'bg-primary-50 text-primary-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {[
                { type: QUESTION_TYPES.MCQ, label: 'Multiple Choice Questions', icon: '🔘' },
                { type: QUESTION_TYPES.TRUE_FALSE, label: 'True/False Questions', icon: '⚖️' },
                { type: QUESTION_TYPES.DESCRIPTIVE, label: 'Descriptive Questions', icon: '✍️' },
                { type: QUESTION_TYPES.CODING, label: 'Coding Questions', icon: '💻' },
              ].filter(section => filterType === 'All' || filterType === section.type).map((section) => {
                const sectionAnswers = selectedResult.answers
                  ?.map((ans, idx) => ({ ...ans, originalIndex: idx }))
                  .filter((ans) => ans.questionId?.type === section.type);

                if (!sectionAnswers || sectionAnswers.length === 0) return null;

                return (
                  <div key={section.type} className="space-y-3">
                    <div className="flex items-center gap-2 px-1 pb-1 border-b border-gray-100">
                      <span className="text-xl">{section.icon}</span>
                      <h3 className="font-bold text-gray-800 uppercase tracking-wider text-xs">
                        {section.label} ({sectionAnswers.length})
                      </h3>
                    </div>
                    {sectionAnswers.map((answer) => (
                      <Card key={answer._id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary-500">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-start gap-2 flex-1">
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold flex-shrink-0">
                                {answer.originalIndex + 1}
                              </span>
                              <p className="font-medium text-gray-900 flex-1">
                                {answer.questionId?.questionText}
                              </p>
                            </div>
                            <Badge variant={answer.isEvaluated ? 'success' : 'warning'} className="flex-shrink-0">
                              {answer.isEvaluated ? 'Evaluated' : 'Pending'}
                            </Badge>
                          </div>

                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">Student Answer</p>
                            <div className="text-gray-900 break-words">
                              {answer.questionId?.type === 'Coding' ? (
                                <span className="text-sm text-gray-500 italic">Click Evaluate to view code</span>
                              ) : answer.questionId?.type === 'MCQ' || answer.questionId?.type === 'TrueFalse' ? (
                                answer.selectedAnswer || 'Not answered'
                              ) : (
                                answer.textAnswer || 'Not answered'
                              )}
                            </div>
                          </div>

                          {(answer.questionId?.type === 'MCQ' || answer.questionId?.type === 'TrueFalse') && (
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200 mt-2">
                              <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Correct Answer</p>
                              <p className="text-green-900 font-medium break-words">
                                {answer.questionId?.options?.find(opt => opt.isCorrect)?.text || answer.questionId?.options?.[0]?.text}
                              </p>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                              <FiAward className="w-4 h-4 text-primary-600" />
                              <span className="text-sm text-gray-700">Marks: </span>
                              <span className="font-bold text-gray-900">
                                {answer.marksAwarded || 0} / {answer.questionId?.marks}
                              </span>
                            </div>
                            {answer.questionId?.type !== 'MCQ' && (
                              <Button
                                size="sm"
                                variant={answer.isEvaluated ? 'secondary' : 'primary'}
                                onClick={() => handleEvaluate(answer)}
                              >
                                {answer.isEvaluated ? 'Edit Grade' : 'Evaluate'}
                              </Button>
                            )}
                          </div>

                          {answer.feedback && (
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-lg border border-amber-200">
                              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Feedback</p>
                              <p className="text-gray-900">{answer.feedback}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )
      }

      {/* Evaluation Modal */}
      <Modal
        isOpen={showEvaluateModal}
        onClose={() => setShowEvaluateModal(false)}
        title="Evaluate Answer"
      >
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <p className="text-sm font-semibold text-purple-800 mb-2">Question:</p>
            <p className="text-gray-900">{selectedAnswer?.questionId?.questionText}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-2">Student Answer:</p>
            {selectedAnswer?.questionId?.type === 'Coding' ? (
              <div className="rounded-xl overflow-hidden border border-blue-300 shadow-sm mt-2">
                <div className="bg-gray-800 px-3 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-300 font-mono">Submitted Code</span>
                </div>
                <pre className="p-3 bg-gray-900 text-green-300 font-mono text-sm overflow-x-auto whitespace-pre-wrap max-h-64">
                  {selectedAnswer?.codeAnswer || '// No code submitted'}
                </pre>
              </div>
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">{selectedAnswer?.textAnswer || selectedAnswer?.selectedAnswer || 'Not answered'}</p>
            )}
          </div>

          {selectedAnswer?.questionId?.type === 'Coding' && selectedAnswer?.questionId?.codeSnippet && (
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-purple-800">Reference Solution (Admin Only):</p>
              </div>
              <div className="rounded-xl overflow-hidden border border-purple-300 shadow-sm">
                <div className="bg-purple-900 px-3 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-purple-200 font-mono flex items-center gap-1.5">
                    <FiCheckCircle className="w-3.5 h-3.5" /> Optimal Implementation
                  </span>
                </div>
                <pre className="p-3 bg-gray-900 text-purple-300 font-mono text-sm overflow-x-auto whitespace-pre-wrap max-h-64">
                  {selectedAnswer.questionId.codeSnippet}
                </pre>
              </div>
            </div>
          )}

          <Input
            label={`Marks Awarded (Max: ${selectedAnswer?.questionId?.marks})`}
            type="number"
            step="0.5"
            max={selectedAnswer?.questionId?.marks}
            value={evaluationData.marksAwarded}
            onChange={(e) => setEvaluationData({ ...evaluationData, marksAwarded: e.target.value })}
            required
          />

          <Textarea
            label="Feedback (Optional)"
            value={evaluationData.feedback}
            onChange={(e) => setEvaluationData({ ...evaluationData, feedback: e.target.value })}
            placeholder="Provide detailed feedback to help the student understand..."
            rows={3}
          />

          <div className="flex justify-between items-center bg-gray-50 -mx-6 -mb-6 px-6 py-4 mt-6 border-t border-gray-200 rounded-b-xl">
            <div>
              {selectedAnswer?.questionId?.type === 'Coding' && (
                <Button
                  variant="secondary"
                  onClick={handleAIEvaluate}
                  disabled={loadingAI}
                  className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {loadingAI ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      AI Analyzing...
                    </>
                  ) : (
                    <>
                      <FiAward className="w-4 h-4" />
                      AI Evaluate
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowEvaluateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitEvaluation}>
                Submit Evaluation
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div >
  );
};

export default Results;
