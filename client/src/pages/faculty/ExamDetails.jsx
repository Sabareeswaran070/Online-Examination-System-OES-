import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2, FiUpload, FiUsers, FiSearch, FiZap, FiEdit3 } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Select from '@/components/common/Select.jsx';
import Input from '@/components/common/Input.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import AIGenerateModal from '@/components/superadmin/AIGenerateModal.jsx';
import { facultyService, superAdminService, collegeAdminService, deptHeadService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime, getExamLiveStatus, getTimeRemainingText } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const ExamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const basePath = isSuperAdmin ? '/super-admin' : '/faculty';
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState('');
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [generateNotEnough, setGenerateNotEnough] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateData, setGenerateData] = useState({
    count: 10,
    difficulty: '',
    type: '',
  });

  useEffect(() => {
    fetchExamDetails();
    // Initial fetch for questions when component mounts, not tied to modal
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
      navigate(`${basePath}/exams`);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (params = {}) => {
    try {
      setQuestionsLoading(true);
      const queryParams = {
        limit: 100,
        search: params.search || undefined,
        type: params.type || undefined,
        difficulty: params.difficulty || undefined,
      };

      let response;
      if (isSuperAdmin) {
        response = await superAdminService.getQuestions(queryParams);
      } else {
        response = await facultyService.getQuestions(queryParams);
      }
      setQuestions(response.data || []);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Re-fetch questions when search/filters change in the modal
  useEffect(() => {
    if (showAddModal) {
      const timer = setTimeout(() => {
        fetchQuestions({
          search: questionSearch,
          type: questionTypeFilter,
          difficulty: questionDifficultyFilter,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [questionSearch, questionTypeFilter, questionDifficultyFilter, showAddModal]);

  const handleAddQuestion = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }
    try {
      await facultyService.addQuestionToExam(id, { questionIds: selectedQuestions });
      toast.success(`${selectedQuestions.length} questions added to exam`);
      setShowAddModal(false);
      setSelectedQuestions([]);
      setQuestionSearch('');
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add questions');
    }
  };

  const handleGenerateQuestions = async () => {
    try {
      setGenerateLoading(true);
      setGenerateNotEnough(false);
      const response = await facultyService.generateRandomQuestions({
        examId: id,
        ...generateData,
      });
      const addedCount = response.data?.questions?.length - (exam?.questions?.length || 0);
      toast.success(response.message || `Questions added successfully`);
      setShowGenerateModal(false);
      setGenerateNotEnough(false);
      fetchExamDetails();
    } catch (error) {
      const msg = error.response?.data?.message || '';
      if (msg.toLowerCase().includes('no matching') || error.response?.status === 400) {
        // Not enough questions — offer AI generation
        setGenerateNotEnough(true);
      } else {
        toast.error(msg || 'Failed to generate questions');
      }
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    const topic = generateData.aiTopic || exam.subject?.name || '';
    if (!topic.trim()) {
      toast.error('Please enter a topic or subject');
      return;
    }
    try {
      setGenerateLoading(true);
      const service = isSuperAdmin ? superAdminService :
        user?.role === 'admin' ? collegeAdminService :
          user?.role === 'depthead' ? deptHeadService :
            facultyService;

      const response = await service.generateAIQuestions({
        topic: topic.trim(),
        type: generateData.aiType || 'MCQ',
        difficulty: generateData.aiDifficulty || 'medium',
        count: Number(generateData.aiCount) || 5,
        subjectId: exam.subject?._id || exam.subject || undefined,
        examId: id,
      });
      toast.success(response.message || `${response.count} questions generated and added!`);
      setShowGenerateModal(false);
      setGenerateNotEnough(false);
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'AI generation failed. Please try again.');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Handle AI generated question: save to bank then add to exam
  const handleAIGenerated = async (generatedQuestion) => {
    try {
      // Save the generated question to the question bank
      const questionData = {
        questionText: generatedQuestion.questionText || generatedQuestion.title,
        type: 'Coding',
        difficulty: generatedQuestion.difficulty || 'medium',
        marks: generatedQuestion.marks || 10,
        subject: exam.subject?._id || exam.subject || '',
        explanation: generatedQuestion.explanation || '',
        programmingLanguage: generatedQuestion.programmingLanguage || generatedQuestion.language || 'javascript',
        codeSnippet: generatedQuestion.starterCode || generatedQuestion.codeSnippet || '',
        inputFormat: generatedQuestion.inputFormat || '',
        outputFormat: generatedQuestion.outputFormat || '',
        constraints: generatedQuestion.constraints || '',
        visibleTestCases: generatedQuestion.visibleTestCases || [],
        hiddenTestCases: generatedQuestion.hiddenTestCases || [],
        timeLimit: generatedQuestion.timeLimit || 1000,
        memoryLimit: generatedQuestion.memoryLimit || 256,
        starterCode: generatedQuestion.starterCode || '',
        sampleInput: generatedQuestion.sampleInput || '',
        sampleOutput: generatedQuestion.sampleOutput || '',
        isGlobal: true,
      };

      let savedQuestion;
      const service = isSuperAdmin ? superAdminService :
        user?.role === 'admin' ? collegeAdminService :
          user?.role === 'depthead' ? deptHeadService :
            facultyService;

      const res = await service.createQuestion(questionData);
      savedQuestion = res.data;

      // Now add the saved question to the exam
      if (savedQuestion?._id) {
        await facultyService.addQuestionToExam(id, { questionId: savedQuestion._id });
        toast.success('AI question saved and added to exam!');
        fetchExamDetails();
      } else {
        toast.success('AI question saved to bank!');
      }
    } catch (error) {
      console.error('Error saving AI question:', error);
      toast.error(error.response?.data?.message || 'Failed to save AI-generated question');
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!window.confirm('Remove this question from exam?')) return;
    try {
      await facultyService.removeQuestionFromExam(id, questionId);
      toast.success('Question removed from exam');
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove question');
    }
  };

  const handleRemoveAllQuestions = async () => {
    const count = exam?.questions?.length || 0;
    if (count === 0) {
      toast.error('No questions to remove');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove all ${count} questions from this exam? This action cannot be undone.`)) return;
    try {
      await facultyService.removeAllQuestionsFromExam(id);
      toast.success(`All ${count} questions removed from exam`);
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove questions');
    }
  };

  const handleMarksChange = async (questionId, newMarks) => {
    try {
      await facultyService.updateExamQuestionMarks(id, questionId, Number(newMarks));
      fetchExamDetails();
    } catch (error) {
      toast.error('Failed to update marks');
    }
  };

  const handlePublish = async () => {
    const currentTotal = (exam?.questions || []).reduce((sum, q) => {
      const m = q.marks != null ? q.marks : (q.questionId?.marks || 0);
      return sum + m;
    }, 0);
    if (currentTotal !== exam.totalMarks) {
      toast.error(`Total marks (${currentTotal}) must equal exam total (${exam.totalMarks}). Please adjust question marks.`);
      return;
    }
    if (!window.confirm('Are you sure you want to publish this exam?')) return;
    try {
      await facultyService.publishExam(id);
      toast.success('Exam published successfully');
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish exam');
    }
  };

  const handlePublishResults = async () => {
    if (!window.confirm('Are you sure you want to publish the results? Once published, students will be able to see their scores and detailed performance.')) {
      return;
    }

    try {
      await facultyService.publishResults(id);
      toast.success('Results published successfully');
      fetchExamDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish results');
    }
  };

  // Filter out questions already added to the exam
  const existingQuestionIds = new Set(
    (exam?.questions || []).map(q => q.questionId?._id || q.questionId)
  );
  const availableQuestions = questions.filter(q => !existingQuestionIds.has(q._id));

  // Compute marks total
  const currentTotalMarks = (exam?.questions || []).reduce((sum, q) => {
    const m = q.marks != null ? q.marks : (q.questionId?.marks || 0);
    return sum + m;
  }, 0);
  const marksTarget = exam?.totalMarks || 0;
  const marksPercent = marksTarget > 0 ? Math.min((currentTotalMarks / marksTarget) * 100, 100) : 0;
  const marksExact = currentTotalMarks === marksTarget;
  const marksOver = currentTotalMarks > marksTarget;

  const examQuestionColumns = [
    {
      header: '#', render: (row) => {
        const idx = exam?.questions?.findIndex(q => q._id === row._id || q.questionId?._id === row.questionId?._id);
        return idx >= 0 ? idx + 1 : '-';
      }
    },
    {
      header: 'Question',
      render: (row) => (
        <div className="max-w-xs truncate">
          {row.questionId?.questionText || 'Question deleted'}
        </div>
      )
    },
    {
      header: 'Type',
      render: (row) => (
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
          {row.questionId?.type || 'N/A'}
        </span>
      )
    },
    {
      header: 'Marks',
      render: (row) => {
        const qId = row.questionId?._id;
        const currentMarks = row.marks != null ? row.marks : (row.questionId?.marks || 0);
        const isDraft = exam?.status === 'draft';
        return isDraft ? (
          <input
            type="number"
            className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            defaultValue={currentMarks}
            min={0}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (val !== currentMarks && val >= 0) {
                handleMarksChange(qId, val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
            }}
          />
        ) : (
          <span className="font-semibold">{currentMarks}</span>
        );
      }
    },
    {
      header: 'Actions',
      render: (row) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => handleRemoveQuestion(row.questionId?._id)}
          disabled={!isSuperAdmin && exam?.status !== 'draft'}
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
            onClick={() => navigate(`${basePath}/exams`)}
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
          {exam.status === 'completed' && !exam.resultsPublished && (
            <Button
              variant="success"
              onClick={handlePublishResults}
            >
              <FiUpload className="w-5 h-5 mr-2" />
              Publish Results
            </Button>
          )}
          {exam.resultsPublished && (
            <Badge variant="success" className="px-3 py-2 flex items-center gap-1 font-bold">
              Results Published
            </Badge>
          )}
          <Button onClick={() => navigate(`${basePath}/exams/${id}/results`)}>
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
                variant={getExamLiveStatus(exam).variant}
              >
                {getExamLiveStatus(exam).label}
              </Badge>
            </div>
            <p className="text-xs text-yellow-700 mt-2 font-medium">
              {getTimeRemainingText(exam)}
            </p>
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

      {/* Marks Progress Tracker */}
      {(exam.questions?.length || 0) > 0 && (
        <div className={`p-4 rounded-xl border-2 ${marksExact ? 'bg-green-50 border-green-300' : marksOver ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FiEdit3 className={`w-5 h-5 ${marksExact ? 'text-green-600' : marksOver ? 'text-red-600' : 'text-amber-600'}`} />
              <span className="font-semibold text-gray-900">Marks Allocation</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${marksExact ? 'text-green-700' : marksOver ? 'text-red-700' : 'text-amber-700'}`}>
                {currentTotalMarks}
              </span>
              <span className="text-gray-500 text-lg">/</span>
              <span className="text-2xl font-bold text-gray-700">{marksTarget}</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${marksExact ? 'bg-green-500' : marksOver ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${marksPercent}%` }}
            />
          </div>
          <div className="mt-2 text-sm">
            {marksExact ? (
              <span className="text-green-700 font-medium">✅ Perfect! Marks total matches the exam total.</span>
            ) : marksOver ? (
              <span className="text-red-700 font-medium">⚠️ Over by {currentTotalMarks - marksTarget} marks. Remove or reduce marks to match {marksTarget}.</span>
            ) : (
              <span className="text-amber-700 font-medium">⚠️ {marksTarget - currentTotalMarks} marks remaining. Add questions or increase marks to reach {marksTarget}.</span>
            )}
          </div>
        </div>
      )}

      <Card
        title={`Questions (${exam.questions?.length || 0})`}
        action={
          (exam.status === 'draft' || isSuperAdmin) && (
            <div className="flex gap-2">
              {(exam.questions?.length || 0) > 0 && (isSuperAdmin || exam.status === 'draft') && (
                <Button size="sm" variant="danger" onClick={handleRemoveAllQuestions}>
                  <FiTrash2 className="w-4 h-4 mr-1" />
                  Remove All
                </Button>
              )}
              {exam.status === 'draft' && (
                <>
                  <button
                    onClick={() => setShowAIGenerateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-sm hover:shadow-md transition-all text-sm"
                  >
                    <FiZap className="w-4 h-4" />
                    AI Generate
                  </button>
                  <Button size="sm" onClick={() => setShowGenerateModal(true)}>
                    Generate Random
                  </Button>
                  <Button size="sm" onClick={() => setShowAddModal(true)}>
                    <FiPlus className="w-4 h-4 mr-1" />
                    Add Question
                  </Button>
                </>
              )}
            </div>
          )
        }
      >
        <Table columns={examQuestionColumns} data={exam.questions || []} />
      </Card>

      {/* Add Question Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setQuestionSearch(''); setSelectedQuestion(''); }}
        title="Add Question to Exam"
      >
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-1">
                <Select
                  value={questionTypeFilter}
                  onChange={(e) => setQuestionTypeFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'MCQ', label: 'MCQ' },
                    { value: 'Coding', label: 'Coding' },
                    { value: 'Descriptive', label: 'Descriptive' },
                    { value: 'TrueFalse', label: 'True/False' },
                  ]}
                  className="flex-1"
                />
                <Select
                  value={questionDifficultyFilter}
                  onChange={(e) => setQuestionDifficultyFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Difficulty' },
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' },
                  ]}
                  className="flex-1"
                />
              </div>
              {availableQuestions.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedQuestions.length === availableQuestions.length) {
                      setSelectedQuestions([]);
                    } else {
                      setSelectedQuestions(availableQuestions.map(q => q._id));
                    }
                  }}
                  className="ml-3 text-xs text-primary-600 font-medium hover:underline"
                >
                  {selectedQuestions.length === availableQuestions.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
          </div>

          {/* Question List */}
          {questionsLoading ? (
            <div className="flex justify-center py-8"><Loader /></div>
          ) : (
            <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
              {availableQuestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No questions available. Try adjusting your filters.
                </div>
              ) : (
                availableQuestions.map((q) => (
                  <label
                    key={q._id}
                    className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedQuestions.includes(q._id) ? 'bg-primary-50 ring-1 ring-primary-300' : ''}`}
                  >
                    <input
                      type="checkbox"
                      value={q._id}
                      checked={selectedQuestions.includes(q._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestions([...selectedQuestions, q._id]);
                        } else {
                          setSelectedQuestions(selectedQuestions.filter(id => id !== q._id));
                        }
                      }}
                      className="mt-1 w-4 h-4 text-primary-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{q.questionText}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{q.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.difficulty === 'easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{q.difficulty}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium">{q.marks} marks</span>
                        {q.subject?.name && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">{q.subject.name}</span>}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-gray-500">
              {selectedQuestions.length} selected / {availableQuestions.length} available
            </span>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setShowAddModal(false); setQuestionSearch(''); setSelectedQuestions([]); }}>
                Cancel
              </Button>
              <Button onClick={handleAddQuestion} disabled={selectedQuestions.length === 0}>
                Add Selected
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Generate Random Questions Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => { setShowGenerateModal(false); setGenerateNotEnough(false); }}
        title="Generate Random Questions"
      >
        <div className="space-y-4">
          {generateNotEnough ? (
            /* AI Fallback — inline multi-type generation form */
            <div className="space-y-4 py-2">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 mb-3">
                  <FiZap className="w-7 h-7 text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Generate with AI</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Not enough questions in the bank. AI will generate and add them to this exam.
                  {exam.subject?.name && <span className="font-semibold text-purple-700"> Subject: {exam.subject.name}</span>}
                </p>
              </div>

              <Input
                label="Topic / Subject"
                value={generateData.aiTopic || exam.subject?.name || ''}
                onChange={(e) => setGenerateData({ ...generateData, aiTopic: e.target.value })}
                placeholder="e.g., Data Structures, Calculus, World History..."
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Question Type"
                  value={generateData.aiType || 'MCQ'}
                  onChange={(e) => setGenerateData({ ...generateData, aiType: e.target.value })}
                  options={[
                    { value: 'MCQ', label: 'MCQ' },
                    { value: 'TrueFalse', label: 'True / False' },
                    { value: 'Descriptive', label: 'Descriptive' },
                    { value: 'Coding', label: 'Coding' },
                  ]}
                />
                <Input
                  label="Count"
                  type="number"
                  value={generateData.aiCount || 5}
                  onChange={(e) => setGenerateData({ ...generateData, aiCount: e.target.value })}
                  min={1}
                  max={20}
                />
              </div>

              <Select
                label="Difficulty"
                value={generateData.aiDifficulty || 'medium'}
                onChange={(e) => setGenerateData({ ...generateData, aiDifficulty: e.target.value })}
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setGenerateNotEnough(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  ← Back to random
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={generateLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-200 hover:shadow-lg transition-all text-sm disabled:opacity-50"
                >
                  {generateLoading ? (
                    <><Loader className="w-4 h-4" /> Generating...</>
                  ) : (
                    <><FiZap className="w-4 h-4" /> Generate {generateData.aiCount || 5} Questions</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Normal Generate Form */
            <>
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
                <Button variant="secondary" onClick={() => { setShowGenerateModal(false); setGenerateNotEnough(false); }}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateQuestions} loading={generateLoading}>
                  Generate
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={showAIGenerateModal}
        onClose={() => setShowAIGenerateModal(false)}
        onGenerated={handleAIGenerated}
        service={isSuperAdmin ? superAdminService :
          user?.role === 'admin' ? collegeAdminService :
            user?.role === 'depthead' ? deptHeadService :
              facultyService}
      />
    </div>
  );
};

export default ExamDetails;
