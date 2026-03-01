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
import { facultyService, collegeAdminService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime, getExamLiveStatus, getTimeRemainingText } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const Exams = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        departmentId: '',
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
    });

    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalExams, setTotalExams] = useState(0);

    useEffect(() => {
        fetchExams();
    }, [filterStatus, currentPage, pageSize, searchTerm]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const deptsRes = await collegeAdminService.getDepartments({ limit: 100 });
            setDepartments(deptsRes.data || []);
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    };

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

    const fetchSubjects = async (deptId) => {
        if (!deptId) {
            setSubjects([]);
            return;
        }
        try {
            const response = await facultyService.getSubjects({ departmentId: deptId });
            setSubjects(response.data || []);
        } catch (error) {
            console.error('Failed to load subjects:', error);
        }
    };

    const handleDepartmentChange = (e) => {
        const deptId = e.target.value;
        setFormData({ ...formData, departmentId: deptId, subject: '' });
        fetchSubjects(deptId);
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
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
        const deptId = exam.departmentId?._id || exam.departmentId || '';
        if (deptId) fetchSubjects(deptId);

        setFormData({
            title: exam.title,
            departmentId: deptId,
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
            departmentId: '',
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
        });
        setEditingExam(null);
        setSubjects([]);
    };

    const columns = [
        { header: 'Title', accessor: 'title' },
        {
            header: 'Department',
            render: (row) => row.departmentId?.name || 'N/A'
        },
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
                        onClick={() => navigate(`/admin/exams/${row._id}`)}
                    >
                        <FiEye className="w-4 h-4" />
                    </Button>
                    {(row.status === 'draft' || row.status === 'scheduled') && (
                        <>
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
                            <Button
                                size="sm"
                                variant="success"
                                onClick={() => handlePublish(row._id)}
                            >
                                <FiUpload className="w-4 h-4" />
                            </Button>
                        </>
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
                        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">College Exam Management</h1>
                        <p className="text-blue-100 max-w-xl">Manage examinations across all departments in your college</p>
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

            <Card className="overflow-hidden border-none shadow-sm">
                {loading && exams.length === 0 ? (
                    <div className="text-center py-20">
                        <Loader />
                    </div>
                ) : (
                    <div className={`overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Table columns={columns} data={exams} />
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

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Department"
                            name="departmentId"
                            value={formData.departmentId}
                            onChange={handleDepartmentChange}
                            options={[
                                { value: '', label: 'Select Department' },
                                ...departments.map(d => ({ value: d._id, label: d.name }))
                            ]}
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
                            disabled={!formData.departmentId}
                            required
                        />
                    </div>

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

                        <div className="flex gap-4 pt-1">
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

                        {/* Results now always require manual publication as per new security requirement */}
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-2">
                            <FiCheckCircle className="text-blue-600 w-4 h-4" />
                            <span className="text-xs text-blue-800 font-medium">Results will require manual publication after the exam ends.</span>
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
