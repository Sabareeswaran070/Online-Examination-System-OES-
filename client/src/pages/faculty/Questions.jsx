import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiFilter, FiHelpCircle } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import Textarea from '@/components/common/Textarea.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { facultyService } from '@/services';
import toast from 'react-hot-toast';

const Questions = () => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    questionText: '',
    type: 'MCQ',
    subject: '',
    difficulty: 'medium',
    marks: 1,
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
  });
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({
    type: '',
    difficulty: '',
    subject: '',
  });

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, [filters]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await facultyService.getQuestions(filters);
      setQuestions(response.data);
    } catch (error) {
      toast.error('Failed to load questions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await facultyService.getDashboard();
      setSubjects(response.data.subjects || []);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const questionData = {
        ...formData,
        marks: Number(formData.marks),
      };

      if (formData.type === 'MCQ') {
        questionData.correctAnswer = Number(formData.correctAnswer);
      }

      if (editingQuestion) {
        await facultyService.updateQuestion(editingQuestion._id, questionData);
        toast.success('Question updated successfully');
      } else {
        await facultyService.createQuestion(questionData);
        toast.success('Question created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchQuestions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      questionText: question.questionText,
      type: question.type,
      subject: question.subject?._id || '',
      difficulty: question.difficulty,
      marks: question.marks,
      options: question.options?.length ? question.options : ['', '', '', ''],
      correctAnswer: question.correctAnswer || 0,
      explanation: question.explanation || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await facultyService.deleteQuestion(id);
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete question');
    }
  };

  const resetForm = () => {
    setFormData({
      questionText: '',
      type: 'MCQ',
      subject: '',
      difficulty: 'medium',
      marks: 1,
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
    });
    setEditingQuestion(null);
  };

  const getDifficultyBadge = (difficulty) => {
    const difficultyMap = {
      easy: { variant: 'success', label: 'Easy' },
      medium: { variant: 'warning', label: 'Medium' },
      hard: { variant: 'danger', label: 'Hard' },
    };
    const config = difficultyMap[difficulty] || difficultyMap.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    { 
      header: 'Question', 
      accessor: (row) => (
        <div className="max-w-md truncate" title={row.questionText}>
          {row.questionText}
        </div>
      )
    },
    { 
      header: 'Type', 
      accessor: 'type'
    },
    { 
      header: 'Subject', 
      accessor: (row) => row.subject?.name || 'N/A'
    },
    { 
      header: 'Difficulty', 
      accessor: (row) => getDifficultyBadge(row.difficulty)
    },
    { 
      header: 'Marks', 
      accessor: 'marks'
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleEdit(row)}
          >
            <FiEdit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row._id)}
          >
            <FiTrash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-600 mt-1">Build and manage your question repository</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }} size="lg">
          <FiPlus className="w-5 h-5 mr-2" />
          Add New Question
        </Button>
      </div>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            placeholder="Filter by Type"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            options={[
              { value: '', label: 'All Types' },
              { value: 'MCQ', label: 'Multiple Choice' },
              { value: 'Descriptive', label: 'Descriptive' },
              { value: 'TrueFalse', label: 'True/False' },
              { value: 'Coding', label: 'Coding' },
            ]}
          />

          <Select
            placeholder="Filter by Difficulty"
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            options={[
              { value: '', label: 'All Difficulties' },
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
          />

          <Select
            placeholder="Filter by Subject"
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            options={[
              { value: '', label: 'All Subjects' },
              ...subjects.map(s => ({ value: s._id, label: s.name }))
            ]}
          />

          <div className="flex items-center gap-2">
            <span className="px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium">
              Total: {questions.length} questions
            </span>
          </div>
        </div>
      </Card>

      {/* Questions Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <Loader />
          </div>
        ) : questions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table columns={columns} data={questions} />
          </div>
        ) : (
          <div className="text-center py-16">
            <FiHelpCircle className="mx-auto w-16 h-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No questions found</h3>
            <p className="mt-2 text-gray-500">Start building your question bank</p>
            <Button 
              className="mt-6"
              onClick={() => { resetForm(); setShowModal(true); }}
            >
              <FiPlus className="w-5 h-5 mr-2" />
              Add Question
            </Button>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingQuestion ? 'Edit Question' : 'Add Question'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            label="Question Text"
            name="questionText"
            value={formData.questionText}
            onChange={handleChange}
            rows={3}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={[
                { value: 'MCQ', label: 'Multiple Choice' },
                { value: 'Descriptive', label: 'Descriptive' },
                { value: 'TrueFalse', label: 'True/False' },
                { value: 'Coding', label: 'Coding' },
              ]}
              required
            />

            <Select
              label="Subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              options={subjects.map(s => ({ value: s._id, label: s.name }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
              required
            />

            <Input
              label="Marks"
              name="marks"
              type="number"
              step="0.5"
              value={formData.marks}
              onChange={handleChange}
              required
            />
          </div>

          {formData.type === 'MCQ' && (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Options</label>
                {formData.options.map((option, index) => (
                  <Input
                    key={index}
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    required
                  />
                ))}
              </div>

              <Select
                label="Correct Answer"
                name="correctAnswer"
                value={formData.correctAnswer}
                onChange={handleChange}
                options={formData.options.map((opt, idx) => ({
                  value: idx,
                  label: `Option ${idx + 1}: ${opt || '(empty)'}`
                }))}
                required
              />
            </>
          )}

          <Textarea
            label="Explanation (Optional)"
            name="explanation"
            value={formData.explanation}
            onChange={handleChange}
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowModal(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingQuestion ? 'Update' : 'Add'} Question
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Questions;
