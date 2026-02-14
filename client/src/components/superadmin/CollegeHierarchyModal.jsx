import { useState, useEffect } from 'react';
import { FiUser, FiHome, FiCheck, FiPlus, FiEdit, FiTrash2, FiX } from 'react-icons/fi';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import Select from '@/components/common/Select.jsx';
import Input from '@/components/common/Input.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';

const CollegeHierarchyModal = ({ isOpen, onClose, college, onUpdate }) => {
    const [admins, setAdmins] = useState([]);
    const [selectedAdminId, setSelectedAdminId] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Department States
    const [showDeptForm, setShowDeptForm] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [deptForm, setDeptForm] = useState({ name: '', departmentCode: '' });
    const [deptLoading, setDeptLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            setSelectedAdminId(college?.adminId?._id || college?.adminId || '');
        }
    }, [isOpen, college]);

    const fetchInitialData = async () => {
        try {
            const response = await superAdminService.getUsers({ role: 'admin' });
            setAdmins(response.data || []);
        } catch (error) {
            toast.error('Failed to load initial data');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleAssignAdmin = async () => {
        if (!selectedAdminId) {
            toast.error('Please select an admin');
            return;
        }

        setLoading(true);
        try {
            await superAdminService.assignCollegeAdmin(college._id, selectedAdminId);
            toast.success('College Admin assigned successfully');
            onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Assignment failed');
        } finally {
            setLoading(false);
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
                        <h3 className="font-bold text-gray-900">Institution Administrator</h3>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Select
                                value={selectedAdminId}
                                onChange={(e) => setSelectedAdminId(e.target.value)}
                                options={[
                                    { label: 'Select Admin...', value: '' },
                                    ...admins.map(admin => ({
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
                            disabled={loading || selectedAdminId === (college?.adminId?._id || college?.adminId)}
                        >
                            Assign
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {college?.departments?.length > 0 ? (
                            college.departments.map((dept) => (
                                <div key={dept._id} className="p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center group hover:border-primary-300 transition-all shadow-sm">
                                    <div>
                                        <p className="font-bold text-gray-900">{dept.name}</p>
                                        <p className="text-xs font-mono text-gray-400">{dept.departmentCode || dept.deptCode || 'CODE'}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditDept(dept)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <FiEdit size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteDept(dept._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
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
        </Modal>
    );
};

export default CollegeHierarchyModal;
