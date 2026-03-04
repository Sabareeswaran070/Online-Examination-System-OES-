import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiBook, FiUserPlus, FiUsers, FiClock, FiLayers, FiX } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import Textarea from '@/components/common/Textarea.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { deptHeadService } from '@/services';
import toast from 'react-hot-toast';

const Subjects = () => {
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        subjectCode: '',
        credits: 3,
        semester: 1,
        description: ''
    });
    const [assignData, setAssignData] = useState({
        facultyId: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [subjectsRes, facultyRes] = await Promise.all([
                deptHeadService.getSubjects(),
                deptHeadService.getFaculty()
            ]);
            setSubjects(subjectsRes.data || []);
            setFaculties(facultyRes.data || []);
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            subjectCode: '',
            credits: 3,
            semester: 1,
            description: ''
        });
        setEditingSubject(null);
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            subjectCode: subject.subjectCode,
            credits: subject.credits || 3,
            semester: subject.semester || 1,
            description: subject.description || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingSubject) {
                await deptHeadService.updateSubject(editingSubject._id, formData);
                toast.success('Subject updated successfully');
            } else {
                await deptHeadService.createSubject(formData);
                toast.success('Subject created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this subject?')) return;
        try {
            await deptHeadService.deleteSubject(id);
            toast.success('Subject deleted successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleOpenAssign = (subject) => {
        setSelectedSubject(subject);
        setAssignData({ facultyId: '' });
        setShowAssignModal(true);
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!assignData.facultyId) {
            toast.error('Please select a faculty member');
            return;
        }
        setSubmitting(true);
        try {
            await deptHeadService.assignFaculty({
                subjectId: selectedSubject._id,
                facultyId: assignData.facultyId
            });
            toast.success('Faculty assigned successfully');
            setShowAssignModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Assignment failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnassign = async (subjectId, facultyId) => {
        if (!window.confirm('Are you sure you want to unassign this faculty?')) return;
        try {
            await deptHeadService.unassignFaculty({ subjectId, facultyId });
            toast.success('Faculty unassigned successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unassignment failed');
        }
    };

    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subjectCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            header: 'Subject Information',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                        <FiBook className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 uppercase tracking-tight">{row.name}</div>
                        <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-blue-100">
                            {row.subjectCode}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Details',
            render: (row) => (
                <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-600">
                        <FiLayers className="mr-1.5 w-3.5 h-3.5 text-indigo-500" />
                        Semester {row.semester}
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                        <FiClock className="mr-1.5 w-3.5 h-3.5 text-indigo-500" />
                        {row.credits} Credits
                    </div>
                </div>
            )
        },
        {
            header: 'Assigned Faculty',
            render: (row) => (
                <div className="flex flex-wrap gap-1 max-w-xs">
                    {row.assignedFaculty && row.assignedFaculty.length > 0 ? (
                        row.assignedFaculty.map((f, idx) => (
                            <Badge key={idx} variant="info" className="py-1 px-2 text-[10px] rounded-lg flex items-center gap-1">
                                {f.facultyId?.name || 'Unknown Faculty'}
                                <button
                                    onClick={() => handleUnassign(row._id, f.facultyId?._id)}
                                    className="hover:text-red-500 transition-colors ml-1 p-0.5 rounded-full hover:bg-white/20"
                                    title="Unassign Faculty"
                                >
                                    <FiX className="w-2.5 h-2.5" />
                                </button>
                            </Badge>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400 italic">No faculty assigned</span>
                    )}
                </div>
            )
        },
        {
            header: 'Department',
            render: (row) => (
                <span className="text-sm font-medium text-gray-600">
                    {row.departmentId?.name || 'N/A'}
                </span>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenAssign(row)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                        title="Assign Faculty"
                    >
                        <FiUserPlus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                        title="Edit Subject"
                    >
                        <FiEdit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(row._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        title="Delete Subject"
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
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Subject Management</h1>
                        <p className="mt-1 opacity-90 text-sm md:text-base">View and manage courses for your department</p>
                    </div>
                    <Button
                        variant="primary"
                        className="bg-white text-blue-700 hover:bg-blue-50 border-none shadow-md"
                        onClick={() => { resetForm(); setShowModal(true); }}
                    >
                        <FiPlus className="mr-2" />
                        Add Subject
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-sm">
                <Table
                    columns={columns}
                    data={filteredSubjects}
                    emptyMessage="No subjects found. Create one to get started."
                />
            </Card>

            {/* Subject Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingSubject ? 'Update Subject' : 'Add New Subject'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <Input
                        label="Subject Name"
                        name="name"
                        placeholder="e.g. Artificial Intelligence"
                        value={formData.name}
                        onChange={handleFormChange}
                        required
                    />
                    <Input
                        label="Subject Code"
                        name="subjectCode"
                        placeholder="e.g. CS401"
                        value={formData.subjectCode}
                        onChange={handleFormChange}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Credits"
                            name="credits"
                            value={formData.credits}
                            onChange={handleFormChange}
                            required
                            min="1"
                        />
                        <Input
                            type="number"
                            label="Semester"
                            name="semester"
                            value={formData.semester}
                            onChange={handleFormChange}
                            required
                            min="1"
                        />
                    </div>
                    <Textarea
                        label="Description"
                        name="description"
                        placeholder="Optional course overview..."
                        value={formData.description}
                        onChange={handleFormChange}
                        rows={3}
                    />
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            {editingSubject ? 'Update Subject' : 'Create Subject'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Assign Faculty Modal */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title={`Assign Faculty to ${selectedSubject?.name}`}
            >
                <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 mb-2">
                        <FiUsers className="text-indigo-600 w-5 h-5 mt-0.5" />
                        <div className="text-sm text-indigo-800">
                            Select a faculty member from your department to assign them to this subject.
                        </div>
                    </div>
                    <Select
                        label="Select Faculty"
                        value={assignData.facultyId}
                        onChange={(e) => setAssignData({ facultyId: e.target.value })}
                        options={[
                            { label: 'Select faculty member...', value: '' },
                            ...faculties.map(f => ({
                                label: `${f.name} (${f.email})`,
                                value: f._id
                            }))
                        ]}
                    />
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="secondary" onClick={() => setShowAssignModal(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            Assign Faculty
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Subjects;
