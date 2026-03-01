import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiUpload, FiFileText, FiSearch, FiCheckCircle } from 'react-icons/fi';
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
import { useAuth } from '@/context/AuthContext';
import { formatDateTime, getExamLiveStatus, getTimeRemainingText } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const Exams = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        description: '',
        startTime: '',
        endTime: '',
        duration: '',
        totalMarks: '',
        passingMarks: '',
        instructions: '',
        negativeMarkingEnabled: false,
        negativeMarks: 0,
        isRandomized: true,
        showResultsImmediately: true,
        proctoring: {
            enabled: true,
            enforceFullscreen: true,
            blockNotifications: false,
            tabSwitchingAllowed: true,
            maxTabSwitches: 3,
            maxFullscreenExits: 3,
            maxCopyPaste: 0,
            actionOnLimit: 'warn',
        }
    });

    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalExams, setTotalExams] = useState(0);
    const [selectedExams, setSelectedExams] = useState([]);

    useEffect(() => {
        fetchExams();
    }, [filterStatus, currentPage, pageSize, searchTerm]);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const params = {
                status: filterStatus || undefined,
                page: currentPage,
                limit: pageSize,
                search: searchTerm || undefined
            };
            const response = await facultyService.getExams(params);
            setExams(response.data || []);
            setTotalPages(response.totalPages || 1);
            setTotalExams(response.count || 0);
        } catch (error) {
            toast.error('Failed to load exams');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedExams.length} selected exams? This action cannot be undone.`)) return;
        try {
            setLoading(true);
            await facultyService.bulkDeleteExams(selectedExams);
            toast.success('Selected exams deleted successfully');
            setSelectedExams([]);
            fetchExams();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete selected exams');
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const response = await facultyService.getSubjects();
            setSubjects(response.data || []);
        } catch (error) {
            console.error('Failed to load subjects:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        if (name.startsWith('proctoring.')) {
            const field = name.split('.')[1];
            setFormData({
                ...formData,
                proctoring: {
                    ...formData.proctoring,
                    [field]: val
                }
            });
        } else {
            setFormData({ ...formData, [name]: val });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                duration: Number(formData.duration),
                totalMarks: Number(formData.totalMarks),
                passingMarks: Number(formData.passingMarks),
                negativeMarks: Number(formData.negativeMarks || 0),
            };

            if (editingExam) {
                await facultyService.updateExam(editingExam._id, payload);
                toast.success('Exam updated successfully');
            } else {
                await facultyService.createExam(payload);
                toast.success('Exam created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchExams();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (exam) => {
        setEditingExam(exam);
        setFormData({
            title: exam.title,
            subject: exam.subject?._id || exam.subject || '',
            description: exam.description || '',
            startTime: exam.startTime ? new Date(exam.startTime).toISOString().slice(0, 16) : '',
            endTime: exam.endTime ? new Date(exam.endTime).toISOString().slice(0, 16) : '',
            duration: exam.duration || '',
            totalMarks: exam.totalMarks || '',
            passingMarks: exam.passingMarks || '',
            instructions: exam.instructions || '',
            negativeMarkingEnabled: exam.negativeMarkingEnabled || false,
            negativeMarks: exam.negativeMarks || 0,
            isRandomized: exam.isRandomized !== false,
            showResultsImmediately: exam.showResultsImmediately !== false,
            proctoring: exam.proctoring || {
                enabled: false,
                enforceFullscreen: false,
                blockNotifications: false,
                tabSwitchingAllowed: true,
                maxTabSwitches: 3,
                maxFullscreenExits: 3,
                maxCopyPaste: 0,
                actionOnLimit: 'warn',
            }
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this exam?')) return;
        try {
            await facultyService.deleteExam(id);
            toast.success('Exam deleted successfully');
            fetchExams();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete exam');
        }
    };

    const handlePublish = async (id) => {
        if (!window.confirm('Are you sure you want to publish this exam?')) return;
        try {
            await facultyService.publishExam(id);
            toast.success('Exam published successfully');
            fetchExams();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to publish exam');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            subject: '',
            description: '',
            startTime: '',
            endTime: '',
            duration: '',
            totalMarks: '',
            passingMarks: '',
            instructions: '',
            negativeMarkingEnabled: false,
            negativeMarks: 0,
            isRandomized: true,
            showResultsImmediately: true,
            proctoring: {
                enabled: false,
                enforceFullscreen: false,
                blockNotifications: false,
                tabSwitchingAllowed: true,
                maxTabSwitches: 3,
                maxFullscreenExits: 3,
                maxCopyPaste: 0,
                actionOnLimit: 'warn',
            }
        });
        setEditingExam(null);
    };

    const columns = [
        { header: 'Title', accessor: 'title' },
        {
            header: 'Subject',
            render: (row) => row.subject?.name || 'N/A'
        },
        {
            header: 'Start Time',
            render: (row) => (
                <div>
                    <div className="text-sm">{formatDateTime(row.startTime)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{getTimeRemainingText(row)}</div>
                </div>
            )
        },
        {
            header: 'Status',
            render: (row) => {
                const { label, variant } = getExamLiveStatus(row);
                return <Badge variant={variant}>{label}</Badge>;
            }
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/dept-head/exams/${row._id}`)}
                    >
                        <FiEye className="w-4 h-4" />
                    </Button>
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
                    {(row.status === 'draft' || row.status === 'scheduled') && (
                        <Button
                            size="sm"
                            variant="success"
                            onClick={() => handlePublish(row._id)}
                        >
                            <FiUpload className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">Department Exam Management</h1>
                        <p className="text-blue-100 max-w-xl">Manage examinations for your department subjects</p>
                    </div>
                    <Button
                        className="bg-white text-blue-700 hover:bg-blue-50 border-none shadow-xl transition-all hover:scale-105"
                        size="lg"
                        onClick={() => { resetForm(); setShowModal(true); }}
                    >
                        <FiPlus className="w-5 h-5 mr-2" />
                        Create Exam
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search exams..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="px-4 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm bg-white min-w-[140px]"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            {selectedExams.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between animate-fade-in text-blue-900 font-bold text-sm mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                            {selectedExams.length}
                        </div>
                        <div>
                            <p>Exams Selected</p>
                            <p className="text-blue-700 text-xs font-normal">Bulk actions available for selected items</p>
                        </div>
                    </div>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="shadow-md hover:scale-105 transition-all"
                    >
                        <FiTrash2 className="w-4 h-4 mr-2" />
                        Delete Selected
                    </Button>
                </div>
            )}

            <Card className="overflow-hidden border-none shadow-sm">
                {loading && exams.length === 0 ? (
                    <div className="text-center py-20">
                        <Loader />
                    </div>
                ) : exams.length > 0 ? (
                    <>
                        <div className={`overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Table
                                columns={columns}
                                data={exams}
                                selectable={true}
                                selectedRows={selectedExams}
                                onSelectChange={setSelectedExams}
                            />
                        </div>

                        {totalExams > 0 && (
                            <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 p-4 rounded-b-xl border-t border-gray-100">
                                <div className="text-sm text-gray-600 font-medium">
                                    Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, totalExams)}</span> of <span className="text-gray-900 font-bold">{totalExams}</span> exams
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
                                                        ? 'bg-blue-600 text-white shadow-md'
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
                            <FiFileText className="text-gray-300 w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No exams found</h3>
                        <p className="text-gray-500 mt-1">Start by creating your first examination session</p>
                        <Button
                            className="mt-6 shadow-lg"
                            onClick={() => { resetForm(); setShowModal(true); }}
                        >
                            <FiPlus className="w-5 h-5 mr-2" />
                            Create Exam
                        </Button>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingExam ? 'Edit Exam' : 'Create Exam'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Exam Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />

                    <Select
                        label="Subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        options={[
                            { value: '', label: 'Select Subject' },
                            ...subjects.map(s => ({ value: s._id, label: s.name }))
                        ]}
                        required
                    />

                    <Textarea
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={2}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Start Time"
                            name="startTime"
                            type="datetime-local"
                            value={formData.startTime}
                            onChange={handleChange}
                            required
                        />

                        <Input
                            label="End Time"
                            name="endTime"
                            type="datetime-local"
                            value={formData.endTime}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input
                            label="Duration (min)"
                            name="duration"
                            type="number"
                            value={formData.duration}
                            onChange={handleChange}
                            required
                        />

                        <Input
                            label="Total Marks"
                            name="totalMarks"
                            type="number"
                            value={formData.totalMarks}
                            onChange={handleChange}
                            required
                        />

                        <Input
                            label="Passing Marks"
                            name="passingMarks"
                            type="number"
                            value={formData.passingMarks}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <Textarea
                        label="Instructions"
                        name="instructions"
                        value={formData.instructions}
                        onChange={handleChange}
                        rows={2}
                    />

                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="negativeMarkingEnabled"
                                checked={formData.negativeMarkingEnabled}
                                onChange={handleChange}
                                className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="text-sm text-gray-700 font-bold">Allow Negative Marking</span>
                        </label>

                        {formData.negativeMarkingEnabled && (
                            <Input
                                label="Penalty per Wrong Answer"
                                name="negativeMarks"
                                type="number"
                                step="0.25"
                                min="0"
                                value={formData.negativeMarks}
                                onChange={handleChange}
                            />
                        )}

                        <div className="flex flex-col gap-4 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isRandomized"
                                    checked={formData.isRandomized}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-primary-600 rounded"
                                />
                                <span className="text-sm text-gray-700 font-bold">Shuffle Questions</span>
                            </label>

                            {/* Proctoring Settings */}
                            <div className="border-t pt-4 mt-2">
                                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FiEye className="text-primary-600" />
                                    Proctoring & Security
                                </h4>

                                <div className="space-y-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold border-b pb-2 mb-2">
                                        <input
                                            type="checkbox"
                                            name="proctoring.enabled"
                                            checked={formData.proctoring.enabled}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <span className="text-sm text-gray-900">Enable Proctoring System</span>
                                    </label>

                                    {formData.proctoring.enabled && (
                                        <div className="space-y-4 pl-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="proctoring.enforceFullscreen"
                                                        checked={formData.proctoring.enforceFullscreen}
                                                        onChange={handleChange}
                                                        className="w-4 h-4 text-primary-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700 font-bold">Enforce Fullscreen</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="proctoring.blockNotifications"
                                                        checked={formData.proctoring.blockNotifications}
                                                        onChange={handleChange}
                                                        className="w-4 h-4 text-primary-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700 font-bold">Block Notifications</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="proctoring.tabSwitchingAllowed"
                                                        checked={formData.proctoring.tabSwitchingAllowed}
                                                        onChange={handleChange}
                                                        className="w-4 h-4 text-primary-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700 font-bold">Allow Tab Switching</span>
                                                </label>
                                            </div>

                                            {(!formData.proctoring.tabSwitchingAllowed || formData.proctoring.enforceFullscreen) && (
                                                <div className="grid grid-cols-1 gap-4 pt-2 border-t mt-2">
                                                    <Select
                                                        label="Action on Limit"
                                                        name="proctoring.actionOnLimit"
                                                        value={formData.proctoring.actionOnLimit}
                                                        onChange={handleChange}
                                                        options={[
                                                            { value: 'warn', label: 'Warn Only' },
                                                            { value: 'auto-submit', label: 'Auto Submit' },
                                                            { value: 'lock', label: 'Lock Exam' },
                                                        ]}
                                                    />
                                                </div>
                                            )}

                                            {(formData.proctoring.enforceFullscreen || !formData.proctoring.tabSwitchingAllowed) && (
                                                <div className="grid grid-cols-3 gap-4 pb-2">
                                                    {!formData.proctoring.tabSwitchingAllowed && (
                                                        <Input
                                                            label="Max Tab Switches"
                                                            name="proctoring.maxTabSwitches"
                                                            type="number"
                                                            min="0"
                                                            value={formData.proctoring.maxTabSwitches}
                                                            onChange={handleChange}
                                                        />
                                                    )}
                                                    {formData.proctoring.enforceFullscreen && (
                                                        <Input
                                                            label="Max FS Exits"
                                                            name="proctoring.maxFullscreenExits"
                                                            type="number"
                                                            min="0"
                                                            value={formData.proctoring.maxFullscreenExits}
                                                            onChange={handleChange}
                                                        />
                                                    )}
                                                    <Input
                                                        label="Max Copy-Paste"
                                                        name="proctoring.maxCopyPaste"
                                                        type="number"
                                                        min="0"
                                                        value={formData.proctoring.maxCopyPaste || 0}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Results always manual publication footer */}
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-2 mt-2">
                                <FiCheckCircle className="text-blue-600 w-4 h-4" />
                                <span className="text-xs text-blue-800 font-medium italic">Results will require manual publication.</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setShowModal(false); resetForm(); }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingExam ? 'Update' : 'Create'} Exam
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Exams;
