import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiUpload, FiFileText, FiSearch, FiFilter } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import Textarea from '@/components/common/Textarea.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { facultyService, superAdminService } from '@/services';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const SuperAdminExams = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState([]);
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]); // All departments or filtered
    const [subjects, setSubjects] = useState([]); // All subjects or filtered
    const [modalDepartments, setModalDepartments] = useState([]);
    const [modalSubjects, setModalSubjects] = useState([]);

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
        allowNegativeMarking: false,
        negativeMarks: 0,
        shuffleQuestions: true,
        showResults: true,
        collegeId: '',
        departmentId: '',
        contributingColleges: [],
    });

    // Pagination & Search & Filter state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalExams, setTotalExams] = useState(0);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCollege, setFilterCollege] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchExams();
    }, [filterStatus, filterCollege, filterDepartment, currentPage, pageSize, searchTerm]);

    const fetchInitialData = async () => {
        try {
            const collegesRes = await superAdminService.getColleges({ limit: 100 });
            setColleges(collegesRes.data || []);

            // We fetch all subjects for lookup/mapping if needed, or lazy load
            const subjectsRes = await superAdminService.getSubjects();
            setSubjects(subjectsRes.data || []);
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    };

    const fetchExams = async () => {
        try {
            setLoading(true);
            const params = {
                status: filterStatus || undefined,
                collegeId: filterCollege || undefined,
                departmentId: filterDepartment || undefined,
                page: currentPage,
                limit: pageSize,
                search: searchTerm || undefined
            };
            const response = await superAdminService.getExams(params);
            setExams(response.data || []);
            setTotalPages(response.totalPages || 1);
            setTotalExams(response.count || 0);
        } catch (error) {
            toast.error('Failed to load exams');
        } finally {
            setLoading(false);
        }
    };

    const handleCollegeChange = (e) => {
        const collegeId = e.target.value;
        setFilterCollege(collegeId);
        setFilterDepartment('');
        setCurrentPage(1);

        if (collegeId) {
            const college = colleges.find(c => c._id === collegeId);
            setDepartments(college?.departments || []);
        } else {
            setDepartments([]);
        }
    };

    const handleModalCollegeChange = (e) => {
        const collegeId = e.target.value;
        setFormData({ ...formData, collegeId, departmentId: '', subject: '' });

        if (collegeId) {
            const college = colleges.find(c => c._id === collegeId);
            setModalDepartments(college?.departments || []);
        } else {
            setModalDepartments([]);
        }
        setModalSubjects([]);
    };

    const handleModalDepartmentChange = (e) => {
        const departmentId = e.target.value;
        setFormData({ ...formData, departmentId, subject: '' });

        if (departmentId) {
            // Filter global subjects by departmentId
            const filtered = subjects.filter(s => s.departmentId?._id === departmentId || s.departmentId === departmentId);
            setModalSubjects(filtered);
        } else {
            setModalSubjects([]);
        }
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingExam) {
                await facultyService.updateExam(editingExam._id, formData);
                toast.success('Exam updated successfully');
            } else {
                await facultyService.createExam(formData);
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

        // Setup departments and subjects for the modal
        if (exam.collegeId) {
            const college = colleges.find(c => (c._id === (exam.collegeId?._id || exam.collegeId)));
            setModalDepartments(college?.departments || []);
        }

        if (exam.departmentId) {
            const depId = exam.departmentId?._id || exam.departmentId;
            const filtered = subjects.filter(s => (s.departmentId?._id || s.departmentId) === depId);
            setModalSubjects(filtered);
        }

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
            allowNegativeMarking: exam.allowNegativeMarking || false,
            negativeMarks: exam.negativeMarks || 0,
            shuffleQuestions: exam.shuffleQuestions !== false,
            showResults: exam.showResults !== false,
            collegeId: exam.collegeId?._id || exam.collegeId || '',
            departmentId: exam.departmentId?._id || exam.departmentId || '',
            contributingColleges: exam.contributingColleges?.map(c => c._id || c) || [],
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
            allowNegativeMarking: false,
            negativeMarks: 0,
            shuffleQuestions: true,
            showResults: true,
            collegeId: '',
            departmentId: '',
            contributingColleges: [],
        });
        setEditingExam(null);
        setModalDepartments([]);
        setModalSubjects([]);
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            draft: { variant: 'secondary', label: 'Draft' },
            scheduled: { variant: 'warning', label: 'Scheduled' },
            ongoing: { variant: 'info', label: 'Ongoing' },
            completed: { variant: 'success', label: 'Completed' },
            cancelled: { variant: 'danger', label: 'Cancelled' },
        };
        const config = statusMap[status] || statusMap.draft;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const columns = [
        { header: 'Title', accessor: 'title' },
        {
            header: 'College',
            render: (row) => row.collegeId?.collegeName || 'N/A'
        },
        {
            header: 'Dept',
            render: (row) => row.departmentId?.name || 'N/A'
        },
        {
            header: 'Subject',
            render: (row) => row.subject?.name || 'N/A'
        },
        {
            header: 'Start Time',
            render: (row) => formatDateTime(row.startTime)
        },
        {
            header: 'Duration',
            render: (row) => `${row.duration} min`
        },
        {
            header: 'Status',
            render: (row) => getStatusBadge(row.status)
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/super-admin/exams/${row._id}`)}
                        title="View Details"
                    >
                        <FiEye className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleEdit(row)}
                        title="Edit Exam"
                    >
                        <FiEdit className="w-4 h-4" />
                    </Button>
                    {row.status === 'draft' && (
                        <>
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDelete(row._id)}
                                title="Delete Exam"
                            >
                                <FiTrash2 className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="success"
                                onClick={() => handlePublish(row._id)}
                                title="Publish Exam"
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
                        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">Global Exam Management</h1>
                        <p className="text-blue-100 max-w-xl">Manage and monitor examinations across all registered institutions</p>
                    </div>
                    <Button
                        className="bg-white text-blue-700 hover:bg-blue-50 border-none shadow-xl transition-all hover:scale-105"
                        size="lg"
                        onClick={() => { resetForm(); setShowModal(true); }}
                    >
                        <FiPlus className="w-5 h-5 mr-2" />
                        Create New Exam
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search exams by title..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        className="px-4 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm bg-white min-w-[150px]"
                        value={filterCollege}
                        onChange={handleCollegeChange}
                    >
                        <option value="">All Colleges</option>
                        {colleges.map(c => <option key={c._id} value={c._id}>{c.collegeName}</option>)}
                    </select>

                    <select
                        className="px-4 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm bg-white min-w-[150px]"
                        value={filterDepartment}
                        onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
                        disabled={!filterCollege}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>

                    <select
                        className="px-4 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm bg-white min-w-[130px]"
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-sm">
                {loading && exams.length === 0 ? (
                    <div className="text-center py-20">
                        <Loader />
                    </div>
                ) : exams.length > 0 ? (
                    <>
                        <div className={`overflow-x-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Table columns={columns} data={exams} />
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
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <p className="text-gray-500 mt-1">Try adjusting your filters or create a new exam session</p>
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
                            label="College"
                            name="collegeId"
                            value={formData.collegeId}
                            onChange={handleModalCollegeChange}
                            options={[
                                { value: '', label: 'Select' },
                                ...colleges.map(c => ({ value: c._id, label: c.collegeName }))
                            ]}
                            required
                        />

                        <Select
                            label="Department"
                            name="departmentId"
                            value={formData.departmentId}
                            onChange={handleModalDepartmentChange}
                            options={[
                                { value: '', label: 'Select' },
                                ...modalDepartments.map(d => ({ value: d._id, label: d.name }))
                            ]}
                            disabled={!formData.collegeId}
                            required
                        />
                    </div>

                    <Select
                        label="Subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        options={[
                            { value: '', label: 'Select' },
                            ...modalSubjects.map(s => ({ value: s._id, label: s.name }))
                        ]}
                        disabled={!formData.departmentId}
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

                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="allowNegativeMarking"
                                checked={formData.allowNegativeMarking}
                                onChange={handleChange}
                                className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="text-sm text-gray-700 font-medium">Allow Negative Marking</span>
                        </label>

                        {formData.allowNegativeMarking && (
                            <Input
                                label="Penalty per Wrong Answer"
                                name="negativeMarks"
                                type="number"
                                step="0.25"
                                value={formData.negativeMarks}
                                onChange={handleChange}
                            />
                        )}

                        <div className="flex flex-wrap gap-4 pt-1">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="shuffleQuestions"
                                    checked={formData.shuffleQuestions}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-primary-600 rounded"
                                />
                                <span className="text-sm text-gray-700 font-medium">Shuffle Questions</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="showResults"
                                    checked={formData.showResults}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-primary-600 rounded"
                                />
                                <span className="text-sm text-gray-700 font-medium">Show Results After Submission</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700">Contributing Colleges</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-48 overflow-y-auto">
                            {colleges.map((college) => (
                                <label key={college._id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-all cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.contributingColleges.includes(college._id)}
                                        onChange={(e) => {
                                            const updated = e.target.checked
                                                ? [...formData.contributingColleges, college._id]
                                                : formData.contributingColleges.filter(id => id !== college._id);
                                            setFormData({ ...formData, contributingColleges: updated });
                                        }}
                                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                    />
                                    <span className="text-xs font-semibold text-gray-600 group-hover:text-primary-700 truncate">
                                        {college.collegeName}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-500 italic">Select colleges that will contribute questions to this exam pool.</p>
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
                            {editingExam ? 'Update' : 'Create'} Global Exam
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SuperAdminExams;
