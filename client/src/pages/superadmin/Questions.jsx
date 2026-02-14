import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiFilter, FiHelpCircle, FiSearch, FiCheck, FiX, FiCode, FiList, FiCheckCircle, FiFileText, FiFolder, FiChevronRight, FiGrid, FiArrowLeft, FiUpload, FiDownload } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import Textarea from '@/components/common/Textarea.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';

const AdminQuestions = () => {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [questionSets, setQuestionSets] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Folder View States
    const [viewMode, setViewMode] = useState('folders'); // 'folders' or 'questions'
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [folderType, setFolderType] = useState('set'); // 'subject' or 'set'

    const [folderData, setFolderData] = useState({ name: '', description: '' });

    const [formData, setFormData] = useState({
        questionText: '',
        type: 'MCQ',
        difficulty: 'medium',
        marks: 1,
        negativeMarks: 0,
        subject: '',
        questionSet: '',
        explanation: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        idealAnswer: '',
        programmingLanguage: 'javascript',
        codeSnippet: '',
        testCases: [{ input: '', expectedOutput: '' }],
    });

    const [filters, setFilters] = useState({
        type: '',
        difficulty: '',
        subject: '',
        questionSet: '',
        search: '',
        page: 1,
        limit: 20
    });

    const [totalQuestions, setTotalQuestions] = useState(0);
    const [totalQuestionPages, setTotalQuestionPages] = useState(1);

    // Question Set Pagination
    const [setPage, setSetPage] = useState(1);
    const [totalSetPages, setTotalSetPages] = useState(1);
    const [setsLoading, setSetsLoading] = useState(false);

    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        fetchQuestionSets();
    }, [setPage]);

    useEffect(() => {
        if (viewMode === 'questions') {
            fetchQuestions();
        }
    }, [filters, viewMode]);

    const fetchSubjects = async () => {
        try {
            const subRes = await superAdminService.getSubjects();
            setSubjects(subRes.data || []);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchQuestionSets = async () => {
        try {
            setSetsLoading(true);
            const response = await superAdminService.getQuestionSets({ page: setPage, limit: 12 });
            setQuestionSets(response.data || []);
            setTotalSetPages(response.totalPages || 1);
        } catch (error) {
            console.error('Error fetching question sets:', error);
        } finally {
            setSetsLoading(false);
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchSubjects(), fetchQuestionSets()]);
        } catch (error) {
            console.error('Error in initial fetch:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await superAdminService.getQuestions(filters);
            setQuestions(response.data || []);
            setTotalQuestionPages(response.totalPages || 1);
            setTotalQuestions(response.count || 0);
        } catch (error) {
            toast.error('Failed to load questions');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFolderClick = (item, type) => {
        const isGlobal = item === 'global';
        setSelectedFolder(isGlobal ? { name: 'Global Library', _id: '' } : item);
        setFolderType(type);

        const newFilters = { ...filters, subject: '', questionSet: '', search: '', page: 1 };
        if (!isGlobal) {
            if (type === 'subject') newFilters.subject = item._id;
            else newFilters.questionSet = item._id;
        }

        setFilters(newFilters);
        setViewMode('questions');
    };

    const resetView = () => {
        setViewMode('folders');
        setSelectedFolder(null);
        setFilters({ ...filters, subject: '', questionSet: '', search: '', page: 1 });
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await superAdminService.createQuestionSet(folderData);
            setShowFolderModal(false);
            setFolderData({ name: '', description: '' });
            await fetchQuestionSets();
            toast.success('Folder created successfully');
        } catch (error) {
            toast.error('Failed to create folder');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteFolder = async (folderId, folderName) => {
        if (!window.confirm(`Delete folder "${folderName}"?\n\nAll questions in this folder will be moved to Unassigned.`)) return;
        try {
            await superAdminService.deleteQuestionSet(folderId);
            toast.success('Folder deleted successfully');
            await fetchQuestionSets();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete folder');
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

    const handleTestCaseChange = (index, field, value) => {
        const newTestCases = [...formData.testCases];
        newTestCases[index][field] = value;
        setFormData({ ...formData, testCases: newTestCases });
    };

    const addTestCase = () => {
        setFormData({
            ...formData,
            testCases: [...formData.testCases, { input: '', expectedOutput: '' }]
        });
    };

    const removeTestCase = (index) => {
        const newTestCases = formData.testCases.filter((_, i) => i !== index);
        setFormData({ ...formData, testCases: newTestCases });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                marks: Number(formData.marks),
                negativeMarks: Number(formData.negativeMarks),
            };

            if (!payload.subject) delete payload.subject;
            if (!payload.questionSet) delete payload.questionSet;

            if (formData.type === 'MCQ') {
                payload.options = formData.options.map((text, idx) => ({
                    text,
                    isCorrect: idx === Number(formData.correctAnswer)
                }));
            } else if (formData.type === 'TrueFalse') {
                payload.options = [
                    { text: 'True', isCorrect: formData.correctAnswer === 'true' },
                    { text: 'False', isCorrect: formData.correctAnswer === 'false' }
                ];
            } else if (formData.type === 'Descriptive') {
                payload.correctAnswer = formData.idealAnswer;
            }

            if (editingQuestion) {
                await superAdminService.updateQuestion(editingQuestion._id, payload);
                toast.success('Question updated successfully');
            } else {
                await superAdminService.createQuestion(payload);
                toast.success('Question added to bank');
            }
            setShowModal(false);
            resetForm();
            fetchQuestions();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save question');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (q) => {
        setEditingQuestion(q);
        const data = {
            questionText: q.questionText,
            type: q.type,
            difficulty: q.difficulty,
            marks: q.marks,
            negativeMarks: q.negativeMarks || 0,
            subject: q.subject?._id || q.subject || '',
            questionSet: q.questionSet?._id || q.questionSet || '',
            explanation: q.explanation || '',
            options: q.options?.map(o => o.text) || ['', '', '', ''],
            correctAnswer: q.type === 'TrueFalse'
                ? (q.options?.find(o => o.isCorrect)?.text.toLowerCase() || 'true')
                : (q.options?.findIndex(o => o.isCorrect) ?? 0),
            idealAnswer: q.correctAnswer || '',
            programmingLanguage: q.programmingLanguage || 'javascript',
            codeSnippet: q.codeSnippet || '',
            testCases: q.testCases?.length ? q.testCases : [{ input: '', expectedOutput: '' }],
        };
        setFormData(data);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this question permanently?')) return;
        try {
            await superAdminService.deleteQuestion(id);
            toast.success('Question removed');
            fetchQuestions();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);
        if (selectedFolder && selectedFolder._id) {
            if (folderType === 'subject') uploadData.append('subjectId', selectedFolder._id);
            else uploadData.append('questionSetId', selectedFolder._id);
        }

        try {
            setUploading(true);
            const res = await superAdminService.bulkUploadQuestions(uploadData);
            toast.success(res.message || 'Questions uploaded successfully');
            if (viewMode === 'questions') await fetchQuestions();
            else await fetchInitialData();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || 'Bulk upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ["questionText", "type", "marks", "difficulty", "correctAnswerIndex", "option1", "option2", "option3", "option4", "explanation"];
        const example = ["What is the capital of France?", "MCQ", "1", "easy", "0", "Paris", "London", "Berlin", "Madrid", "Paris is the capital."];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + example.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "question_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetForm = () => {
        setFormData({
            questionText: '',
            type: 'MCQ',
            difficulty: 'medium',
            marks: 1,
            negativeMarks: 0,
            subject: folderType === 'subject' ? (selectedFolder?._id || '') : '',
            questionSet: folderType === 'set' ? (selectedFolder?._id || '') : '',
            explanation: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            idealAnswer: '',
            programmingLanguage: 'javascript',
            codeSnippet: '',
            testCases: [{ input: '', expectedOutput: '' }],
        });
        setEditingQuestion(null);
    };

    const getDifficultyBadge = (d) => {
        const variants = { easy: 'success', medium: 'warning', hard: 'danger' };
        return <Badge variant={variants[d] || 'neutral'}>{d.toUpperCase()}</Badge>;
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'MCQ': return <FiList className="text-blue-500" />;
            case 'Coding': return <FiCode className="text-purple-500" />;
            case 'TrueFalse': return <FiCheckCircle className="text-green-500" />;
            default: return <FiFileText className="text-gray-500" />;
        }
    };

    const columns = [
        {
            header: 'Question',
            render: (row) => (
                <div className="flex items-start gap-3">
                    <div className="mt-1">{getTypeIcon(row.type)}</div>
                    <div className="max-w-xs lg:max-w-md">
                        <p className="font-medium text-gray-900 truncate" title={row.questionText}>{row.questionText}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {row.questionSet?.name ? `📁 ${row.questionSet.name}` : (row.subject?.name || 'Global Library')}
                        </p>
                    </div>
                </div>
            )
        },
        { header: 'Type', accessor: 'type' },
        { header: 'Difficulty', render: (row) => getDifficultyBadge(row.difficulty) },
        { header: 'Marks', render: (row) => <span className="font-semibold">{row.marks}</span> },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex gap-2">
                    <button onClick={() => handleEdit(row)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <FiEdit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(row._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <FiTrash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Library Manager</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span className="hover:text-primary-600 cursor-pointer transition-colors" onClick={resetView}>Question Bank</span>
                        {selectedFolder && (
                            <>
                                <FiChevronRight className="text-gray-300" />
                                <span className="text-gray-900 font-medium">{selectedFolder.name}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleBulkUpload}
                        className="hidden"
                        accept=".csv"
                    />
                    <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 sm:flex-none border-primary-200 hover:border-primary-500"
                        loading={uploading}
                    >
                        <FiUpload className="mr-2" /> Bulk Import
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleDownloadTemplate}
                        className="flex-1 sm:flex-none border-gray-200"
                    >
                        <FiDownload className="mr-2" /> Template
                    </Button>
                    <Button variant="secondary" onClick={() => setShowFolderModal(true)} className="flex-1 sm:flex-none hidden md:flex">
                        <FiPlus className="mr-2" /> New Folder
                    </Button>
                    <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex-1 sm:flex-none shadow-lg shadow-primary-100">
                        <FiPlus className="mr-2" /> Add Question
                    </Button>
                </div>
            </div>

            {/* Folder View vs Question List */}
            {viewMode === 'folders' ? (
                <div className="space-y-8">
                    {/* Manual Question Sets */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <FiFolder className="text-primary-500" /> Custom Folders
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {/* Global Folder */}
                            <div
                                onClick={() => handleFolderClick('global', 'set')}
                                className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border-2 border-transparent hover:border-primary-500 hover:shadow-xl hover:shadow-primary-50 transition-all cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                                    <FiFolder className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
                                </div>
                                <span className="text-sm font-bold text-gray-700 group-hover:text-primary-700">Unassigned</span>
                            </div>

                            {/* Question Set Folders */}
                            {questionSets.map((set) => (
                                <div
                                    key={set._id}
                                    className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border-2 border-transparent hover:border-primary-500 hover:shadow-xl hover:shadow-primary-50 transition-all cursor-pointer"
                                    onClick={() => handleFolderClick(set, 'set')}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFolder(set._id, set.name);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all z-10"
                                        title="Delete folder"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                    <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                                        <FiFolder className="w-8 h-8 text-primary-500" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-primary-700 text-center line-clamp-2">{set.name}</span>
                                </div>
                            ))}
                        </div>
                        {totalSetPages > 1 && (
                            <div className="mt-8 flex justify-center items-center gap-2">
                                <button
                                    onClick={() => setSetPage(p => Math.max(1, p - 1))}
                                    disabled={setPage === 1}
                                    className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    <FiArrowLeft />
                                </button>
                                <span className="text-sm text-gray-600 font-medium">Page {setPage} of {totalSetPages}</span>
                                <button
                                    onClick={() => setSetPage(p => Math.min(totalSetPages, p + 1))}
                                    disabled={setPage === totalSetPages}
                                    className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    <FiChevronRight />
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Academic Subjects */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <FiGrid className="text-purple-500" /> Academic Subjects
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                            {subjects.map((sub) => (
                                <div
                                    key={sub._id}
                                    onClick={() => handleFolderClick(sub, 'subject')}
                                    className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 border-2 border-transparent hover:border-purple-500 transition-all cursor-pointer"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center group-hover:bg-purple-50 transition-colors shadow-sm">
                                        <FiFolder className="w-8 h-8 text-purple-400 group-hover:text-purple-600" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-purple-700 text-center line-clamp-2">{sub.name}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            ) : (
                <Card className="border-none shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button onClick={resetView} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all text-gray-500">
                                <FiArrowLeft />
                            </button>
                            <div className="relative flex-1 md:w-80">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search in folder..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                            <select
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                                value={filters.limit}
                                onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}
                            >
                                {[20, 50, 100, 500].map(size => (
                                    <option key={size} value={size}>{size} per page</option>
                                ))}
                            </select>
                            <Select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                                options={[
                                    { value: '', label: 'All Types' },
                                    { value: 'MCQ', label: 'MCQ' },
                                    { value: 'Coding', label: 'Coding' },
                                    { value: 'Descriptive', label: 'Descriptive' },
                                    { value: 'TrueFalse', label: 'T/F' },
                                ]}
                                className="bg-white min-w-[120px]"
                            />
                            <Select
                                value={filters.difficulty}
                                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value, page: 1 })}
                                options={[
                                    { value: '', label: 'Difficulty' },
                                    { value: 'easy', label: 'Easy' },
                                    { value: 'medium', label: 'Medium' },
                                    { value: 'hard', label: 'Hard' },
                                ]}
                                className="bg-white min-w-[120px]"
                            />
                        </div>
                    </div>
                    {loading && questions.length === 0 ? (
                        <div className="py-20 flex justify-center"><Loader /></div>
                    ) : questions.length > 0 ? (
                        <>
                            <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
                                <Table columns={columns} data={questions} />
                            </div>

                            <div className="mt-6 flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 gap-4">
                                <div className="text-sm text-gray-600 font-medium">
                                    Displaying <span className="text-gray-900 font-bold">{(filters.page - 1) * filters.limit + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(filters.page * filters.limit, totalQuestions)}</span> of <span className="text-gray-900 font-bold">{totalQuestions}</span> questions
                                </div>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                                        disabled={filters.page === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Prev
                                    </button>

                                    <div className="flex gap-1">
                                        {[...Array(Math.min(5, totalQuestionPages))].map((_, i) => {
                                            let pageNum;
                                            if (totalQuestionPages <= 5) pageNum = i + 1;
                                            else if (filters.page <= 3) pageNum = i + 1;
                                            else if (filters.page >= totalQuestionPages - 2) pageNum = totalQuestionPages - 4 + i;
                                            else pageNum = filters.page - 2 + i;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setFilters({ ...filters, page: pageNum })}
                                                    className={`w-9 h-9 text-sm font-medium rounded-lg transition-all ${filters.page === pageNum
                                                        ? 'bg-primary-600 text-white shadow-md'
                                                        : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setFilters({ ...filters, page: Math.min(totalQuestionPages, filters.page + 1) })}
                                        disabled={filters.page === totalQuestionPages}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiHelpCircle className="text-gray-300 w-10 h-10" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Empty folder</h3>
                            <p className="text-gray-500">No questions match your current filters in this category.</p>
                            <Button variant="secondary" onClick={() => { resetForm(); setShowModal(true); }} className="mt-4">
                                Add First Question
                            </Button>
                        </div>
                    )}
                </Card>
            )}

            {/* Folder Creation Modal */}
            <Modal
                isOpen={showFolderModal}
                onClose={() => setShowFolderModal(false)}
                title="Create New Folder"
                size="md"
            >
                <form onSubmit={handleCreateFolder} className="space-y-4">
                    <Input
                        label="Folder Name"
                        placeholder="e.g., Coding Challenge Set A"
                        value={folderData.name}
                        onChange={(e) => setFolderData({ ...folderData, name: e.target.value })}
                        required
                    />
                    <Textarea
                        label="Description (Optional)"
                        placeholder="Purpose of this folder..."
                        value={folderData.description}
                        onChange={(e) => setFolderData({ ...folderData, description: e.target.value })}
                        rows={3}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowFolderModal(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? <Loader size="sm" /> : 'Create Folder'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Question Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingQuestion ? 'Edit Question' : 'Add New Question'}
                size="2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Type"
                            name="type"
                            value={formData.type}
                            onChange={(e) => {
                                setFormData({ ...formData, type: e.target.value, correctAnswer: e.target.value === 'TrueFalse' ? 'true' : 0 });
                            }}
                            options={[
                                { value: 'MCQ', label: 'MCQ' },
                                { value: 'TrueFalse', label: 'True/False' },
                                { value: 'Descriptive', label: 'Descriptive' },
                                { value: 'Coding', label: 'Coding' },
                            ]}
                            required
                        />
                        <Select
                            label="Folder (Set)"
                            name="questionSet"
                            value={formData.questionSet}
                            onChange={handleChange}
                            options={[
                                { value: '', label: 'Unassigned' },
                                ...questionSets.map(s => ({ value: s._id, label: s.name }))
                            ]}
                        />
                        <Select
                            label="Academic Subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            options={[
                                { value: '', label: 'None' },
                                ...subjects.map(s => ({ value: s._id, label: s.name }))
                            ]}
                        />
                    </div>

                    <Textarea
                        label="Question Text"
                        name="questionText"
                        value={formData.questionText}
                        onChange={handleChange}
                        placeholder="Type your question here..."
                        rows={4}
                        required
                    />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                            value={formData.marks}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Negative Marks"
                            name="negativeMarks"
                            type="number"
                            value={formData.negativeMarks}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Type Specific Fields */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        {formData.type === 'MCQ' && (
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Options & Correct Answer</label>
                                {formData.options.map((opt, idx) => (
                                    <div key={idx} className="flex gap-3 items-center">
                                        <input
                                            type="radio"
                                            name="correctAnswer"
                                            checked={Number(formData.correctAnswer) === idx}
                                            onChange={() => setFormData({ ...formData, correctAnswer: idx })}
                                            className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                        />
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                                            placeholder={`Option ${idx + 1}`}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {formData.type === 'TrueFalse' && (
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Select Correct Statement</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.correctAnswer === 'true'}
                                            onChange={() => setFormData({ ...formData, correctAnswer: 'true' })}
                                        /> True
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.correctAnswer === 'false'}
                                            onChange={() => setFormData({ ...formData, correctAnswer: 'false' })}
                                        /> False
                                    </label>
                                </div>
                            </div>
                        )}

                        {formData.type === 'Descriptive' && (
                            <div className="space-y-4">
                                <Textarea
                                    label="Ideal/Sample Answer (for grading reference)"
                                    name="idealAnswer"
                                    value={formData.idealAnswer}
                                    onChange={handleChange}
                                    placeholder="Explain how this question should be answered..."
                                    rows={3}
                                />
                            </div>
                        )}

                        {formData.type === 'Coding' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Select
                                        label="Language"
                                        name="programmingLanguage"
                                        value={formData.programmingLanguage}
                                        onChange={handleChange}
                                        options={[
                                            { value: 'javascript', label: 'JavaScript' },
                                            { value: 'python', label: 'Python' },
                                            { value: 'java', label: 'Java' },
                                            { value: 'cpp', label: 'C++' },
                                        ]}
                                    />
                                </div>
                                <Textarea
                                    label="Starter Code / Template"
                                    name="codeSnippet"
                                    value={formData.codeSnippet}
                                    onChange={handleChange}
                                    placeholder="function solution() { ... }"
                                    rows={4}
                                    className="font-mono text-xs"
                                />
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-gray-700">Test Cases</label>
                                        <button type="button" onClick={addTestCase} className="text-xs text-primary-600 font-bold hover:underline">+ Add Case</button>
                                    </div>
                                    {formData.testCases.map((tc, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white rounded-xl border relative">
                                            {formData.testCases.length > 1 && (
                                                <button type="button" onClick={() => removeTestCase(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity">
                                                    <FiX />
                                                </button>
                                            )}
                                            <input
                                                placeholder="Input"
                                                className="px-2 py-1 text-xs border-b outline-none"
                                                value={tc.input}
                                                onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                                            />
                                            <input
                                                placeholder="Expected Output"
                                                className="px-2 py-1 text-xs border-b outline-none"
                                                value={tc.expectedOutput}
                                                onChange={(e) => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Textarea
                        label="Explanation for Students"
                        name="explanation"
                        value={formData.explanation}
                        onChange={handleChange}
                        placeholder="Help students understand the answer after the exam..."
                        rows={2}
                    />

                    <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                        <Button type="button" variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? <Loader size="sm" /> : editingQuestion ? 'Update Question' : 'Save to Bank'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminQuestions;
