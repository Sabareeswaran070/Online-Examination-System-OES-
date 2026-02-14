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

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, [filters, currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined
      };
      const response = await facultyService.getQuestions(params);
      const data = response.data || response;
      setQuestions(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalQuestions(data.count || 0);
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
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">Question Bank</h1>
            <p className="text-emerald-50 max-w-xl">Centralized repository for your examination questions. Create, organize, and filter content across subjects.</p>
          </div>
          <Button
            className="bg-white text-teal-700 hover:bg-emerald-50 border-none shadow-xl transition-all hover:scale-105"
            size="lg"
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Add New Question
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions by text..."
            className="w-full pl-10 pr-4 py-2 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            placeholder="All Types"
            value={filters.type}
            onChange={(e) => {
              setFilters({ ...filters, type: e.target.value });
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'All Types' },
              { value: 'MCQ', label: 'Multiple Choice' },
              { value: 'Descriptive', label: 'Descriptive' },
              { value: 'TrueFalse', label: 'True/False' },
              { value: 'Coding', label: 'Coding' },
            ]}
          />

          <Select
            placeholder="All Difficulties"
            value={filters.difficulty}
            onChange={(e) => {
              setFilters({ ...filters, difficulty: e.target.value });
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'All Difficulties' },
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
          />

          <Select
            placeholder="All Subjects"
            value={filters.subject}
            onChange={(e) => {
              setFilters({ ...filters, subject: e.target.value });
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'All Subjects' },
              ...subjects.map(s => ({ value: s._id, label: s.name }))
            ]}
          />

          <select
            className="px-4 py-2 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm bg-white"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[20, 50, 100, 200].map(size => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>
      </div>


      {/* Questions Table */}
      <Card className="overflow-hidden border-none shadow-sm">
        {loading && questions.length === 0 ? (
          <div className="text-center py-20">
            <Loader />
          </div>
        ) : questions.length > 0 ? (
          <>
            <div className={`overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Table columns={columns} data={questions} />
            </div>

            {totalQuestions > 0 && (
              <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 p-4 rounded-b-xl border-t border-gray-100">
                <div className="text-sm text-gray-600 font-medium">
                  Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, totalQuestions)}</span> of <span className="text-gray-900 font-bold">{totalQuestions}</span> questions
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 text-sm font-bold rounded-lg transition-all ${currentPage === pageNum
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <FiHelpCircle className="text-gray-300 w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No questions found</h3>
            <p className="text-gray-500 mt-1">Start building your question bank repository</p>
            <Button
              className="mt-6 shadow-lg"
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
