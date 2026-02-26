import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiHome, FiCheck, FiPlus, FiEdit, FiTrash2, FiX, FiUserMinus, FiBook, FiCpu, FiCode, FiHelpCircle } from 'react-icons/fi';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import Select from '@/components/common/Select.jsx';
import Input from '@/components/common/Input.jsx';
import Textarea from '@/components/common/Textarea.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';

const CollegeHierarchyModal = ({ isOpen, onClose, college, onUpdate }) => {
    const [admins, setAdmins] = useState([]);
    const [selectedAdminId, setSelectedAdminId] = useState('');
    const [loading, setLoading] = useState(false);
    const [removingId, setRemovingId] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);

    // Department States
    const [showDeptForm, setShowDeptForm] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [deptForm, setDeptForm] = useState({ name: '', departmentCode: '' });
    const [deptLoading, setDeptLoading] = useState(false);

    // Subject States
    const [showSubjectForm, setShowSubjectForm] = useState(false);
    const [activeDeptIdForSubject, setActiveDeptIdForSubject] = useState(null);
    const [subjectForm, setSubjectForm] = useState({ name: '', subjectCode: '', description: '' });
    const [subjectLoading, setSubjectLoading] = useState(false);
    const navigate = useNavigate();

    // Get assigned admin IDs for this college
    const assignedAdminIds = (college?.adminIds || []).map(a => (a?._id || a)?.toString());

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            setSelectedAdminId('');
        }
    }, [isOpen, college]);

    const fetchInitialData = async () => {
        try {
            const response = await superAdminService.getUsers({ role: 'admin', limit: 100 });
            setAdmins(response.data || []);
        } catch (error) {
            toast.error('Failed to load initial data');
        } finally {
            setInitialLoading(false);
        }
    };

    // Filter out already-assigned admins from the dropdown
    // Only show admins who are not assigned to ANY college
    const availableAdmins = admins.filter(a => !a.collegeId);

    const handleAssignAdmin = async () => {
        if (!selectedAdminId) {
            toast.error('Please select an admin');
            return;
        }

        setLoading(true);
        try {
            await superAdminService.assignCollegeAdmin(college._id, selectedAdminId);
            toast.success('College Admin assigned successfully');
            setSelectedAdminId('');
            onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Assignment failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAdmin = async (adminId) => {
        if (!window.confirm('Remove this admin from the college?')) return;
        setRemovingId(adminId);
        try {
            await superAdminService.removeCollegeAdmin(college._id, adminId);
            toast.success('Admin removed');
            onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove admin');
        } finally {
            setRemovingId(null);
        }
    };

    const handleDeptSubmit = async (e) => {
        e.preventDefault();
        setDeptLoading(true);
        try {
            if (editingDept) {
                await superAdminService.updateCollegeDepartment(college._id, editingDept._id, deptForm);
                toast.success('Department updated');
            } else {
                await superAdminService.createCollegeDepartment(college._id, deptForm);
                toast.success('Department created');
            }
            onUpdate();
            setShowDeptForm(false);
            setEditingDept(null);
            setDeptForm({ name: '', departmentCode: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Department action failed');
        } finally {
            setDeptLoading(false);
        }
    };

    const handleDeleteDept = async (deptId) => {
        if (!window.confirm('Are you sure you want to delete this department?')) return;
        try {
            await superAdminService.deleteCollegeDepartment(college._id, deptId);
            toast.success('Department deleted');
            onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleEditDept = (dept) => {
        setEditingDept(dept);
        setDeptForm({ name: dept.name, departmentCode: dept.departmentCode || dept.deptCode || '' });
        setShowDeptForm(true);
    };

    const handleSubjectSubmit = async (e) => {
        e.preventDefault();
        if (!activeDeptIdForSubject) return;

        setSubjectLoading(true);
        try {
            await superAdminService.createSubject(college._id, activeDeptIdForSubject, subjectForm);
            toast.success('Subject created successfully');
            setShowSubjectForm(false);
            setSubjectForm({ name: '', subjectCode: '', description: '' });
            onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create subject');
        } finally {
            setSubjectLoading(false);
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        if (!window.confirm('Delete this subject? This will not delete questions associated with it but will remove the link.')) return;
        try {
            await superAdminService.deleteSubject(subjectId);
            toast.success('Subject deleted');
            onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleAddQuestion = (subject, type) => {
        // Redirect to Questions page with state
        navigate('/superadmin/questions', {
            state: {
                preSelectSubject: subject._id,
                openModal: type === 'AI' ? 'AI' : 'manual'
            }
        });
        onClose(); // Close modal on redirect
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage Hierarchy: ${college?.collegeName}`}
            size="lg"
        >
            <div className="space-y-8">
                {/* Admin Assignment Section */}
                <div className="bg-primary-50/30 p-5 rounded-2xl border border-primary-100">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                            <FiUser size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">
                            Institution Administrators
                            {assignedAdminIds.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
                                    {assignedAdminIds.length}
                                </span>
                            )}
                        </h3>
                    </div>

                    {/* Current Admins List */}
                    {assignedAdminIds.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {(college?.adminIds || []).map((admin) => {
                                const adminObj = typeof admin === 'object' ? admin : admins.find(a => a._id === admin);
                                const id = admin?._id || admin;
                                return (
                                    <div key={id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                                {(adminObj?.name || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{adminObj?.name || 'Admin'}</p>
                                                <p className="text-xs text-gray-500">{adminObj?.email || ''}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveAdmin(id)}
                                            disabled={removingId === id}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                            title="Remove admin"
                                        >
                                            <FiUserMinus size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add New Admin */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Select
                                value={selectedAdminId}
                                onChange={(e) => setSelectedAdminId(e.target.value)}
                                options={[
                                    { label: 'Select Admin to Add...', value: '' },
                                    ...availableAdmins.map(admin => ({
                                        label: `${admin.name} (${admin.email})`,
                                        value: admin._id
                                    }))
                                ]}
                                disabled={initialLoading}
                            />
                        </div>
                        <Button
                            onClick={handleAssignAdmin}
                            loading={loading}
                            disabled={loading || !selectedAdminId}
                        >
                            <FiPlus className="mr-1" /> Add
                        </Button>
                    </div>
                </div>

                {/* Departments Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <FiHome size={18} />
                            </div>
                            <h3 className="font-bold text-gray-900">Departments</h3>
                        </div>
                        {!showDeptForm && (
                            <Button size="sm" onClick={() => setShowDeptForm(true)}>
                                <FiPlus className="mr-2" /> Add Dept
                            </Button>
                        )}
                    </div>

                    {showDeptForm && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                            <form onSubmit={handleDeptSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Name"
                                        placeholder="Computer Science"
                                        value={deptForm.name}
                                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                                        required
                                    />
                                    <Input
                                        label="Code"
                                        placeholder="CSE"
                                        value={deptForm.departmentCode}
                                        onChange={(e) => setDeptForm({ ...deptForm, departmentCode: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => { setShowDeptForm(false); setEditingDept(null); }}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" size="sm" loading={deptLoading}>
                                        {editingDept ? 'Update' : 'Create'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {college?.departments?.length > 0 ? (
                            college.departments.map((dept) => (
                                <div key={dept._id} className="p-5 bg-white border border-gray-200 rounded-2xl space-y-5 group hover:border-primary-300 transition-all shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                                <FiHome size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-lg leading-tight">{dept.name}</p>
                                                <p className="text-xs font-mono text-gray-400 mt-0.5 tracking-wider">{dept.departmentCode || dept.deptCode || 'CODE'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 px-3 text-xs bg-primary-50 text-primary-700 border-primary-100 hover:bg-primary-100"
                                                onClick={() => {
                                                    setActiveDeptIdForSubject(dept._id);
                                                    setShowSubjectForm(true);
                                                    setSubjectForm({ name: '', subjectCode: '', description: '' });
                                                }}
                                            >
                                                <FiPlus className="mr-1.5" /> Subject
                                            </Button>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditDept(dept)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Department">
                                                    <FiEdit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteDept(dept._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete Department">
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subjects List */}
                                    <div className="pl-4 border-l-2 border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between pr-2">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <FiBook size={12} className="text-slate-300" /> Subjects ({dept.subjects?.length || 0})
                                            </h4>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {dept.subjects?.map((sub) => (
                                                <div key={sub._id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col gap-3 group/sub relative hover:bg-white hover:shadow-md hover:border-primary-100 transition-all duration-200">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-700 truncate" title={sub.name}>{sub.name}</p>
                                                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{sub.subjectCode}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteSubject(sub._id)}
                                                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover/sub:opacity-100 transition-all"
                                                            title="Delete Subject"
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleAddQuestion(sub, 'manual')}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white text-primary-600 border border-primary-100 rounded-lg text-[10px] font-bold hover:bg-primary-600 hover:text-white transition-all shadow-sm"
                                                            title="Add Question Manually"
                                                        >
                                                            <FiHelpCircle size={12} /> Questions
                                                        </button>
                                                        <button
                                                            onClick={() => handleAddQuestion(sub, 'AI')}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-lg text-[10px] font-bold hover:from-violet-600 hover:to-indigo-600 transition-all shadow-sm"
                                                            title="Generate Questions with AI"
                                                        >
                                                            <FiCpu size={12} /> AI Generate
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!dept.subjects || dept.subjects.length === 0) && (
                                                <div className="col-span-full py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                    <p className="text-[11px] text-slate-400 italic">No subjects configured for this department.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FiHome className="text-gray-300" size={24} />
                                </div>
                                <p className="text-gray-500 text-sm">No departments configured for this college.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>
                        Done
                    </Button>
                </div>
            </div>

            {/* Subject Creation Modal */}
            <Modal
                isOpen={showSubjectForm}
                onClose={() => setShowSubjectForm(false)}
                title="Add New Subject"
                size="md"
            >
                <form onSubmit={handleSubjectSubmit} className="space-y-4">
                    <Input
                        label="Subject Name"
                        placeholder="e.g. Data Structures"
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Subject Code"
                        placeholder="e.g. CS101"
                        value={subjectForm.subjectCode}
                        onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })}
                        required
                    />
                    <Textarea
                        label="Description"
                        placeholder="Brief overview of the subject..."
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                        rows={3}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setShowSubjectForm(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={subjectLoading}>
                            Create Subject
                        </Button>
                    </div>
                </form>
            </Modal>
        </Modal>
    );
};

export default CollegeHierarchyModal;
