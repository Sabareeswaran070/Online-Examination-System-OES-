import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiDownload,
  FiEye,
  FiUser,
  FiAward,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiFileText,
  FiActivity,
  FiMonitor,
  FiAlertTriangle,
  FiLock,
  FiShield,
  FiRotateCcw,
  FiTerminal,
} from "react-icons/fi";
import Card from "@/components/common/Card.jsx";
import Button from "@/components/common/Button.jsx";
import Table from "@/components/common/Table.jsx";
import Modal from "@/components/common/Modal.jsx";
import Input from "@/components/common/Input.jsx";
import Textarea from "@/components/common/Textarea.jsx";
import Loader from "@/components/common/Loader.jsx";
import Badge from "@/components/common/Badge.jsx";
import { facultyService } from "@/services";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/utils/dateUtils";
import { QUESTION_TYPES, USER_ROLES } from "@/config/constants";
import toast from "react-hot-toast";

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getBasePath = () => {
    switch (user?.role) {
      case USER_ROLES.SUPER_ADMIN:
        return "/super-admin";
      case USER_ROLES.ADMIN:
        return "/admin";
      case USER_ROLES.DEPT_HEAD:
        return "/dept-head";
      case USER_ROLES.FACULTY:
        return "/faculty";
      default:
        return "/faculty";
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
    feedback: "",
  });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [activeTab, setActiveTab] = useState("results"); // 'results' or 'monitoring'

  useEffect(() => {
    let interval;
    if (
      activeTab === "monitoring" &&
      exam &&
      (exam.status === "ongoing" || exam.status === "scheduled")
    ) {
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
      toast.error("Failed to load results");
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
      feedback: answer.feedback || "",
    });
    setShowEvaluateModal(true);
  };

  const handleSubmitEvaluation = async () => {
    try {
      await facultyService.evaluateAnswer(
        selectedResult._id,
        selectedAnswer._id,
        evaluationData,
      );
      toast.success("Answer evaluated successfully");
      setShowEvaluateModal(false);
      fetchResults(selectedResult._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to evaluate");
    }
  };

  const handleAIEvaluate = async () => {
    try {
      setLoadingAI(true);
      const response = await facultyService.evaluateAI(
        selectedResult._id,
        selectedAnswer._id,
      );

      if (response.success) {
        setEvaluationData({
          marksAwarded: response.data.marksAwarded,
          feedback: response.data.feedback,
        });
        toast.success("AI evaluation complete!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "AI evaluation failed");
      console.error(error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePublishResults = async () => {
    if (
      !window.confirm(
        "Are you sure you want to publish the results? Once published, students will be able to see their scores and detailed performance.",
      )
    ) {
      return;
    }

    try {
      await facultyService.publishResults(id);
      toast.success("Results published successfully");
      fetchResults(); // Refresh data to get updated exam status
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish results");
    }
  };

  const handleUnlock = async (resultId, status) => {
    try {
      await facultyService.handleUnlockRequest(resultId, status);
      toast.success(`Unlock request ${status} successfully`);
      fetchResults(selectedResult?._id);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to handle unlock request",
      );
    }
  };

  const handleReset = async (result) => {
    if (
      !window.confirm(
        `Are you sure you want to reset the exam attempt for ${result.studentId?.name}? This will delete their current score and answers, and allow them to take the exam again.`,
      )
    ) {
      return;
    }

    try {
      await facultyService.resetExamAttempt(id, result.studentId._id);
      toast.success("Exam attempt reset successfully");
      fetchResults();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset attempt");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "in-progress": { variant: "info", label: "In Progress" },
      submitted: { variant: "warning", label: "Submitted" },
      evaluated: { variant: "success", label: "Evaluated" },
      locked: { variant: "danger", label: "LOCKED" },
    };
    const config = statusMap[status] || statusMap.submitted;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    { header: "Rank", accessor: "rank" },
    {
      header: "Student",
      accessor: (row) => (
        <div>
          <p className="font-medium">{row.studentId?.name}</p>
          <p className="text-sm text-gray-500">
            {row.studentId?.regNo || row.studentId?.enrollmentNumber}
          </p>
        </div>
      ),
    },
    {
      header: "Score",
      accessor: (row) =>
        `${row.score} / ${row.totalMarks || exam?.totalMarks || 0}`,
    },
    {
      header: "Percentage",
      accessor: (row) => {
        const percentage = (
          (row.score / (row.totalMarks || exam?.totalMarks || 1)) *
          100
        ).toFixed(2);
        return `${percentage}%`;
      },
    },
    {
      header: "Status",
      accessor: (row) => getStatusBadge(row.status),
    },
    {
      header: "Violations",
      render: (row) => (
        <div className="flex flex-col gap-1">
          {row.tabSwitchCount > 0 && (
            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 font-bold">
              TAB: {row.tabSwitchCount}
            </span>
          )}
          {row.violations?.length > 0 && (
            <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-bold">
              EXT:{" "}
              {
                row.violations.filter((v) => v.type === "fullscreen_exit")
                  .length
              }
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Submitted At",
      accessor: (row) =>
        row.submittedAt ? formatDateTime(row.submittedAt) : "Ongoing...",
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleViewDetails(row)}
          >
            <FiEye className="w-4 h-4 mr-1" />
            Evaluate
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
    <div className="space-y-6 h-full flex flex-col">
      {!selectedResult && (
        <>
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
                <h1 className="text-3xl font-bold text-gray-900">
                  Exam Results
                </h1>
                <p className="text-gray-600 mt-1">{exam?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {exam?.status === "completed" && !exam?.resultsPublished && (
                <Button
                  variant="success"
                  onClick={handlePublishResults}
                  icon={<FiCheckCircle />}
                >
                  Publish Results
                </Button>
              )}
              {exam?.resultsPublished && (
                <Badge
                  variant="success"
                  className="px-3 py-2 flex items-center gap-1 font-bold"
                >
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
                <p className="text-sm text-blue-700 font-medium">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {results.length}
                </p>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="text-center">
                <p className="text-sm text-green-700 font-medium">
                  Average Score
                </p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {results.length > 0
                    ? (
                      results.reduce((sum, r) => sum + r.score, 0) /
                      results.length
                    ).toFixed(1)
                    : 0}
                </p>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <div className="text-center">
                <p className="text-sm text-emerald-700 font-medium">
                  Highest Score
                </p>
                <p className="text-3xl font-bold text-emerald-900 mt-2">
                  {results.length > 0
                    ? Math.max(...results.map((r) => r.score))
                    : 0}
                </p>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <div className="text-center">
                <p className="text-sm text-red-700 font-medium">Lowest Score</p>
                <p className="text-3xl font-bold text-red-900 mt-2">
                  {results.length > 0
                    ? Math.min(...results.map((r) => r.score))
                    : 0}
                </p>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="text-center">
                <p className="text-sm text-purple-700 font-medium">Pass Rate</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {results.length > 0
                    ? (
                      (results.filter(
                        (r) => r.score >= (exam?.passingMarks || 0),
                      ).length /
                        results.length) *
                      100
                    ).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("results")}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "results" ? "border-primary-600 text-primary-600 bg-primary-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <FiFileText /> Completed Results
            </button>
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "monitoring" ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <FiMonitor
                className={
                  activeTab === "monitoring" && exam?.status === "ongoing"
                    ? "animate-pulse text-red-500"
                    : ""
                }
              />
              Live Monitoring
            </button>
          </div>

          {activeTab === "results" ? (
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-xl font-semibold text-gray-900">
                  Student Results
                </h2>
              </div>
              {results.length > 0 ? (
                <Table columns={columns} data={results} />
              ) : (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <FiFileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Results Yet
                  </h3>
                  <p className="text-gray-600">
                    No students have submitted this exam yet.
                  </p>
                </div>
              )}
            </Card>
          ) : (
            /* Monitoring View */
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Feed Column */}
                <div className="lg:col-span-2 space-y-4">
                  <Card
                    title="Live Student Status"
                    subtitle={`Currently ${results.filter((r) => r.status === "in-progress").length} active students`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.length > 0 ? (
                        results.map((result) => (
                          <div
                            key={result._id}
                            className={`p-4 rounded-xl border-2 transition-all group hover:cursor-pointer relative ${result.status === "locked" ? "bg-red-50 border-red-200" : result.status === "submitted" ? "bg-gray-50 border-gray-100" : "bg-white border-transparent shadow-sm hover:shadow-md"}`}
                            onClick={() => handleViewDetails(result)}
                          >
                            {result.unlockRequest?.status === "pending" && (
                              <div className="absolute -top-2 -right-2 z-10 animate-bounce">
                                <Badge
                                  variant="warning"
                                  className="shadow-lg border-2 border-white flex items-center gap-1"
                                >
                                  <FiAlertTriangle className="w-3 h-3" /> UNLOCK
                                  REQ
                                </Badge>
                              </div>
                            )}
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${result.status === "locked" ? "bg-red-500 shadow-md shadow-red-100" : result.status === "submitted" ? "bg-gray-400" : "bg-indigo-500 shadow-md shadow-indigo-100"}`}
                                >
                                  {result.studentId?.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                                    {result.studentId?.name}
                                  </p>
                                  <p className="text-[10px] font-mono text-gray-400">
                                    {result.studentId?.regNo}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(result.status)}
                            </div>

                            <div className="flex gap-2 mb-3">
                              <div
                                className={`flex-1 p-2 rounded-lg text-center border ${result.tabSwitchCount > 0 ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"}`}
                              >
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  Tab Switches
                                </p>
                                <p
                                  className={`text-lg font-black ${result.tabSwitchCount > 0 ? "text-amber-600" : "text-gray-300"}`}
                                >
                                  {result.tabSwitchCount}
                                </p>
                              </div>
                              <div
                                className={`flex-1 p-2 rounded-lg text-center border ${result.violations?.length > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}
                              >
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  FS Exits
                                </p>
                                <p
                                  className={`text-lg font-black ${result.violations?.length > 0 ? "text-red-600" : "text-gray-300"}`}
                                >
                                  {result.violations?.length || 0}
                                </p>
                              </div>
                            </div>

                            {result.status === "in-progress" && (
                              <div className="flex items-center gap-2 text-xs text-green-500 font-bold animate-pulse">
                                <FiActivity /> Live Session Active
                              </div>
                            )}

                            {result.status === "locked" && (
                              <div className="flex items-center gap-2 text-xs text-red-600 font-black">
                                <FiLock /> EXAM LOCKED (THRESHOLD)
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-20 text-center">
                          <p className="text-gray-400">
                            No students joined yet
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Recent Violations Column */}
                <div className="space-y-4">
                  {results.some(
                    (r) => r.unlockRequest?.status === "pending",
                  ) && (
                      <Card
                        title="Pending Unlock Requests"
                        className="bg-amber-50 border-amber-200"
                      >
                        <div className="space-y-3">
                          {results
                            .filter((r) => r.unlockRequest?.status === "pending")
                            .map((r) => (
                              <div
                                key={r._id}
                                className="p-3 bg-white border border-amber-200 rounded-lg shadow-sm"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                                      {r.studentId?.name?.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-900">
                                        {r.studentId?.name}
                                      </p>
                                      <p className="text-[10px] text-gray-400">
                                        Locked due to violations
                                      </p>
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
                                  <Button
                                    size="xs"
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() =>
                                      handleUnlock(r._id, "approved")
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="danger"
                                    className="flex-1"
                                    onClick={() =>
                                      handleUnlock(r._id, "rejected")
                                    }
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </Card>
                    )}

                  <Card title="Critical Alerts" className="bg-white">
                    <div className="space-y-3">
                      {results
                        .filter(
                          (r) =>
                            r.tabSwitchCount > 0 || r.violations?.length > 0,
                        )
                        .sort((a, b) => b.updatedAt - a.updatedAt)
                        .slice(0, 10)
                        .map((r) => (
                          <div
                            key={r._id}
                            className="p-3 bg-red-50/50 border border-red-100 rounded-lg flex gap-3 items-start"
                          >
                            <div className="bg-red-500 text-white p-1.5 rounded-lg">
                              <FiAlertTriangle size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {r.studentId?.name}
                              </p>
                              <p className="text-[10px] text-red-600 font-medium">
                                {r.tabSwitchCount > 0 &&
                                  `${r.tabSwitchCount} Tab Switches `}
                                {r.violations?.length > 0 &&
                                  `${r.violations.length} Fullscreen Exits`}
                              </p>
                            </div>
                          </div>
                        ))}
                      {results.filter(
                        (r) => r.tabSwitchCount > 0 || r.violations?.length > 0,
                      ).length === 0 && (
                          <div className="text-center py-6">
                            <FiShield className="w-10 h-10 text-green-100 mx-auto mb-2" />
                            <p className="text-xs text-green-600 font-bold uppercase tracking-widest">
                              Secure session
                            </p>
                          </div>
                        )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Exclusive Dashboard Views */}
      {selectedResult && !selectedAnswer && (
        <div className="flex flex-col flex-1 h-[calc(100vh-6rem)] bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Top Fixed Header Panel */}
          <div className="bg-white border-b border-slate-200 shadow-sm z-20 flex-none relative">
            {/* Title & Close Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 bg-slate-900 text-white gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center font-black text-lg shadow-inner border border-slate-700/50 flex-shrink-0">
                  {selectedResult?.studentId?.name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold truncate pr-4">
                    {selectedResult?.studentId?.name}'s Answer Sheet
                  </h2>
                  <p className="text-slate-400 text-xs font-mono truncate">
                    {selectedResult?.studentId?.regNo} • {exam?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-1.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white absolute right-3 top-3 sm:static"
              >
                <FiXCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Stats Bar Container */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 bg-white">
              {/* Score */}
              <div className="flex items-center gap-3 px-5 py-2.5">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg shadow-sm border border-green-100/50">
                  <FiAward className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    Total Score
                  </p>
                  <p className="text-xl font-black text-slate-800 leading-none">
                    {selectedResult.score}{" "}
                    <span className="text-xs font-bold text-slate-400">
                      / {exam?.totalMarks}
                    </span>
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 px-5 py-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shadow-sm border border-purple-100/50">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    Exam Status
                  </p>
                  <div className="scale-75 origin-left -ml-2">
                    {getStatusBadge(selectedResult.status)}
                  </div>
                </div>
              </div>

              {/* Submitted */}
              <div className="flex items-center gap-3 px-5 py-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-blue-100/50">
                  <FiClock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    Submitted At
                  </p>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedResult.submittedAt ? (
                      formatDateTime(selectedResult.submittedAt)
                    ) : (
                      <span className="text-slate-400 italic font-normal">
                        Pending Review
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Security */}
              <div className="flex items-center gap-3 px-5 py-2.5">
                <div
                  className={`p-2 rounded-lg shadow-sm border ${selectedResult.tabSwitchCount > 0 ||
                    selectedResult.violations?.length > 0
                    ? "bg-red-50 text-red-600 border-red-100/50"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                    }`}
                >
                  <FiShield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    Security Score
                  </p>
                  <p className="text-xs font-bold">
                    {selectedResult.tabSwitchCount > 0 ||
                      selectedResult.violations?.length > 0 ? (
                      <span className="text-red-600 flex items-center gap-1">
                        {selectedResult.tabSwitchCount} Tabs,{" "}
                        {selectedResult.violations?.length || 0} Exits
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-1">
                        100% Secure
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="flex items-center gap-2 px-5 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto custom-scrollbar shadow-inner">
              {[
                "All",
                QUESTION_TYPES.MCQ,
                QUESTION_TYPES.TRUE_FALSE,
                QUESTION_TYPES.DESCRIPTIVE,
                QUESTION_TYPES.CODING,
              ].map((type) => {
                const count =
                  type === "All"
                    ? selectedResult.answers?.length
                    : selectedResult.answers?.filter(
                      (a) => a.questionId?.type === type,
                    ).length;

                if (type !== "All" && count === 0) return null;

                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${filterType === type
                      ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-800/20 ring-offset-1 ring-offset-slate-50"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    {type === "All" ? "All Types" : type}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${filterType === type
                        ? "bg-slate-700 text-white shadow-inner"
                        : "bg-slate-100 text-slate-500 border border-slate-200/60"
                        }`}
                    >
                      {count} Qs
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Main Area Background Wrapper */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar relative">
            {/* Content Constraint Width */}
            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-32">
              {/* Sticky Alerts Section */}
              {(selectedResult.unlockRequest?.status === "pending" ||
                selectedResult.tabSwitchCount > 0 ||
                selectedResult.violations?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Unlock Request Card */}
                    {selectedResult.unlockRequest?.status === "pending" && (
                      <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-black text-amber-900 uppercase tracking-tight mb-2">
                            <FiAlertTriangle className="w-5 h-5" /> Unlock Request
                            Pending
                          </h4>
                          <p className="text-amber-800 text-sm font-medium bg-white/60 p-3 rounded-lg border border-amber-100">
                            "{selectedResult.unlockRequest.reason}"
                          </p>
                        </div>
                        <div className="flex gap-3 mt-4 pt-4 border-t border-amber-200/50">
                          <Button
                            size="sm"
                            className="flex-1 bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-200"
                            onClick={() =>
                              handleUnlock(selectedResult._id, "approved")
                            }
                          >
                            <FiCheckCircle className="mr-2" /> Approve Request
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100 bg-white"
                            onClick={() =>
                              handleUnlock(selectedResult._id, "rejected")
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Activity Violations Log Card */}
                    {(selectedResult.tabSwitchCount > 0 ||
                      selectedResult.violations?.length > 0) && (
                        <div className="bg-white border text-red-900 border-red-200 p-5 rounded-2xl shadow-sm">
                          <h4 className="flex items-center gap-2 text-sm font-black uppercase mb-4 tracking-tight">
                            <span className="p-1.5 bg-red-100 rounded-md text-red-600">
                              <FiShield className="w-4 h-4" />
                            </span>
                            Suspicious Activity Detected
                          </h4>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-red-50/50 p-3 rounded-xl border border-red-100/80">
                              <p className="text-[10px] text-red-500 uppercase font-black tracking-widest mb-1">
                                Tab Switches
                              </p>
                              <p className="text-3xl font-black text-red-600 tracking-tighter">
                                {selectedResult.tabSwitchCount || 0}
                              </p>
                            </div>
                            <div className="bg-red-50/50 p-3 rounded-xl border border-red-100/80">
                              <p className="text-[10px] text-red-500 uppercase font-black tracking-widest mb-1">
                                Fullscreen Exits
                              </p>
                              <p className="text-3xl font-black text-red-600 tracking-tighter">
                                {selectedResult.violations?.filter(
                                  (v) => v.type === "fullscreen_exit",
                                ).length || 0}
                              </p>
                            </div>
                          </div>

                          {selectedResult.violations?.length > 0 && (
                            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar border-t border-red-100 pt-3">
                              {selectedResult.violations
                                .slice()
                                .reverse()
                                .map((v, i) => (
                                  <div
                                    key={i}
                                    className="flex justify-between items-center bg-red-50 hover:bg-red-100 transition-colors px-3 py-2 rounded-lg text-xs"
                                  >
                                    <span className="font-bold uppercase tracking-wide flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                      {v.type.replace("_", " ")}
                                    </span>
                                    <span className="font-mono text-[10px] opacity-75">
                                      {new Date(v.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}

              {/* Question Type Iteration Engine */}
              {[
                ...new Set(
                  selectedResult.answers?.map((a) => a.questionId?.type),
                ),
              ]
                .sort()
                .filter((type) => filterType === "All" || filterType === type)
                .map((type) => {
                  const answersOfType = selectedResult.answers
                    ?.map((ans, idx) => ({ ...ans, originalIndex: idx }))
                    .filter((ans) => ans.questionId?.type === type);

                  if (!answersOfType || answersOfType.length === 0) return null;

                  return (
                    <div key={type} className="space-y-6 pt-4">
                      {/* Section Header Divider */}
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                          {type} Questions
                          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm border border-indigo-200/50">
                            {answersOfType.length} Items
                          </span>
                        </h3>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>

                      <div className="space-y-8">
                        {answersOfType.map((answer) => (
                          /* Premium Question Card Paradigm */
                          <div
                            key={answer._id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row group transition-all hover:shadow-md"
                          >
                            {/* Left Column: Question & Grading Metadata */}
                            <div className="md:w-[45%] p-6 md:p-8 bg-slate-50/30 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col relative">
                              {/* Evaluated Badge positioned absolutely for flair */}
                              <div className="absolute top-0 right-0 p-4">
                                <Badge
                                  variant={
                                    answer.isEvaluated ? "success" : "warning"
                                  }
                                  className="font-black px-3 py-1.5 border shadow-sm text-[10px] uppercase tracking-wider"
                                >
                                  {answer.isEvaluated
                                    ? "Evaluated"
                                    : "Pending Review"}
                                </Badge>
                              </div>

                              <div className="mb-6 mt-2">
                                <span className="inline-flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-md font-black text-lg mb-4 ring-4 ring-indigo-50">
                                  {answer.originalIndex + 1}
                                </span>
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                  <FiFileText /> Question Prompt
                                </h4>
                                <p className="text-slate-800 font-semibold text-lg leading-relaxed">
                                  {answer.questionId?.questionText}
                                </p>
                              </div>

                              <div className="mt-auto pt-6 border-t border-slate-200 flex items-end justify-between">
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    Marks Awarded
                                  </p>
                                  <div className="flex items-baseline gap-1">
                                    <p
                                      className={`font-black text-3xl leading-none ${answer.marksAwarded > 0 ? "text-green-600" : "text-slate-800"}`}
                                    >
                                      {answer.marksAwarded || 0}
                                    </p>
                                    <span className="text-sm font-bold text-slate-400">
                                      / {answer.questionId?.marks} pt
                                    </span>
                                  </div>
                                </div>

                                {answer.questionId?.type !== "MCQ" && (
                                  <Button
                                    variant={
                                      answer.isEvaluated ? "outline" : "primary"
                                    }
                                    onClick={() => handleEvaluate(answer)}
                                    className="font-bold shadow-sm"
                                  >
                                    Evaluate
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Right Column: Answers & Feedback */}
                            <div className="md:w-[55%] p-6 md:p-8 flex flex-col gap-5 bg-white">
                              {/* Student Answer Block */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                                  <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    Student Answer
                                  </h4>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 min-h-[120px] shadow-inner font-medium text-slate-800 text-base leading-relaxed whitespace-pre-wrap">
                                  {answer.questionId?.type === "Coding" ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-white border border-dashed border-slate-300 rounded-lg p-6 font-semibold gap-3">
                                      <FiTerminal className="w-8 h-8 text-indigo-400" />
                                      <p>Code Editor Content Isolated</p>
                                      <p className="text-xs font-normal">
                                        Click Evaluate to run code against test
                                        cases.
                                      </p>
                                    </div>
                                  ) : answer.questionId?.type === "MCQ" ||
                                    answer.questionId?.type === "TrueFalse" ? (
                                    <span className="text-xl font-black text-slate-900">
                                      {answer.selectedAnswer || (
                                        <span className="text-slate-400 italic font-normal text-base">
                                          Student left this blank
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    answer.textAnswer || (
                                      <span className="text-slate-400 italic font-normal text-base">
                                        No descriptive text provided
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Correct Answer Reference (Objective only) */}
                              {(answer.questionId?.type === "MCQ" ||
                                answer.questionId?.type === "TrueFalse") && (
                                  <div className="mt-2 bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-4 flex items-start gap-3">
                                    <div className="p-1.5 bg-emerald-100 rounded-md text-emerald-600 flex-none mt-0.5">
                                      <FiCheckCircle className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5">
                                        Official Answer Key
                                      </p>
                                      <p className="text-emerald-900 font-bold text-sm bg-white px-3 py-2 rounded-lg border border-emerald-100 shadow-sm inline-block">
                                        {answer.questionId?.options?.find(
                                          (opt) => opt.isCorrect,
                                        )?.text ||
                                          answer.questionId?.options?.[0]?.text}
                                      </p>
                                    </div>
                                  </div>
                                )}

                              {/* Faculty Feedback Bubble */}
                              {answer.feedback && (
                                <div className="mt-2 bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 flex items-start gap-3">
                                  <div className="p-1.5 bg-amber-100 rounded-md text-amber-600 flex-none mt-0.5">
                                    <FiMessageSquare className="w-4 h-4" />
                                  </div>
                                  <div className="w-full">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">
                                      Faculty Feedback
                                    </p>
                                    <div className="text-amber-900 font-medium text-sm bg-white p-4 rounded-lg border border-amber-100 shadow-sm whitespace-pre-wrap leading-relaxed relative">
                                      {/* Tooltip triangle */}
                                      <div className="absolute top-4 -left-2 w-3 h-3 bg-white border-l border-b border-amber-100 transform rotate-45"></div>
                                      {answer.feedback}
                                      {answer.evaluatedBy && (
                                        <div className="mt-3 pt-3 border-t border-amber-100/50 flex items-center gap-1.5 text-xs text-amber-700/70 font-bold uppercase tracking-wider">
                                          <FiUser className="w-3 h-3" />{" "}
                                          {answer.evaluatedBy.name}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Inline Evaluation Detail View */}
      {selectedAnswer && (
        <div className="flex flex-col flex-1 h-[calc(100vh-6rem)] bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-right-10 duration-500 z-30">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedAnswer(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-indigo-600 group"
                title="Back to Answers"
              >
                <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                    ⚖️
                  </span>
                  Evaluation Mode
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Assessment for {selectedResult?.studentId?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-black py-1.5 border-slate-200 text-slate-500">
                {selectedAnswer?.questionId?.marks} Max Marks
              </Badge>
              {selectedAnswer?.isEvaluated && (
                <Badge variant="success" className="font-black py-1.5 shadow-sm">
                  <FiCheckCircle className="mr-1.5" /> Graded
                </Badge>
              )}
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Evidence */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Question Prompt Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group">
                    <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h5 className="font-black text-slate-400 uppercase tracking-widest text-[10px] flex items-center gap-2">
                        <FiFileText className="text-indigo-500" /> Original Question
                      </h5>
                    </div>
                    <div className="p-7">
                      <p className="text-slate-800 text-lg leading-relaxed font-semibold">
                        {selectedAnswer?.questionId?.questionText}
                      </p>
                    </div>
                  </div>

                  {/* Student Submission Card */}
                  <div className="bg-white rounded-3xl border-2 border-indigo-100 shadow-xl shadow-indigo-500/5 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-400 to-blue-600"></div>
                    <div className="bg-slate-50/50 px-6 py-4 border-b border-indigo-50 flex items-center justify-between">
                      <h5 className="font-black text-indigo-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
                        <FiUser className="text-indigo-600" /> Student Response
                      </h5>
                    </div>

                    <div className="p-6">
                      {selectedAnswer?.questionId?.type === "Coding" ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                          <div className="bg-[#1a1b26] px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
                            <div className="flex gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-2 uppercase tracking-widest font-bold">
                              <FiMonitor className="w-3.5 h-3.5 text-blue-400" /> main.js
                            </span>
                          </div>
                          <div className="relative">
                            <pre className="p-6 text-emerald-400 font-mono text-sm overflow-x-auto whitespace-pre-wrap max-h-[500px] custom-scrollbar leading-relaxed">
                              {selectedAnswer?.codeAnswer || (
                                <span className="text-slate-600 italic">// No implementation provided</span>
                              )}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-indigo-50/20 p-7 rounded-2xl border border-indigo-100/50 min-h-[180px] text-slate-800 whitespace-pre-wrap shadow-inner leading-relaxed text-lg font-medium italic">
                          {selectedAnswer?.textAnswer || selectedAnswer?.selectedAnswer || (
                            <div className="flex flex-col items-center justify-center h-full opacity-40">
                              <FiAlertTriangle className="w-10 h-10 mb-2" />
                              <span className="font-black uppercase tracking-widest text-xs">Empty Response</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Reference & Grading */}
                <div className="lg:col-span-5 space-y-8">
                  {/* Reference Solution (Privileged) */}
                  {selectedAnswer?.questionId?.type === "Coding" && selectedAnswer?.questionId?.codeSnippet && (
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden group">
                      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                        <h5 className="font-black text-indigo-400 uppercase tracking-widest text-[10px] flex items-center gap-2">
                          <FiShield /> Faculty Guide
                        </h5>
                        <Badge variant="warning" className="text-[9px] tracking-tighter bg-amber-500/10 text-amber-500 border-amber-500/20">
                          REFERENCE
                        </Badge>
                      </div>
                      <div className="p-6">
                        <pre className="text-slate-300 font-mono text-[13px] overflow-x-auto whitespace-pre-wrap max-h-64 custom-scrollbar leading-relaxed">
                          {selectedAnswer.questionId.codeSnippet}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Grading Panel Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden sticky top-8 animate-in zoom-in-95 duration-500">
                    <div className="bg-slate-900 px-7 py-5 border-b border-slate-800 flex items-center justify-between">
                      <h5 className="font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                        Grading Control
                      </h5>
                    </div>

                    <div className="p-7 space-y-8 bg-slate-50/50">
                      {/* Score Input */}
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Marks Awarded (Max: {selectedAnswer?.questionId?.marks})
                        </label>
                        <div className="flex items-stretch h-16 shadow-lg shadow-primary-500/5">
                          <div className="bg-white border-2 border-r-0 border-slate-200 rounded-l-2xl px-6 flex items-center text-slate-400 font-black text-lg">
                            Pts
                          </div>
                          <input
                            type="number"
                            step="0.5"
                            max={selectedAnswer?.questionId?.marks}
                            value={evaluationData.marksAwarded}
                            onChange={(e) => setEvaluationData({ ...evaluationData, marksAwarded: e.target.value })}
                            className="w-full bg-white border-2 border-slate-200 rounded-r-2xl px-6 font-black text-3xl text-slate-900 outline-none focus:border-primary-500 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Feedback Textarea */}
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Evaluator's Feedback
                        </label>
                        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-lg shadow-primary-500/5 focus-within:border-primary-500 transition-colors min-h-[150px]">
                          <textarea
                            value={evaluationData.feedback}
                            onChange={(e) => setEvaluationData({ ...evaluationData, feedback: e.target.value })}
                            placeholder="Type constructive feedback here..."
                            className="w-full h-full resize-none border-none focus:ring-0 p-0 text-slate-700 font-medium placeholder-slate-300 custom-scrollbar text-base"
                            rows={5}
                          />
                        </div>
                      </div>

                      {/* AI Integration */}
                      {selectedAnswer?.questionId?.type === "Coding" && (
                        <button
                          onClick={handleAIEvaluate}
                          disabled={loadingAI}
                          className="w-full group relative flex items-center justify-center gap-3 py-4 bg-white border-2 border-indigo-100 rounded-2xl text-indigo-600 font-black overflow-hidden hover:bg-indigo-50 transition-all shadow-md active:scale-[0.98]"
                        >
                          {loadingAI ? (
                            <FiActivity className="animate-spin w-5 h-5" />
                          ) : (
                            <>
                              <span className="text-xl">✨</span>
                              <span className="uppercase tracking-widest text-[11px]">Auto-Grade with AI</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Submission Buttons */}
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => setSelectedAnswer(null)}
                          className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmitEvaluation}
                          className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-700 hover:to-primary-700 text-white font-black rounded-2xl shadow-xl shadow-primary-500/30 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
