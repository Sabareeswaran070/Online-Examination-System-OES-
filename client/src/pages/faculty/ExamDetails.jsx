import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2, FiUpload, FiUsers } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Select from '@/components/common/Select.jsx';
import Input from '@/components/common/Input.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { facultyService } from '@/services';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const ExamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [generateData, setGenerateData] = useState({
    count: 10,
    difficulty: '',
    type: '',
  });

  useEffect(() => {
    fetchExamDetails();
    fetchQuestions();
  }, [id]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      const response = await facultyService.getExam(id);
      setExam(response.data);
    } catch (error) {
      toast.error('Failed to load exam details');
      console.error(error);
      navigate('/faculty/exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await facultyService.getQuestions({});
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedQuestion) {
      toast.error('Please select a question');
      return;
    }
    try {
      await facultyService.addQuestionToExam(id, selectedQuestion);
      toast.success('Question added to exam');
      setShowAddModal(false);
      setSelectedQuestion('');
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add question');
    }
  };

  const handleGenerateQuestions = async () => {
    try {
      const response = await facultyService.generateRandomQuestions({
        examId: id,
        ...generateData,
      });
      toast.success(`${generateData.count} questions generated`);
      setShowGenerateModal(false);
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate questions');
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!window.confirm('Remove this question from exam?')) return;
    try {
      // You'll need to implement this endpoint
      toast.info('Feature coming soon');
    } catch (error) {
      toast.error('Failed to remove question');
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this exam?')) return;
    try {
      await facultyService.publishExam(id);
      toast.success('Exam published successfully');
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish exam');
    }
  };

  const examQuestionColumns = [
    { header: '#', accessor: (row, idx) => idx + 1 },
    { 
      header: 'Question', 
      accessor: (row) => (
        <div className="max-w-md truncate">
          {row.questionId?.questionText || 'Question deleted'}
        </div>
      )
    },
    { 
      header: 'Type', 
      accessor: (row) => row.questionId?.type || 'N/A'
    },
    { 
      header: 'Marks', 
      accessor: (row) => row.questionId?.marks || 0
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => handleRemoveQuestion(row.questionId?._id)}
          disabled={exam?.status !== 'draft'}
        >
          <FiTrash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  if (loading) return <Loader fullScreen />;

  if (!exam) return <div>Exam not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/faculty/exams')}
            size="sm"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">
              {exam.subject?.name} • {exam.questions?.length || 0} Questions
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {exam.status === 'draft' && (
            <Button variant="success" onClick={handlePublish}>
              <FiUpload className="w-5 h-5 mr-2" />
              Publish Exam
            </Button>
          )}
          <Button onClick={() => navigate(`/faculty/exams/${id}/results`)}>
            <FiUsers className="w-5 h-5 mr-2" />
            View Results
          </Button>
        </div>
      </div>

      {/* Exam Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="text-center">
            <p className="text-sm text-blue-700 font-medium">Start Time</p>
            <p className="text-base font-semibold text-blue-900 mt-2">
              {formatDateTime(exam.startTime)}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="text-center">
            <p className="text-sm text-green-700 font-medium">Duration</p>
            <p className="text-2xl font-bold text-green-900 mt-2">{exam.duration} min</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="text-center">
            <p className="text-sm text-purple-700 font-medium">Total Marks</p>
            <p className="text-2xl font-bold text-purple-900 mt-2">{exam.totalMarks}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="text-center">
            <p className="text-sm text-yellow-700 font-medium">Status</p>
            <div className="mt-2">
              <Badge 
                variant={exam.status === 'draft' ? 'secondary' : exam.status === 'scheduled' ? 'info' : 'success'}
              >
                {exam.status}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Exam Details */}
      <Card title="Exam Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600 font-medium">Description:</span>
              <span className="text-gray-900">{exam.description || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600 font-medium">Passing Marks:</span>
              <span className="text-gray-900 font-semibold">{exam.passingMarks}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600 font-medium">Negative Marking:</span>
              <span className="text-gray-900">
                {exam.allowNegativeMarking ? (
                  <Badge variant="danger">Yes (-{exam.negativeMarks})</Badge>
                ) : (
                  <Badge variant="success">No</Badge>
                )}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600 font-medium">Shuffle Questions:</span>
              <span className="text-gray-900">
                {exam.shuffleQuestions ? (
                  <Badge variant="info">Enabled</Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600 font-medium">Show Results:</span>
              <span className="text-gray-900">
                {exam.showResults ? (
                  <Badge variant="success">Yes</Badge>
                ) : (
                  <Badge variant="warning">No</Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600 font-medium">End Time:</span>
              <span className="text-gray-900">{formatDateTime(exam.endTime)}</span>
            </div>
          </div>
        </div>
        {exam.instructions && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">Instructions:</p>
            <p className="text-sm text-blue-800">{exam.instructions}</p>
          </div>
        )}
      </Card>

      <Card 
        title={`Questions (${exam.questions?.length || 0})`}
        action={
          exam.status === 'draft' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowGenerateModal(true)}>
                Generate Random
              </Button>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <FiPlus className="w-4 h-4 mr-1" />
                Add Question
              </Button>
            </div>
          )
        }
      >
        <Table columns={examQuestionColumns} data={exam.questions || []} />
      </Card>

      {/* Add Question Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Question to Exam"
      >
        <div className="space-y-4">
          <Select
            label="Select Question"
            value={selectedQuestion}
            onChange={(e) => setSelectedQuestion(e.target.value)}
            options={questions.map(q => ({
              value: q._id,
              label: `${q.questionText.substring(0, 60)}... (${q.marks} marks)`
            }))}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddQuestion}>
              Add Question
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate Random Questions Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Random Questions"
      >
        <div className="space-y-4">
          <Input
            label="Number of Questions"
            type="number"
            value={generateData.count}
            onChange={(e) => setGenerateData({ ...generateData, count: e.target.value })}
          />
          <Select
            label="Difficulty (Optional)"
            value={generateData.difficulty}
            onChange={(e) => setGenerateData({ ...generateData, difficulty: e.target.value })}
            options={[
              { value: '', label: 'All' },
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
          />
          <Select
            label="Type (Optional)"
            value={generateData.type}
            onChange={(e) => setGenerateData({ ...generateData, type: e.target.value })}
            options={[
              { value: '', label: 'All' },
              { value: 'MCQ', label: 'MCQ' },
              { value: 'Descriptive', label: 'Descriptive' },
              { value: 'TrueFalse', label: 'True/False' },
            ]}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateQuestions}>
              Generate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExamDetails;
