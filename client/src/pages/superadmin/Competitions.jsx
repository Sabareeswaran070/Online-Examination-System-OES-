import { useState, useEffect } from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import Table from '@/components/common/Table';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { superAdminService, facultyService, competitionService } from '@/services';
import { FiPlus, FiEdit, FiTrash2, FiCalendar, FiClock, FiSettings, FiSearch, FiCheck, FiX } from 'react-icons/fi';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const AdminCompetitions = () => {
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedComp, setSelectedComp] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Question Selection State
    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [qSearch, setQSearch] = useState('');
    const [qType, setQType] = useState('all');
    const [qSubject, setQSubject] = useState('');
    const [qQuestionSet, setQQuestionSet] = useState('');
    const [qLoading, setQLoading] = useState(false);

    const [subjects, setSubjects] = useState([]);
    const [questionSets, setQuestionSets] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        duration: '',
        totalMarks: '',
        passingMarks: '',
        questions: [], // Array of { questionId: string, order: number }
    });

    // Pagination & Search state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [totalCompetitions, setTotalCompetitions] = useState(0);

    useEffect(() => {
        fetchCompetitions();
        fetchQuestions();
        fetchFilters();
    }, [currentPage, pageSize, searchTerm, statusFilter]);

    const fetchFilters = async () => {
        try {
            const [subRes, setRes] = await Promise.all([
                superAdminService.getSubjects(),
                superAdminService.getQuestionSets()
            ]);
            setSubjects(subRes.data || []);
            setQuestionSets(setRes.data || []);
        } catch (error) {
            console.error('Error fetching filters:', error);
        }
    };

    const fetchQuestions = async (search = '', type = 'all', subject = '', questionSet = '') => {
        setQLoading(true);
        try {
            const params = { search, limit: 100 };
            if (type !== 'all') params.type = type;
            if (subject) params.subject = subject;
            if (questionSet) params.questionSet = questionSet;

            const res = await superAdminService.getQuestions(params);
            setAvailableQuestions(res.data || []);
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setQLoading(false);
        }
    };

    const fetchCompetitions = async () => {
        try {
            setLoading(true);
            const response = await competitionService.getAllCompetitions({
                page: currentPage,
                limit: pageSize,
                search: searchTerm,
                status: statusFilter
            });
            const data = response.data || response;
            setCompetitions(data.data || []);
            setTotalPages(data.totalPages || 1);
            setTotalCompetitions(data.count || 0);
        } catch (error) {
            console.error('Error fetching competitions:', error);
            toast.error('Failed to load competitions');
        } finally {
            setLoading(false);
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
                    order: q.order
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
                duration: '',
                totalMarks: '',
                passingMarks: '',
                questions: [],
            });
        }
        setShowModal(true);
    };

    const toggleQuestion = (qId) => {
        const isSelected = formData.questions.some(q => q.questionId === qId);
        if (isSelected) {
            setFormData({
                ...formData,
                questions: formData.questions.filter(q => q.questionId !== qId)
            });
        } else {
            setFormData({
                ...formData,
                questions: [...formData.questions, { questionId: qId, order: formData.questions.length + 1 }]
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (isEditing) {
                await competitionService.updateCompetition(selectedComp._id, formData);
                toast.success('Competition updated successfully');
            } else {
                await competitionService.createCompetition(formData);
                toast.success('Competition created successfully');
            }
            setShowModal(false);
            fetchCompetitions();
        } catch (error) {
            console.error('Error saving competition:', error);
            toast.error(error.response?.data?.message || 'Failed to save competition');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this competition?')) {
            try {
                await competitionService.deleteCompetition(id);
                toast.success('Competition deleted successfully');
                fetchCompetitions();
            } catch (error) {
                console.error('Error deleting competition:', error);
                toast.error('Failed to delete competition');
            }
        }
    };

    const columns = [
        {
            header: 'Competition Name',
            accessor: 'title',
            render: (row) => (
                <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                        <FiSettings className="text-purple-600 w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-bold text-gray-900">{row.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{row.description}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Timeline',
            render: (row) => (
                <div className="text-sm space-y-1">
                    <div className="flex items-center text-gray-700">
                        <FiCalendar className="w-3 h-3 mr-1" />
                        {formatDateTime(row.startTime)}
                    </div>
                    <div className="flex items-center text-gray-500 italic">
                        <FiClock className="w-3 h-3 mr-1" />
                        {row.duration} mins
                    </div>
                </div>
            )
        },
        {
            header: 'Marks',
            render: (row) => (
                <div className="text-sm font-medium">
                    Total: <span className="text-primary-600">{row.totalMarks}</span>
                    <div className="text-xs text-gray-500">Pass: {row.passingMarks}</div>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <Badge variant={row.status === 'scheduled' ? 'success' : 'warning'}>
                    {row.status}
                </Badge>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => handleOpenModal(row)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <FiEdit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(row._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <FiTrash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    if (loading) return <Loader fullScreen />;

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Manage Competitions</h1>
                        <p className="mt-1 opacity-90">Design and oversee global hackathons and coding challenges</p>
                    </div>
                    <Button
                        className="bg-white text-purple-600 hover:bg-purple-50 border-none shadow-md"
                        size="lg"
                        onClick={() => handleOpenModal()}
                    >
                        <FiPlus className="mr-2 w-5 h-5" />
                        Create Competition
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-2">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search competitions by title..."
                        className="w-full pl-10 pr-4 py-2 border border-blue-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-4 py-2 border border-blue-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white shadow-sm min-w-[140px]"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                    <select
                        className="px-4 py-2 border border-blue-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white shadow-sm"
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        {[10, 25, 50, 100].map(size => (
                            <option key={size} value={size}>{size} per page</option>
                        ))}
                    </select>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-sm">
                {loading && competitions.length === 0 ? (
                    <div className="py-20 flex justify-center">
                        <Loader />
                    </div>
                ) : (
                    <>
                        <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
                            <Table
                                columns={columns}
                                data={competitions}
                                emptyMessage="No competitions found matching your search."
                            />
                        </div>

                        {totalCompetitions > 0 && (
                            <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="text-sm text-gray-600 font-medium">
                                    Showing <span className="text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * pageSize, totalCompetitions)}</span> of <span className="text-gray-900">{totalCompetitions}</span> competitions
                                </div>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Prev
                                    </button>

                                    <div className="flex gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-9 h-9 text-sm font-medium rounded-lg transition-all ${currentPage === i + 1
                                                    ? 'bg-primary-600 text-white shadow-md'
                                                    : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEditing ? 'Edit Competition' : 'Create New Competition'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    <Input
                        label="Competition Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="e.g., CodeRush 2024 / Global Hackathon"
                    />

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                        <textarea
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-none"
                            rows="4"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief overview of the competition..."
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Input
                            label="Duration (Mins)"
                            type="number"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            required
                        />
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

                    <div className="border-t pt-5">
                        <div className="flex flex-col gap-4 mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Select Questions ({formData.questions.length})</h3>

                            {/* Filtering UI */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <select
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={qType}
                                    onChange={(e) => {
                                        setQType(e.target.value);
                                        fetchQuestions(qSearch, e.target.value, qSubject, qQuestionSet);
                                    }}
                                >
                                    <option value="all">All Types</option>
                                    <option value="MCQ">MCQ</option>
                                    <option value="Coding">Coding</option>
                                    <option value="Descriptive">Descriptive</option>
                                    <option value="TrueFalse">True/False</option>
                                </select>

                                <select
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={qQuestionSet}
                                    onChange={(e) => {
                                        setQQuestionSet(e.target.value);
                                        fetchQuestions(qSearch, qType, qSubject, e.target.value);
                                    }}
                                >
                                    <option value="">All Folders</option>
                                    {questionSets.map(set => (
                                        <option key={set._id} value={set._id}>{set.name}</option>
                                    ))}
                                </select>

                                <select
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={qSubject}
                                    onChange={(e) => {
                                        setQSubject(e.target.value);
                                        fetchQuestions(qSearch, qType, e.target.value, qQuestionSet);
                                    }}
                                >
                                    <option value="">All Subjects</option>
                                    {subjects.map(sub => (
                                        <option key={sub._id} value={sub._id}>{sub.name}</option>
                                    ))}
                                </select>

                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={qSearch}
                                        onChange={(e) => {
                                            setQSearch(e.target.value);
                                            fetchQuestions(e.target.value, qType, qSubject, qQuestionSet);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y">
                            {qLoading ? (
                                <div className="p-4 text-center text-gray-500 italic">Searching questions...</div>
                            ) : availableQuestions.length > 0 ? (
                                availableQuestions.map((q) => {
                                    const isSelected = formData.questions.some(fq => fq.questionId === q._id);
                                    return (
                                        <div
                                            key={q._id}
                                            onClick={() => toggleQuestion(q._id)}
                                            className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary-50 border-primary-100' : ''}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{q.questionText}</p>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded uppercase font-bold">{q.type}</span>
                                                    <span className="text-[10px] text-gray-500">{q.marks} Marks</span>
                                                    {q.questionSet?.name && (
                                                        <span className="text-[10px] text-primary-600 font-medium">📁 {q.questionSet.name}</span>
                                                    )}
                                                    {q.subject?.name && (
                                                        <span className="text-[10px] text-purple-600 font-medium">🎓 {q.subject.name}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300'}`}>
                                                {isSelected && <FiCheck className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-4 text-center text-gray-500 italic">No questions found matching your search.</div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={submitting}>
                            {submitting ? 'Processing...' : isEditing ? 'Update Competition' : 'Create Competition'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminCompetitions;
