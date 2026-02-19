import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiEye, FiUser, FiAward, FiCheckCircle, FiClock, FiXCircle, FiFileText } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Textarea from '@/components/common/Textarea.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { facultyService } from '@/services';
import { formatDateTime } from '@/utils/dateUtils';
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

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await facultyService.getExamResults(id);
      setResults(response.data);
      if (response.data.length > 0) {
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
      fetchResults();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to evaluate');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'in-progress': { variant: 'info', label: 'In Progress' },
      submitted: { variant: 'warning', label: 'Submitted' },
      evaluated: { variant: 'success', label: 'Evaluated' },
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
      header: 'Submitted At', 
      accessor: (row) => row.submittedAt ? formatDateTime(row.submittedAt) : 'N/A'
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
            variant="secondary"
            onClick={() => navigate(`${basePath}/exams`)}
            size="sm"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exam Results</h1>
            <p className="text-gray-600 mt-1">{exam?.title}</p>
          </div>
        </div>
        <Button variant="success">
          <FiDownload className="w-5 h-5 mr-2" />
          Export Results
        </Button>
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

      {/* Results Table */}
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
            <p className="text-gray-600">
              No students have submitted this exam yet.
            </p>
          </div>
        )}
      </Card>

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

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {selectedResult.answers?.map((answer, index) => (
                <Card key={answer._id} className="hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold flex-shrink-0">
                          {index + 1}
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
                      <p className="text-gray-900">
                        {answer.questionId?.type === 'MCQ' 
                          ? answer.questionId?.options[answer.selectedOption]
                          : answer.answerText}
                      </p>
                    </div>

                    {answer.questionId?.type === 'MCQ' && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                        <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Correct Answer</p>
                        <p className="text-green-900 font-medium">
                          {answer.questionId?.options[answer.questionId?.correctAnswer]}
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
                      {!answer.isEvaluated && answer.questionId?.type !== 'MCQ' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleEvaluate(answer)}
                        >
                          Evaluate
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
          </div>
        </Modal>
      )}

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
            <p className="text-gray-900">{selectedAnswer?.answerText}</p>
          </div>

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

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEvaluateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEvaluation}>
              Submit Evaluation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Results;
