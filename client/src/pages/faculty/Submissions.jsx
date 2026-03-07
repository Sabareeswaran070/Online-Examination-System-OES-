import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiCheckCircle, FiClock, FiFileText, FiUser, FiInfo, FiCpu } from 'react-icons/fi';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Table from '@/components/common/Table';
import Loader from '@/components/common/Loader';
import Badge from '@/components/common/Badge';
import { facultyService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/utils/dateUtils';
import { USER_ROLES } from '@/config/constants';
import toast from 'react-hot-toast';
import EvaluatorLayout from '@/components/evaluator/EvaluatorLayout';

const Submissions = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [exam, setExam] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [loadingAIRows, setLoadingAIRows] = useState({});

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

    useEffect(() => {
        fetchPendingSubmissions();
    }, []);

    const fetchPendingSubmissions = async () => {
        try {
            setLoading(true);
            const response = await facultyService.getPendingSubmissions();
            setSubmissions(response.data);
        } catch (error) {
            toast.error('Failed to load pending submissions');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewResults = (examId) => {
        navigate(`${basePath}/exams/${examId}/results`);
    };

    const handleEvaluate = async (row) => {
        try {
            setLoading(true);
            // Fetch fresh result details with populated data
            const response = await facultyService.getExamResults(row.examId._id);
            const found = response.data.find(r => r._id === row._id);
            if (found) {
                const examRes = await facultyService.getExam(row.examId._id);
                setExam(examRes.data);
                setSelectedResult(found);
            }
        } catch (error) {
            toast.error('Failed to load evaluation details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEvaluation = async (answerId, marks, feedback) => {
        try {
            await facultyService.evaluateAnswer(selectedResult._id, answerId, { marksAwarded: marks, feedback });
            toast.success('Evaluation updated');
            // Refresh local state
            const response = await facultyService.getExamResults(exam._id);
            const updated = response.data.find(r => r._id === selectedResult._id);
            if (updated) setSelectedResult(updated);
            fetchPendingSubmissions(); // Also refresh the main list
        } catch (error) {
            toast.error('Failed to update evaluation');
        }
    };

    const handleAcceptAIEvaluation = async (answerId) => {
        try {
            setLoadingAI(true);
            const response = await facultyService.evaluateAI(selectedResult._id, answerId);
            if (response.success) {
                await facultyService.evaluateAnswer(selectedResult._id, answerId, {
                    marksAwarded: response.data.marksAwarded,
                    feedback: response.data.feedback
                });
                toast.success('AI evaluation accepted');
                // Refresh local state
                const res = await facultyService.getExamResults(exam._id);
                const updated = res.data.find(r => r._id === selectedResult._id);
                if (updated) setSelectedResult(updated);
                fetchPendingSubmissions();
            }
        } catch (error) {
            toast.error('AI evaluation failed');
        } finally {
            setLoadingAI(false);
        }
    };

    const handleBulkAIResult = async (resultId) => {
        try {
            setLoadingAIRows(prev => ({ ...prev, [resultId]: true }));
            const response = await facultyService.bulkEvaluateAI(resultId);
            if (response.success) {
                toast.success(response.message || 'Bulk AI evaluation complete');
                fetchPendingSubmissions();
            }
        } catch (error) {
            toast.error('AI evaluation failed');
        } finally {
            setLoadingAIRows(prev => ({ ...prev, [resultId]: false }));
        }
    };

    const columns = [
        {
            header: 'Exam',
            accessor: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{row.examId?.title}</span>
                    <span className="text-xs text-gray-500 italic">By: {row.examId?.facultyId?.name || 'Unknown'}</span>
                </div>
            ),
        },
        {
            header: 'Student',
            accessor: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{row.studentId?.name}</span>
                    <span className="text-xs text-gray-500">{row.studentId?.regNo || row.studentId?.enrollmentNumber}</span>
                </div>
            ),
        },
        {
            header: 'Submitted At',
            accessor: (row) => (
                <div className="flex items-center gap-1.5 text-gray-600">
                    <FiClock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(row.submittedAt)}</span>
                </div>
            ),
        },
        {
            header: 'Status',
            accessor: () => (
                <Badge variant="warning">Pending Evaluation</Badge>
            ),
        },
        {
            header: 'Actions',
            accessor: (row) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEvaluate(row)}
                        className="flex items-center gap-2"
                    >
                        <FiEye className="w-4 h-4" />
                        Evaluate Now
                    </Button>
                    <button
                        onClick={() => handleBulkAIResult(row._id)}
                        disabled={loadingAIRows[row._id]}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-100 transition-colors disabled:opacity-50"
                        title="AI Evaluate All Questions"
                    >
                        <FiCpu className={`w-4 h-4 ${loadingAIRows[row._id] ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            ),
        },
    ];

    if (loading) return <Loader fullPage />;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pending Evaluations</h1>
                    <p className="text-gray-500 mt-1">Review and grade descriptive or coding submissions across all your exams.</p>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-md">
                {submissions.length > 0 ? (
                    <Table columns={columns} data={submissions} />
                ) : (
                    <div className="py-20 text-center">
                        <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiCheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                        <p className="text-gray-500 mt-1">There are no pending submissions requiring manual evaluation at this time.</p>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5 border-l-4 border-l-amber-500">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                            <FiInfo className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Priority Grading</h4>
                            <p className="text-sm text-gray-500 mt-1">Submissions are sorted by most recent first. Ensure you grade older attempts promptly.</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-blue-500">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <FiFileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Manual Reviews</h4>
                            <p className="text-sm text-gray-500 mt-1">MCQ questions are auto-graded. This list only shows exams with Descriptive or Coding components.</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-indigo-500">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                            <FiUser className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">College Access</h4>
                            <p className="text-sm text-gray-500 mt-1">You can view evaluation requests for any exam within your department or contributing college.</p>
                        </div>
                    </div>
                </Card>
            </div>

            {selectedResult && (
                <EvaluatorLayout
                    studentData={selectedResult}
                    examData={exam}
                    onClose={() => {
                        setSelectedResult(null);
                        setExam(null);
                        fetchPendingSubmissions();
                    }}
                    onUpdateEvaluation={handleUpdateEvaluation}
                    onAcceptAIEvaluation={handleAcceptAIEvaluation}
                    loadingAI={loadingAI}
                />
            )}
        </div>
    );
};

export default Submissions;
