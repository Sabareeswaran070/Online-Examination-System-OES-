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
  FiCpu,
} from "react-icons/fi";
import Card from "@/components/common/Card.jsx";
import Button from "@/components/common/Button.jsx";
import Table from "@/components/common/Table.jsx";
import Textarea from "@/components/common/Textarea.jsx";
import Loader from "@/components/common/Loader.jsx";
import Badge from "@/components/common/Badge.jsx";
import { facultyService } from "@/services";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/utils/dateUtils";
import { QUESTION_TYPES, USER_ROLES } from "@/config/constants";
import toast from "react-hot-toast";
import EvaluatorLayout from "@/components/evaluator/EvaluatorLayout";

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
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingAIRows, setLoadingAIRows] = useState({});
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

  const handleUpdateEvaluation = async (answerId, marks, feedback) => {
    try {
      await facultyService.evaluateAnswer(
        selectedResult._id,
        answerId,
        { marksAwarded: marks, feedback }
      );
      toast.success("Evaluation updated");
      fetchResults(selectedResult._id);
    } catch (error) {
      toast.error("Failed to update evaluation");
    }
  };

  const handleAcceptAIEvaluation = async (answerId) => {
    try {
      setLoadingAI(true);
      const response = await facultyService.evaluateAI(
        selectedResult._id,
        answerId
      );

      if (response.success) {
        await facultyService.evaluateAnswer(
          selectedResult._id,
          answerId,
          {
            marksAwarded: response.data.marksAwarded,
            feedback: response.data.feedback
          }
        );
        toast.success("AI score accepted and saved");
        fetchResults(selectedResult._id);
      }
    } catch (error) {
      toast.error("Failed to process AI evaluation");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleBulkAIResult = async (resultId) => {
    try {
      setLoadingAIRows((prev) => ({ ...prev, [resultId]: true }));
      const response = await facultyService.bulkEvaluateAI(resultId);
      if (response.success) {
        toast.success(response.message || "Bulk AI evaluation complete");
        fetchResults(true); // Silent refresh won't work perfectly here but fetchResults(resultId) might be better
      }
    } catch (error) {
      toast.error("AI evaluation failed");
    } finally {
      setLoadingAIRows((prev) => ({ ...prev, [resultId]: false }));
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
          <button
            onClick={() => handleBulkAIResult(row._id)}
            disabled={loadingAIRows[row._id]}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-100 transition-colors disabled:opacity-50"
            title="AI Evaluate All Questions"
          >
            <FiCpu
              className={`w-4 h-4 ${loadingAIRows[row._id] ? "animate-spin" : ""}`}
            />
          </button>
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

      {selectedResult && (
        <EvaluatorLayout
          studentData={selectedResult}
          examData={exam}
          onClose={() => {
            setSelectedResult(null);
            fetchResults();
          }}
          onUpdateEvaluation={handleUpdateEvaluation}
          onAcceptAIEvaluation={handleAcceptAIEvaluation}
          loadingAI={loadingAI}
        />
      )}


    </div>
  );
};

export default Results;
