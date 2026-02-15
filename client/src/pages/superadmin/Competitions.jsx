import { useState, useEffect } from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { superAdminService, competitionService } from '@/services';
import { FiPlus, FiEdit, FiTrash2, FiCalendar, FiClock, FiCode, FiSearch, FiCheck, FiUsers, FiAward, FiChevronRight, FiX, FiTarget, FiZap, FiFolder } from 'react-icons/fi';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const AdminCompetitions = () => {
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedComp, setSelectedComp] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState(1); // 1: Details, 2: Questions

    // Questions
    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [qSearch, setQSearch] = useState('');
    const [qLoading, setQLoading] = useState(false);
    const [questionSets, setQuestionSets] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        duration: 60,
        totalMarks: 0,
        passingMarks: 0,
        questions: [],
    });

    useEffect(() => {
        fetchCompetitions();
    }, []);

    const fetchCompetitions = async () => {
        try {
            setLoading(true);
            const response = await competitionService.getAllCompetitions({ limit: 100 });
            setCompetitions(response.data || []);
        } catch (error) {
            console.error('Error fetching competitions:', error);
            toast.error('Failed to load competitions');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestionSets = async () => {
        try {
            const res = await superAdminService.getQuestionSets();
            setQuestionSets(res.data || []);
        } catch (error) {
            console.error('Error fetching question sets:', error);
        }
    };

    const fetchQuestions = async (search = '', folder = '') => {
        setQLoading(true);
        try {
            const params = { limit: 100 };
            if (search) params.search = search;
            if (folder) params.questionSet = folder;
            const res = await superAdminService.getQuestions(params);
            setAvailableQuestions(res.data || []);
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setQLoading(false);
        }
    };

    const handleOpenModal = (comp = null) => {
        if (comp) {
            setIsEditing(true);
            setSelectedComp(comp);
            setFormData({
                title: comp.title,
                description: comp.description || '',
                startTime: new Date(comp.startTime).toISOString().slice(0, 16),
                endTime: new Date(comp.endTime).toISOString().slice(0, 16),
                duration: comp.duration,
                totalMarks: comp.totalMarks,
                passingMarks: comp.passingMarks,
                questions: comp.questions?.map(q => ({
                    questionId: q.questionId?._id || q.questionId,
                    order: q.order,
                    _q: q.questionId, // keep full obj for display
                })) || [],
            });
        } else {
            setIsEditing(false);
            setSelectedComp(null);
            setFormData({
                title: '',
                description: '',
                startTime: '',
                endTime: '',
                duration: 60,
                totalMarks: 0,
                passingMarks: 0,
                questions: [],
            });
        }
        setStep(1);
        setQSearch('');
        setSelectedFolder('');
        fetchQuestions();
        fetchQuestionSets();
        setShowModal(true);
    };

    const toggleQuestion = (q) => {
        const isSelected = formData.questions.some(fq => fq.questionId === q._id);
        let newQuestions;
        if (isSelected) {
            newQuestions = formData.questions.filter(fq => fq.questionId !== q._id);
        } else {
            newQuestions = [...formData.questions, { questionId: q._id, order: formData.questions.length + 1, _q: q }];
        }
        // Auto-calculate total marks
        const totalMarks = newQuestions.reduce((sum, fq) => {
            const question = fq._q || availableQuestions.find(aq => aq._id === fq.questionId);
            return sum + (question?.marks || 0);
        }, 0);
        setFormData({ ...formData, questions: newQuestions, totalMarks, passingMarks: Math.ceil(totalMarks * 0.4) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.questions.length === 0) {
            toast.error('Please select at least one question');
            setStep(2);
            return;
        }
        if (!formData.title || !formData.startTime || !formData.endTime) {
            toast.error('Please fill in all required fields');
            setStep(1);
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                startTime: formData.startTime,
                endTime: formData.endTime,
                duration: Number(formData.duration),
                totalMarks: Number(formData.totalMarks),
                passingMarks: Number(formData.passingMarks),
                questions: formData.questions.map(({ questionId, order }) => ({ questionId, order })),
            };

            if (isEditing) {
                await competitionService.updateCompetition(selectedComp._id, payload);
                toast.success('Competition updated!');
            } else {
                await competitionService.createCompetition(payload);
                toast.success('Competition created!');
            }
            setShowModal(false);
            fetchCompetitions();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save competition');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this competition permanently?')) {
            try {
                await competitionService.deleteCompetition(id);
                toast.success('Competition deleted');
                fetchCompetitions();
            } catch (error) {
                toast.error('Failed to delete competition');
            }
        }
    };

    const getStatusColor = (status) => {
        if (status === 'active') return 'bg-green-100 text-green-700 border-green-200';
        if (status === 'completed') return 'bg-gray-100 text-gray-600 border-gray-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    const getStatusDot = (status) => {
        if (status === 'active') return 'bg-green-500';
        if (status === 'completed') return 'bg-gray-400';
        return 'bg-blue-500';
    };

    if (loading) return <Loader fullScreen />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <FiAward className="w-8 h-8" /> Coding Contests
                        </h1>
                        <p className="mt-1 opacity-90">Create and manage coding challenges for students</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
                    >
                        <FiPlus className="w-5 h-5" /> New Contest
                    </button>
                </div>
            </div>

            {/* Competition Cards */}
            {competitions.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                        <FiCode className="w-10 h-10 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No contests yet</h3>
                    <p className="text-gray-500 mb-6">Create your first coding contest to get started</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                        <FiPlus className="inline mr-2 w-4 h-4" /> Create Contest
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {competitions.map((comp) => (
                        <div key={comp._id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                            {/* Card Header */}
                            <div className="p-5 pb-3">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(comp.status)}`}>
                                        <div className={`w-2 h-2 rounded-full ${getStatusDot(comp.status)}`}></div>
                                        {comp.status?.charAt(0).toUpperCase() + comp.status?.slice(1)}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(comp)}
                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                        >
                                            <FiEdit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(comp._id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{comp.title}</h3>
                                {comp.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{comp.description}</p>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="px-5 pb-4 grid grid-cols-3 gap-3">
                                <div className="text-center p-2 bg-purple-50 rounded-lg">
                                    <FiClock className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                                    <p className="text-sm font-bold text-gray-800">{comp.duration}m</p>
                                    <p className="text-[10px] text-gray-400 uppercase">Duration</p>
                                </div>
                                <div className="text-center p-2 bg-blue-50 rounded-lg">
                                    <FiTarget className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                                    <p className="text-sm font-bold text-gray-800">{comp.totalMarks}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">Marks</p>
                                </div>
                                <div className="text-center p-2 bg-green-50 rounded-lg">
                                    <FiCode className="w-4 h-4 text-green-500 mx-auto mb-1" />
                                    <p className="text-sm font-bold text-gray-800">{comp.questions?.length || 0}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">Questions</p>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <FiCalendar className="w-3 h-3" />
                                    {formatDateTime(comp.startTime)} — {formatDateTime(comp.endTime)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal — 2-step */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title=""
                size="xl"
            >
                <div className="space-y-5">
                    {/* Modal Header */}
                    <div className="text-center pb-4 border-b">
                        <h2 className="text-xl font-bold text-gray-800">
                            {isEditing ? 'Edit Contest' : 'Create Coding Contest'}
                        </h2>
                        {/* Step Indicator */}
                        <div className="flex items-center justify-center gap-3 mt-4">
                            <button
                                onClick={() => setStep(1)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    step === 1 ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
                                Details
                            </button>
                            <FiChevronRight className="w-4 h-4 text-gray-300" />
                            <button
                                onClick={() => setStep(2)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    step === 2 ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
                                Questions ({formData.questions.length})
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Step 1: Contest Details */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <Input
                                    label="Contest Title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    placeholder="e.g., CodeSprint Challenge 2026"
                                />
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description (optional)</label>
                                    <textarea
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-sm"
                                        rows="3"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="What's this contest about..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Start Time"
                                        type="datetime-local"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        required
                                    />
                                    <Input
                                        label="End Time"
                                        type="datetime-local"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (min)</label>
                                        <div className="flex gap-1.5">
                                            {[30, 60, 90, 120].map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, duration: d })}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                                        formData.duration == d
                                                            ? 'bg-purple-600 text-white shadow-sm'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <Input
                                        label="Total Marks"
                                        type="number"
                                        value={formData.totalMarks}
                                        onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                                        required
                                    />
                                    <Input
                                        label="Passing Marks"
                                        type="number"
                                        value={formData.passingMarks}
                                        onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all"
                                    >
                                        Next: Pick Questions <FiChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Question Selection */}
                        {step === 2 && (
                            <div className="space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search questions..."
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                        value={qSearch}
                                        onChange={(e) => {
                                            setQSearch(e.target.value);
                                            fetchQuestions(e.target.value, selectedFolder);
                                        }}
                                    />
                                </div>

                                {/* Folder Filter */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedFolder(''); fetchQuestions(qSearch, ''); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                            selectedFolder === ''
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                                        }`}
                                    >
                                        <FiCode className="w-3 h-3" /> All Questions
                                    </button>
                                    {questionSets.map(folder => (
                                        <button
                                            type="button"
                                            key={folder._id}
                                            onClick={() => { setSelectedFolder(folder._id); fetchQuestions(qSearch, folder._id); }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                                selectedFolder === folder._id
                                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                                            }`}
                                        >
                                            <FiFolder className="w-3 h-3" /> {folder.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Selected count */}
                                {formData.questions.length > 0 && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-100">
                                        <FiCheck className="w-4 h-4 text-purple-600" />
                                        <span className="text-sm font-medium text-purple-700">
                                            {formData.questions.length} questions selected • {formData.totalMarks} total marks
                                        </span>
                                    </div>
                                )}

                                {/* Question List */}
                                <div className="max-h-[45vh] overflow-y-auto border border-gray-100 rounded-xl divide-y">
                                    {qLoading ? (
                                        <div className="p-8 text-center text-gray-400">Loading questions...</div>
                                    ) : availableQuestions.length > 0 ? (
                                        availableQuestions.map((q) => {
                                            const isSelected = formData.questions.some(fq => fq.questionId === q._id);
                                            return (
                                                <div
                                                    key={q._id}
                                                    onClick={() => toggleQuestion(q)}
                                                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{q.questionText}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                                q.type === 'Coding' ? 'bg-violet-100 text-violet-700' :
                                                                q.type === 'MCQ' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-600'
                                                            }`}>{q.type}</span>
                                                            <span className="text-[10px] text-gray-500">{q.marks} marks</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                                q.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
                                                                q.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
                                                                'bg-yellow-50 text-yellow-600'
                                                            }`}>{q.difficulty}</span>
                                                            {q.questionSet?.name && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 flex items-center gap-0.5">
                                                                    <FiFolder className="w-2.5 h-2.5" /> {q.questionSet.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 ml-3 transition-all ${
                                                        isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'
                                                    }`}>
                                                        {isSelected && <FiCheck className="w-3.5 h-3.5" />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 text-center text-gray-400">No questions found</div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="px-5 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                                    >
                                        {submitting ? 'Saving...' : isEditing ? 'Update Contest' : 'Create Contest'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default AdminCompetitions;
