import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiEye, FiUser, FiAward, FiCheckCircle, FiClock, FiXCircle, FiFileText, FiActivity, FiMonitor, FiAlertTriangle, FiLock, FiShield, FiRotateCcw } from 'react-icons/fi';
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
import { QUESTION_TYPES, USER_ROLES } from '@/config/constants';
import toast from 'react-hot-toast';

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getBasePath = () => {
    switch (user?.role) {
      case USER_ROLES.SUPER_ADMIN: return '/super-admin';
      case USER_ROLES.ADMIN: return '/admin';
      case USER_ROLES.DEPT_HEAD: return '/dept-head';
      case USER_ROLES.FACULTY: return '/faculty';
      default: return '/faculty';
    }
  };
  const basePath = getBasePath();
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

  const handleUnlock = async (resultId, status) => {
    try {
      await facultyService.handleUnlockRequest(resultId, status);
      toast.success(`Unlock request ${status} successfully`);
      fetchResults(selectedResult?._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to handle unlock request');
    }
  };

  const handleReset = async (result) => {
    if (!window.confirm(`Are you sure you want to reset the exam attempt for ${result.studentId?.name}? This will delete their current score and answers, and allow them to take the exam again.`)) {
      return;
    }

    try {
      await facultyService.resetExamAttempt(id, result.studentId._id);
      toast.success('Exam attempt reset successfully');
      fetchResults();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset attempt');
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
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleViewDetails(row)}
          >
            <FiEye className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleReset(row)}
            title="Reset Attempt"
          >
            <FiRotateCcw className="w-4 h-4" />
          </Button>
        </div>
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
                      className={`p-4 rounded-xl border-2 transition-all group hover:cursor-pointer relative ${result.status === 'locked' ? 'bg-red-50 border-red-200' : result.status === 'submitted' ? 'bg-gray-50 border-gray-100' : 'bg-white border-transparent shadow-sm hover:shadow-md'}`}
                      onClick={() => handleViewDetails(result)}
                    >
                      {result.unlockRequest?.status === 'pending' && (
                        <div className="absolute -top-2 -right-2 z-10 animate-bounce">
                          <Badge variant="warning" className="shadow-lg border-2 border-white flex items-center gap-1">
                            <FiAlertTriangle className="w-3 h-3" /> UNLOCK REQ
                          </Badge>
                        </div>
                      )}
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
              {results.some(r => r.unlockRequest?.status === 'pending') && (
                <Card title="Pending Unlock Requests" className="bg-amber-50 border-amber-200">
                  <div className="space-y-3">
                    {results.filter(r => r.unlockRequest?.status === 'pending').map(r => (
                      <div key={r._id} className="p-3 bg-white border border-amber-200 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                              {r.studentId?.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{r.studentId?.name}</p>
                              <p className="text-[10px] text-gray-400">Locked due to violations</p>
                            </div>
                          </div>
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(r);
                            }}
                          >
                            Review
                          </Button>
                        </div>
                        <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-800 italic border border-amber-100 mb-2">
                          "{r.unlockRequest?.reason}"
                        </div>
                        <div className="flex gap-2">
                          <Button size="xs" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleUnlock(r._id, 'approved')}>Approve</Button>
                          <Button size="xs" variant="danger" className="flex-1" onClick={() => handleUnlock(r._id, 'rejected')}>Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

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
            {/* Premium Header Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch">
              <div className="bg-gradient-to-br from-indigo-500 to-primary-600 p-6 flex flex-col items-center justify-center text-white md:w-1/3 text-center border-b md:border-b-0 md:border-r border-indigo-400">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center font-black text-3xl shadow-inner backdrop-blur-sm mb-3 ring-4 ring-white/30">
                  {selectedResult?.studentId?.name?.charAt(0)}
                </div>
                <h3 className="text-xl font-bold leading-tight">{selectedResult?.studentId?.name}</h3>
                <p className="text-indigo-100 font-mono text-sm mt-1">{selectedResult?.studentId?.regNo || selectedResult?.studentId?.enrollmentNumber}</p>
              </div>
              <div className="p-6 md:w-2/3 grid grid-cols-2 gap-y-6 gap-x-4 bg-gray-50/50">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FiAward className="text-green-500" /> Total Score</p>
                  <p className="text-2xl font-black text-gray-900 flex items-baseline gap-1">
                    {selectedResult.score} <span className="text-sm font-medium text-gray-500">/ {exam?.totalMarks}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FiCheckCircle className="text-purple-500" /> Exam Status</p>
                  <div className="mt-1">{getStatusBadge(selectedResult.status)}</div>
                </div>
                <div className="space-y-1 mt-auto">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FiClock className="text-orange-500" /> Submitted At</p>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedResult.submittedAt ? formatDateTime(selectedResult.submittedAt) : <span className="text-gray-400 italic font-normal">Not Submitted</span>}
                  </p>
                </div>
                <div className="space-y-1 mt-auto">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><FiMonitor className="text-blue-500" /> Security Events</p>
                  <div className="flex gap-2 mt-1 relative z-10">
                    {selectedResult.tabSwitchCount > 0 ? (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">Tabs: {selectedResult.tabSwitchCount}</span>
                    ) : (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold transition-all">Secure</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Unlock Request Banner in Modal */}
            {selectedResult.unlockRequest?.status === 'pending' && (
              <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                    <FiAlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Pending Unlock Request</h4>
                    <p className="text-sm text-amber-800 mt-1 italic">
                      "{selectedResult.unlockRequest.reason}"
                    </p>
                    <p className="text-[10px] text-amber-600 mt-2 font-bold uppercase tracking-widest">
                      Requested at: {formatDateTime(selectedResult.unlockRequest.requestedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button
                    className="flex-1 md:flex-none h-11 px-8 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100"
                    onClick={() => handleUnlock(selectedResult._id, 'approved')}
                  >
                    Approve & Unlock
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 md:flex-none h-11 px-8"
                    onClick={() => handleUnlock(selectedResult._id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}

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
                      <Card key={answer._id} className="hover:shadow-lg transition-all border border-gray-200 rounded-2xl overflow-hidden group">
                        <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex justify-between items-center group-hover:bg-primary-50/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-black shadow-sm group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 outline outline-2 outline-offset-2 outline-transparent group-hover:outline-primary-200 transition-all">
                              {answer.originalIndex + 1}
                            </span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><FiFileText /> Question</span>
                          </div>
                          <Badge variant={answer.isEvaluated ? 'success' : 'warning'} className="shadow-sm font-bold">
                            {answer.isEvaluated ? 'Evaluated' : 'Pending'}
                          </Badge>
                        </div>

                        <div className="p-5 space-y-4">
                          <p className="font-semibold text-gray-900 leading-relaxed text-[15px]">
                            {answer.questionId?.questionText}
                          </p>

                          <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-300 shadow-sm mt-3">
                            <p className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Student Answer
                            </p>
                            <div className="text-gray-900 font-medium break-words text-sm bg-white p-3 rounded-lg border border-blue-100 shadow-inner">
                              {answer.questionId?.type === 'Coding' ? (
                                <span className="flex items-center gap-2 text-indigo-700 font-semibold bg-indigo-50 px-3 py-1.5 rounded-md w-fit border border-indigo-200">
                                  <FiMonitor className="w-4 h-4" /> Click Evaluate to view code
                                </span>
                              ) : answer.questionId?.type === 'MCQ' || answer.questionId?.type === 'TrueFalse' ? (
                                answer.selectedAnswer || <span className="text-gray-400 italic font-normal">Not answered</span>
                              ) : (
                                answer.textAnswer || <span className="text-gray-400 italic font-normal">Not answered</span>
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

                          {answer.feedback && (
                            <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-300 mt-3 shadow-sm">
                              <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Evaluator Feedback
                              </p>
                              <div className="text-gray-900 bg-white p-3 rounded-lg border border-amber-100 text-sm shadow-inner">
                                {answer.feedback}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center bg-gray-50 -mx-5 -mb-5 px-5 py-4 mt-6 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Awarded:</span>
                                <span className="font-black text-lg text-primary-600">
                                  {answer.marksAwarded || 0} <span className="text-xs text-gray-400 font-medium">/ {answer.questionId?.marks}</span>
                                </span>
                              </div>
                              {answer.isEvaluated && answer.evaluatedBy && (
                                <Badge variant="info" className="text-[9px] py-1 border-blue-200 px-3 rounded-full flex items-center gap-1.5 shadow-sm bg-white font-bold text-blue-800">
                                  <FiUser className="w-3 h-3" /> Graded by {answer.evaluatedBy.name}
                                  {answer.evaluatedBy._id === exam?.facultyId?._id && <span className="bg-blue-100 text-blue-600 px-1 rounded ml-1 uppercase text-[7px] tracking-wider">Owner</span>}
                                </Badge>
                              )}
                            </div>
                            {answer.questionId?.type !== 'MCQ' && (
                              <Button
                                size="sm"
                                variant={answer.isEvaluated ? 'secondary' : 'primary'}
                                onClick={() => handleEvaluate(answer)}
                                className="font-bold shadow-sm"
                              >
                                {answer.isEvaluated ? 'Edit Grade' : 'Evaluate'}
                              </Button>
                            )}
                          </div>
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

      {/* Evaluation Modal Full Redesign */}
      <Modal
        isOpen={showEvaluateModal}
        onClose={() => setShowEvaluateModal(false)}
        title={
          <div className="flex items-center gap-3 w-full border-b border-gray-100 pb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md ring-2 ring-white">
              {selectedResult?.studentId?.name?.charAt(0)}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-lg leading-none">{selectedResult?.studentId?.name}</h4>
              <p className="text-xs text-gray-500 font-mono tracking-wider mt-1 flex items-center gap-2">
                {selectedResult?.studentId?.regNo || selectedResult?.studentId?.enrollmentNumber}
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span className="text-primary-600">{exam?.title}</span>
              </p>
            </div>
          </div>
        }
        size="full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

          {/* Left Column: Question & Student Answer */}
          <div className="lg:col-span-7 space-y-6">

            {/* Question Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center text-sm">❓</div>
                  <h5 className="font-bold text-gray-800 uppercase tracking-widest text-xs">Question Detail</h5>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-gray-500 border-gray-300">{selectedAnswer?.questionId?.marks} Marks Base</Badge>
              </div>
              <div className="p-5">
                <p className="text-gray-800 text-sm leading-relaxed font-medium">
                  {selectedAnswer?.questionId?.questionText}
                </p>
              </div>
            </div>

            {/* Student Answer Card */}
            <div className="bg-white rounded-2xl border border-blue-200 shadow-lg shadow-blue-50/50 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
              <div className="bg-gradient-to-r from-blue-50/50 to-white px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-sm shadow-inner">🧑‍🎓</div>
                  <h5 className="font-black text-blue-900 uppercase tracking-widest text-xs">Student Submission</h5>
                </div>
                {selectedAnswer?.isEvaluated && selectedAnswer?.evaluatedBy && (
                  <Badge variant="info" className="text-[9px] py-1 bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 shadow-sm font-bold">
                    <FiCheckCircle className="w-3 h-3" /> Graded by {selectedAnswer.evaluatedBy.name}
                  </Badge>
                )}
              </div>

              <div className="p-4">
                {selectedAnswer?.questionId?.type === 'Coding' ? (
                  <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900 shadow-2xl">
                    <div className="bg-gray-950 px-4 py-2.5 flex items-center justify-between border-b border-gray-800">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono flex items-center gap-2 uppercase tracking-widest">
                        <FiMonitor className="w-3.5 h-3.5 text-blue-400" /> main.js
                      </span>
                    </div>
                    <div className="relative">
                      <pre className="p-5 text-green-400 font-mono text-sm overflow-x-auto whitespace-pre-wrap max-h-[500px] custom-scrollbar leading-relaxed">
                        {selectedAnswer?.codeAnswer || <span className="text-gray-600 italic">// No implementation provided by student</span>}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100 min-h-[150px] text-gray-800 whitespace-pre-wrap shadow-inner leading-relaxed text-sm font-medium">
                    {selectedAnswer?.textAnswer || selectedAnswer?.selectedAnswer || (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <FiAlertTriangle className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">No Answer Submitted</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Reference & Grading Panel */}
          <div className="lg:col-span-5 space-y-6">

            {/* Reference Solution Card */}
            {selectedAnswer?.questionId?.type === 'Coding' && selectedAnswer?.questionId?.codeSnippet && (
              <div className="bg-white rounded-2xl border border-indigo-200 shadow-md overflow-hidden ring-1 ring-black/5">
                <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiShield className="text-indigo-600 w-4 h-4" />
                    <h5 className="font-bold text-indigo-900 uppercase tracking-widest text-[11px]">Reference Solution</h5>
                  </div>
                  <Badge variant="warning" className="text-[8px] tracking-widest uppercase bg-amber-100 text-amber-800">Facultys Only</Badge>
                </div>
                <div className="rounded-b-xl overflow-hidden bg-gray-900 border-none">
                  <pre className="p-4 text-[#a5b4fc] font-mono text-[13px] overflow-x-auto whitespace-pre-wrap max-h-64 custom-scrollbar">
                    {selectedAnswer.questionId.codeSnippet}
                  </pre>
                </div>
              </div>
            )}

            {/* Grading Panel Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col sticky top-4">
              <div className="bg-gray-900 px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary-500/20 text-primary-400 flex items-center justify-center">
                    <span className="text-sm">⚖️</span>
                  </div>
                  <h5 className="font-bold text-white uppercase tracking-widest text-xs">Grading Panel</h5>
                </div>
                {selectedAnswer?.isEvaluated && <Badge variant="success" className="bg-green-500 text-white border-none text-[9px]">Already Graded</Badge>}
              </div>

              <div className="p-5 space-y-5 bg-gray-50">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                    <span>Award Marks</span>
                    <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">Max: {selectedAnswer?.questionId?.marks}</span>
                  </label>
                  <div className="flex items-center h-12">
                    <span className="h-full bg-gray-100 border border-gray-200 border-r-0 px-4 flex items-center text-gray-500 font-bold rounded-l-lg">Pts</span>
                    <input
                      type="number"
                      step="0.5"
                      max={selectedAnswer?.questionId?.marks}
                      value={evaluationData.marksAwarded}
                      onChange={(e) => setEvaluationData({ ...evaluationData, marksAwarded: e.target.value })}
                      className="w-full h-full border border-gray-200 rounded-r-lg px-4 font-black text-2xl text-gray-900 outline-none w-full"
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 transition-all">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <FiFileText className="w-3.5 h-3.5" /> Feedback / Comments
                  </label>
                  <textarea
                    value={evaluationData.feedback}
                    onChange={(e) => setEvaluationData({ ...evaluationData, feedback: e.target.value })}
                    placeholder="Provide constructive feedback..."
                    rows={4}
                    className="w-full resize-none border-none focus:ring-0 p-0 text-sm text-gray-800 placeholder-gray-300 custom-scrollbar"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-white px-5 py-4 border-t border-gray-200 flex flex-col gap-3">
                {selectedAnswer?.questionId?.type === 'Coding' && (
                  <Button
                    variant="outline"
                    onClick={handleAIEvaluate}
                    disabled={loadingAI}
                    className="w-full flex items-center justify-center gap-2 border-primary-200 text-primary-700 hover:bg-primary-50 rounded-xl py-3 font-bold"
                  >
                    {loadingAI ? (
                      <FiActivity className="animate-spin w-5 h-5" />
                    ) : (
                      <>
                        <span className="text-xl">✨</span> Auto-Grade with AI
                      </>
                    )}
                  </Button>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowEvaluateModal(false)}
                    className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 border-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitEvaluation}
                    className="flex-[2] rounded-xl shadow-xl shadow-primary-500/20 py-3 font-black tracking-wide bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 flex justify-center w-full"
                  >
                    {selectedAnswer?.isEvaluated ? 'Update Grade' : 'Submit Grade'}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </Modal>
    </div >
  );
};

export default Results;
