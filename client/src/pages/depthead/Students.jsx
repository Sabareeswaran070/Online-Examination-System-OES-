import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiMail, FiUser, FiHash } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import Modal from '@/components/common/Modal.jsx';
import Table from '@/components/common/Table.jsx';
import Input from '@/components/common/Input.jsx';
import { deptHeadService } from '@/services';
import toast from 'react-hot-toast';

const Students = () => {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student',
        regNo: '',
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalStudents, setTotalStudents] = useState(0);

    useEffect(() => {
        fetchStudents();
    }, [currentPage, pageSize, searchTerm]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await deptHeadService.getStudents({
                page: currentPage,
                limit: pageSize,
                search: searchTerm
            });
            setStudents(res.data || []);
            setTotalPages(res.totalPages || 1);
            setTotalStudents(res.count || 0);
        } catch (error) {
            console.error('Fetch students error:', error);
            toast.error('Failed to load student data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingStudent) {
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;
                await deptHeadService.updateUser(editingStudent._id, updateData);
                toast.success('Student updated successfully');
            } else {
                await deptHeadService.createUser(formData);
                toast.success('Student added successfully');
            }
            setShowModal(false);
            resetForm();
            fetchStudents();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Save failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name,
            email: student.email,
            password: '',
            role: 'student',
            regNo: student.regNo || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this student?')) {
            try {
                await deptHeadService.deleteUser(id);
                toast.success('Student deleted');
                fetchStudents();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Delete failed');
            }
        }
    };

    const resetForm = () => {
        setEditingStudent(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'student',
            regNo: '',
        });
    };

    const columns = [
        {
            header: 'Student Name',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-indigo-600 font-bold border border-primary-100 uppercase">
                        {row.name.charAt(0)}
                    </div>
                    <div className="font-semibold text-gray-900">{row.name}</div>
                </div>
            )
        },
        {
            header: 'Registration No',
            render: (row) => (
                <div className="flex items-center text-sm text-gray-600">
                    <FiHash className="mr-1.5 text-gray-400" />
                    {row.regNo || 'N/A'}
                </div>
            )
        },
        {
            header: 'Department',
            render: (row) => (
                <span className="text-sm font-medium text-gray-600">
                    {row.departmentId?.name || 'Unassigned'}
                </span>
            )
        },
        {
            header: 'Email',
            render: (row) => (
                <div className="flex items-center text-sm text-gray-600">
                    <FiMail className="mr-1.5 text-gray-400" />
                    {row.email}
                </div>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-blue-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100"
                        title="Edit Student"
                    >
                        <FiEdit size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Delete Student"
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl shadow-lg p-8 text-eyDark">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Student Roster</h1>
                        <p className="mt-1 opacity-90">Manage student records for your department</p>
                    </div>
                    <Button
                        className="bg-white text-eyDark hover:bg-primary-50 border-none shadow-md"
                        size="lg"
                        onClick={() => { resetForm(); setShowModal(true); }}
                    >
                        <FiPlus className="mr-2 w-5 h-5" />
                        Add Student
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="w-full pl-10 pr-4 py-2 border border-primary-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-sm h-fit">
                {loading && students.length === 0 ? (
                    <div className="py-20 flex justify-center">
                        <Loader />
                    </div>
                ) : (
                    <>
                        <Table
                            columns={columns}
                            data={students}
                            emptyMessage="No students found in your department."
                        />

                        {totalStudents > 0 && (
                            <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 p-4 rounded-b-xl border-t border-gray-100">
                                <div className="text-sm text-gray-600 font-medium">
                                    Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, totalStudents)}</span> of <span className="text-gray-900 font-bold">{totalStudents}</span> students
                                </div>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        Prev
                                    </button>

                                    <div className="flex gap-1 mx-2">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${currentPage === i + 1
                                                    ? 'bg-indigo-600 text-white shadow-md'
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
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingStudent ? 'Update Student' : 'Add New Student'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Student Name"
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="student@college.edu"
                    />
                    <Input
                        label="Registration Number"
                        value={formData.regNo}
                        onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                        required
                        placeholder="REG12345"
                    />
                    <Input
                        label={editingStudent ? "Password (Leave blank to keep current)" : "Password"}
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingStudent}
                        placeholder="••••••••"
                    />

                    <div className="flex justify-end space-x-3 mt-8">
                        <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            {editingStudent ? 'Update' : 'Add Student'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Students;
